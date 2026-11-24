/**
 * Product cards set the first word of a title in italics: the start of an
 * artwork or design name ("*Where* Mist Rests Art Print", "*Counter-Diagonal*
 * Tee"). Titles that open with a plain product word have no artwork name to
 * mark ("Art Tough Phone Case", "Fine Art Postcard"), so they stay upright.
 */
const GENERIC_LEAD_WORDS = new Set([
  'art',
  'classic',
  'fine',
  'gift',
  'stretched',
]);

export function cardTitleParts(title: string): {
  lead: string | null;
  rest: string;
} {
  const trimmed = title.trim();
  const space = trimmed.indexOf(' ');
  const first = space === -1 ? trimmed : trimmed.slice(0, space);
  if (!first || GENERIC_LEAD_WORDS.has(first.toLowerCase())) {
    return {lead: null, rest: trimmed};
  }
  return {lead: first, rest: space === -1 ? '' : trimmed.slice(space)};
}
