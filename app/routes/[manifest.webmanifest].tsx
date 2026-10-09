import {webManifest} from '~/lib/webManifest';

export function loader() {
  return new Response(JSON.stringify(webManifest()), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
