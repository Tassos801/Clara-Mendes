/**
 * Social photo-review feature for the product page. Renders the summary block,
 * customer-photo strip, filter/sort controls, review cards, and the
 * write-a-review panel — all in the refined editorial aesthetic (class prefix
 * `rv-`, component-scoped CSS below).
 */
import {useEffect, useMemo, useState} from 'react';
import {useFetcher} from 'react-router';
import {Stars} from './Stars';
import {PhotoLightbox, type LightboxPhoto} from './PhotoLightbox';
import {ReviewForm} from './ReviewForm';
import type {ProductReview, ProductReviewsData} from '~/lib/reviewTypes';

type FilterMode = 'all' | 'photos';
type SortMode = 'newest' | 'highest' | 'lowest' | 'helpful';

const PAGE_SIZE = 6;

const SORT_OPTIONS: Array<{label: string; value: SortMode}> = [
  {label: 'Newest', value: 'newest'},
  {label: 'Highest rated', value: 'highest'},
  {label: 'Lowest rated', value: 'lowest'},
  {label: 'Most helpful', value: 'helpful'},
];

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return monthYear.format(date);
}

export function ReviewsSection({
  productGid,
  productTitle,
  data,
}: {
  productGid: string;
  productTitle: string;
  data: ProductReviewsData;
}) {
  const {reviews, summary} = data;
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Flat, newest-first list of every photo across every review — powers both
  // the customer-photo strip and the lightbox navigation.
  const allPhotos = useMemo<LightboxPhoto[]>(() => {
    const photos: LightboxPhoto[] = [];
    for (const review of reviews) {
      for (const photo of review.photos) {
        photos.push({...photo, review});
      }
    }
    return photos;
  }, [reviews]);

  const filtered = useMemo(() => {
    const base =
      filter === 'photos'
        ? reviews.filter((review) => review.photos.length > 0)
        : reviews;
    const sorted = [...base];
    switch (sort) {
      case 'highest':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
        break;
      case 'newest':
      default:
        sorted.sort(
          (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
        );
        break;
    }
    return sorted;
  }, [reviews, filter, sort]);

  // Reset the reveal count whenever the list composition changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, sort]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const openPhotoByUrl = (url: string, reviewId: string) => {
    const idx = allPhotos.findIndex(
      (photo) => photo.url === url && photo.review.id === reviewId,
    );
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <section className="rv-root" aria-labelledby="rv-heading">
      <style suppressHydrationWarning>{reviewsCss}</style>

      <div className="rv-heading-row">
        <div>
          <p className="rv-eyebrow">From real homes</p>
          <h2 id="rv-heading" className="rv-title">
            Reviews
          </h2>
        </div>
        {summary.total > 0 ? (
          <button
            type="button"
            className="rv-btn rv-btn--outline"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
          >
            {formOpen ? 'Close' : 'Write a review'}
          </button>
        ) : null}
      </div>

      {summary.total === 0 ? (
        <div className="rv-empty">
          <p className="rv-empty-text">
            No reviews yet for {productTitle}. Be the first to share how it
            lives in your home.
          </p>
          <button
            type="button"
            className="rv-btn rv-btn--primary"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
          >
            {formOpen ? 'Close' : 'Write the first review'}
          </button>
          {formOpen ? (
            <div className="rv-form-panel rv-form-panel--empty">
              <ReviewForm
                productGid={productGid}
                onDone={() => setFormOpen(false)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {formOpen ? (
            <div className="rv-form-panel">
              <ReviewForm
                productGid={productGid}
                onDone={() => setFormOpen(false)}
              />
            </div>
          ) : null}

          <SummaryBlock summary={summary} />

          {allPhotos.length > 0 ? (
            <div className="rv-photostrip">
              <p className="rv-substrip-label">
                Customer photos <span>({allPhotos.length})</span>
              </p>
              <ul className="rv-photostrip-track">
                {allPhotos.map((photo, idx) => (
                  <li key={`${photo.review.id}-${photo.url}`}>
                    <button
                      type="button"
                      className="rv-thumb"
                      onClick={() => setLightboxIndex(idx)}
                      aria-label={`View customer photo from ${photo.review.authorName}`}
                    >
                      <img
                        src={photo.url}
                        alt={
                          photo.altText ||
                          `Customer photo from ${photo.review.authorName}`
                        }
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rv-controls">
            <div className="rv-chips" role="group" aria-label="Filter reviews">
              <button
                type="button"
                className={`rv-chip${filter === 'all' ? ' is-active' : ''}`}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All ({reviews.length})
              </button>
              <button
                type="button"
                className={`rv-chip${filter === 'photos' ? ' is-active' : ''}`}
                aria-pressed={filter === 'photos'}
                onClick={() => setFilter('photos')}
              >
                With photos (
                {allPhotos.length > 0 ? countWithPhotos(reviews) : 0})
              </button>
            </div>
            <div className="rv-sort">
              <label className="rv-sort-label" htmlFor="rv-sort-select">
                Sort
              </label>
              <select
                id="rv-sort-select"
                className="rv-sort-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {shown.length > 0 ? (
            <ul className="rv-list">
              {shown.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onOpenPhoto={openPhotoByUrl}
                />
              ))}
            </ul>
          ) : (
            <p className="rv-nomatch">No reviews match this filter yet.</p>
          )}

          {hasMore ? (
            <button
              type="button"
              className="rv-loadmore"
              onClick={() =>
                setVisible((count) =>
                  Math.min(count + PAGE_SIZE, filtered.length),
                )
              }
            >
              Load more reviews
            </button>
          ) : null}
        </>
      )}

      <PhotoLightbox
        photos={allPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </section>
  );
}

function countWithPhotos(reviews: ProductReview[]): number {
  return reviews.reduce(
    (total, review) => total + (review.photos.length > 0 ? 1 : 0),
    0,
  );
}

function SummaryBlock({summary}: {summary: ProductReviewsData['summary']}) {
  const {average, histogram, total} = summary;
  const max = Math.max(1, ...histogram);

  return (
    <div className="rv-summary">
      <div className="rv-summary-score">
        <span className="rv-summary-average">{average.toFixed(1)}</span>
        <Stars value={average} size={20} />
        <span className="rv-summary-count">
          {total} {total === 1 ? 'review' : 'reviews'}
        </span>
      </div>
      <ul className="rv-histogram" aria-hidden="true">
        {[5, 4, 3, 2, 1].map((starValue) => {
          const count = histogram[starValue - 1];
          const width = (count / max) * 100;
          return (
            <li key={starValue} className="rv-histogram-row">
              <span className="rv-histogram-star">{starValue}★</span>
              <span className="rv-histogram-bar">
                <span
                  className="rv-histogram-fill"
                  style={{width: `${width}%`}}
                />
              </span>
              <span className="rv-histogram-count">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({
  review,
  onOpenPhoto,
}: {
  review: ProductReview;
  onOpenPhoto: (url: string, reviewId: string) => void;
}) {
  const fetcher = useFetcher<
    {ok: true; message: string} | {ok: false; error: string}
  >();
  const storageKey = `review-helpful:${review.id}`;
  const [voted, setVoted] = useState(false);

  // Read prior-vote state from localStorage after mount (SSR-safe).
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) setVoted(true);
    } catch {
      // Ignore storage access errors (private mode, disabled storage).
    }
  }, [storageKey]);

  const submitting = fetcher.state !== 'idle';
  // Optimistic count: bump by one the moment the user has voted this session.
  const optimisticCount = review.helpfulCount + (voted ? 1 : 0);
  const initial = review.authorName.trim().charAt(0).toUpperCase() || '?';

  const onHelpful = () => {
    if (voted || submitting) return;
    setVoted(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // Ignore storage write failures; the optimistic UI still updates.
    }
    const formData = new FormData();
    formData.set('intent', 'helpful');
    formData.set('reviewId', review.id);
    void fetcher.submit(formData, {
      action: '/api/reviews',
      method: 'POST',
      encType: 'multipart/form-data',
    });
  };

  return (
    <li className="rv-card">
      <div className="rv-card-head">
        <span className="rv-avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="rv-card-meta">
          <span className="rv-card-author">{review.authorName}</span>
          <div className="rv-card-subline">
            <Stars value={review.rating} size={14} />
            <span className="rv-card-date">
              {formatDate(review.submittedAt)}
            </span>
          </div>
        </div>
      </div>

      <p className="rv-card-body">{review.body}</p>

      {review.photos.length > 0 ? (
        <ul className="rv-card-photos">
          {review.photos.map((photo) => (
            <li key={photo.url}>
              <button
                type="button"
                className="rv-thumb rv-thumb--sm"
                onClick={() => onOpenPhoto(photo.url, review.id)}
                aria-label={`View photo from ${review.authorName}`}
              >
                <img
                  src={photo.url}
                  alt={photo.altText || `Photo from ${review.authorName}`}
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rv-card-actions">
        <button
          type="button"
          className="rv-helpful"
          onClick={onHelpful}
          disabled={voted || submitting}
          aria-pressed={voted}
        >
          {voted ? 'Marked helpful' : 'Helpful'} ({optimisticCount})
        </button>
      </div>
    </li>
  );
}

const reviewsCss = `
.rv-root {
  --rv-ink: #26231f;
  --rv-muted: #746f65;
  --rv-paper: #fbfaf6;
  --rv-line: rgba(38, 35, 31, 0.12);
  --rv-line-strong: rgba(38, 35, 31, 0.18);
  --rv-star: #26231f;
  --rv-star-empty: rgba(38, 35, 31, 0.16);
  --rv-ease: cubic-bezier(0.25, 1, 0.5, 1);
  border-top: 1px solid var(--rv-line);
  padding: clamp(40px, 6vw, 88px) 0 clamp(24px, 3vw, 48px);
  color: var(--rv-ink);
}

/* ── Heading ── */
.rv-heading-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: clamp(24px, 3vw, 40px);
}

.rv-eyebrow {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--rv-muted);
  margin: 0 0 12px;
}

.rv-title {
  font-family: var(--serif);
  font-size: clamp(1.9rem, 4vw, 2.8rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1;
  margin: 0;
}

/* ── Buttons ── */
.rv-btn {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 400ms var(--rv-ease), color 400ms var(--rv-ease),
    border-color 400ms var(--rv-ease);
  white-space: nowrap;
}

.rv-btn--outline,
.rv-btn--ghost {
  backdrop-filter: blur(12px) saturate(1.16);
  -webkit-backdrop-filter: blur(12px) saturate(1.16);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.46), transparent 58%),
    rgba(251,250,246,0.62);
  color: var(--rv-ink);
  border: 1px solid rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
}

.rv-btn--outline:hover,
.rv-btn--ghost:hover {
  border-color: rgba(38, 35, 31, 0.42);
}

.rv-btn--primary {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.12), transparent 46%),
    rgba(38,35,31,0.95);
  color: var(--rv-paper);
  border: 1px solid var(--rv-ink);
}

.rv-btn--primary:hover {
  background: #3a352e;
}

.rv-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Stars ── */
.rv-stars {
  position: relative;
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
  font-family: var(--sans);
}

.rv-stars-track {
  color: var(--rv-star-empty);
  letter-spacing: 0.08em;
}

.rv-stars-fill {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  color: var(--rv-star);
  letter-spacing: 0.08em;
}

/* ── Empty state ── */
.rv-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  max-width: 52ch;
}

.rv-empty-text {
  font-family: var(--serif);
  font-size: clamp(1.1rem, 2.2vw, 1.4rem);
  line-height: 1.5;
  color: var(--rv-ink);
  margin: 0;
}

/* ── Summary ── */
.rv-summary {
  display: grid;
  grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  padding: clamp(24px, 3vw, 36px) 0;
  border-top: 1px solid var(--rv-line);
  border-bottom: 1px solid var(--rv-line);
}

.rv-summary-score {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rv-summary-average {
  font-family: var(--serif);
  font-size: clamp(3rem, 7vw, 4.4rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.03em;
}

.rv-summary-count {
  font-family: var(--sans);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: var(--rv-muted);
}

.rv-histogram {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rv-histogram-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 12px;
}

.rv-histogram-star {
  font-family: var(--sans);
  font-size: 0.72rem;
  color: var(--rv-muted);
  letter-spacing: 0.04em;
}

.rv-histogram-bar {
  height: 5px;
  background: rgba(38, 35, 31, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.rv-histogram-fill {
  display: block;
  height: 100%;
  background: var(--rv-ink);
  border-radius: 999px;
  transition: width 700ms var(--rv-ease);
}

.rv-histogram-count {
  font-family: var(--sans);
  font-size: 0.72rem;
  color: var(--rv-muted);
  text-align: right;
}

/* ── Photo strip ── */
.rv-photostrip {
  padding: clamp(24px, 3vw, 36px) 0;
  border-bottom: 1px solid var(--rv-line);
}

.rv-substrip-label {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rv-muted);
  margin: 0 0 16px;
}

.rv-substrip-label span {
  opacity: 0.7;
}

.rv-photostrip-track {
  list-style: none;
  margin: 0;
  padding: 0 0 6px;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.rv-thumb {
  display: block;
  padding: 0;
  border: 1px solid var(--rv-line);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(38, 35, 31, 0.04);
  width: clamp(84px, 14vw, 116px);
  height: clamp(84px, 14vw, 116px);
  flex: 0 0 auto;
  transition: border-color 400ms var(--rv-ease), transform 400ms var(--rv-ease);
}

.rv-thumb:hover {
  border-color: rgba(38, 35, 31, 0.42);
  transform: translateY(-2px);
}

.rv-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rv-thumb--sm {
  width: 72px;
  height: 72px;
}

/* ── Controls ── */
.rv-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: clamp(20px, 2.6vw, 28px) 0;
}

.rv-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rv-chip {
  font-family: var(--sans);
  font-size: 0.74rem;
  color: var(--rv-muted);
  backdrop-filter: blur(10px) saturate(1.14);
  -webkit-backdrop-filter: blur(10px) saturate(1.14);
  background: rgba(255,255,255,0.42);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
  padding: 6px 15px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 300ms var(--rv-ease), border-color 300ms var(--rv-ease),
    background 300ms var(--rv-ease);
}

.rv-chip:hover {
  color: var(--rv-ink);
  border-color: rgba(38, 35, 31, 0.42);
}

.rv-chip.is-active {
  color: var(--rv-paper);
  background: var(--rv-ink);
  border-color: var(--rv-ink);
}

.rv-sort {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rv-sort-label {
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rv-muted);
}

.rv-sort-select {
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--rv-ink);
  background-color: rgba(251,250,246,0.62);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
  padding: 6px 28px 6px 10px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2326231f' stroke-width='1.2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}

/* ── Review list ── */
.rv-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rv-card {
  padding: clamp(22px, 3vw, 32px) 0;
  border-top: 1px solid var(--rv-line);
}

.rv-card-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.rv-avatar {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(38, 35, 31, 0.08);
  color: var(--rv-ink);
  font-family: var(--serif);
  font-size: 1.1rem;
}

.rv-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rv-card-author {
  font-family: var(--sans);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.rv-card-subline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rv-card-date {
  font-family: var(--sans);
  font-size: 0.74rem;
  color: var(--rv-muted);
}

.rv-card-body {
  font-family: var(--serif);
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--rv-ink);
  margin: 0 0 16px;
  max-width: 68ch;
}

.rv-card-photos {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.rv-card-actions {
  display: flex;
  gap: 12px;
}

.rv-helpful {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--rv-muted);
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--rv-line-strong);
  transition: color 300ms var(--rv-ease), border-color 300ms var(--rv-ease);
}

.rv-helpful:hover:not(:disabled) {
  color: var(--rv-ink);
  border-color: rgba(38, 35, 31, 0.42);
}

.rv-helpful:disabled {
  cursor: default;
  color: var(--rv-ink);
  border-bottom-color: transparent;
}

.rv-nomatch,
.rv-loadmore {
  font-family: var(--sans);
}

.rv-nomatch {
  font-size: 0.9rem;
  color: var(--rv-muted);
  padding: 28px 0;
  border-top: 1px solid var(--rv-line);
}

.rv-loadmore {
  display: block;
  margin: clamp(20px, 3vw, 32px) auto 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rv-ink);
  background: transparent;
  border: 1px solid var(--rv-line-strong);
  border-radius: 6px;
  padding: 12px 28px;
  cursor: pointer;
  transition: border-color 400ms var(--rv-ease);
}

.rv-loadmore:hover {
  border-color: rgba(38, 35, 31, 0.42);
}

/* ── Form ── */
.rv-form-panel {
  backdrop-filter: blur(18px) saturate(1.16);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
  margin-bottom: clamp(28px, 3vw, 40px);
  padding: clamp(24px, 3vw, 36px);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255,255,255,0.48), transparent 54%),
    rgba(251,250,246,0.68);
  box-shadow:
    0 16px 38px rgba(55,48,39,0.1),
    inset 0 1px 0 rgba(255,255,255,0.82);
}

.rv-form-panel--empty {
  width: 100%;
  margin-top: 8px;
}

.rv-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 620px;
}

.rv-honeypot {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.rv-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 0;
  padding: 0;
  margin: 0;
}

.rv-field-label {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rv-muted);
}

.rv-field-hint {
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: none;
  opacity: 0.8;
}

.rv-input,
.rv-textarea {
  font-family: var(--sans);
  font-size: 0.92rem;
  color: var(--rv-ink);
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(38,35,31,0.14);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
  padding: 12px 14px;
  width: 100%;
  transition: border-color 300ms var(--rv-ease);
}

.rv-input:focus,
.rv-textarea:focus {
  outline: none;
  border-color: rgba(38, 35, 31, 0.5);
}

.rv-textarea {
  resize: vertical;
  line-height: 1.55;
}

.rv-form-rating {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rv-rate {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rv-rate-star {
  font-size: 1.7rem;
  line-height: 1;
  background: transparent;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--rv-star-empty);
  transition: color 200ms var(--rv-ease), transform 200ms var(--rv-ease);
}

.rv-rate-star.is-on {
  color: var(--rv-star);
}

.rv-rate-star:hover {
  transform: scale(1.12);
}

.rv-rate-caption {
  margin-left: 12px;
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--rv-muted);
}

.rv-form-previews {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.rv-form-preview {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--rv-line);
}

.rv-form-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rv-form-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(38, 35, 31, 0.78);
  color: #fbfaf6;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.rv-file {
  display: inline-flex;
  align-items: center;
  width: fit-content;
}

.rv-file input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.rv-file-cue {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rv-ink);
  border: 1px dashed var(--rv-line-strong);
  border-radius: 6px;
  padding: 10px 18px;
  cursor: pointer;
  transition: border-color 300ms var(--rv-ease);
}

.rv-file:hover .rv-file-cue {
  border-color: rgba(38, 35, 31, 0.5);
}

.rv-field-error,
.rv-form-error {
  font-family: var(--sans);
  font-size: 0.82rem;
  color: #9a3412;
  margin: 0;
}

.rv-form-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.rv-form-success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: clamp(20px, 3vw, 28px);
}

.rv-form-success-text {
  font-family: var(--serif);
  font-size: 1.15rem;
  line-height: 1.5;
  color: var(--rv-ink);
  margin: 0;
  max-width: 46ch;
}

/* ── Lightbox ── */
.rv-lightbox {
  border: none;
  padding: 0;
  background: transparent;
  max-width: 100vw;
  max-height: 100vh;
  width: 100%;
  height: 100%;
  margin: 0;
}

.rv-lightbox::backdrop {
  background: rgba(20, 18, 14, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.rv-lightbox-inner {
  backdrop-filter: blur(24px) saturate(1.18);
  -webkit-backdrop-filter: blur(24px) saturate(1.18);
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto;
  width: min(960px, 94vw);
  max-height: 92vh;
  margin: auto;
  margin-top: 4vh;
  background: rgba(251,250,246,0.88);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 22px;
  box-shadow:
    0 30px 80px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.82);
  overflow: hidden;
}

.rv-lightbox-close {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 3;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: rgba(20, 18, 14, 0.55);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.rv-lightbox-stage {
  position: relative;
  display: grid;
  place-items: center;
  background: #14120e;
  min-height: 0;
}

.rv-lightbox-img {
  max-width: 100%;
  max-height: 62vh;
  object-fit: contain;
  display: block;
}

.rv-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(251, 250, 246, 0.85);
  color: var(--rv-ink);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 300ms var(--rv-ease);
}

.rv-lightbox-nav:hover {
  background: rgba(251, 250, 246, 1);
}

.rv-lightbox-nav--prev {
  left: 14px;
}

.rv-lightbox-nav--next {
  right: 14px;
}

.rv-lightbox-meta {
  padding: clamp(18px, 2.4vw, 26px);
  border-top: 1px solid var(--rv-line);
  overflow-y: auto;
}

.rv-lightbox-meta-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.rv-lightbox-author {
  font-family: var(--sans);
  font-size: 0.92rem;
  font-weight: 600;
}

.rv-lightbox-body {
  font-family: var(--serif);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--rv-ink);
  margin: 0;
  max-width: 64ch;
}

.rv-lightbox-count {
  font-family: var(--sans);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--rv-muted);
  margin: 12px 0 0;
}

/* ── Responsive ── */
@media (max-width: 720px) {
  .rv-summary {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .rv-heading-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .rv-controls {
    align-items: flex-start;
  }

  .rv-lightbox-img {
    max-height: 48vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rv-histogram-fill,
  .rv-thumb,
  .rv-rate-star,
  .rv-btn,
  .rv-chip {
    transition: none !important;
  }

  .rv-thumb:hover,
  .rv-rate-star:hover {
    transform: none !important;
  }
}
`;
