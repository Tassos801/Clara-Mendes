// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {CAPSULES, type Capsule} from './capsules.ts';

/**
 * Editorial content for the five capsule landing pages
 * (`/collections/<slug>`). These pages are storefront-rendered from the
 * sync-guaranteed capsule tags, so they exist independently of Shopify
 * collections. Each entry is written once, by hand — the whole point of the
 * pages is unique indexable copy, so nothing here is generated from
 * templates at request time.
 */
export type CapsulePageContent = {
  slug: string;
  /** Title tag (brand suffix added by buildSeoMeta). */
  seoTitle: string;
  /** Meta description, tuned to 140-155 characters. */
  metaDescription: string;
  /** Line under the H1. */
  subtitle: string;
  /** Two editorial paragraphs of unique page copy. */
  editorial: [string, string];
  /** One-sentence version used on product pages, linking back here. */
  pdpBlurb: string;
};

const CAPSULE_PAGE_CONTENT: Record<string, CapsulePageContent> = {
  'quiet-form': {
    slug: 'quiet-form',
    seoTitle: 'Quiet Form — Architectural Abstract Art Prints',
    metaDescription:
      'Three coordinated abstract art prints in ivory, oat, terracotta and charcoal. Warm architectural forms, giclée-printed to order on archival matte paper.',
    subtitle:
      'Warm architectural forms in ivory, oat, terracotta, and charcoal.',
    editorial: [
      'Quiet Form is built from arches, columns, and grounded curves — the shapes buildings rest on, softened into warm neutrals. Ivory and oat carry the light; terracotta and charcoal give each composition its weight. The result reads as calm rather than empty: abstract wall art that organises a room instead of decorating it.',
      'The capsule holds three original works, giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. Hang one 8 × 10 print alone above a desk or reading chair, or run all three in a row for a gallery wall that stays quiet in a living room, bedroom, or study.',
    ],
    pdpBlurb:
      'Part of Quiet Form — three warm architectural compositions designed to hang alone or as a set.',
  },
  'patina-blue': {
    slug: 'patina-blue',
    seoTitle: 'Patina Blue — Indigo & Cobalt Abstract Prints',
    metaDescription:
      'Three coordinated abstract prints in weathered indigo, cobalt and slate. Mineral-wash textures, giclée-printed to order on archival matte art paper.',
    subtitle:
      'Weathered indigo, cobalt, slate, and translucent mineral washes.',
    editorial: [
      'Patina Blue works the way weather works on paint: in layers. Translucent mineral washes settle over indigo and cobalt grounds, leaving edges that look found rather than drawn. It is blue wall art without the nautical cliché — closer to oxidised metal and sea-worn shutters than to anything themed.',
      'The three prints are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. The palette holds its depth in both bright and low light, which makes the set easy to place: a bedroom that needs calm, a hallway that needs interest, or a study that needs one strong, cool note.',
    ],
    pdpBlurb:
      'Part of Patina Blue — three layered indigo compositions with weathered, mineral-wash texture.',
  },
  'neo-deco': {
    slug: 'neo-deco',
    seoTitle: 'Neo Deco — Graphic Geometric Art Deco Prints',
    metaDescription:
      'Three coordinated geometric art prints — black structure with oxblood, green and muted gold. Deco-inspired originals, giclée-printed on archival paper.',
    subtitle: 'Graphic black geometry with oxblood, green, and muted gold.',
    editorial: [
      'Neo Deco borrows the discipline of 1920s ornament — repeated arcs, fans, and stepped lines — and strips it back to essentials. Black does the structural work; oxblood, green, and muted gold appear only where they earn their place. The result is geometric wall art with the confidence of Art Deco and none of its gilt excess.',
      'All three originals are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. One print gives an entryway or office a sharp focal point; the trio, hung with even spacing, turns a dining wall into deliberate pattern. Frame in thin black for the full period effect.',
    ],
    pdpBlurb:
      'Part of Neo Deco — three graphic compositions of black geometry with oxblood, green, and gold.',
  },
  'midnight-garden': {
    slug: 'midnight-garden',
    seoTitle: 'Midnight Garden — Dark Botanical Art Prints',
    metaDescription:
      'Three coordinated dark botanical prints in navy, plum, teal and copper. Moonlit layered florals, giclée-printed to order on archival matte paper.',
    subtitle: 'Layered moonlit botanicals in navy, plum, teal, and copper.',
    editorial: [
      'Midnight Garden is botanical art after dark: leaf and bloom shapes layered into navy shadow, with plum, teal, and copper surfacing where the moonlight lands. Instead of the bright, literal florals most botanical prints repeat, these read as depth — a garden remembered rather than photographed.',
      'The capsule’s three originals are giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. Dark art prints do their best work in rooms with warm lamps and evening use: bedrooms, snug living corners, a moody dining wall. Hang the set vertically in a stairwell for a slow reveal.',
    ],
    pdpBlurb:
      'Part of Midnight Garden — three moonlit botanical layers in navy, plum, teal, and copper.',
  },
  'sunlit-mosaic': {
    slug: 'sunlit-mosaic',
    seoTitle: 'Sunlit Mosaic — Terracotta Collage Art Prints',
    metaDescription:
      'Three coordinated collage-style prints in terracotta, ochre, olive and cobalt. Warm Mediterranean rhythm, giclée-printed on archival matte art paper.',
    subtitle: 'Warm collage rhythms in terracotta, ochre, olive, and cobalt.',
    editorial: [
      'Sunlit Mosaic assembles torn-edge shapes the way strong afternoon light breaks a courtyard into pieces: terracotta and ochre doing the warmth, olive steadying it, cobalt appearing in small, deliberate flashes. It is the most rhythmic of the five capsules — collage wall art that keeps a room lively without shouting.',
      'Each of the three originals is giclée-printed to order in archival pigment inks on 200gsm Enhanced Matte Art paper. The warm palette flatters kitchens, breakfast corners, and any room with natural wood; hang the trio in a loose cluster rather than a strict row to let the mosaic idea carry.',
    ],
    pdpBlurb:
      'Part of Sunlit Mosaic — three warm collage compositions in terracotta, ochre, olive, and cobalt.',
  },
};

export type CapsulePage = CapsulePageContent & {capsule: Capsule};

export function getCapsulePage(slug?: string | null): CapsulePage | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  const content = CAPSULE_PAGE_CONTENT[normalized];
  const capsule = CAPSULES.find((entry) => entry.slug === normalized);
  if (!content || !capsule) return null;
  return {...content, capsule};
}

export function listCapsulePages(): CapsulePage[] {
  return CAPSULES.map((capsule) => ({
    ...CAPSULE_PAGE_CONTENT[capsule.slug],
    capsule,
  })).filter((page) => Boolean(page.slug));
}

export function capsulePagePath(slug: string) {
  return `/collections/${slug}`;
}
