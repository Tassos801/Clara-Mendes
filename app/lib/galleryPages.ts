// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {CAPSULES} from './capsules.ts';

/**
 * Editorial content for the curated "shop by" gallery pages
 * (`/collections/<slug>`, same namespace as the capsule pages). Each page
 * targets one search intent — a palette, a style, a room, or a format — and
 * is written once, by hand: the whole point is unique indexable copy plus a
 * genuinely curated selection from the fifteen-print catalog. Nothing here
 * is templated at request time.
 *
 * Curation rule: every page must earn its keyword — at least three real
 * products, editorial that says something specific about hanging them, and
 * no near-duplicate copy between pages.
 */
export type GalleryPageContent = {
  slug: string;
  /** Title tag (brand suffix added by buildSeoMeta). */
  seoTitle: string;
  /** Meta description, tuned to 140-155 characters. */
  metaDescription: string;
  /** Line above the H1. */
  eyebrow: string;
  /** H1 — matches the page's target query. */
  title: string;
  /** Line under the H1. */
  subtitle: string;
  /** Three editorial paragraphs of unique page copy. */
  editorial: [string, string, string];
  /** Curated product handles, in display order. */
  handles: string[];
  /** Slugs of related gallery pages, shown as "keep browsing" links. */
  related: string[];
  /** Capsule slugs this edit draws from, shown as capsule cards. */
  capsules: string[];
  /** Cinematic palette for the page chrome. */
  chapter: 'linen' | 'ink' | 'umber' | 'clay';
};

const QF = ['quiet-form-i-art-print', 'quiet-form-ii-art-print', 'quiet-form-iii-art-print'];
const PB = ['patina-blue-i-art-print', 'patina-blue-ii-art-print', 'patina-blue-iii-art-print'];
const ND = ['neo-deco-i-art-print', 'neo-deco-ii-art-print', 'neo-deco-iii-art-print'];
const MG = ['midnight-garden-i-art-print', 'midnight-garden-ii-art-print', 'midnight-garden-iii-art-print'];
const SM = ['sunlit-mosaic-i-art-print', 'sunlit-mosaic-ii-art-print', 'sunlit-mosaic-iii-art-print'];

