import {data} from 'react-router';
import type {Route} from './+types/api.reviews';
import {MAX_REVIEW_PHOTOS} from '~/lib/reviewTypes';
import {
  markReviewHelpful,
  ReviewsNotConfiguredError,
  ReviewValidationError,
  submitReview,
} from '~/lib/reviews.server';

// Minimum gap between two review submissions from the same session.
const SUBMIT_COOLDOWN_MS = 60_000;
const RATE_LIMIT_SESSION_KEY = 'reviewLastSubmittedAt';

const NOT_CONFIGURED_MESSAGE =
  'Reviews are not enabled yet — check back soon.';

/**
 * Resource route backing the product-review form. POST only; the loader
 * rejects GET so the route is not accidentally rendered.
 */
export async function loader() {
  throw new Response('Method Not Allowed', {status: 405});
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({ok: false, error: 'Method Not Allowed'}, {status: 405});
  }

  const {env, session} = context;
  const formData = await request.formData();

  // Honeypot: bots fill hidden fields. Pretend success and do nothing.
  const honeypot = formData.get('website');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return data({ok: true, message: 'Thanks for your review!'});
  }

  const intent = formData.get('intent');

  try {
    if (intent === 'helpful') {
      return await handleHelpful(env, formData);
    }

    if (intent === 'submit') {
      return await handleSubmit({env, session, formData});
    }

    return data({ok: false, error: 'Unknown intent.'}, {status: 400});
  } catch (error) {
    if (error instanceof ReviewsNotConfiguredError) {
      return data({ok: false, error: NOT_CONFIGURED_MESSAGE}, {status: 503});
    }
    if (error instanceof ReviewValidationError) {
      return data({ok: false, error: error.message}, {status: 400});
    }

    console.error('Review action failed.', error);
    return data(
      {ok: false, error: 'Something went wrong. Please try again.'},
      {status: 500},
    );
  }
}

async function handleSubmit({
  env,
  session,
  formData,
}: {
  env: Route.ActionArgs['context']['env'];
  session: Route.ActionArgs['context']['session'];
  formData: FormData;
}) {
  // Rate limit: one submission per session per cooldown window.
  const lastSubmittedAt = Number(session.get(RATE_LIMIT_SESSION_KEY) ?? 0);
  const now = Date.now();
  if (lastSubmittedAt && now - lastSubmittedAt < SUBMIT_COOLDOWN_MS) {
    return data(
      {
        ok: false,
        error: 'You just submitted a review. Please wait a moment before sending another.',
      },
      {status: 429},
    );
  }

  const productId = String(formData.get('productId') ?? '').trim();
  if (!/^gid:\/\/shopify\/Product\/\d+$/.test(productId)) {
    return data({ok: false, error: 'Invalid product.'}, {status: 400});
  }

  const rating = Number.parseInt(String(formData.get('rating') ?? ''), 10);
  const authorName = String(formData.get('authorName') ?? '');
  const body = String(formData.get('body') ?? '');
  const photos = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_REVIEW_PHOTOS);

  await submitReview(env, {
    productGid: productId,
    rating,
    authorName,
    body,
    photos,
  });

  // Record the timestamp so the server persists it via Set-Cookie.
  session.set(RATE_LIMIT_SESSION_KEY, now);

  return data({
    ok: true,
    message: 'Thanks! Your review will appear once it is approved.',
  });
}

async function handleHelpful(
  env: Route.ActionArgs['context']['env'],
  formData: FormData,
) {
  const reviewId = String(formData.get('reviewId') ?? '').trim();
  const result = await markReviewHelpful(env, reviewId);
  return data({
    ok: true,
    message: 'Thanks for the feedback!',
    helpfulCount: result.helpfulCount,
  });
}
