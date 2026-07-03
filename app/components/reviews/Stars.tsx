/**
 * Static star-rating display. Renders five glyphs, filled proportionally to the
 * given value (supports fractional averages via a clipped overlay). Purely
 * presentational — see StarRatingInput for the interactive form control.
 */

export function Stars({
  value,
  size = 16,
  label,
}: {
  /** 0–5, may be fractional */
  value: number;
  /** px size of each star */
  size?: number;
  /** Accessible label; defaults to "N out of 5 stars" */
  label?: string;
}) {
  const clamped = Math.min(5, Math.max(0, value));
  const percent = (clamped / 5) * 100;
  const rounded = Math.round(clamped * 10) / 10;

  return (
    <span
      className="rv-stars"
      role="img"
      aria-label={label ?? `${rounded} out of 5 stars`}
      style={{fontSize: `${size}px`}}
    >
      <span className="rv-stars-track" aria-hidden="true">
        ★★★★★
      </span>
      <span
        className="rv-stars-fill"
        aria-hidden="true"
        style={{width: `${percent}%`}}
      >
        ★★★★★
      </span>
    </span>
  );
}
