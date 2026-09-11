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
    const origin = 'http://local.invalid';
    return new URL(value, origin).origin === origin;
  } catch {
    return false;
  }
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
