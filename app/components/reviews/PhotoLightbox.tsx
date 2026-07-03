/**
 * Native <dialog> lightbox for review photos. Shows the selected photo large
 * alongside the originating review's stars, author, and text, with prev/next
 * navigation across a flat list of all photos, plus Esc and backdrop close.
 */
import {useCallback, useEffect, useRef} from 'react';
import {Stars} from './Stars';
import type {ProductReview} from '~/lib/reviewTypes';

export type LightboxPhoto = {
  altText?: string | null;
  height?: number | null;
  review: ProductReview;
  url: string;
  width?: number | null;
};

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: LightboxPhoto[];
  /** Active index, or null when closed */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index != null;
  const total = photos.length;

  const goPrev = useCallback(() => {
    if (index == null || total === 0) return;
    onNavigate((index - 1 + total) % total);
  }, [index, onNavigate, total]);

  const goNext = useCallback(() => {
    if (index == null || total === 0) return;
    onNavigate((index + 1) % total);
  }, [index, onNavigate, total]);

  // Sync native dialog open/close state with React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Arrow-key navigation while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, goPrev, goNext]);

  const active = index != null ? photos[index] : null;

  return (
    // Native dialog backdrop-close: a click on the dialog element itself (not
    // its content) is a backdrop click. Keyboard dismissal is handled by the
    // dialog's native Esc → onCancel, so the a11y click-events rules are moot.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      ref={dialogRef}
      className="rv-lightbox"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {active ? (
        <div className="rv-lightbox-inner">
          <button
            type="button"
            className="rv-lightbox-close"
            onClick={onClose}
            aria-label="Close photo viewer"
          >
            ×
          </button>

          <div className="rv-lightbox-stage">
            {total > 1 ? (
              <button
                type="button"
                className="rv-lightbox-nav rv-lightbox-nav--prev"
                onClick={goPrev}
                aria-label="Previous photo"
              >
                ‹
              </button>
            ) : null}

            <img
              className="rv-lightbox-img"
              src={active.url}
              alt={
                active.altText ||
                `Customer photo from ${active.review.authorName}`
              }
            />

            {total > 1 ? (
              <button
                type="button"
                className="rv-lightbox-nav rv-lightbox-nav--next"
                onClick={goNext}
                aria-label="Next photo"
              >
                ›
              </button>
            ) : null}
          </div>

          <figcaption className="rv-lightbox-meta">
            <div className="rv-lightbox-meta-head">
              <span className="rv-lightbox-author">
                {active.review.authorName}
              </span>
              <Stars value={active.review.rating} size={15} />
            </div>
            <p className="rv-lightbox-body">{active.review.body}</p>
            {total > 1 ? (
              <p className="rv-lightbox-count">
                {index != null ? index + 1 : 0} / {total}
              </p>
            ) : null}
          </figcaption>
        </div>
      ) : null}
    </dialog>
  );
}
