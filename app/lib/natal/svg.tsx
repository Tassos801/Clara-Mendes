import {useEffect, useMemo, useState} from 'react';
import {fitTextSize, fitTitle, trackedWidth, type MeasureText} from '../sky/fit';
import {moonLitPath} from '../sky/moon';
import type {SkyTheme} from '../sky/themes';
import type {NatalScene} from './scene';

const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

/**
 * Canvas text measurer in the page font, refreshed once EB Garamond has
 * loaded so measurements match what is drawn. Null during SSR. (Same
 * mechanism as the sky preview's.)
 */
function useTextMeasure() {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    Promise.all([
      fonts.load("italic 30px 'EB Garamond'"),
      fonts.load("30px 'EB Garamond'"),
    ])
      .catch(() => {})
      .finally(() => {
        if (alive) setFontsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return null;
    void fontsReady;
    return (style: 'italic' | 'normal'): MeasureText =>
      (text, size) => {
        context.font = `${style === 'italic' ? 'italic ' : ''}${size}px ${FONT}`;
        return context.measureText(text).width;
      };
  }, [fontsReady]);
}

/** Live preview. Draws the same scene the PDF renderer prints. */
export function NatalSvg({
  scene,
  theme,
  plateUrl,
  className,
}: {
  scene: NatalScene;
  theme: SkyTheme;
  plateUrl: string | null;
  className?: string;
}) {
  const {width: W, height: H, disc, scale} = scene;
  const measure = useTextMeasure();
  const name = measure
    ? fitTitle(scene.name, scene.nameSize, scene.maxTextWidth, measure('italic'))
    : {lines: scene.name ? [scene.name] : [], size: scene.nameSize};
  const nameOffset = (index: number) =>
    name.lines.length === 1 ? 0 : (index - 0.5) * name.size * 1.2;
  const tracking = (size: number, base: number) => 1.6 * scale * (size / base);
  const bornSize = measure
    ? fitTextSize(
        scene.born,
        scene.bornSize,
        scene.maxTextWidth,
        (t, s) => trackedWidth(t, s, tracking(s, scene.bornSize), measure('normal')),
      )
    : scene.bornSize;
  const placeSize = measure
    ? fitTextSize(
        scene.place,
        scene.placeSize,
        scene.maxTextWidth,
        (t, s) =>
          trackedWidth(t, s, tracking(s, scene.placeSize), measure('normal')),
      )
    : scene.placeSize;
  const detailsSize = measure
    ? fitTextSize(scene.details, scene.detailsSize, scene.maxTextWidth, measure('italic'))
    : scene.detailsSize;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Birth poster preview: ${scene.name}, ${scene.born}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={W} height={H} fill={theme.background} />
      {plateUrl ? (
        <image
          href={plateUrl}
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {theme.disc ? (
        <circle
          cx={disc.cx}
          cy={disc.cy}
          r={disc.r}
          fill={theme.disc}
          opacity={theme.discOpacity}
        />
      ) : null}
      <g
        stroke={theme.line}
        strokeOpacity={theme.lineOpacity}
        strokeWidth={0.35 * scale}
        strokeLinecap="round"
      >
        {scene.lines.map((l, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
      {/* Static, wholesale-recomputed lists: index keys are correct here. */}
      <g fill={theme.halo} opacity={0.12}>
        {scene.stars
          .filter((s) => s.mag < 1.5)
          .map((s, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <circle key={i} cx={s.x} cy={s.y} r={s.r * 2.4} />
          ))}
      </g>
      <g fill={theme.star}>
        {scene.stars.map((s, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <circle key={i} cx={s.x} cy={s.y} r={s.r} />
        ))}
      </g>
      <g fill={theme.planet}>
        {scene.planets.map((p) => (
          <circle key={p.name} cx={p.x} cy={p.y} r={p.r} />
        ))}
      </g>
      {scene.moon ? (
        <g>
          <circle
            cx={scene.moon.x}
            cy={scene.moon.y}
            r={scene.moon.r}
            fill={theme.moonDark}
            stroke={theme.moonLit}
            strokeWidth={0.4 * scale}
          />
          <path
            d={moonLitPath(
              scene.moon.x,
              scene.moon.y,
              scene.moon.r,
              scene.moon.phaseFraction,
              scene.moon.litRight,
            )}
            fill={theme.moonLit}
          />
        </g>
      ) : null}
      <circle
        cx={disc.cx}
        cy={disc.cy}
        r={disc.r}
        fill="none"
        stroke={theme.ring}
        strokeOpacity={theme.ringOpacity}
        strokeWidth={0.6 * scale}
      />
      {name.lines.map((line, index) => (
        <text
          key={index === 0 ? 'first' : 'second'}
          x={W / 2}
          y={scene.nameY + nameOffset(index)}
          fill={theme.title}
          fontFamily={FONT}
          fontStyle="italic"
          fontSize={name.size}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
      <text
        x={W / 2}
        y={scene.bornY}
        fill={theme.subtitle}
        fontFamily={FONT}
        fontSize={bornSize}
        letterSpacing={tracking(bornSize, scene.bornSize)}
        textAnchor="middle"
      >
        {scene.born}
      </text>
      <text
        x={W / 2}
        y={scene.placeY}
        fill={theme.subtitle}
        fontFamily={FONT}
        fontSize={placeSize}
        letterSpacing={tracking(placeSize, scene.placeSize)}
        textAnchor="middle"
      >
        {scene.place}
      </text>
      {scene.details ? (
        <text
          x={W / 2}
          y={scene.detailsY}
          fill={theme.title}
          fontFamily={FONT}
          fontStyle="italic"
          fontSize={detailsSize}
          textAnchor="middle"
        >
          {scene.details}
        </text>
      ) : null}
      <text
        x={W / 2}
        y={scene.creditY}
        fill={theme.credit}
        fontFamily={FONT}
        fontSize={scene.creditSize}
        letterSpacing={1.8 * scale}
        textAnchor="middle"
      >
        {scene.credit}
      </text>
    </svg>
  );
}
