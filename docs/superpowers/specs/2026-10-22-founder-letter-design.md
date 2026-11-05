# Founder letter on Our Story design

Approved by the owner on 2026-10-22. It covers item 2 of the 2026-10-22 site review: the site never said who is behind the name.

## Facts (the only ones the copy may use)

- "Clara Mendes" is a brand name. The shop is run by **Tassos Dimitriou** from **Nicosia, Cyprus**.
- The work of our own is composed digitally, edited, selected and prepared for print by the owner. The page does not name tools and never claims "painted" or "drawn by hand". The owner's instruction: no mention of AI anywhere.
- The arc is already public: fifteen prints in five capsules first; then phone cases, clothing, pastel pots, book nooks, museum reproductions; "we don't know what we'll make next".
- Portrait: the owner's photo, cropped head-and-shoulders (`public/images/our-story/tassos-dimitriou.webp`, 640 × 800).

## Scope

Our Story only. No signature on the homepage, no footer line (owner's choice).

## The section

Inserted in `app/routes/our-story.tsx` directly after the hero (`.os-hero`) and before "The capsules" (`#os-collection`), so the scroll cue "Read the story" lands on it: change the cue's `href` to `#os-letter`.

```
<section id="os-letter" class="os-section os-section--letter" aria-labelledby="os-letter-title">
  <figure class="os-letter-portrait">
    <img src="/images/our-story/tassos-dimitriou.webp" width=640 height=800 loading="lazy" alt="Tassos Dimitriou, who runs Clara Mendes, smiling in front of a bookshelf">
  </figure>
  <div class="os-letter-copy">
    <p class="os-eyebrow">The person behind the name</p>
    <h2 id="os-letter-title">A letter from Nicosia.</h2>
    <p>…</p> × 4
    <p class="os-letter-sign">— Tassos</p>
  </div>
</section>
```

Copy, verbatim, from a new `BRAND.letter` object in `app/content/brand.ts` (`eyebrow`, `title`, `paragraphs: string[]`, `signature`, `portraitAlt`):

> **The person behind the name**
> **A letter from Nicosia.**
>
> Clara Mendes is a name I chose for a feeling, not a person. I'm Tassos Dimitriou, and I run it from Nicosia.
>
> It began with fifteen prints, five small families of three, made because I wanted walls that felt calm and alive at the same time. I compose each piece on screen, live with it for a while, edit, set most of it aside, and prepare the few that survive for paper that does them justice.
>
> Then it got interesting. The same eye went onto phone cases, a tank top, four pastel pots, a shelf of tiny worlds, and a borrowed wave from Hokusai. Every product page tells you how a thing is made and how it reaches you.
>
> I don't know what we'll make next. I know it will be chosen with care, printed to order, and never boring.
>
> — Tassos

Layout: two columns on desktop (portrait `minmax(240px, 0.8fr)`, copy `1.2fr`, `align-items: start`, gap `clamp(28px, 5vw, 72px)`), portrait with the page's existing soft radius and a `4 / 5` aspect; stacked on ≤820px with the portrait first at `max-width: 320px`. Typography follows the page: eyebrow `.os-eyebrow`, `h2` like the other `.os-section` headings, paragraphs at the section's lede size with `max-width: 60ch`, signature in the serif italic. Paragraph keys are the paragraph text.

## Structured data

`app/routes/our-story.tsx` already renders `StructuredData`. Add a `Person` node for the founder (`name: 'Tassos Dimitriou'`, `jobTitle: 'Founder'`, `worksFor: {'@type': 'Organization', name: 'Clara Mendes', url: STOREFRONT_ORIGIN}`, `image: <absolute portrait URL>`, `address: {'@type': 'PostalAddress', addressLocality: 'Nicosia', addressCountry: 'CY'}`), and add `founder: {'@type': 'Person', name: 'Tassos Dimitriou'}` to `organizationSchema` in `app/lib/seo.ts`.

Meta description of Our Story stays as it is.

## Tests and verification

- `scripts/brand.node-test.mjs`: `BRAND.letter` has four paragraphs, the signature, and none of the banned claims; the guard already scans `app/`.
- A source assertion in `scripts/brand.node-test.mjs` (or a new small test) that `our-story.tsx` renders `BRAND.letter.paragraphs` and the portrait path exists on disk.
- Typecheck, lint; dev-server captures at 1440 and 375 of the letter section; live check after merge.

## Out of scope

Homepage and footer mentions, product pages, the journal, a separate /about route.
