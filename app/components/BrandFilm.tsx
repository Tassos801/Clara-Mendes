import {useEffect, useRef} from 'react';
import {BRAND_FILM, brandFilmIsLive} from '~/lib/brandFilm';

type BrandFilmProps = {
  /** Route-specific spacing class (the video and caption styles are global). */
  className?: string;
  /** Cinematic-scroll chapter the section belongs to, when the route uses chapters. */
  chapter?: string;
  /** Small uppercase line above the video. */
  eyebrow?: string;
};

/**
 * The silent brand film: muted, looping, inline, poster first. Visitors
 * who prefer reduced motion see the poster only. Renders nothing until
 * both CDN URLs are set.
 */
export function BrandFilm({className, chapter, eyebrow}: BrandFilmProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) {
        video.pause();
        video.removeAttribute('autoplay');
        video.load();
      } else {
        video.play().catch(() => {});
      }
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  if (!brandFilmIsLive()) return null;

  const label = `${BRAND_FILM.title} — a silent ${BRAND_FILM.durationSeconds}-second film`;

  return (
    <section
      className={className ? `brand-film ${className}` : 'brand-film'}
      aria-label={label}
      data-chapter={chapter}
    >
      {eyebrow ? <p className="eyebrow brand-film-eyebrow">{eyebrow}</p> : null}
      <video
        ref={videoRef}
        className="brand-film-video"
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        poster={BRAND_FILM.posterUrl}
        width={BRAND_FILM.width}
        height={BRAND_FILM.height}
        aria-label={label}
      >
        <source src={BRAND_FILM.videoUrl} type="video/mp4" />
      </video>
      <p className="brand-film-caption">
        Introducing Clara Mendes — the collection in forty-five seconds.
      </p>
    </section>
  );
}
