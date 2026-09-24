import {useEffect, useId, useMemo, useState} from 'react';
import {fitSubtitle, fitTitle, trackedWidth, type MeasureText} from './fit';
import {moonLitPath} from './moon';
import type {SkyScene} from './scene';
import {
  GLOW_RINGS,
  GRID_WIDTH,
  LABEL_SIZE,
  LABEL_TRACKING,
  LINE_WIDTH,
  MOON_EDGE_OPACITY,
  MOON_EDGE_WIDTH,
  MOON_GLOW,
  PLANET_DOT,
  PLANET_STROKE,
  RING,
  TICK,
  TITLE_LINE_HEIGHT,
} from './style';
import type {SkyTheme} from './themes';

const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

/**
 * Canvas text measurer in the page font, refreshed once EB Garamond has
 * loaded so measurements match what is drawn. Null during SSR.
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

/**
 * Live preview. Draws the same scene, in the same layer order, as the PDF
 * renderer prints (app/lib/sky/pdf.server.ts).
 */
export function SkySvg({
  scene,
  theme,
  plateUrl,
  className,
}: {
  scene: SkyScene;
  theme: SkyTheme;
  plateUrl: string | null;
  className?: string;
}) {
  const {width: W, height: H, disc, scale} = scene;
  const clipId = `sky-disc-${useId().replace(/[^\w-]/g, '')}`;
  const measure = useTextMeasure();
  const title = measure
    ? fitTitle(scene.title, scene.titleSize, scene.maxTextWidth, measure('italic'), {
        maxTwoLineSize: scene.titleTwoLineMaxSize,
      })
    : {lines: scene.title ? [scene.title] : [], size: scene.titleSize};
  const titleOffset = (index: number) =>
    title.lines.length === 1
      ? 0
      : (index - 0.5) * title.size * TITLE_LINE_HEIGHT;
  const titleLines = title.lines.map((text, index) => ({
    text,
    slot: index === 0 ? 'first' : 'second',
    y: scene.titleY + titleOffset(index),
  }));
  const subtitleTracking = (size: number) =>
    1.6 * scale * (size / scene.subtitleSize);
  const subtitle = measure
    ? fitSubtitle(
        scene.subtitleParts,
        scene.subtitleSize,
        scene.maxTextWidth,
        (t, s) => trackedWidth(t, s, subtitleTracking(s), measure('normal')),
      )
    : {lines: [scene.subtitle], size: scene.subtitleSize};
  const moon = scene.moon;
  const moonPath = moon
    ? moonLitPath(moon.x, moon.y, moon.r, moon.phaseFraction, moon.litRight)
    : '';

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Star map preview: ${scene.subtitle}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={disc.cx} cy={disc.cy} r={disc.r} />
        </clipPath>
      </defs>
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
      {/* Static, wholesale-recomputed lists: index keys are correct here, and
          the catalogue contains a few coincident stars, so coordinates are
          not unique. */}
      <g clipPath={`url(#${clipId})`}>
        {scene.milkyWay.map((pass, i) => (
          <path
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            d={pass.path}
            fill={theme.milkyWay}
            opacity={theme.milkyWayOpacity * pass.weight}
          />
        ))}
        {scene.grid ? (
          <g
            fill="none"
            stroke={theme.grid}
            strokeOpacity={theme.gridOpacity}
            strokeWidth={GRID_WIDTH * scale}
          >
            {scene.grid.circles.map((r) => (
              <circle key={r} cx={disc.cx} cy={disc.cy} r={r} />
            ))}
            {scene.grid.spokes.map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        ) : null}
        <g
          stroke={theme.line}
          strokeOpacity={theme.lineOpacity}
          strokeWidth={LINE_WIDTH * scale}
          strokeLinecap="round"
        >
          {scene.lines.map((l, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
        <g fill={theme.glow}>
          {GLOW_RINGS.map((ring, r) =>
            scene.glows.map((g, i) => (
              <circle
                // eslint-disable-next-line react/no-array-index-key
                key={`${r}-${i}`}
                cx={g.x}
                cy={g.y}
                r={g.r * ring.radius}
                opacity={ring.opacity}
              />
            )),
          )}
        </g>
        <g fill={theme.star}>
          {scene.stars.map((s, i) => (
            <circle
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              opacity={s.opacity < 1 ? s.opacity : undefined}
            />
          ))}
        </g>
        {scene.planets.map((p) => (
          <g key={p.name}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="none"
              stroke={theme.planet}
              strokeWidth={PLANET_STROKE * scale}
            />
            <circle cx={p.x} cy={p.y} r={p.r * PLANET_DOT} fill={theme.planet} />
          </g>
        ))}
        {moon ? (
          <g>
            {MOON_GLOW.map((g) => (
              <circle
                key={g.radius}
                cx={moon.x}
                cy={moon.y}
                r={moon.r * g.radius}
                fill={theme.moonGlow}
                opacity={Math.min(1, g.opacity * theme.moonGlowStrength)}
              />
            ))}
            <circle cx={moon.x} cy={moon.y} r={moon.r} fill={theme.background} />
            <circle
              cx={moon.x}
              cy={moon.y}
              r={moon.r}
              fill={theme.moonShade}
              opacity={theme.moonShadeOpacity}
            />
            {moonPath ? <path d={moonPath} fill={theme.moonFace} /> : null}
            <circle
              cx={moon.x}
              cy={moon.y}
              r={moon.r}
              fill="none"
              stroke={theme.moonEdge}
              strokeOpacity={MOON_EDGE_OPACITY}
              strokeWidth={MOON_EDGE_WIDTH * scale}
            />
          </g>
        ) : null}
        {scene.labels.length ? (
          <g
            fill={theme.labelColor}
            opacity={theme.labelColorOpacity}
            fontFamily={FONT}
            fontSize={LABEL_SIZE * scale}
            letterSpacing={LABEL_TRACKING * scale}
            textAnchor="middle"
          >
            {scene.labels.map((l) => (
              <text key={l.text} x={l.x} y={l.y}>
                {l.text}
              </text>
            ))}
          </g>
        ) : null}
      </g>
      <circle
        cx={disc.cx}
        cy={disc.cy}
        r={disc.r}
        fill="none"
        stroke={theme.ring}
        strokeOpacity={theme.ringOpacity}
        strokeWidth={RING.outer * scale}
      />
      <circle
        cx={disc.cx}
        cy={disc.cy}
        r={disc.r - RING.gap * scale}
        fill="none"
        stroke={theme.ring}
        strokeOpacity={theme.ringOpacity * 0.7}
        strokeWidth={RING.inner * scale}
      />
      {scene.compass ? (
        <g>
          <g
            stroke={theme.ring}
            strokeOpacity={theme.ringOpacity}
            strokeWidth={TICK.width * scale}
          >
            {scene.compass.ticks.map((t, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
            ))}
          </g>
          <g
            fill={theme.cardinal}
            fontFamily={FONT}
            fontSize={TICK.numeralSize * scale}
            textAnchor="middle"
          >
            {scene.compass.numerals.map((n) => (
              <text key={n.text} x={n.x} y={n.y}>
                {n.text}
              </text>
            ))}
          </g>
        </g>
      ) : null}
      <g
        fill={theme.cardinal}
        fontFamily={FONT}
        fontSize={scene.cardinalSize}
        textAnchor="middle"
      >
        {scene.cardinal.map((c) => (
          <text key={c.label} x={c.x} y={c.y}>
            {c.label}
          </text>
        ))}
      </g>
      {titleLines.map((line) => (
        <text
          key={line.slot}
          x={W / 2}
          y={line.y}
          fill={theme.title}
          fontFamily={FONT}
          fontStyle="italic"
          fontSize={title.size}
          textAnchor="middle"
        >
          {line.text}
        </text>
      ))}
      {subtitle.lines.map((line, index) => (
        <text
          key={line}
          x={W / 2}
          y={scene.subtitleY + index * subtitle.size * 1.6}
          fill={theme.subtitle}
          fontFamily={FONT}
          fontSize={subtitle.size}
          letterSpacing={subtitleTracking(subtitle.size)}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
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
