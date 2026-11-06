/**
 * Garment colours: the swatch for a fabric colour name, and which product
 * images show which colour. Shared by the /clothing cards and the product
 * page, so a colour looks the same in both.
 *
 * A Shopify swatch on the option value always wins (clothingPresentation's
 * clothingSwatchBackground). Printful-made products carry none, so the dot
 * comes from the fabric's name.
 */

/** "Colour", "Color" or "Colourway": the option that picks a fabric colour. */
export const COLOUR_OPTION_PATTERN = /^(colou?r|colou?rway)$/i;

export function isColourOptionName(name?: string | null) {
  return COLOUR_OPTION_PATTERN.test(name?.trim() ?? '');
}

/**
 * Hand-picked swatches, checked against the real fabric. They win over the
 * catalog value below. Add a line when a catalog hex reads wrong on screen.
 */
const PICKED_HEX: Record<string, string> = {};

/**
 * Printful's own catalog hex for each fabric colour name, from
 * `GET /v2/catalog-products/{id}` (`colors[].value`), read 2026-11-06 for the
 * Counter-Diagonal blanks: Bella+Canvas 4719 (892) and 4711 (897), Cotton
 * Heritage M2580 (380), AS Colour 5082 (713), Comfort Colors 1717 (586),
 * Bella+Canvas 3501 (356), Econscious EC7000 (491), AS Colour 1120 (809) and
 * Stanley/Stella STAU117 (1641). Where blanks share a name, the first blank
 * in that list gives the hex. Keys are lower case.
 */
// prettier-ignore
const PRINTFUL_HEX: Record<string, string> = {
  adobe: '#d06e26',
  asphalt: '#716b63',
  'athletic heather': '#f2f2f2',
  bay: '#b8bfab',
  berry: '#8e5a7b',
  black: '#0e0b0b',
  'black heather': '#0e0e0e',
  blossom: '#ffd6e1',
  'blue jean': '#707e8d',
  'blue spruce': '#4c6151',
  bone: '#f5e8ce',
  brick: '#8d4b54',
  'burnt orange': '#ff7842',
  butter: '#ffe09e',
  'carbon grey': '#c7c3be',
  'carolina blue': '#98b7ee',
  'chalky mint': '#a1f2dc',
  chambray: '#d9f3ff',
  charcoal: '#4c4746',
  'charcoal heather': '#463e3d',
  crimson: '#bb5151',
  crunchberry: '#ff748e',
  cypress: '#455237',
  'dark grey heather': '#3e3c3d',
  denim: '#565a67',
  dust: '#f4e7d6',
  'dusty rose': '#d27e6f',
  ecru: '#fff2d9',
  emerald: '#306d6e',
  espresso: '#87634a',
  'faded black': '#424242',
  'faded bone': '#f3ede4',
  'faded coal': '#484946',
  'faded eucalyptus': '#d1cbad',
  'faded grey': '#8c837e',
  'faded indigo': '#546274',
  'faded khaki': '#dbc4a2',
  'faded white': '#ffffff',
  'flo blue': '#7888d2',
  forest: '#233c27',
  'forest green': '#335231',
  'french navy': '#000a21',
  gold: '#ffa107',
  granite: '#a6abaa',
  grape: '#644e6d',
  graphite: '#3e3737',
  grey: '#92928f',
  'heather deep teal': '#335c6b',
  'heather forest': '#28332e',
  'heather mauve': '#c4736c',
  'heather navy': '#44495b',
  hemp: '#4f5232',
  'ice blue': '#7a9096',
  'island reef': '#b8ffca',
  ivory: '#fff4d9',
  jungle: '#928355',
  khaki: '#d2a26f',
  'lagoon blue': '#92dedb',
  latte: '#b28a68',
  lavender: '#ffdcf3',
  'light green': '#608267',
  'light pink': '#ffd0cc',
  maroon: '#621926',
  midnight: '#3a4e63',
  'military green': '#5c4f32',
  moss: '#6b7053',
  mustard: '#ffbc5a',
  'mystic blue': '#5068ab',
  'natural raw': '#fff5e8',
  navy: '#24283c',
  'navy blazer': '#171f2c',
  'neon lemon': '#efff99',
  'neon pink': '#ff5ea1',
  'oatmeal heather': '#fbf2e1',
  orchid: '#ead3f2',
  oyster: '#f3e6cf',
  pacific: '#061226',
  paprika: '#fe4747',
  pepper: '#514f4c',
  'petrol blue': '#273e42',
  purple: '#623a7a',
  red: '#bb1035',
  sage: '#49482e',
  sandstone: '#938a6f',
  seafoam: '#69a999',
  'sky blue': '#d6edf7',
  storm: '#9f9393',
  'team gold': '#ffa912',
  'team red': '#ff2d41',
  'team royal': '#1b43ae',
  terracotta: '#ff9364',
  'true navy': '#1e2c4a',
  'true royal': '#2353c4',
  'vintage black': '#161816',
  'vintage brown': '#9e7551',
  'vintage heather grey': '#fff6e3',
  violet: '#9a8ad2',
  walnut: '#59392b',
  'washed denim': '#98aed1',
  watermelon: '#d15c68',
  white: '#ffffff',
  wine: '#816977',
  'worker blue': '#00125c',
  yam: '#db642f',
};

/** The swatch hex for a fabric colour name, or null when it is unknown. */
export function garmentColourHex(name?: string | null): string | null {
  const key = name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  if (!key) return null;
  return PICKED_HEX[key] ?? PRINTFUL_HEX[key] ?? null;
}

type ImageLike = {altText?: string | null};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Not a letter or digit: the edge of a whole word or phrase. */
const EDGE = String.raw`[^\p{L}\p{N}]`;

/**
 * The colour an image shows: the longest colour name its alt text names as a
 * whole phrase ("in Faded Bone" is Faded Bone, not Bone). Null when the alt
 * names none of the product's colours (a detail, label or flat print shot,
 * shown with every colour).
 */
export function imageColour(
  image: ImageLike,
  colours: readonly string[],
): string | null {
  const alt = image.altText ?? '';
  if (!alt) return null;
  return (
    [...colours]
      .sort((a, b) => b.length - a.length)
      .find((colour) =>
        new RegExp(
          `(^|${EDGE})${escapeRegExp(colour.trim()).replace(/\s+/g, String.raw`\s+`)}($|${EDGE})`,
          'iu',
        ).test(alt),
      ) ?? null
  );
}

/**
 * A product's gallery for one colour: the images whose alt text names that
 * colour, plus those that name no colour, in the merchant's order. Images of
 * the other colours drop out. When no image names any colour (one colour, or
 * alt text not written that way), every image stays, as before.
 */
export function imagesForColour<T extends ImageLike>(
  images: readonly T[],
  colours: readonly string[],
  selected?: string | null,
): T[] {
  if (!selected || colours.length < 2) return [...images];
  const tagged = images.map((image) => ({
    image,
    colour: imageColour(image, colours),
  }));
  if (!tagged.some((item) => item.colour)) return [...images];
  const wanted = selected.trim().toLowerCase();
  return tagged
    .filter(
      (item) => !item.colour || item.colour.trim().toLowerCase() === wanted,
    )
    .map((item) => item.image);
}
