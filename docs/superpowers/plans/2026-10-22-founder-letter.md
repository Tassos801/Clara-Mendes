# Founder Letter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the person behind the brand on Our Story: a portrait and a first-person letter from Tassos Dimitriou, Nicosia, directly after the hero.

**Architecture:** Copy lives in `BRAND.letter` (`app/content/brand.ts`); `app/routes/our-story.tsx` renders it as a new `.os-section--letter` with the page's own CSS-in-JS; the page's `StructuredData` gains a `Person`, and `organizationSchema` a `founder`. One test in `scripts/brand.node-test.mjs` pins the copy and the portrait file.

**Tech Stack:** Hydrogen / React Router 7, TypeScript, Node `node --test` scripts (relative `.ts` imports).

**Spec:** `docs/superpowers/specs/2026-10-22-founder-letter-design.md`. **Worktree:** `C:\Users\admin\Desktop\Mine\shopify\clara-wt-brand`, branch `claude/founder-letter` (HEAD `38383d1`, portrait already committed at `public/images/our-story/tassos-dimitriou.webp`, 640 × 800).

---

### Task 1: Copy, section, schema, test

**Files:**
- Modify: `app/content/brand.ts` (add `letter` after `curiosity`)
- Modify: `app/routes/our-story.tsx` (section after the hero, scroll-cue target, CSS, Person schema)
- Modify: `app/lib/seo.ts` (`organizationSchema` founder)
- Test: `scripts/brand.node-test.mjs`

- [ ] **Step 1: Failing test**

Append to `scripts/brand.node-test.mjs` (the file already imports `assert`, `test`, `BRAND`, `readFileSync`, `path`, `ROOT`):

```js
test('the founder letter is complete and the portrait exists', () => {
  assert.equal(BRAND.letter.title, 'A letter from Nicosia.');
  assert.equal(BRAND.letter.paragraphs.length, 4);
  assert.match(BRAND.letter.paragraphs[0], /Tassos Dimitriou/);
  assert.equal(BRAND.letter.signature, '— Tassos');
  assert.ok(BRAND.letter.portraitAlt.length > 10);
  const text = JSON.stringify(BRAND.letter);
  assert.doesNotMatch(text, /\bAI\b|artificial|generated|painted|hand-drawn/i);
  assert.ok(
    statSync(path.join(ROOT, 'public', BRAND.letter.portrait)).size > 10_000,
    'portrait file exists',
  );
  const story = readFileSync(path.join(ROOT, 'app/routes/our-story.tsx'), 'utf8');
  assert.match(story, /BRAND\.letter\.paragraphs\.map/);
  assert.match(story, /href="#os-letter"/);
  assert.match(story, /'@type': 'Person'/);
});
```

`statSync` is already imported for the guard; if not, add it to the `node:fs` import.

Run: `node --test scripts/brand.node-test.mjs` → FAIL (`BRAND.letter` undefined).

- [ ] **Step 2: Copy**

In `app/content/brand.ts`, after the `curiosity` object:

```ts
  letter: {
    eyebrow: 'The person behind the name',
    title: 'A letter from Nicosia.',
    paragraphs: [
      "Clara Mendes is a name I chose for a feeling, not a person. I'm Tassos Dimitriou, and I run it from Nicosia.",
      'It began with fifteen prints, five small families of three, made because I wanted walls that felt calm and alive at the same time. I compose each piece on screen, live with it for a while, edit, set most of it aside, and prepare the few that survive for paper that does them justice.',
      'Then it got interesting. The same eye went onto phone cases, a tank top, four pastel pots, a shelf of tiny worlds, and a borrowed wave from Hokusai. Every product page tells you how a thing is made and how it reaches you.',
      "I don't know what we'll make next. I know it will be chosen with care, printed to order, and never boring.",
    ],
    signature: '— Tassos',
    /** Site-relative; 640 × 800 head-and-shoulders crop supplied by the owner. */
    portrait: '/images/our-story/tassos-dimitriou.webp',
    portraitAlt:
      'Tassos Dimitriou, who runs Clara Mendes, smiling in front of a bookshelf',
    founder: {name: 'Tassos Dimitriou', city: 'Nicosia', country: 'CY'},
  },
```

