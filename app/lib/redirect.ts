import {redirect} from 'react-router';

/**
 * True only for a same-origin path such as `/collections/all?x=1#top`.
 *
 * Browsers strip ASCII tab and newline characters while parsing a URL, so
 * `/<TAB>/evil.com` resolves to `//evil.com`, and a backslash is read as a
 * slash. Rejecting control characters and backslashes anywhere, then
 * confirming the value parses against a fixed origin without leaving it,
 * closes the open redirect that a bare `startsWith('//')` check leaves open.
 */
export function isLocalPath(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (hasUnsafeUrlCharacter(value)) return false;
  try {
    return new URL(value, LOCAL_ORIGIN).origin === LOCAL_ORIGIN;
  } catch {
    return false;
  }
}

const LOCAL_ORIGIN = 'http://local.invalid';

/**
 * A local path re-serialised by the URL parser, or null when the value is
 * not local. Use this for a Location header: headers only carry Latin-1, so
 * a raw `/café` or `/€` from a query string would throw after the cart
 * mutation already ran, turning the redirect into a 500.
 */
export function toLocalPath(value: unknown): string | null {
  if (typeof value !== 'string' || !isLocalPath(value)) return null;
  const url = new URL(value, LOCAL_ORIGIN);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Appends query parameters to a local path, keeping any fragment last. */
export function withSearchParams(path: string, params: URLSearchParams) {
  const url = new URL(path, LOCAL_ORIGIN);
  for (const [key, value] of params) url.searchParams.append(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function hasUnsafeUrlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    // C0 controls (tab, newline, carriage return...), DEL, and backslash.
    if (code < 32 || code === 127 || code === 92) return true;
  }
  return false;
}

export function redirectIfHandleIsLocalized(
  request: Request,
  ...localizedResources: Array<{
    handle: string;
    data: {handle: string} & unknown;
  }>
) {
  const url = new URL(request.url);
  let shouldRedirect = false;

  localizedResources.forEach(({handle, data}) => {
    if (handle !== data.handle) {
      url.pathname = url.pathname.replace(handle, data.handle);
      shouldRedirect = true;
    }
  });

  if (shouldRedirect) {
    throw redirect(url.toString());
  }
}
