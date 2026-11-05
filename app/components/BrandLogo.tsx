import {
  LOGO_COLORS,
  LOGO_HORIZONTAL,
  LOGO_MARK,
  LOGO_STACKED,
  type LogoRect,
} from '~/content/logo';

export type BrandLogoVariant = 'horizontal' | 'stacked';

type Lockup = {
  width: number;
  height: number;
  mark: {x: number; y: number; scale: number};
  textPath: string;
};

const LOCKUPS: Record<BrandLogoVariant, Lockup> = {
  horizontal: LOGO_HORIZONTAL,
  stacked: LOGO_STACKED,
};

/**
 * The mark's six rectangles placed in a lockup's box, rounded to whole units
 * the way scripts/trace-logo.mjs writes the standalone SVGs, so the inline
 * logo and the files in public/images/brand draw the same blocks.
 */
function placeMark({mark}: Lockup) {
  const at = (value: number) => Math.round(value);
  return LOGO_MARK.rects.map((rect: LogoRect) => ({
    fill: rect.fill,
    x: at(mark.x + rect.x * mark.scale),
    y: at(mark.y + rect.y * mark.scale),
    width: at(rect.width * mark.scale),
    height: at(rect.height * mark.scale),
  }));
}

const MARKS: Record<BrandLogoVariant, ReturnType<typeof placeMark>> = {
  horizontal: placeMark(LOGO_HORIZONTAL),
  stacked: placeMark(LOGO_STACKED),
};

/**
 * The Clara Mendes logo drawn inline from app/content/logo.ts. The capitals
 * and the black bars take currentColor (ink in the header, paper on the
 * footer); red, blue and yellow never change. No width or height attributes:
 * CSS sets the height and the viewBox gives the width. Decorative, because
 * the link around it carries the name.
 */
export function BrandLogo({
  variant,
  className,
}: {
  variant: BrandLogoVariant;
  className?: string;
}) {
  const lockup = LOCKUPS[variant];
  const classes = ['brand-logo', `brand-logo--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      viewBox={`0 0 ${lockup.width} ${lockup.height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" fillRule="evenodd" d={lockup.textPath} />
      {MARKS[variant].map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          fill={rect.fill === 'ink' ? 'currentColor' : LOGO_COLORS[rect.fill]}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
        />
      ))}
    </svg>
  );
}