- [ ] **Step 3: Section**

In `app/routes/our-story.tsx`: change the scroll cue `href="#os-collection"` to `href="#os-letter"`. Insert directly after the hero's closing `</section>` and before `<section id="os-collection"`:

```tsx
      <section
        id="os-letter"
        className="os-section os-section--letter"
        aria-labelledby="os-letter-title"
      >
        <figure className="os-letter-portrait">
          <img
            alt={BRAND.letter.portraitAlt}
            decoding="async"
            height={800}
            loading="lazy"
            src={BRAND.letter.portrait}
            width={640}
          />
        </figure>
        <div className="os-letter-copy">
          <p className="os-eyebrow">{BRAND.letter.eyebrow}</p>
          <h2 id="os-letter-title">{BRAND.letter.title}</h2>
          {BRAND.letter.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="os-letter-sign">{BRAND.letter.signature}</p>
        </div>
      </section>
```

Add to the `StructuredData` `data` array:

```tsx
          {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: BRAND.letter.founder.name,
            jobTitle: 'Founder',
            image: `${STOREFRONT_ORIGIN}${BRAND.letter.portrait}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: BRAND.letter.founder.city,
              addressCountry: BRAND.letter.founder.country,
            },
            worksFor: {
              '@type': 'Organization',
              name: 'Clara Mendes',
              url: STOREFRONT_ORIGIN,
            },
          },
```

- [ ] **Step 4: CSS** (in `ourStoryCss`, after the `.os-section-lede` rule)

```css
.os-section--letter {
  align-items: start;
  display: grid;
  gap: clamp(28px, 5vw, 72px);
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.2fr);
}

.os-letter-portrait {
  margin: 0;
}

.os-letter-portrait img {
  aspect-ratio: 4 / 5;
  border-radius: 10px;
  display: block;
  height: auto;
  object-fit: cover;
  width: 100%;
}

.os-letter-copy p:not(.os-eyebrow) {
  color: var(--os-muted);
  font-size: 1.06rem;
  line-height: 1.75;
  margin: 0 0 1.15em;
  max-width: 60ch;
}

.os-letter-copy .os-letter-sign {
  color: inherit;
  font-family: var(--os-font-serif);
  font-size: 1.3rem;
  font-style: italic;
  margin-top: 1.6em;
}
```

In the `@media (max-width: 768px)` block (change its query is not needed; add inside it):

```css
  .os-section--letter {
    grid-template-columns: 1fr;
  }

  .os-letter-portrait {
    max-width: 320px;
  }
```

Check the page's variables: use whatever the file already names for muted text (`--os-muted` or `--os-text-muted`) and the serif font (`--os-font-serif`); match the existing rules, do not invent new variables.

- [ ] **Step 5: Organization founder**

In `app/lib/seo.ts`, `organizationSchema` returns `founder: {'@type': 'Person', name: 'Tassos Dimitriou'}` too. Import nothing new; the literal is fine (seo.ts already imports `BRAND`, so `BRAND.letter.founder.name` is also acceptable).

- [ ] **Step 6: Verify and commit**

Run: `node --test scripts/brand.node-test.mjs scripts/liquidGlass.node-test.mjs` → PASS; `npm run typecheck`; `npm run lint`.

```bash
git add app/content/brand.ts app/routes/our-story.tsx app/lib/seo.ts scripts/brand.node-test.mjs
git commit -m "Put the person behind the name on Our Story

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Sweep and PR (coordinator)

Dev-server captures at 1440 and 375 of `/our-story` (letter visible under the hero, "Read the story" lands on it, Person JSON-LD present), then push and `gh pr create` against `main`; after merge, live check.
