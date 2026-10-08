/**
 * Quiet Current activewear descriptions are written in Shopify as structured
 * HTML: an intro paragraph, a feature list, fabric and care paragraphs, a
 * "Body size guide" table, then fit and made-to-order notes. The plain-text
 * `description` Shopify derives from it runs those blocks together, so the
 * PDP reads `descriptionHtml` and renders each part in its own place.
 *
 * Output is plain text and string cells only (no HTML is rendered), so
 * merchant markup can never inject anything into the page.
 */
export type ApparelSizeGuide = {headers: string[]; rows: string[][]};

export type ApparelCopy = {
  lede: string;
  features: string[];
  fabricAndCare: string[];
  sizeGuide: ApparelSizeGuide | null;
  fitNotes: string[];
  madeToOrder: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  sup2: '²',
};

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (match, code: string) => {
      if (code[0] === '#') {
        const n =
          code[1].toLowerCase() === 'x'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function cells(rowHtml: string, tag: 'th' | 'td') {
  return [
    ...rowHtml.matchAll(
      new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'),
    ),
  ].map((match) => htmlToText(match[1]));
}

function parseTable(tableHtml: string): ApparelSizeGuide | null {
  const rowsHtml = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (match) => match[1],
  );
  const headers =
    rowsHtml.map((row) => cells(row, 'th')).find((r) => r.length) ?? [];
  const rows = rowsHtml.map((row) => cells(row, 'td')).filter((r) => r.length);
  if (!rows.length) return null;
  return {headers, rows};
}

/** Returns null when the HTML has no intro paragraph to lead with. */
export function parseApparelDescription(
  html?: string | null,
): ApparelCopy | null {
  if (!html) return null;
  const blocks = [
    ...html.matchAll(/<(p|ul|ol|table|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi),
  ].map((match) => ({tag: match[1].toLowerCase(), inner: match[2]}));

  const copy: ApparelCopy = {
    lede: '',
    features: [],
    fabricAndCare: [],
    sizeGuide: null,
    fitNotes: [],
    madeToOrder: null,
  };
  let afterTable = false;
  for (const block of blocks) {
    if (block.tag === 'ul' || block.tag === 'ol') {
      if (!copy.features.length) {
        copy.features = [
          ...block.inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi),
        ]
          .map((match) => htmlToText(match[1]))
          .filter(Boolean);
      }
      continue;
    }
    if (block.tag === 'table') {
      copy.sizeGuide ??= parseTable(block.inner);
      afterTable = true;
      continue;
    }
    if (block.tag !== 'p') continue; // headings are replaced by the PDP's own labels
    const text = htmlToText(block.inner);
    if (!text) continue;
    if (!copy.lede) {
      copy.lede = text;
    } else if (/^made to order\b/i.test(text)) {
      copy.madeToOrder = text;
    } else if (afterTable) {
      copy.fitNotes.push(text);
    } else {
      copy.fabricAndCare.push(text);
    }
  }
  return copy.lede ? copy : null;
}