const GALLERY_PAGE_CONTENT: Record<string, GalleryPageContent> = {
  'terracotta-wall-art': {
    slug: 'terracotta-wall-art',
    seoTitle: 'Terracotta Wall Art — Warm Clay & Ochre Prints',
    metaDescription:
      'Terracotta wall art printed to order: warm clay, ochre and oat abstract prints on archival matte paper. Six curated originals in three sizes.',
    eyebrow: 'Curated by palette',
    title: 'Terracotta Wall Art',
    subtitle: 'Clay, ochre, and oat — warmth that reads as light, not colour.',
    editorial: [
      'Terracotta wall art works because the pigment behaves like late-afternoon light: it warms whatever hangs near it without demanding attention. This edit gathers the six prints in the catalog built on clay and ochre grounds — the collaged courtyard rhythms of Sunlit Mosaic and the softened architectural forms of Quiet Form — so the palette stays coherent whether you hang one print or a full wall.',
      'The two families do different jobs. Sunlit Mosaic is the livelier of the pair, breaking terracotta into torn-edge pieces with olive and a flash of cobalt; it suits kitchens, breakfast corners, and rooms with natural wood. Quiet Form holds the same warmth still — arches and grounded curves in ivory, oat, and charcoal that let a bedroom or study keep its calm.',
      'Every print is an original composition, giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Terracotta sits naturally beside linen, rattan, walnut, and unglazed ceramics; frame in raw oak or thin black depending on whether the room leans soft or graphic.',
    ],
    handles: [...SM, ...QF],
    related: ['warm-minimalist-wall-art', 'living-room-wall-art'],
    capsules: ['sunlit-mosaic', 'quiet-form'],
    chapter: 'clay',
  },
  'blue-abstract-wall-art': {
    slug: 'blue-abstract-wall-art',
    seoTitle: 'Blue Abstract Wall Art — Indigo & Cobalt Prints',
    metaDescription:
      'Blue abstract wall art in weathered indigo, cobalt and slate. Mineral-wash originals giclée-printed to order on archival matte paper, three sizes.',
    eyebrow: 'Curated by palette',
    title: 'Blue Abstract Wall Art',
    subtitle: 'Indigo, cobalt, and slate — depth without the nautical cliché.',
    editorial: [
      'Most blue wall art reaches for the sea. This edit does not. The Patina Blue capsule builds its indigo and cobalt the way weather builds patina — translucent washes settling over darker grounds, edges that look found rather than drawn — and the two Sunlit Mosaic prints included here use cobalt the opposite way, as small deliberate flashes inside a warm collage.',
      'Blue earns its keep in rooms that need lowering: a bedroom that runs hot with morning light, a hallway of doors and right angles, a study where one strong cool note stops the shelves from shouting. The mineral washes hold their depth in both bright and lamp light, so the prints do not go flat after dark the way saturated blues tend to.',
      'Each original is giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in sizes from 8 × 10 to 20 × 24 in. Pair the Patina Blue trio for a single sustained tone, or set one beside the terracotta edit and let the two temperatures argue politely across the room.',
    ],
    handles: [...PB, 'sunlit-mosaic-i-art-print', 'sunlit-mosaic-ii-art-print'],
    related: ['dark-botanical-wall-art', 'bedroom-wall-art'],
    capsules: ['patina-blue'],
    chapter: 'ink',
  },
  'geometric-wall-art': {
    slug: 'geometric-wall-art',
    seoTitle: 'Geometric Wall Art — Graphic Pattern Prints',
    metaDescription:
      'Geometric wall art printed to order: Deco-inspired black structure and warm collage rhythm. Six graphic originals on archival matte paper.',
    eyebrow: 'Curated by style',
    title: 'Geometric Wall Art',
    subtitle: 'Structure first — arcs, fans, circles, and deliberate colour.',
    editorial: [
      'Geometric wall art fails when the geometry is decoration. It holds when the shapes carry the composition — which is the standard this edit is curated to. Neo Deco strips 1920s ornament back to repeated arcs, fans, and stepped lines, black doing the structural work with oxblood, green, and muted gold appearing only where they earn a place. Sunlit Mosaic answers with softer geometry: overlapping circles and slanted bands that keep strict shapes from feeling severe.',
      'Graphic prints like these organise the busiest walls. An entryway gets a sharp first impression from a single Neo Deco panel; a dining wall takes the full trio hung with even spacing, where the repetition reads as intentional pattern. The Sunlit pieces suit rooms that want rhythm with warmth — kitchens, breakfast nooks, a hallway that needs movement.',
      'All six are original compositions, giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Thin black frames sharpen the Deco pieces; raw wood settles the warm ones. Mixing the two families works if you keep one scale and alternate temperaments.',
    ],
    handles: [...ND, ...SM],
    related: ['art-deco-prints', 'abstract-wall-art'],
    capsules: ['neo-deco', 'sunlit-mosaic'],
    chapter: 'umber',
  },
  'art-deco-prints': {
    slug: 'art-deco-prints',
    seoTitle: 'Art Deco Prints — Modern Deco Wall Art',
    metaDescription:
      'Modern Art Deco prints: black geometry with oxblood, green and muted gold. Three coordinated originals, giclée-printed on archival matte paper.',
    eyebrow: 'Curated by style',
    title: 'Art Deco Prints',
    subtitle: 'The discipline of Deco, none of its gilt excess.',
    editorial: [
      'Art Deco prints usually copy the poster era — champagne coupes, sunbursts, gold on black laid on thick. Neo Deco takes the part of the period worth keeping: its discipline. Repeated arcs, fans, and stepped lines are stripped to essentials, black carries the structure, and oxblood, green, and muted gold appear in small amounts, where a colour is doing actual work.',
      'That restraint is what lets these prints live in modern rooms. Above a console or bar cart, one panel reads as a nod to the period rather than a costume. The full trio, hung in a row with even spacing, turns a dining wall or office into deliberate pattern — the kind of repetition Deco interiors were built on, at a scale a normal wall can take.',
      'Each of the three originals is giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Frame in thin black for the full period effect, or float them in oak to pull the warmth forward. They sit comfortably beside brass, marble, and dark joinery.',
    ],
    handles: [...ND],
    related: ['geometric-wall-art', 'living-room-wall-art'],
    capsules: ['neo-deco'],
    chapter: 'umber',
  },
  'dark-botanical-wall-art': {
    slug: 'dark-botanical-wall-art',
    seoTitle: 'Dark Botanical Wall Art — Moody Floral Prints',
    metaDescription:
      'Dark botanical wall art in navy, plum, teal and copper. Moonlit layered florals, giclée-printed to order on archival matte paper in three sizes.',
    eyebrow: 'Curated by palette',
    title: 'Dark Botanical Wall Art',
    subtitle: 'Botanicals after dark — navy shadow, plum, teal, and copper.',
    editorial: [
      'Bright, literal florals are everywhere, and they all read the same. Dark botanical wall art works differently: the Midnight Garden capsule layers leaf and bloom shapes into navy shadow, letting plum, teal, and copper surface only where the moonlight lands. The result is depth rather than illustration — a garden remembered, not photographed.',
      'Moody prints do their best work in rooms used at night. A bedroom takes the softness without turning saccharine; a snug living corner or dining wall gains the kind of low-lit richness that flat white walls never manage. Warm lamplight brings the copper forward; daylight lets the navy read as near-black structure.',
      'The three originals are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Hang the set vertically in a stairwell for a slow reveal, or a single large panel above the bed. Dark frames deepen the mood; pale oak turns it gentler.',
    ],
    handles: [...MG],
    related: ['bedroom-wall-art', 'blue-abstract-wall-art'],
    capsules: ['midnight-garden'],
    chapter: 'ink',
  },
  'abstract-wall-art': {
    slug: 'abstract-wall-art',
    seoTitle: 'Abstract Wall Art Prints, Made to Order',
    metaDescription:
      'Original abstract wall art in warm neutrals, weathered blues and collage rhythm. Nine coordinated prints on archival matte paper, three sizes.',
    eyebrow: 'The core edit',
    title: 'Abstract Wall Art',
    subtitle: 'Nine originals across three temperaments — calm, cool, and warm.',
    editorial: [
      'Abstract wall art is easy to find and hard to choose, mostly because so much of it is interchangeable. This edit keeps the choice honest by reducing it to three clear temperaments: Quiet Form, warm architectural neutrals that organise a room; Patina Blue, weathered indigo washes that cool one; and Sunlit Mosaic, collage rhythms in terracotta and ochre that liven one. Every print is an original composition — no licensed stock, no recycled motifs.',
      'Choosing between them is a question about the room, not the art. Rooms that feel cluttered want Quiet Form’s stillness. Rooms that run warm — sun, timber, brick — take Patina Blue as a counterweight. Rooms that feel flat borrow energy from Sunlit Mosaic. Within each capsule the three prints share a palette, so pairs and trios coordinate without matching.',
      'All nine are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in, and dispatched within 2–4 business days. Start with the room that bothers you most, pick the temperament it lacks, and size up: almost every wall carries a larger print better than expected.',
    ],
    handles: [...QF, ...PB, ...SM],
    related: ['geometric-wall-art', 'warm-minimalist-wall-art'],
    capsules: ['quiet-form', 'patina-blue', 'sunlit-mosaic'],
    chapter: 'linen',
  },
  'living-room-wall-art': {
    slug: 'living-room-wall-art',
    seoTitle: 'Living Room Wall Art — Curated Print Edit',
    metaDescription:
      'Living room wall art chosen for sofa walls and open shelving: warm abstracts, collage rhythm and one graphic note. Printed to order, three sizes.',
    eyebrow: 'Curated by room',
    title: 'Living Room Wall Art',
    subtitle: 'For sofa walls, alcoves, and the shelf that needs an anchor.',
    editorial: [
      'The living room wall is the most public wall in the house, which is exactly why it goes wrong: art chosen to impress reads as noise within a week. This edit is curated for longevity instead. Quiet Form I and II hold a sofa wall without competing with the life in front of them; the Sunlit Mosaic trio brings rhythm to an open-plan room; a single Patina Blue or Neo Deco panel gives an alcove or console one strong note.',
      'Scale matters more than subject here. Above a standard 84-inch sofa, one 20 × 24 print centred at eye level looks deliberate; two 16 × 20s hung as a pair carry a longer wall; the 8 × 10s belong on shelves and narrow piers between windows, leaned rather than hung. Keep roughly a hand’s width between frame and sofa back, and resist centering on the wall instead of the furniture.',
      'Every print is giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. If the room already has pattern — rugs, cushions, spines of books — choose the calm end of this edit. If it is mostly sofa and plaster, let Sunlit Mosaic or Neo Deco do the talking.',
    ],
    handles: [
      'quiet-form-i-art-print',
      'quiet-form-ii-art-print',
      ...SM,
      'patina-blue-i-art-print',
      'neo-deco-i-art-print',
    ],
    related: ['terracotta-wall-art', 'wall-art-sets-of-3'],
    capsules: ['quiet-form', 'sunlit-mosaic'],
    chapter: 'linen',
  },
  'bedroom-wall-art': {
    slug: 'bedroom-wall-art',
    seoTitle: 'Bedroom Wall Art — Calm Prints for Rest',
    metaDescription:
      'Bedroom wall art in calm neutrals, weathered indigo and moonlit botanicals. Original prints on archival matte paper, made to order in three sizes.',
    eyebrow: 'Curated by room',
    title: 'Bedroom Wall Art',
    subtitle: 'Art that lowers the temperature of the last room you see.',
    editorial: [
      'Bedroom wall art has one job the rest of the house does not: it has to be good at night. Everything in this edit was chosen for how it behaves in lamplight. Quiet Form’s ivory-and-oat architecture stays soft at low brightness; Patina Blue’s indigo washes deepen rather than disappear; Midnight Garden was composed for the dark in the first place — botanicals surfacing out of navy shadow.',
      'The classic positions all work here. Above the headboard, one wide print (16 × 20 or 20 × 24) centred on the bed rather than the wall; over a dresser, a smaller pair hung close so they read as one object; on the wall you face from the pillow, choose the piece you want to see first in the morning — this edit’s calmest, not its darkest.',
      'Each original is giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. Skip glass-free frames near radiators, keep frames matte, and if the room is small, hang one good print instead of three adequate ones. Calm is a subtraction exercise.',
    ],
    handles: [
      ...QF,
      'patina-blue-i-art-print',
      'patina-blue-iii-art-print',
      'midnight-garden-i-art-print',
      'midnight-garden-ii-art-print',
    ],
    related: ['dark-botanical-wall-art', 'warm-minimalist-wall-art'],
    capsules: ['quiet-form', 'patina-blue', 'midnight-garden'],
    chapter: 'ink',
  },
  'wall-art-sets-of-3': {
    slug: 'wall-art-sets-of-3',
    seoTitle: 'Wall Art Sets of 3 — Coordinated Print Trios',
    metaDescription:
      'Wall art sets of 3, composed together rather than matched afterwards: five coordinated trios of original prints on archival matte paper.',
    eyebrow: 'Curated by format',
    title: 'Wall Art Sets of 3',
    subtitle: 'Five trios composed together — not three prints that merely match.',
    editorial: [
      'Most wall art sets of 3 are one image cut into thirds, or three strangers in the same colourway. Every set here was composed as a trio from the start: each capsule’s three originals share a palette and a vocabulary of shapes, so they coordinate the way movements of the same piece of music do — related, not repeated. The five lead prints below open each set; the full trio is one click deeper.',
      'Three is the most forgiving number a wall can take. A strict row with even spacing suits Neo Deco’s geometry and Quiet Form’s architecture; a loose cluster lets Sunlit Mosaic’s collage idea carry; a vertical stack gives Patina Blue or Midnight Garden a slow reveal up a stairwell. Keep gaps consistent — about a hand’s width — and treat the trio’s outer edges as one frame when centering.',
      'All fifteen prints are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Buying a set staggered is fine: each capsule is designed so one print stands alone until its companions arrive.',
    ],
    handles: [
      'quiet-form-i-art-print',
      'patina-blue-i-art-print',
      'neo-deco-i-art-print',
      'midnight-garden-i-art-print',
      'sunlit-mosaic-i-art-print',
    ],
    related: ['living-room-wall-art', 'abstract-wall-art'],
    capsules: ['quiet-form', 'patina-blue', 'neo-deco', 'midnight-garden', 'sunlit-mosaic'],
    chapter: 'linen',
  },
  'warm-minimalist-wall-art': {
    slug: 'warm-minimalist-wall-art',
    seoTitle: 'Warm Minimalist Wall Art — Neutral Prints',
    metaDescription:
      'Warm minimalist wall art in ivory, oat, terracotta and charcoal. Quiet architectural prints made to order on archival matte paper, three sizes.',
    eyebrow: 'Curated by style',
    title: 'Warm Minimalist Wall Art',
    subtitle: 'Minimal without the chill — neutrals that carry actual warmth.',
    editorial: [
      'Minimalist wall art has a coldness problem: grey abstracts and thin line drawings that make a room feel staged rather than lived in. This edit takes the other route. Quiet Form’s arches and grounded curves are minimal in structure but warm in material — ivory, oat, terracotta, charcoal — and the two Sunlit Mosaic pieces included here add just enough rhythm to keep restraint from tipping into emptiness.',
      'The pieces suit the rooms minimalism actually lives in: a study that needs order, a hallway that should breathe, a bedroom pared back to essentials. Because the palette stays within a hand-span of warmth, any two prints from this page hang together without planning — the discipline is built into the compositions, not imposed by the frame.',
      'Each print is an original, giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper, in 8 × 10, 16 × 20, and 20 × 24 in. Wide mats and pale frames push these further toward gallery quiet; frameless rails or oak edges keep them domestic. Either way, give them margin — warm minimalism is mostly generous spacing.',
    ],
    handles: [...QF, 'sunlit-mosaic-i-art-print', 'sunlit-mosaic-iii-art-print'],
    related: ['terracotta-wall-art', 'bedroom-wall-art'],
    capsules: ['quiet-form', 'sunlit-mosaic'],
    chapter: 'linen',
  },
};

export type GalleryPage = GalleryPageContent;

export function getGalleryPage(slug?: string | null): GalleryPage | null {
  if (!slug) return null;
  return GALLERY_PAGE_CONTENT[slug.trim().toLowerCase()] ?? null;
}

export function listGalleryPages(): GalleryPage[] {
  return Object.values(GALLERY_PAGE_CONTENT);
}

export function galleryPagePath(slug: string) {
  return `/collections/${slug}`;
}

/**
 * Storefront `products(query:)` clause covering a gallery page's curated
 * handles. Handle is not a searchable product field, so the query selects
 * the capsule tags the handles span; the loader then filters and orders by
 * the curated handle list.
 */
export function buildGalleryTagQuery(page: GalleryPage) {
  const titles = new Set<string>();
  for (const capsule of CAPSULES) {
    if (capsule.handles.some((handle) => page.handles.includes(handle))) {
      titles.add(capsule.title);
    }
  }
  return [...titles].map((title) => `tag:"${title}"`).join(' OR ');
}
