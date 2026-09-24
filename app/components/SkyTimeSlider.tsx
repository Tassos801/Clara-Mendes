import {type CSSProperties, useEffect} from 'react';
import {
  minutesToTime,
  phaseWord,
  SLIDER_MAX,
  SLIDER_STEP,
  sliderKeyTarget,
  sliderPercent,
  timeValueText,
  trackGradient,
  twilightCaption,
} from '~/lib/sky/timeSlider';
import {phaseAt, type SkyTimeline} from '~/lib/sky/twilight';

const SCRUB_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End',
]);

/**
 * Time-of-night slider under the map: local minutes in 5-minute steps,
 * shaded by the Sun's altitude for the chosen date and place. `onScrub`
 * reports when the customer is actively moving it (pointer down or a key
 * held), so the preview can sketch at frame rate.
 */
export function SkyTimeSlider({
  minutes,
  timeline,
  onChange,
  onScrub,
}: {
  minutes: number;
  timeline: SkyTimeline | null;
  onChange: (minutes: number) => void;
  onScrub: (active: boolean) => void;
}) {
  // A drag can end anywhere on the page.
  useEffect(() => {
    const end = () => onScrub(false);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [onScrub]);

  const value = Math.min(minutes, SLIDER_MAX);
  const word = timeline ? phaseWord(timeline, value) : null;
  const ticks = timeline
    ? [timeline.sunrise, timeline.sunset].filter((m): m is number => m !== null)
    : [];
  const trackStyle = timeline
    ? ({'--sky-time-track': trackGradient(timeline)} as CSSProperties)
    : undefined;

  return (
    <div className="sky-time">
      <div className="sky-time-head">
        <label htmlFor="sky-time-slider">Time of night</label>
        <output aria-hidden="true" htmlFor="sky-time-slider">
          {minutesToTime(value)}
          {word ? ` · ${word[0].toUpperCase()}${word.slice(1)}` : ''}
        </output>
      </div>
      <div className="sky-time-track" style={trackStyle}>
        {ticks.map((tick) => (
          <span
            aria-hidden="true"
            className="sky-time-tick"
            key={tick}
            style={{'--at': sliderPercent(tick) / 100} as CSSProperties}
          />
        ))}
        <input
          aria-describedby={timeline ? 'sky-time-caption' : undefined}
          aria-valuetext={timeValueText(timeline, value)}
          id="sky-time-slider"
          max={SLIDER_MAX}
          min={0}
          onBlur={() => onScrub(false)}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (!SCRUB_KEYS.has(event.key)) return;
            onScrub(true);
            const target = sliderKeyTarget(event.key, value);
            if (target !== null) {
              event.preventDefault();
              onChange(target);
            }
          }}
          onKeyUp={() => onScrub(false)}
          onPointerDown={() => onScrub(true)}
          step={SLIDER_STEP}
          type="range"
          value={value}
        />
      </div>
      {timeline ? (
        <p className="sky-time-caption" id="sky-time-caption">
          {twilightCaption(timeline)}
        </p>
      ) : null}
      {timeline && phaseAt(timeline, value) === 'day' ? (
        <p className="sky-time-note">
          Daylight: the stars are shown as they stood above the horizon.
        </p>
      ) : null}
    </div>
  );
}
