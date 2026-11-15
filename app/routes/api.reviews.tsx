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

/*
 * Per-IP and per-product throttles, on top of the session check above
 * (which a client that drops the cookie skips). Like api.subscribe.tsx they
 * live in memory, per Oxygen isolate: isolates are short-lived and a
 * visitor's requests can land on different ones, so these only blunt bursts
 * from one client hitting one isolate. They are not a global rate limit;
 * moderation (every review starts DRAFT) remains the real gate.
 */
const SUBMIT_IP_LIMIT = {max: 1, windowMs: SUBMIT_COOLDOWN_MS};
// Submissions per product per isolate: each one writes a draft metaobject,
// up to MAX_REVIEW_PHOTOS uploads and a metafield rewrite.
const SUBMIT_PRODUCT_LIMIT = {max: 5, windowMs: 60 * 60_000};
const HELPFUL_IP_LIMIT = {max: 20, windowMs: 60_000};
// One helpful vote per review per IP for as long as the isolate remembers.
const HELPFUL_REVIEW_LIMIT = {max: 1, windowMs: 24 * 60 * 60_000};
// Bounds memory if an isolate sees many distinct keys.
const MAX_THROTTLE_KEYS = 5_000;

type Window = {start: number; count: number};
const throttles = {
  submitIp: new Map<string, Window>(),
  submitProduct: new Map<string, Window>(),
  helpfulIp: new Map<string, Window>(),
  helpfulReview: new Map<string, Window>(),
};

function clientIp(request: Request) {
  return (
    request.headers.get('oxygen-buyer-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/** Counts one hit for `key`; true when it is over `max` in the window. */
function throttled(
  map: Map<string, Window>,
  key: string,
  {max, windowMs}: {max: number; windowMs: number},
  now = Date.now(),
) {
  for (const [k, w] of map) if (now - w.start >= windowMs) map.delete(k);
  if (map.size >= MAX_THROTTLE_KEYS) map.clear();
  const current = map.get(key);
  if (!current) {
    map.set(key, {start: now, count: 1});
    return false;
  }
  current.count += 1;
  return current.count > max;
}

const SLOW_DOWN = 'You just submitted a review. Please wait a moment before sending another.';

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
  const ip = clientIp(request);

  try {
    if (intent === 'helpful') {
      return await handleHelpful(env, formData, ip);
    }

    if (intent === 'submit') {
      return await handleSubmit({env, session, formData, ip});
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
  ip,
}: {
  env: Route.ActionArgs['context']['env'];
  session: Route.ActionArgs['context']['session'];
  formData: FormData;
  ip: string;
}) {
  // Rate limit: one submission per session per cooldown window.
  const lastSubmittedAt = Number(session.get(RATE_LIMIT_SESSION_KEY) ?? 0);
  const now = Date.now();
  if (lastSubmittedAt && now - lastSubmittedAt < SUBMIT_COOLDOWN_MS) {
    return data({ok: false, error: SLOW_DOWN}, {status: 429});
  }
  if (throttled(throttles.submitIp, ip, SUBMIT_IP_LIMIT, now)) {
    return data({ok: false, error: SLOW_DOWN}, {status: 429});
  }

  const productId = String(formData.get('productId') ?? '').trim();
  if (!/^gid:\/\/shopify\/Product\/\d+$/.test(productId)) {
    return data({ok: false, error: 'Invalid product.'}, {status: 400});
  }
  if (throttled(throttles.submitProduct, productId, SUBMIT_PRODUCT_LIMIT, now)) {
    return data(
      {
        ok: false,
        error: 'This product has had a lot of reviews just now. Please try again later.',
      },
      {status: 429},
    );
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
  ip: string,
) {
  const reviewId = String(formData.get('reviewId') ?? '').trim();
  const now = Date.now();
  if (throttled(throttles.helpfulIp, ip, HELPFUL_IP_LIMIT, now)) {
    return data(
      {ok: false, error: 'One moment, then try again.'},
      {status: 429},
    );
  }
  if (
    throttled(throttles.helpfulReview, `${ip} ${reviewId}`, HELPFUL_REVIEW_LIMIT, now)
  ) {
    return data(
      {ok: false, error: 'Thanks, your vote is already counted.'},
      {status: 429},
    );
  }
  const result = await markReviewHelpful(env, reviewId);
  return data({
    ok: true,
    message: 'Thanks for the feedback!',
    helpfulCount: result.helpfulCount,
  });
}
