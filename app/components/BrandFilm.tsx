import {useEffect, useRef} from 'react';
import {BRAND_FILM, brandFilmIsLive} from '~/lib/brandFilm';

/**
 * The silent brand film on Our Story: muted, looping, inline, poster
 * first. Visitors who prefer reduced motion see the poster only.
 */
export function BrandFilm() {
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
    <section className="os-film" aria-label={label}>
      <video
        ref={videoRef}
        className="os-film-video"
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
      <p className="os-film-caption">
        Introducing Clara Mendes — the collection in forty-five seconds.
      </p>
    </section>
  );
}
