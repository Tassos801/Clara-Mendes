/**
 * Collapsible write-a-review form. Submits multipart FormData to /api/reviews
 * via useFetcher (intent="submit"). Handles tap-to-rate, client-side photo
 * validation with previews, a honeypot field, and submit/success/error states.
 */
import {useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  MAX_REVIEW_PHOTOS,
  MAX_REVIEW_PHOTO_BYTES,
  REVIEW_PHOTO_CONTENT_TYPES,
} from '~/lib/reviewTypes';

type ApiResponse =
  | {ok: true; message: string}
  | {ok: false; error: string};

type SelectedPhoto = {
  file: File;
  id: string;
  previewUrl: string;
};

const MAX_MB = Math.round(MAX_REVIEW_PHOTO_BYTES / (1024 * 1024));
const RATING_LABELS = [
  'Poor',
  'Fair',
  'Good',
  'Very good',
  'Excellent',
] as const;

export function ReviewForm({
  productGid,
  onDone,
}: {
  productGid: string;
  onDone?: () => void;
}) {
  const fetcher = useFetcher<ApiResponse>();
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const submitting = fetcher.state !== 'idle';
  const response = fetcher.data;
  const succeeded = response?.ok === true;
  const serverError = response && !response.ok ? response.error : null;

  // Revoke object URLs on unmount / change to avoid leaks.
  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photos]);

  const displayRating = hoverRating || rating;

  const remainingSlots = MAX_REVIEW_PHOTOS - photos.length;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);

    const incoming = Array.from(fileList);
    const accepted: SelectedPhoto[] = [];
    let error: string | null = null;

    for (const file of incoming) {
      if (accepted.length >= remainingSlots) {
        error = `You can add up to ${MAX_REVIEW_PHOTOS} photos.`;
        break;
      }
      if (!REVIEW_PHOTO_CONTENT_TYPES.includes(file.type)) {
        error = 'Photos must be JPEG, PNG, or WebP.';
        continue;
      }
      if (file.size > MAX_REVIEW_PHOTO_BYTES) {
        error = `Each photo must be under ${MAX_MB} MB.`;
        continue;
      }
      accepted.push({
        file,
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(36)
          .slice(2)}`,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) setPhotos((prev) => [...prev, ...accepted]);
    if (error) setPhotoError(error);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((photo) => photo.id !== id);
    });
    setPhotoError(null);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || rating < 1) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('intent', 'submit');
    formData.set('productId', productGid);
    formData.set('rating', String(rating));
    // Rebuild the photo list from validated state (the raw input may hold
    // rejected files, so we control exactly what gets sent).
    formData.delete('photos');
    for (const photo of photos) {
      formData.append('photos', photo.file, photo.file.name);
    }

    void fetcher.submit(formData, {
      action: '/api/reviews',
      method: 'POST',
      encType: 'multipart/form-data',
    });
  };

  const errorId = useMemo(
    () => `rv-form-error-${Math.random().toString(36).slice(2)}`,
    [],
  );

  if (succeeded) {
    return (
      <div className="rv-form-success" role="status">
        <p className="rv-eyebrow">Received</p>
        <p className="rv-form-success-text">
          {response?.ok
            ? response.message
            : 'Thank you — your review will appear once approved.'}
        </p>
        {onDone ? (
          <button
            type="button"
            className="rv-btn rv-btn--ghost"
            onClick={onDone}
          >
            Close
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <fetcher.Form
      ref={formRef}
      className="rv-form"
      method="POST"
      action="/api/reviews"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      noValidate
    >
      {/* Honeypot: hidden from users, tempting to bots. */}
      <input
        className="rv-honeypot"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <fieldset className="rv-form-rating">
        <legend className="rv-field-label">Your rating</legend>
        <div
          className="rv-rate"
          role="radiogroup"
          tabIndex={-1}
          aria-label="Rate this product from 1 to 5 stars"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= displayRating;
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${star === 1 ? 'star' : 'stars'} — ${
                  RATING_LABELS[star - 1]
                }`}
                className={`rv-rate-star${active ? ' is-on' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onFocus={() => setHoverRating(star)}
                onBlur={() => setHoverRating(0)}
              >
                ★
              </button>
            );
          })}
          <span className="rv-rate-caption" aria-hidden="true">
            {displayRating ? RATING_LABELS[displayRating - 1] : 'Tap to rate'}
          </span>
        </div>
      </fieldset>

      <label className="rv-field">
        <span className="rv-field-label">Name</span>
        <input
          className="rv-input"
          type="text"
          name="authorName"
          required
          maxLength={80}
          autoComplete="name"
          placeholder="How should we credit you?"
        />
      </label>

      <label className="rv-field">
        <span className="rv-field-label">Your review</span>
        <textarea
          className="rv-textarea"
          name="body"
          required
          rows={4}
          maxLength={2000}
          placeholder="What did you love? How does it live in your home?"
        />
      </label>

      <div className="rv-field">
        <span className="rv-field-label">
          Photos <span className="rv-field-hint">optional · up to {MAX_REVIEW_PHOTOS}</span>
        </span>

        {photos.length > 0 ? (
          <ul className="rv-form-previews">
            {photos.map((photo) => (
              <li key={photo.id} className="rv-form-preview">
                <img src={photo.previewUrl} alt="" />
                <button
                  type="button"
                  className="rv-form-preview-remove"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove ${photo.file.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {photos.length < MAX_REVIEW_PHOTOS ? (
          <label className="rv-file">
            <input
              type="file"
              accept={REVIEW_PHOTO_CONTENT_TYPES.join(',')}
              multiple
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <span className="rv-file-cue">Add photos</span>
          </label>
        ) : null}

        {photoError ? (
          <p className="rv-field-error" role="alert">
            {photoError}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rv-form-error" id={errorId} role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="rv-form-actions">
        {onDone ? (
          <button
            type="button"
            className="rv-btn rv-btn--ghost"
            onClick={onDone}
            disabled={submitting}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="rv-btn rv-btn--primary"
          disabled={submitting || rating < 1}
          aria-describedby={serverError ? errorId : undefined}
        >
          {submitting ? 'Sending…' : 'Submit review'}
        </button>
      </div>
    </fetcher.Form>
  );
}
