import {INDEXNOW_KEY} from '~/lib/indexNow';

/** The IndexNow key file (app/lib/indexNow.ts): the key, as plain text. */
export function loader() {
  return new Response(INDEXNOW_KEY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `public, max-age=${60 * 60 * 24}`,
    },
  });
}
