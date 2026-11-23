/**
 * HEAD for the files in public/.
 *
 * Oxygen serves those files itself, before the app, but only for GET. A HEAD
 * request for one reaches the app, which has no such route and answered 404:
 * `curl -I /favicon.ico` said "not found" for a file that exists. Link
 * checkers, some crawlers and some asset fetchers ask with HEAD first.
 *
 * The app cannot read the files, but it can GET them from its own origin
 * (the PDF routes load their fonts and plates the same way), so a HEAD is
 * answered with the status and headers of that GET and no body.
 */

/**
 * The top-level entries of public/. Only these paths can name a public file;
 * scripts/publicFileHead.node-test.mjs fails when the folder and this list
 * differ.
 */
export const PUBLIC_FILE_ROOTS: readonly string[] = [
  '/favicon.ico',
  '/fonts/',
  '/icons/',
  '/images/',
  '/print-files/',
  '/sky/',
];

export function isPublicFilePath(pathname: string): boolean {
  return PUBLIC_FILE_ROOTS.some((root) =>
    root.endsWith('/')
      ? pathname.startsWith(root) && pathname.length > root.length
      : pathname === root,
  );
}

/**
 * The answer to a HEAD request for a public file, or null when the request
 * is something else or the file does not exist (the caller then keeps its
 * own 404). The GET is a different method, so this cannot call itself.
 */
export async function headForPublicFile(
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<Response | null> {
  if (request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (!isPublicFilePath(url.pathname)) return null;
  try {
    const file = await fetcher(url.toString(), {method: 'GET'});
    // Only the headers are needed; do not download the file.
    await file.body?.cancel();
    if (!file.ok) return null;
    return new Response(null, {status: file.status, headers: file.headers});
  } catch {
    return null;
  }
}
