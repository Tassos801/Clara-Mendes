export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside an open modal dialog instead of letting
 * focus walk into the page hidden under its scrim. Call from a keydown
 * handler when `event.key === 'Tab'`.
 */
export function keepTabInside(event: KeyboardEvent, container: HTMLElement) {
  const focusable = [
    ...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ].filter((element) => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!first || !last) {
    event.preventDefault();
    container.focus();
  } else if (
    event.shiftKey &&
    (active === first || !container.contains(active))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (active === last || !container.contains(active))
  ) {
    event.preventDefault();
    first.focus();
  }
}
