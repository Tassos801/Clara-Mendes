import {Component, createRef, type ReactNode, useEffect, useRef, useState} from 'react';
import type {SkyCatalog} from '~/lib/sky/catalog';
import type {SkyParams} from '~/lib/sky/params';
import type {SkySizeKey} from '~/lib/sky/products';
import {computeSky, type SkyScene} from '~/lib/sky/scene';
import {drawSkySketch, type SketchPlate} from '~/lib/sky/sketch';
import {SkySvg} from '~/lib/sky/svg';
import type {SkyTheme} from '~/lib/sky/themes';

export const SKY_CROSSFADE_MS = 250;
const MAX_PIXEL_RATIO = 2;

/**
 * A copy of the outgoing SVG to fade out over the new one. Its clip path
 * gets its own id: `url(#…)` resolves to the first match in the document,
 * which would otherwise be the live SVG's (possibly re-laid-out) disc.
 */
function ghostOf(svg: SVGSVGElement) {
  const ghost = svg.cloneNode(true) as SVGSVGElement;
  ghost.removeAttribute('role');
  ghost.removeAttribute('aria-label');
  ghost.setAttribute('aria-hidden', 'true');
  const clip = ghost.querySelector('clipPath');
  if (clip) {
    const id = `${clip.id}-ghost`;
    clip.id = id;
    for (const node of ghost.querySelectorAll('[clip-path]')) {
      node.setAttribute('clip-path', `url(#${id})`);
    }
  }
  return ghost;
}

type CrossfadeProps = {
  scene: SkyScene;
  theme: SkyTheme;
  disabled: boolean;
  children: ReactNode;
};

/**
 * Crossfades the exact SVG between sky or style changes: the DOM is cloned
 * just before React updates it (getSnapshotBeforeUpdate, so nothing is
 * cloned for text-only edits) and the clone fades out on top.
 */
class SkyCrossfade extends Component<CrossfadeProps> {
  host = createRef<HTMLDivElement>();
  ghosts = createRef<HTMLDivElement>();
  timer = 0;

  getSnapshotBeforeUpdate(prev: CrossfadeProps) {
    const {scene, theme, disabled} = this.props;
    if (disabled) return null;
    if (prev.scene.stars === scene.stars && prev.theme.id === theme.id) return null;
    const svg = this.host.current?.querySelector(':scope > svg');
    return svg instanceof SVGSVGElement ? ghostOf(svg) : null;
  }

  componentDidUpdate(_prev: CrossfadeProps, _state: unknown, ghost: SVGSVGElement | null) {
    const layer = this.ghosts.current;
    if (!ghost || !layer) return;
    window.clearTimeout(this.timer);
    layer.replaceChildren(ghost);
    // Paint the ghost fully opaque once, then let the transition run.
    void ghost.getBoundingClientRect();
    ghost.classList.add('is-leaving');
    this.timer = window.setTimeout(() => ghost.remove(), SKY_CROSSFADE_MS + 60);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return (
      <div className="sky-live-host" ref={this.host}>
        {this.props.children}
        <div aria-hidden="true" className="sky-live-ghosts" ref={this.ghosts} />
      </div>
    );
  }
}

/**
 * The print preview: the exact SVG at rest; a canvas sketch of the disc at
 * frame rate while the time slider is scrubbed (and until the exact render
 * catches up); crossfades for other changes. Reduced motion: instant swaps
 * and no sketch.
 */
export function SkyLivePreview({
  scene,
  sceneKey,
  live,
  scrubbing,
  catalog,
  size,
  theme,
  plateUrl,
  reducedMotion,
}: {
  scene: SkyScene;
  sceneKey: string;
  live: {params: SkyParams; key: string} | null;
  scrubbing: boolean;
  catalog: SkyCatalog | null;
  size: SkySizeKey;
  theme: SkyTheme;
  plateUrl: string | null;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plateRef = useRef<SketchPlate | null>(null);
  const [sketchOn, setSketchOn] = useState(false);
  const sketching =
    !reducedMotion &&
    catalog !== null &&
    live !== null &&
    (scrubbing || (sketchOn && live.key !== sceneKey));

  useEffect(() => {
    plateRef.current = null;
    if (!plateUrl) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      plateRef.current = image;
    };
    image.src = plateUrl;
    return () => {
      image.onload = null;
    };
  }, [plateUrl]);

  // One draw per frame at most: a newer slider value cancels the pending one.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!sketching || !canvas || !catalog || !live) return;
    const frame = window.requestAnimationFrame(() => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const width = Math.max(1, Math.round(box.width * ratio));
      const height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const liveScene = computeSky({params: live.params, size, catalog});
      drawSkySketch(context, liveScene, theme, {
        plate: plateRef.current,
        pixelScale: width / liveScene.width,
      });
      setSketchOn(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalog, live, size, sketching, theme]);

  // Once the exact render has caught up, fade the sketch out.
  useEffect(() => {
    if (sketching || !sketchOn) return;
    const timeout = window.setTimeout(() => setSketchOn(false), SKY_CROSSFADE_MS);
    return () => window.clearTimeout(timeout);
  }, [sketchOn, sketching]);

  return (
    <div className="sky-live">
      <SkyCrossfade disabled={reducedMotion || sketchOn} scene={scene} theme={theme}>
        <SkySvg className="sky-preview-svg" plateUrl={plateUrl} scene={scene} theme={theme} />
      </SkyCrossfade>
      <canvas
        aria-hidden="true"
        className={`sky-live-sketch${sketching && sketchOn ? ' is-visible' : ''}`}
        ref={canvasRef}
      />
    </div>
  );
}
