import {moonLitPath} from './moon';
import type {SkyScene} from './scene';
import type {SkyTheme} from './themes';

const FONT = "'EB Garamond', Georgia, 'Times New Roman', serif";

/** Live preview. Draws the same scene the PDF renderer prints. */
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
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Star map preview: ${scene.subtitle}`}
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
        {scene.lines.map((l) => (
          <line
            key={`${l.x1},${l.y1},${l.x2},${l.y2}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
          />
        ))}
      </g>
      <g fill={theme.halo} opacity={0.12}>
        {scene.stars
          .filter((s) => s.mag < 1.5)
          .map((s) => (
            <circle key={`${s.x},${s.y}`} cx={s.x} cy={s.y} r={s.r * 2.4} />
          ))}
      </g>
      <g fill={theme.star}>
        {scene.stars.map((s) => (
          <circle key={`${s.x},${s.y}`} cx={s.x} cy={s.y} r={s.r} />
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
      <g
        fill={theme.cardinal}
        fontFamily={FONT}
        fontSize={7 * scale}
        textAnchor="middle"
      >
        {scene.cardinal.map((c) => (
          <text key={c.label} x={c.x} y={c.y}>
            {c.label}
          </text>
        ))}
      </g>
      {scene.title ? (
        <text
          x={W / 2}
          y={scene.titleY}
          fill={theme.title}
          fontFamily={FONT}
          fontStyle="italic"
          fontSize={scene.titleSize}
          textAnchor="middle"
        >
          {scene.title}
        </text>
      ) : null}
      <text
        x={W / 2}
        y={scene.subtitleY}
        fill={theme.subtitle}
        fontFamily={FONT}
        fontSize={scene.subtitleSize}
        letterSpacing={1.6 * scale}
        textAnchor="middle"
      >
        {scene.subtitle}
      </text>
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
