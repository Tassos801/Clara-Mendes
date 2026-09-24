const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * One formatter per zone: building one costs far more than using it. The
 * cache is cleared past a few dozen zones so odd inputs (any capitalisation
 * of a zone id is valid) can't grow it without bound.
 */
function formatterFor(tz: string) {
  let formatter = formatters.get(tz);
  if (!formatter) {
    if (formatters.size >= 64) formatters.clear();
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, formatter);
  }
  return formatter;
}

/** Offset (minutes east of UTC) that `tz` applies at the instant `utcMs`. */
export function tzOffsetMinutes(utcMs: number, tz: string) {
  const parts = Object.fromEntries(
    formatterFor(tz)
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * Wall-clock date/time at a place → UTC instant. Two passes so the offset
 * is evaluated at the instant itself (handles DST transitions).
 */
export function localToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let utc = guess - tzOffsetMinutes(guess, tz) * 60000;
  utc = guess - tzOffsetMinutes(utc, tz) * 60000;
  return new Date(utc);
}
