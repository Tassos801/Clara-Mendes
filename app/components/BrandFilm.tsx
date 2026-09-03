import {useCallback, useEffect, useRef, useState} from 'react';
import {BRAND_FILM, brandFilmIsLive} from '~/lib/brandFilm';

type BrandFilmProps = {
  /** Route-specific spacing class (the video and caption styles are global). */
  className?: string;
  /** Cinematic-scroll chapter the section belongs to, when the route uses chapters. */
  chapter?: string;
  /** Small uppercase line above the video. */
  eyebrow?: string;
};

type FilmState = 'idle' | 'playing' | 'paused' | 'ended';

const CONTROL_COPY: Record<FilmState, {label: string; action: string}> = {
  idle: {label: 'Watch the film', action: 'Play the film'},
  playing: {label: 'Pause', action: 'Pause the film'},
  paused: {label: 'Resume', action: 'Resume the film'},
  ended: {label: 'Watch again', action: 'Watch the film again'},
};

/**
 * The silent brand film, poster first with a play control on top. Nothing
 * moves until the visitor asks: one tap plays the film inline (muted — it
 * has no sound), another pauses it, and when it ends the poster returns
 * with "Watch again". Renders nothing until both CDN URLs are set.
 */
export function BrandFilm({className, chapter, eyebrow}: BrandFilmProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<FilmState>('idle');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setState('playing');
    const onPause = () => setState(video.ended ? 'ended' : 'paused');
    const onEnded = () => {
      setState('ended');
      video.load(); // back to the poster
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(() => setState('idle'));
    } else {
      video.pause();
    }
  }, []);

  if (!brandFilmIsLive()) return null;

  const copy = CONTROL_COPY[state];
  const label = `${BRAND_FILM.title} — a silent ${BRAND_FILM.durationSeconds}-second film`;

  return (
    <section
      className={className ? `brand-film ${className}` : 'brand-film'}
      aria-label={label}
      data-chapter={chapter}
      data-film-state={state}
    >
      {eyebrow ? <p className="eyebrow brand-film-eyebrow">{eyebrow}</p> : null}
      <div className="brand-film-frame">
        <video
          ref={videoRef}
          className="brand-film-video"
          muted
          playsInline
          preload="metadata"
          poster={BRAND_FILM.posterUrl}
          width={BRAND_FILM.width}
          height={BRAND_FILM.height}
          aria-label={label}
        >
          <source src={BRAND_FILM.videoUrl} type="video/mp4" />
        </video>
        <button
          type="button"
          className="brand-film-control"
          aria-label={copy.action}
          onClick={toggle}
        >
          <span className="brand-film-play">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-film-play-label">{copy.label}</span>
          <span className="brand-film-hint">Pause</span>
        </button>
      </div>
      <p className="brand-film-caption">
        Introducing Clara Mendes — the collection in forty-five seconds.
      </p>
    </section>
  );
}
