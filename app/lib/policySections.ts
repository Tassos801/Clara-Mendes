export type PolicySection = {id: string; title: string};

/** Fewer sections than this read fine without an "On this page" list. */
const MIN_POLICY_SECTIONS = 4;

/**
 * Gives every <h2> in a policy body an id and lists them, so a long policy
 * (the shipping policy has a dozen sections) can open with links that jump
 * to each one. Headings that already carry an id keep it. A short policy
 * comes back unchanged with no sections.
 */
export function withPolicySections(body: string): {
  body: string;
  sections: PolicySection[];
} {
  const sections: PolicySection[] = [];
  const used = new Set<string>();
  const html = body.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (match, attrs: string | undefined, inner: string) => {
      const title = decodeEntities(inner.replace(/<[^>]*>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) return match;
      const existing = attrs?.match(/\sid\s*=\s*["']([^"']+)["']/i)?.[1];
      let id = existing ?? (slugify(title) || 'section');
      if (!existing) {
        const base = id;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      }
      used.add(id);
      sections.push({id, title});
      return existing ? match : `<h2 id="${id}"${attrs ?? ''}>${inner}</h2>`;
    },
  );
  return sections.length >= MIN_POLICY_SECTIONS
    ? {body: html, sections}
    : {body, sections: []};
}

function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|#x27|apos|rsquo|lsquo);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
