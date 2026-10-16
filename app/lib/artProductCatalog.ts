// Relative imports keep this module loadable by the plain-Node test runner
// and by scripts/product.mjs, which cannot resolve the Vite "~" alias.
import catalogData from '../../data/art-product-catalog.json' with {type: 'json'};
import {
  ART_REGISTRY,
  findArtist,
  findArtwork,
  masterSize,
  orientationOf,
  screenArtworkRights,
  type ArtRegistry,
} from './artRegistry.ts';
import {
  cropPlan,
  cropsApproved,
  MUSEUM_CROPS,
  type CropShape,
  type MuseumCrops,
  type PixelBox,
} from './museumCrops.ts';
import {
  PRINT_CATALOG,
  printSku,
  printVariants,
  type PrintCatalog,
  type PrintCatalogCollection,
  type PrintCatalogPrint,
} from './printCatalog.ts';
import {TOUGH_CASE_PHONES} from './toughCase.ts';

/**
 * Museum works on other products (docs/artist-shops/status.md): a framed
 * print, a canvas, a greeting card, a postcard, a tough phone case and a mug
 * per artwork, each its own hidden Shopify Draft (one product per artwork per
 * type, Society6-style) — never variants of the live studio products.
 *
 * The "seven products per artist" types (hanger print, acrylic, metal print,
 * Printful mug, cushion, blanket; owner decision of 2026-10-16) print
 * finished files made outside the pipeline: the work is unchanged and only
 * the margins the shape needs were filled (`suppliedFiles`). Their files and
 * the log of what was filled are recorded per variant, and some have more
 * than one option (size and hanger colour, size and filling).
 *
 * `data/art-product-catalog.json` is the single source, like the print
 * catalog: the product pipeline (`npm run product -- … --families`) writes
 * the asset records, Shopify ids and mappings into it, and a product is
 * storefront-visible only when `released` is true AND Shopify has it Active
 * and published. Validation blocks a release until the artist is approved,
 * the rights and master reviews are cleared, the crops are approved, the
 * assets are current, Shopify ids exist and every variant's fulfilment
 * mapping is verified against the current file.
 */

export const ART_PRODUCT_FAMILIES = [
  'framed-print',
  'canvas',
  'greeting-card',
  'postcard',
  'phone-case',
  'mug',
  'hanger-print',
  'acrylic-print',
  'metal-print',
  'printful-mug',
  'cushion',
  'blanket',
] as const;
export type ArtProductFamily = (typeof ART_PRODUCT_FAMILIES)[number];

/** Artist-shop product types, shared with app/lib/artistShops.ts. */
export type ArtFamilyLabel =
  | 'Framed prints'
  | 'Canvas'
  | 'Cards'
  | 'Postcards'
  | 'Phone cases'
  | 'Mugs'
  | 'Hanger prints'
  | 'Acrylic prints'
  | 'Metal prints'
  | 'Cushions'
  | 'Blankets';

export type ShippingReach = 'eu' | 'selected' | 'worldwide';

/**
 * A panel of a file that holds the whole composition, fitted and centred,
 * never cropped (the mug's two sides), in millimetres of the print area.
 */
export type WholePanel = {
  centreX: number;
  centreY: number;
  height: number;
  width: number;
};

type FileSpec = {
  /** Portrait pixel size; families that follow the artwork turn it. */
  height: number;
  width: number;
  dpi: number;
  followsOrientation: boolean;
  /** Where the artwork sits inside a multi-panel file. */
  panel?: PixelBox;
  /** Whole-composition panels; the family renders its own file from them. */
  wholePanels?: WholePanel[];
};

/** A finished print file's pixel size in each orientation of the work. */
export type SuppliedFileSpec = {
  dpi: number;
  landscape: {height: number; width: number};
  portrait: {height: number; width: number};
};

/**
 * One variant of a family with its own options: the option values (one per
 * `optionNames`), the SKU suffix, which of the collection's `prices` it
 * sells at, the supplied file it prints and the supplier's SKU (a Prodigi
 * SKU, or a Printful catalog variant id) with any supplier attributes.
 */
export type ArtVariantDef = {
  file: string;
  key: string;
  priceKey: string;
  providerAttributes?: Record<string, string>;
  providerSku: string;
  skuSuffix: string;
  values: string[];
};

export type ArtFamilySpec = {
  artistFamily: ArtFamilyLabel;
  /** Shopify productType, the same as the live studio product of the type. */
  productType: string;
  /** "<print title> <titleSuffix>", like "… Art Print" for prints. */
  titleSuffix: string;
  /** "<print slug>-<handleSuffix>"; the family key when absent. */
  handleSuffix?: string;
  /**
   * Prodigi Shopify-channel mapping, the orders/paid webhook (Prodigi API),
   * or a Printful sync of the Shopify variant (Printful's Shopify app).
   */
  route: 'channel' | 'api' | 'printful';
  /**
   * The one Prodigi SKU the file contract is drawn for, when the family
   * has one; a collection offering the family must use it.
   */
  providerSku?: string;
  /** The approved crop (app/lib/museumCrops.ts); null keeps the work whole. */
  shape: CropShape | null;
  optionName: string;
  /** Option names of a multi-option family, in order; [optionName] otherwise. */
  optionNames?: string[];
  /** Single-variant families; phone cases have one variant per device. */
  single: {key: string; option: string; skuSuffix: string} | null;
  /**
   * Families with their own variant list, per orientation of the work
   * (sizes differ between portrait and landscape hangers).
   */
  variantDefs?: {landscape: ArtVariantDef[]; portrait: ArtVariantDef[]};
  /**
   * Families printed from finished files made outside the pipeline, by the
   * file key of their manifest (products/manifest.json `product`). The
   * pipeline checks and records them; it never renders them.
   */
  suppliedFiles?: Record<string, SuppliedFileSpec>;
  /** Printful placements each variant prints its file on (route 'printful'). */
  printfulPlacements?: string[];
  /** The lead file (the first variant's), for summaries and previews. */
  file: FileSpec;
  /**
   * Lowest native ppi accepted for every work (owner decisions of
   * 2026-10-13: canvas 140, framed 200, the rest 300). One work goes lower
   * only by a recorded owner exception (ArtFamilyConfig.ppiExceptions).
   */
  minPpi: number;
  tags: string[];
  /** Product noun in running copy. */
  noun: string;
  /** How the image was made, for the product page's artwork credit. */
  reproduction: string;
  /** Spec-sheet bullets of the Shopify description. */
  bullets: string[];
  /** Product-page details, in order. */
  details: Array<{label: string; text: string}>;
  seoSuffix: string;
  shippingReach: ShippingReach;
};

const DEVICE_COUNT = TOUGH_CASE_PHONES.length;
const COLOURS = 'Printed to order; screen and print colours can vary slightly.';

/** How a supplied (margin-filled) file was made, for the artwork credit. */
const SUPPLIED_REPRODUCTION =
  'Printed from a public-domain museum image. The work itself is unchanged; where the shape needs more room, a plain margin was added around it, or on some prints more of a calm sky or sea, filled in digitally.';

const HANGERS = [
  {code: 'BLK', color: 'black', label: 'Black'},
  {code: 'WHT', color: 'white', label: 'White'},
  {code: 'OAK', color: 'natural', label: 'Oak'},
] as const;

/**
 * Prodigi's art print with hanger: A3 and a large size per orientation
 * (portrait 60 × 90 cm, landscape 76 × 51 cm), each with a black, white or
 * oak hanger. One price per size.
 */
function hangerDefs(orientation: 'landscape' | 'portrait'): ArtVariantDef[] {
  const sizes =
    orientation === 'landscape'
      ? [
          {
            file: 'hanger-a3',
            key: 'a3',
            label: 'A3 (42 × 29.7 cm)',
            providerSku: 'POSTER-HANGER-40-A3-LAND',
            sku: 'A3',
          },
          {
            file: 'hanger-big',
            key: 'large',
            label: '76 × 51 cm',
            providerSku: 'POSTER-HANGER-80-20X30-LAND',
            sku: 'LG',
          },
        ]
      : [
          {
            file: 'hanger-a3',
            key: 'a3',
            label: 'A3 (29.7 × 42 cm)',
            providerSku: 'POSTER-HANGER-30-A3-PORT',
            sku: 'A3',
          },
          {
            file: 'hanger-big',
            key: 'large',
            label: '60 × 90 cm',
            providerSku: 'POSTER-HANGER-60-24X36-PORT',
            sku: 'LG',
          },
        ];
  return sizes.flatMap((size) =>
    HANGERS.map((hanger) => ({
      file: size.file,
      key: `${size.key}-${hanger.label.toLowerCase()}`,
      priceKey: size.key,
      providerAttributes: {color: hanger.color},
      providerSku: size.providerSku,
      skuSuffix: `HANG-${size.sku}-${hanger.code}`,
      values: [size.label, hanger.label],
    })),
  );
}

const ACRYLIC_DEFS: ArtVariantDef[] = ['8x12', '12x16', '16x24'].map((size) => {
  const [short, long] = size.split('x');
  return {
    file: `acrylic-${size}`,
    key: size,
    priceKey: size,
    providerSku: `GLOBAL-MOU-ACRY-${size.toUpperCase()}`,
    skuSuffix: `ACRY${size.toUpperCase()}`,
    values: [`${short} × ${long} in`],
  };
});

const METAL_DEFS: ArtVariantDef[] = [
  {
    file: 'metal-8x12',
    key: '8x12',
    priceKey: '8x12',
    providerSku: 'MOU-DI-20X30',
    skuSuffix: 'METAL8X12',
    values: ['8 × 12 in'],
  },
];

/** Printful catalog variant 1320: White Glossy Mug, 11 oz. */
const PRINTFUL_MUG_DEFS: ArtVariantDef[] = [
  {
    file: 'mug-11oz',
    key: '11oz',
    priceKey: '11oz',
    providerSku: '1320',
    skuSuffix: 'MUG11-PF',
    values: ['11 oz'],
  },
];

/**
 * Printful Premium Pillow Case (cover, 215) and Premium Pillow (with
 * insert, 214), 18 and 22 inch; one square file prints both sides.
 */
const CUSHION_DEFS: ArtVariantDef[] = [
  {inch: 18, insert: false, providerSku: '9516'},
  {inch: 18, insert: true, providerSku: '9515'},
  {inch: 22, insert: false, providerSku: '11078'},
  {inch: 22, insert: true, providerSku: '11077'},
].map(({inch, insert, providerSku}) => ({
  file: 'cushion-22',
  key: `${inch}-${insert ? 'insert' : 'cover'}`,
  priceKey: `${inch}-${insert ? 'insert' : 'cover'}`,
  providerSku,
  skuSuffix: `CUSH${inch}-${insert ? 'I' : 'C'}`,
  values: [`${inch} × ${inch} in`, insert ? 'With insert' : 'Cover only'],
}));

/** Printful catalog variant 10986: Throw Blanket 50 × 60 in. */
const BLANKET_DEFS: ArtVariantDef[] = [
  {
    file: 'blanket-50x60',
    key: '50x60',
    priceKey: '50x60',
    providerSku: '10986',
    skuSuffix: 'BLANKET50X60',
    values: ['50 × 60 in'],
  },
];

const both = (defs: ArtVariantDef[]) => ({landscape: defs, portrait: defs});
const turns = (width: number, height: number, dpi: number) => ({
  dpi,
  landscape: {height: width, width: height},
  portrait: {height, width},
});
const fixed = (width: number, height: number, dpi: number) => ({
  dpi,
  landscape: {height, width},
  portrait: {height, width},
});

export const FAMILY_SPECS: Record<ArtProductFamily, ArtFamilySpec> = {
  'framed-print': {
    artistFamily: 'Framed prints',
    productType: 'Framed Art',
    titleSuffix: 'Framed Art Print',
    route: 'channel',
    shape: null,
    optionName: 'Size',
    single: {key: '16x20', option: '16 × 20 in', skuSuffix: 'CFP16X20'},
    // The bordered 16×20 print file from `prepare`, reused as it is.
    file: {height: 6000, width: 4800, dpi: 300, followsOrientation: true},
    minPpi: 200,
    tags: ['Wall Art', 'Framed Art'],
    noun: 'framed print',
    reproduction:
      'Printed whole on a white border from a public-domain museum image.',
    bullets: [
      'Natural classic frame in solid wood with clear Perspex glazing',
      'Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper',
      '16 × 20 inch print, the full composition on a white border',
      'Delivered ready to hang',
    ],
    details: [
      {
        label: 'Frame',
        text: 'Natural classic frame in satin-laminated solid wood, with a 20 mm face and shatterproof clear Perspex glazing. Delivered ready to hang.',
      },
      {
        label: 'Print',
        text: `Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper, 16 × 20 in, with the whole composition on a white border. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'Framed at 16 × 20 in and reproduced whole from a public-domain museum image.',
    shippingReach: 'selected',
  },
  canvas: {
    artistFamily: 'Canvas',
    productType: 'Canvas Art',
    titleSuffix: 'Canvas Print',
    route: 'channel',
    shape: 'canvas',
    optionName: 'Size',
    single: {key: '16x20', option: '16 × 20 in', skuSuffix: 'CAN16X20'},
    // The live canvas files: 16×20 at 150 dpi, mirror-wrapped by Prodigi.
    file: {height: 3000, width: 2400, dpi: 150, followsOrientation: true},
    minPpi: 140,
    tags: ['Wall Art', 'Canvas Art'],
    noun: 'canvas',
    reproduction:
      'Cropped to the canvas from a public-domain museum image; nothing is painted in.',
    bullets: [
      '400gsm artist-grade canvas on a 38 mm pine frame',
      '16 × 20 inch canvas with mirrored edges',
      'Ready to hang',
    ],
    details: [
      {
        label: 'Canvas',
        text: `400gsm artist-grade canvas, hand-stretched over a 38 mm pine frame at 16 × 20 in. The edges mirror the picture, so none of it wraps out of sight. Ready to hang. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On 16 × 20 in stretched canvas, cropped from a public-domain museum image.',
    shippingReach: 'selected',
  },
  'greeting-card': {
    artistFamily: 'Cards',
    productType: 'Cards',
    titleSuffix: 'Greeting Card',
    route: 'channel',
    shape: 'card',
    optionName: 'Size',
    single: {key: 'card', option: '5 × 7 in', skuSuffix: 'CARD'},
    // The live four-panel card file; the front panel holds the artwork.
    file: {
      height: 2161,
      width: 6117,
      dpi: 300,
      followsOrientation: false,
      panel: {height: 2161, left: 1529, top: 0, width: 1529},
    },
    minPpi: 300,
    tags: ['Cards'],
    noun: 'greeting card',
    reproduction:
      'Cropped to the card front from a public-domain museum image; nothing is painted in.',
    bullets: [
      '324gsm Mohawk fine-art card with a kraft envelope',
      'Blank 5 × 7 inch folded card',
      'Sent by letter post',
    ],
    details: [
      {
        label: 'Card',
        text: `Blank 5 × 7 inch folded card on 324gsm Mohawk fine-art stock, with a kraft envelope. Sent by letter post. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On a blank 5 × 7 in greeting card, cropped from a public-domain museum image.',
    shippingReach: 'eu',
  },
  postcard: {
    artistFamily: 'Postcards',
    productType: 'Postcards',
    titleSuffix: 'Postcard',
    route: 'channel',
    shape: 'postcard',
    optionName: 'Size',
    single: {key: 'postcard', option: '7 × 5 in', skuSuffix: 'POST'},
    // The live two-sided postcard file; the right half holds the artwork.
    file: {
      height: 1559,
      width: 4323,
      dpi: 300,
      followsOrientation: false,
      panel: {height: 1559, left: 2161, top: 0, width: 2162},
    },
    minPpi: 300,
    tags: ['Postcards'],
    noun: 'postcard',
    reproduction:
      'Cropped to the postcard from a public-domain museum image; nothing is painted in.',
    bullets: [
      '324gsm Mohawk card with a smooth white surface',
      '7 × 5 inch postcard, ready for an address and a stamp',
      'Sent by letter post',
    ],
    details: [
      {
        label: 'Postcard',
        text: `7 × 5 inch postcard on 324gsm Mohawk card with a smooth white surface; the back is ready for an address and a stamp. Sent by letter post. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On a 7 × 5 in postcard, cropped from a public-domain museum image.',
    shippingReach: 'eu',
  },
  'phone-case': {
    artistFamily: 'Phone cases',
    productType: 'Phone Cases',
    titleSuffix: 'Tough Phone Case',
    route: 'api',
    shape: 'case',
    optionName: 'Device',
    single: null,
    // The live tough-case contract: one 4:5 file, centre-cropped per device.
    file: {height: 2500, width: 2000, dpi: 300, followsOrientation: false},
    minPpi: 300,
    tags: ['Phone Cases', 'Tough Case'],
    noun: 'phone case',
    reproduction:
      'Cropped to the case from a public-domain museum image; nothing is painted in.',
    bullets: [
      'Matte tough case: an impact-resistant polycarbonate shell over a shock-absorbing silicone liner',
      'Printed edge to edge for the phone model you choose',
      'Similar model names are not interchangeable; check your exact model before ordering',
    ],
    details: [
      {
        label: 'Case',
        text: `Matte dual-layer tough case: an impact-resistant polycarbonate shell over a shock-absorbing silicone liner. The artwork is printed edge to edge and wraps the sides. ${COLOURS}`,
      },
      {
        label: 'Fit',
        text: `Made for the model you choose from ${DEVICE_COUNT} iPhone, Google Pixel and Samsung Galaxy models. The artwork is centred on every model; similar model names are not interchangeable, so check the model in your phone settings before ordering.`,
      },
    ],
    seoSuffix:
      'On a matte tough phone case, cropped from a public-domain museum image.',
    shippingReach: 'worldwide',
  },
  mug: {
    artistFamily: 'Mugs',
    productType: 'Mugs',
    titleSuffix: 'Mug',
    route: 'channel',
    providerSku: 'GLOBAL-MUG-W',
    shape: null,
    optionName: 'Size',
    single: {key: '11oz', option: '11 oz', skuSuffix: 'MUG11'},
    // Prodigi GLOBAL-MUG-W, 11 oz: a 229 × 95 mm print area at 300 dpi.
    // The work is printed whole twice on white, each copy fitted in a
    // 100 × 85 mm panel centred on a quarter of the wrap.
    file: {
      height: 1122,
      width: 2705,
      dpi: 300,
      followsOrientation: false,
      wholePanels: [
        {centreX: 57.25, centreY: 47.5, height: 85, width: 100},
        {centreX: 171.75, centreY: 47.5, height: 85, width: 100},
      ],
    },
    minPpi: 300,
    tags: ['Mugs'],
    noun: 'mug',
    reproduction:
      'Printed whole, on each side, from a public-domain museum image; nothing is cropped or painted in.',
    bullets: [
      'White ceramic mug, 11 oz',
      'The whole composition printed on white, once on each side',
    ],
    details: [
      {
        label: 'Mug',
        text: `White ceramic mug, 11 oz. The whole composition is printed on white, once on each side of the mug. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On an 11 oz white ceramic mug, printed whole from a public-domain museum image.',
    // Not yet decided: no shipping profile exists for mugs. The conservative
    // wording until one does (see ProductShippingText).
    shippingReach: 'selected',
  },
  // The seven products per artist (2026-10-16): free EU shipping in their
  // own Shopify profile, which the owner sets up; until the storefront says
  // so, they keep the conservative shipping wording.
  'hanger-print': {
    artistFamily: 'Hanger prints',
    productType: 'Hanger Prints',
    titleSuffix: 'Print with Hanger',
    route: 'channel',
    shape: null,
    optionName: 'Size',
    optionNames: ['Size', 'Hanger'],
    single: null,
    variantDefs: {
      landscape: hangerDefs('landscape'),
      portrait: hangerDefs('portrait'),
    },
    suppliedFiles: {
      'hanger-a3': turns(3508, 4961, 300),
      'hanger-big': {
        dpi: 300,
        landscape: {height: 6000, width: 9000},
        portrait: {height: 10630, width: 7087},
      },
    },
    file: {height: 4961, width: 3508, dpi: 300, followsOrientation: true},
    minPpi: 150,
    tags: ['Wall Art', 'Hanger Prints'],
    noun: 'print with a wooden hanger',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'Giclée print on 200gsm Enhanced Matte Art paper',
      'Solid wood hanger in black, white or oak, held on by magnets, with a matching cord',
      'The wooden strips cover about 1.5 cm at the top and bottom of the print',
    ],
    details: [
      {
        label: 'Print',
        text: `Giclée print on 200gsm Enhanced Matte Art paper, natural white. ${COLOURS}`,
      },
      {
        label: 'Hanger',
        text: 'Solid wood strips in black, white or oak hold the print at the top and bottom with magnets, and a matching cord hangs it. The strips cover about 1.5 cm of the print at each end.',
      },
    ],
    seoSuffix:
      'As a print with a solid wood hanger, from a public-domain museum image.',
    shippingReach: 'selected',
  },
  'acrylic-print': {
    artistFamily: 'Acrylic prints',
    productType: 'Acrylic Prints',
    titleSuffix: 'Acrylic Print',
    route: 'channel',
    shape: null,
    optionName: 'Size',
    single: null,
    variantDefs: both(ACRYLIC_DEFS),
    suppliedFiles: {
      'acrylic-8x12': turns(2400, 3600, 300),
      'acrylic-12x16': turns(3600, 4800, 300),
      'acrylic-16x24': turns(4800, 7200, 300),
    },
    file: {height: 3600, width: 2400, dpi: 300, followsOrientation: true},
    minPpi: 150,
    tags: ['Wall Art', 'Acrylic Prints'],
    noun: 'acrylic print',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'Giclée print hand-mounted on 10 mm high-gloss acrylic with polished edges',
      'A hidden subframe floats it off the wall; ready to hang',
    ],
    details: [
      {
        label: 'Acrylic',
        text: `Giclée print hand-mounted on 10 mm high-gloss acrylic with polished, clear edges. A hidden subframe floats it off the wall; ready to hang. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On 10 mm high-gloss acrylic, from a public-domain museum image.',
    shippingReach: 'selected',
  },
  'metal-print': {
    artistFamily: 'Metal prints',
    productType: 'Metal Prints',
    titleSuffix: 'Metal Print',
    route: 'channel',
    shape: null,
    optionName: 'Size',
    single: null,
    variantDefs: both(METAL_DEFS),
    suppliedFiles: {'metal-8x12': turns(2400, 3600, 300)},
    file: {height: 3600, width: 2400, dpi: 300, followsOrientation: true},
    minPpi: 150,
    tags: ['Wall Art', 'Metal Prints'],
    noun: 'metal print',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'Matt print on a 3 mm aluminium composite panel (Dibond)',
      'A hidden subframe holds it 15 mm off the wall; ready to hang',
    ],
    details: [
      {
        label: 'Metal',
        text: `Matt giclée print on a 3 mm aluminium composite panel (Dibond), 8 × 12 in (20 × 30 cm). A hidden subframe holds it 15 mm off the wall; ready to hang. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On an 8 × 12 in matt metal panel, from a public-domain museum image.',
    shippingReach: 'selected',
  },
  'printful-mug': {
    artistFamily: 'Mugs',
    productType: 'Mugs',
    titleSuffix: 'Mug',
    handleSuffix: 'mug',
    route: 'printful',
    shape: null,
    optionName: 'Size',
    single: null,
    variantDefs: both(PRINTFUL_MUG_DEFS),
    // Printful's 11 oz print area: 9 × 3.5 in at 300 dpi.
    suppliedFiles: {'mug-11oz': fixed(2700, 1050, 300)},
    printfulPlacements: ['default'],
    file: {height: 1050, width: 2700, dpi: 300, followsOrientation: false},
    minPpi: 300,
    tags: ['Mugs'],
    noun: 'mug',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'White glossy ceramic mug, 11 oz',
      'The whole work printed on the mug; an upright work is printed twice, once on each side',
      'Dishwasher and microwave safe',
    ],
    details: [
      {
        label: 'Mug',
        text: `White glossy ceramic mug, 11 oz (9.6 cm tall, 8.2 cm across). The whole work is printed on it; an upright work is printed twice, once on each side. Dishwasher and microwave safe. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On an 11 oz white glossy mug, from a public-domain museum image.',
    shippingReach: 'selected',
  },
  cushion: {
    artistFamily: 'Cushions',
    productType: 'Cushions',
    titleSuffix: 'Cushion',
    route: 'printful',
    shape: null,
    optionName: 'Size',
    optionNames: ['Size', 'Filling'],
    single: null,
    variantDefs: both(CUSHION_DEFS),
    // 22 in at 150 dpi; Printful scales the same file to 18 in.
    suppliedFiles: {'cushion-22': fixed(3300, 3300, 150)},
    // Front and back print the same file.
    printfulPlacements: ['front', 'back'],
    file: {height: 3300, width: 3300, dpi: 150, followsOrientation: false},
    minPpi: 150,
    tags: ['Cushions'],
    noun: 'cushion',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'Linen-feel 100% polyester cover with a hidden zip, printed on both sides',
      '18 × 18 or 22 × 22 in, as a cover only or with a polyester insert',
      'Machine-washable cover; the insert is hand wash only',
    ],
    details: [
      {
        label: 'Cushion',
        text: `Linen-feel 100% polyester cover (275 g/m²) with a hidden zip, printed on both sides. Choose the cover only, or the cover with a shape-retaining 100% polyester insert. The cover is machine-washable; the insert is hand wash only. ${COLOURS}`,
      },
    ],
    seoSuffix: 'On a linen-feel cushion, from a public-domain museum image.',
    shippingReach: 'selected',
  },
  blanket: {
    artistFamily: 'Blankets',
    productType: 'Blankets',
    titleSuffix: 'Throw Blanket',
    route: 'printful',
    shape: null,
    optionName: 'Size',
    single: null,
    variantDefs: both(BLANKET_DEFS),
    // 50 × 60 in at 150 dpi, portrait; wide works are turned on their side.
    suppliedFiles: {'blanket-50x60': fixed(7500, 9000, 150)},
    printfulPlacements: ['default'],
    file: {height: 9000, width: 7500, dpi: 150, followsOrientation: false},
    minPpi: 150,
    tags: ['Blankets'],
    noun: 'throw blanket',
    reproduction: SUPPLIED_REPRODUCTION,
    bullets: [
      'Silk-touch 100% polyester throw, 50 × 60 in (127 × 152 cm)',
      'Printed on one side, white on the back',
      'Machine-washable',
    ],
    details: [
      {
        label: 'Blanket',
        text: `Soft silk-touch 100% polyester throw, 50 × 60 in (127 × 152 cm), printed on one side with a white back. Wide works are printed turned on their side. Machine-washable. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On a 50 × 60 in throw blanket, from a public-domain museum image.',
    shippingReach: 'selected',
  },
};

/** A family's option names, in order. */
export function familyOptionNames(family: ArtProductFamily) {
  const spec = FAMILY_SPECS[family];
  return spec.optionNames ?? [spec.optionName];
}

/**
 * Every variant a product of the family has, for a work of this
 * orientation, in catalog order: the single variant, one per phone model,
 * or the family's own list. `providerSku` is absent where the collection's
 * entry supplies it (single-variant families) and `priceKey` is absent where
 * the collection has one price for the family.
 */
export function familyVariantDefs(
  family: ArtProductFamily,
  orientation: 'landscape' | 'portrait',
): Array<
  Omit<ArtVariantDef, 'priceKey' | 'providerSku' | 'file'> &
    Partial<Pick<ArtVariantDef, 'priceKey' | 'providerSku' | 'file'>>
> {
  const spec = FAMILY_SPECS[family];
  if (spec.variantDefs) return spec.variantDefs[orientation];
  if (spec.single)
    return [
      {
        key: spec.single.key,
        skuSuffix: spec.single.skuSuffix,
        values: [spec.single.option],
      },
    ];
  return TOUGH_CASE_PHONES.map((phone) => ({
    key: phone.code,
    providerSku: phone.prodigiSku,
    skuSuffix: `CASE-${phone.code}`,
    values: [phone.label],
  }));
}

/** The price a variant sells at: its size's price, or the family's one price. */
export function familyVariantPrice(
  config: Pick<ArtFamilyConfig, 'priceEUR' | 'prices'> | undefined,
  def: {priceKey?: string},
) {
  return def.priceKey !== undefined
    ? config?.prices?.[def.priceKey]
    : config?.priceEUR;
}

/** The recorded file a variant prints (its own supplied file, or the one file). */
export function variantFile(
  product: Pick<ArtFamilyProduct, 'assets'>,
  variant: Pick<ArtProductVariant, 'file'>,
): ArtAssetFile | undefined {
  if (variant.file && product.assets?.files)
    return product.assets.files[variant.file];
  return product.assets?.print;
}

export type WholePanelLayout = {
  /** Printed size of the work in each panel. */
  imageMm: {height: number; width: number};
  /** Native pixels per printed inch of the master at that size. */
  nativePpi: number;
  /** Each panel, in file pixels. */
  panels: PixelBox[];
  /** The work fitted whole and centred in each panel, in file pixels. */
  placements: PixelBox[];
};

/**
 * Where a whole-composition family (the mug) puts the work: fitted inside
 * each panel without cropping or stretching, centred on the panel. Null for
 * families without whole panels. `size` is the master (original less trim).
 */
export function wholePanelLayout(
  size: {height: number; width: number},
  family: ArtProductFamily,
): WholePanelLayout | null {
  const {file} = FAMILY_SPECS[family];
  if (!file.wholePanels?.length) return null;
  const perMm = file.dpi / 25.4;
  const boxes = file.wholePanels.map((panel) => {
    const panelWidth = panel.width * perMm;
    const panelHeight = panel.height * perMm;
    const scale = Math.min(panelWidth / size.width, panelHeight / size.height);
    const width = Math.floor(size.width * scale);
    const height = Math.floor(size.height * scale);
    const centreX = panel.centreX * perMm;
    const centreY = panel.centreY * perMm;
    return {
      panel: {
        height: Math.round(panelHeight),
        left: Math.round(centreX - panelWidth / 2),
        top: Math.round(centreY - panelHeight / 2),
        width: Math.round(panelWidth),
      },
      placement: {
        height,
        left: Math.round(centreX - width / 2),
        top: Math.round(centreY - height / 2),
        width,
      },
    };
  });
  const {placement} = boxes[0];
  const round1 = (value: number) => Math.round(value * 10) / 10;
  return {
    imageMm: {
      height: round1(placement.height / perMm),
      width: round1(placement.width / perMm),
    },
    nativePpi: round1(
      Math.min(
        (size.width * file.dpi) / placement.width,
        (size.height * file.dpi) / placement.height,
      ),
    ),
    panels: boxes.map((box) => box.panel),
    placements: boxes.map((box) => box.placement),
  };
}

export type ArtProductMapping = {
  verified: boolean;
  /** Channel families: the Prodigi channel product, read back on a fresh load. */
  channelProductId?: string;
  /** API families: the deployed print-file path the webhook sends to Prodigi. */
  printUrlPath?: string;
  /** Printful families: the sync product and variant of the Shopify variant. */
  printfulSyncProductId?: string;
  printfulSyncVariantId?: string;
  /** The print file the verified mapping uses. */
  assetSha256?: string;
  verifiedAt?: string;
  note?: string;
};

export type ArtProductVariant = {
  /** "16x20", "card", "postcard", "11oz", "a3-black" or a device code. */
  key: string;
  /** The Shopify option value; values joined by " / " for several options. */
  option: string;
  sku: string;
  /** The collection's price; absent while that price is pending. */
  priceEUR?: string;
  /** Prodigi SKU, or the Printful catalog variant id. */
  providerSku: string;
  /** Supplier attributes, e.g. the hanger colour. */
  providerAttributes?: Record<string, string>;
  /** Supplied families: the file key (assets.files) the variant prints. */
  file?: string;
  inventory: {policy: 'DENY'; quantity: number; tracked: boolean};
  mapping: ArtProductMapping;
};

export type ArtAssetFile = {
  dpi?: number;
  height: number;
  /** Relative to the machine's launch folder, forward slashes. */
  path: string;
  sha256: string;
  width: number;
};

/**
 * A supplied file and what was done to make it, copied from the files' own
 * logs when `prepare` checks them: the manifest row (supplier SKU, master,
 * rotation, hanger strip) and the AI-fill log of its master (which side got
 * plain paper or more scene, the paper colour, and the check that the
 * museum pixels were pasted back unchanged).
 */
export type SuppliedAsset = ArtAssetFile & {
  dpi: number;
  /** Native pixels of the museum image per printed inch. */
  ppi: number;
  provenance: {
    /** The master's AI-fill log entry, verbatim (masters/assembly.json). */
    aiFill: Record<string, unknown> & {block_identical: boolean};
    /** Manifest row fields, verbatim (products/manifest.json). */
    aspectTrimPercent: number;
    hangerStripMm: number;
    manifestSku: string;
    master: string;
    masterSha256: string;
    rotated90: boolean;
  };
};

export type ArtProductAssets = {
  /** The rendered region in master pixels (original less trim); null when whole. */
  box: PixelBox | null;
  /** Native pixels per printed inch (the lowest file's, for supplied families). */
  ppi: number;
  preparedAt: string;
  preview: ArtAssetFile;
  /** The print file (supplied families: the first variant's). */
  print: ArtAssetFile;
  /** Supplied families: every file the variants print, by file key. */
  files?: Record<string, SuppliedAsset>;
  sourceSignature: string;
};

export type ArtFamilyProduct = {
  artworkId: string;
  assets?: ArtProductAssets;
  /** The print-catalog collection the artwork is sold in. */
  collection: string;
  family: ArtProductFamily;
  handle: string;
  orientation: 'landscape' | 'portrait';
  /** The print-catalog print (slug) the product is derived from. */
  print: string;
  released: boolean;
  shopify?: {productId: string; variantIds: Record<string, string>};
  title: string;
  variants: ArtProductVariant[];
};

/**
 * The owner accepting one work's native ppi below its family's floor, as the
 * canvas and framed floors were accepted for every work on 2026-10-13, but
 * for a single artwork and with who decided, when and why. Only the owner
 * grants one; the pipeline never does.
 */
export type PpiException = {
  at: string;
  by: string;
  /** The lowest native ppi accepted for this work and family. */
  minPpi: number;
  /** The reason, e.g. "AIC serves 3000 px; owner accepts 288 ppi". */
  note: string;
};

/**
 * No exception goes below the museum verdicts' floor: under 150 ppi a size
 * is unsupported (scripts/lib/museum-layout.mjs, app/lib/museumCrops.ts).
 */
export const MIN_EXCEPTION_PPI = 150;

export type ArtFamilyConfig = {
  /**
   * The owner-approved price. Absent while it waits for a supplier quote
   * and the owner's approval: files can be prepared, nothing is staged.
   */
  priceEUR?: string;
  /**
   * Families with several sizes: the owner-approved price per `priceKey`
   * (absent while pending, like `priceEUR`).
   */
  prices?: Record<string, string>;
  /**
   * Prodigi SKU; phone cases take one per device from the case manifest,
   * and families with their own variant list name their SKU pattern here.
   */
  providerSku: string;
  /** Supplier settings for the mapping (handoff). */
  providerSettings?: string;
  /** Owner exceptions to the family's ppi floor, by artwork id. */
  ppiExceptions?: Record<string, PpiException>;
};

export type ArtProductCollection = {
  /** Running copy for the family descriptions. */
  copy: string;
  families: Partial<Record<ArtProductFamily, ArtFamilyConfig>>;
  /** The print-catalog collection slug. */
  slug: string;
  /**
   * Where the supplied families' finished files live, relative to the
   * machine's launch folder (it holds products/manifest.json and
   * masters/assembly.json).
   */
  suppliedFiles?: string;
  /**
   * Square works only (within 2%): which way their supplied files are laid
   * out, by artwork id. A square work reads either way, so its files decide
   * the sizes and supplier SKUs; any other work follows its own orientation.
   */
  suppliedLayout?: Record<string, 'landscape' | 'portrait'>;
};

/**
 * The orientation a product's variants follow: the work's own, except for
 * a square work whose supplied files are laid out the other way.
 */
export function familyLayout(
  product: Pick<ArtFamilyProduct, 'artworkId' | 'family' | 'orientation'>,
  collection?: Pick<ArtProductCollection, 'suppliedLayout'>,
): 'landscape' | 'portrait' {
  const own = product.orientation === 'landscape' ? 'landscape' : 'portrait';
  if (!FAMILY_SPECS[product.family]?.suppliedFiles) return own;
  return collection?.suppliedLayout?.[product.artworkId] ?? own;
}

export type ArtProductCatalog = {
  $comment?: string;
  collections: ArtProductCollection[];
  currency: string;
  products: ArtFamilyProduct[];
  version: number;
};

export const ART_PRODUCT_CATALOG = catalogData as unknown as ArtProductCatalog;

/** Bumped whenever the asset renderer changes pixels. */
export const ART_ASSET_RENDERER = 1;

export function familyHandle(
  print: Pick<PrintCatalogPrint, 'slug'>,
  family: ArtProductFamily,
) {
  return `${print.slug}-${FAMILY_SPECS[family].handleSuffix ?? family}`;
}

export function familyTitle(
  print: Pick<PrintCatalogPrint, 'title'>,
  family: ArtProductFamily,
) {
  return `${print.title} ${FAMILY_SPECS[family].titleSuffix}`;
}

/**
 * CM-<collection>-<sequence>-<suffix>, the print SKU scheme. `variantKey`
 * is the device code of a case or the key of a family's own variant.
 */
export function familySku(
  collection: Pick<PrintCatalogCollection, 'skuCode'>,
  print: Pick<PrintCatalogPrint, 'sequence'>,
  family: ArtProductFamily,
  variantKey?: string,
) {
  const base = `CM-${collection.skuCode}-${String(print.sequence).padStart(2, '0')}`;
  const spec = FAMILY_SPECS[family];
  if (spec.single) return `${base}-${spec.single.skuSuffix}`;
  if (!variantKey)
    throw new Error(
      `${family} SKUs need a ${spec.variantDefs ? 'variant key' : 'device code'}`,
    );
  if (!spec.variantDefs) return `${base}-CASE-${variantKey}`;
  const def = [
    ...spec.variantDefs.portrait,
    ...spec.variantDefs.landscape,
  ].find((entry) => entry.key === variantKey);
  if (!def) throw new Error(`${family} has no variant "${variantKey}"`);
  return `${base}-${def.skuSuffix}`;
}

/** Where the orders/paid webhook tells Prodigi to fetch a case file. */
export function casePrintUrlPath(
  product: Pick<ArtFamilyProduct, 'collection' | 'print'>,
) {
  return `/print-files/${product.collection}/${product.print}-phone-case.jpg`;
}

/** Pixel size of a family's production file for one orientation. */
export function familyFileSize(
  family: ArtProductFamily,
  orientation: 'landscape' | 'portrait',
) {
  const {file} = FAMILY_SPECS[family];
  return file.followsOrientation && orientation === 'landscape'
    ? {height: file.width, width: file.height}
    : {height: file.height, width: file.width};
}

/**
 * Why a print's work cannot have a family product, or null when it can: a
 * cropped family needs the work's crop for its shape, and the framed print
 * reuses the 16×20 print file, so the print must be offered at 16×20.
 * Whole-work families (the mug) fit every work.
 */
export function familyIneligibility(
  family: ArtProductFamily,
  collection: Pick<PrintCatalogCollection, 'variants'>,
  print: Pick<PrintCatalogPrint, 'artworkId' | 'sizes' | 'slug'>,
  crops: MuseumCrops = MUSEUM_CROPS,
): string | null {
  const spec = FAMILY_SPECS[family];
  if (spec.shape && !crops.crops[print.artworkId ?? '']?.[spec.shape])
    return `${print.artworkId} has no ${spec.shape} crop`;
  if (
    family === 'framed-print' &&
    !printVariants(collection, print).some(
      (variant) => variant.size === '16x20',
    )
  )
    return `the framed print reuses the 16x20 print file, which ${print.slug} is not offered in`;
  return null;
}

/**
 * The crop a family product renders from, in master pixels, with its native
 * ppi; the phone case renders its 4:5 file box. Null for whole-work families.
 */
export function familyCrop(
  family: ArtProductFamily,
  artworkId: string,
  {
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {crops?: MuseumCrops; registry?: ArtRegistry} = {},
) {
  const shape = FAMILY_SPECS[family].shape;
  if (!shape) return null;
  const plan = cropPlan(artworkId, {data: crops, registry});
  const entry = plan?.shapes.find((candidate) => candidate.shape === shape);
  if (!plan || !entry) return null;
  return {
    box: entry.box,
    ppi: entry.ppi,
    render: shape === 'case' && entry.file ? entry.file : entry.box,
    size: plan.size,
  };
}

/**
 * Every pixel-affecting input of a product's files, as a stable string:
 * renderer version, family, file size and dpi, the original's checksum and
 * trim, and the crop (or the whole-work layout). Machine paths and review
 * timestamps are excluded, so it is the same on every PC. A recorded asset
 * whose signature differs is stale.
 */
export function familySourceSignature(
  product: Pick<ArtFamilyProduct, 'artworkId' | 'family' | 'orientation'>,
  {
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {crops?: MuseumCrops; registry?: ArtRegistry} = {},
) {
  const artwork = findArtwork(product.artworkId, registry);
  if (!artwork?.original) return '';
  const trim = artwork.trim;
  const spec = FAMILY_SPECS[product.family];
  if (spec.suppliedFiles)
    // The finished files were cut from this original, trim and printed
    // area; if any of them changes, the files are stale. The files' own
    // checksums are checked against the disk by every step.
    return JSON.stringify({
      renderer: ART_ASSET_RENDERER,
      family: product.family,
      supplied: Object.keys(spec.suppliedFiles),
      source: artwork.original.sha256,
      trim: trim
        ? [trim.left, trim.top, trim.right, trim.bottom]
        : [0, 0, 0, 0],
      area: crops.crops[product.artworkId]?.area ?? null,
    });
  const crop = familyCrop(product.family, product.artworkId, {
    crops,
    registry,
  });
  const file = familyFileSize(product.family, product.orientation);
  const recorded = crops.crops[product.artworkId];
  const master = masterSize(artwork);
  const whole = master && wholePanelLayout(master, product.family);
  let layout: unknown = 'bordered-16x20';
  if (crop && spec.shape)
    layout = {
      area: recorded?.area,
      box: [
        crop.render.left,
        crop.render.top,
        crop.render.width,
        crop.render.height,
      ],
      crop: recorded?.[spec.shape],
    };
  else if (whole)
    layout = {
      whole: whole.placements.map((box) => [
        box.left,
        box.top,
        box.width,
        box.height,
      ]),
    };
  return JSON.stringify({
    renderer: ART_ASSET_RENDERER,
    family: product.family,
    file: [file.width, file.height, spec.file.dpi],
    source: artwork.original.sha256,
    trim: trim ? [trim.left, trim.top, trim.right, trim.bottom] : [0, 0, 0, 0],
    layout,
  });
}

/**
 * The lowest native ppi a product's file may have: its family's floor, or
 * the owner's recorded exception for that artwork in its collection.
 */
export function familyPpiFloor(
  product: Pick<ArtFamilyProduct, 'artworkId' | 'collection' | 'family'>,
  catalog: Pick<ArtProductCatalog, 'collections'> = ART_PRODUCT_CATALOG,
) {
  const exception = catalog.collections.find(
    (entry) => entry.slug === product.collection,
  )?.families[product.family]?.ppiExceptions?.[product.artworkId];
  return {
    minPpi: exception?.minPpi ?? FAMILY_SPECS[product.family].minPpi,
    ppiException: exception ?? null,
  };
}

/** What still blocks a product's release; empty when it may be released. */
export function familyReleaseIssues(
  product: ArtFamilyProduct,
  {
    catalog = ART_PRODUCT_CATALOG,
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {
    catalog?: Pick<ArtProductCatalog, 'collections'>;
    crops?: MuseumCrops;
    registry?: ArtRegistry;
  } = {},
): string[] {
  const artwork = findArtwork(product.artworkId, registry);
  const artist = artwork && findArtist(artwork.artistId, registry);
  const spec = FAMILY_SPECS[product.family];
  const issues: string[] = [];
  if (!artist?.approval.approved) issues.push('artist approval');
  if (
    !artwork ||
    artwork.reviews.rights.status !== 'cleared' ||
    !screenArtworkRights(artwork, artist, {
      year: Number(artwork.reviews.rights.at?.slice(0, 4)) || undefined,
    }).pass
  )
    issues.push('a cleared rights review');
  if (artwork?.reviews.master.status !== 'cleared')
    issues.push('a cleared master review');
  // Supplied files are cut to the approved printed area too.
  if (
    (spec?.shape || spec?.suppliedFiles) &&
    !cropsApproved(product.artworkId, crops)
  )
    issues.push('crop approval');
  if (
    spec?.suppliedFiles &&
    product.variants.some((variant) => {
      const file = variantFile(product, variant) as SuppliedAsset | undefined;
      return !file?.provenance?.aiFill?.block_identical;
    })
  )
    issues.push('every file checked unchanged where the museum image sits');
  if (
    !product.assets ||
    product.assets.sourceSignature !==
      familySourceSignature(product, {crops, registry})
  )
    issues.push('current assets');
  // An exception withdrawn after `prepare` must stop the release too.
  if (
    product.assets &&
    !(product.assets.ppi >= familyPpiFloor(product, catalog).minPpi)
  )
    issues.push('native ppi at its floor or an owner ppi exception');
  if (
    !product.shopify?.productId ||
    product.variants.some(
      (variant) => !product.shopify?.variantIds?.[variant.key],
    )
  )
    issues.push('Shopify ids');
  if (
    product.variants.some((variant) => !variantMappingCurrent(product, variant))
  )
    issues.push('a verified fulfilment mapping of the current file');
  return issues;
}

/**
 * Whether a variant's fulfilment mapping is verified on the file it prints
 * now: a Prodigi channel product, the deployed case file, or a Printful sync
 * variant.
 */
export function variantMappingCurrent(
  product: ArtFamilyProduct,
  variant: ArtProductVariant,
) {
  const {mapping} = variant;
  const file = variantFile(product, variant);
  if (!mapping.verified || !file || mapping.assetSha256 !== file.sha256)
    return false;
  const route = FAMILY_SPECS[product.family]?.route;
  if (route === 'channel') return Boolean(mapping.channelProductId);
  if (route === 'printful')
    return Boolean(
      mapping.printfulSyncProductId && mapping.printfulSyncVariantId,
    );
  return mapping.printUrlPath === casePrintUrlPath(product);
}

export function releasedArtProductHandles(
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  return catalog.products
    .filter((product) => product.released === true)
    .map((product) => product.handle);
}

/**
 * Shopify product types of the released family products, in family order,
 * so the shop's type filter offers a family the day it releases.
 */
export function releasedArtProductTypes(
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const released = new Set(
    catalog.products
      .filter((product) => product.released === true)
      .map((product) => product.family),
  );
  return [
    ...new Set(
      ART_PRODUCT_FAMILIES.filter((family) => released.has(family)).map(
        (family) => FAMILY_SPECS[family].productType,
      ),
    ),
  ];
}

/** Staged family handles stay out of listings and sitemaps if published. */
export function isUnreleasedArtProductHandle(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const key = handle?.toLowerCase();
  if (!key) return false;
  return catalog.products.some(
    (product) => product.handle === key && product.released !== true,
  );
}

export function artProductByHandle(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const key = handle?.toLowerCase();
  return key
    ? (catalog.products.find((product) => product.handle === key) ?? null)
    : null;
}

export type ArtProductPage = {
  details: Array<{label: string; text: string}>;
  family: ArtProductFamily;
  shippingReach: ShippingReach;
  /**
   * The one size of a single-variant product ("16 × 20 in", "5 × 7 in"),
   * shown by the price because there is no size picker; null for cases.
   */
  size: string | null;
};

/** Product-page copy for a released family product; null otherwise. */
export function artProductPage(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
): ArtProductPage | null {
  const product = artProductByHandle(handle, catalog);
  if (!product?.released) return null;
  const spec = FAMILY_SPECS[product.family];
  // A family with one variant and no picker shows its size by the price.
  const only = product.variants.length === 1 ? product.variants[0] : null;
  return {
    details: spec.details,
    family: product.family,
    shippingReach: spec.shippingReach,
    size:
      spec.single?.option ?? (spec.variantDefs ? (only?.option ?? null) : null),
  };
}

/** How a museum image was made into the product, for the artwork credit. */
export function reproductionSentence(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const product = artProductByHandle(handle, catalog);
  // Prints, like framed prints, keep the whole composition on a border.
  return FAMILY_SPECS[product?.family ?? 'framed-print'].reproduction;
}

export type ArtCaseLine = {
  attributes: Record<string, string>;
  printUrlPath: string;
  providerSku: string;
};

/**
 * The Prodigi item for a paid museum phone-case line, by Shopify SKU: only
 * for released products whose API route is verified, so a staged Draft can
 * never reach Prodigi through the webhook.
 */
export function artCaseLineForSku(
  sku?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
): ArtCaseLine | null {
  const key = sku?.trim().toUpperCase();
  if (!key) return null;
  for (const product of catalog.products) {
    if (product.family !== 'phone-case' || product.released !== true) continue;
    const variant = product.variants.find((entry) => entry.sku === key);
    if (!variant) continue;
    const phone = TOUGH_CASE_PHONES.find((entry) => entry.code === variant.key);
    if (
      !phone ||
      phone.prodigiSku !== variant.providerSku ||
      !variant.mapping.verified ||
      !variant.mapping.printUrlPath ||
      variant.mapping.printUrlPath !== casePrintUrlPath(product)
    )
      return null;
    return {
      attributes: phone.prodigiAttributes,
      printUrlPath: variant.mapping.printUrlPath,
      providerSku: variant.providerSku,
    };
  }
  return null;
}

const PRICE = /^\d+\.\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Everything that would make the family catalog unsafe to ship. Run by the
 * test suite and by every family step of `npm run product`.
 */
export function validateArtProductCatalog(
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
  {
    crops = MUSEUM_CROPS,
    printCatalog = PRINT_CATALOG,
    registry = ART_REGISTRY,
  }: {
    crops?: MuseumCrops;
    printCatalog?: PrintCatalog;
    registry?: ArtRegistry;
  } = {},
): string[] {
  const problems: string[] = [];
  if (catalog.currency !== 'EUR')
    problems.push('art-product-catalog: currency must be EUR');
  const collections = new Map<string, ArtProductCollection>();
  for (const entry of catalog.collections ?? []) {
    const at = `art-product-catalog collection ${entry.slug}`;
    if (collections.has(entry.slug)) problems.push(`${at}: duplicate`);
    collections.set(entry.slug, entry);
    const source = printCatalog.collections.find((c) => c.slug === entry.slug);
    if (!source) problems.push(`${at}: not a print-catalog collection`);
    else if (source.kind !== 'museum')
      problems.push(`${at}: families are for museum collections`);
    if (!entry.copy?.trim()) problems.push(`${at}: missing copy`);
    for (const [family, config] of Object.entries(entry.families ?? {})) {
      if (!ART_PRODUCT_FAMILIES.includes(family as ArtProductFamily))
        problems.push(`${at}: unknown family ${family}`);
      // Absent while the price waits for a quote and the owner's approval.
      if (config?.priceEUR !== undefined && !PRICE.test(config.priceEUR))
        problems.push(`${at}: ${family} priceEUR must look like "29.99"`);
      const defs = FAMILY_SPECS[family as ArtProductFamily]?.variantDefs;
      if (defs) {
        const keys = new Set(
          [...defs.portrait, ...defs.landscape].map((def) => def.priceKey),
        );
        if (config?.priceEUR !== undefined)
          problems.push(
            `${at}: ${family} sells at a price per size: use prices {${[...keys].join(', ')}}, not priceEUR`,
          );
        for (const [key, price] of Object.entries(config?.prices ?? {})) {
          if (!keys.has(key))
            problems.push(`${at}: ${family} has no size "${key}" to price`);
          if (!PRICE.test(price))
            problems.push(
              `${at}: ${family} price ${key} must look like "29.99"`,
            );
        }
      } else if (config?.prices)
        problems.push(`${at}: ${family} has one price: use priceEUR`);
      if (
        FAMILY_SPECS[family as ArtProductFamily]?.suppliedFiles &&
        !entry.suppliedFiles?.trim()
      )
        problems.push(
          `${at}: ${family} prints supplied files: set suppliedFiles to their folder`,
        );
      if (!config?.providerSku?.trim())
        problems.push(`${at}: ${family} missing providerSku`);
      for (const [artworkId, exception] of Object.entries(
        config?.ppiExceptions ?? {},
      )) {
        const where = `${at}: ${family} ppi exception for ${artworkId}`;
        const floor = FAMILY_SPECS[family as ArtProductFamily]?.minPpi ?? 0;
        if (!source?.prints.some((print) => print.artworkId === artworkId))
          problems.push(`${where}: not an artwork of this collection`);
        if (
          typeof exception?.minPpi !== 'number' ||
          !(exception.minPpi >= MIN_EXCEPTION_PPI && exception.minPpi < floor)
        )
          problems.push(
            `${where}: minPpi must be at least ${MIN_EXCEPTION_PPI} and below the family's ${floor}`,
          );
        if (
          !exception?.by?.trim() ||
          !exception.at?.trim() ||
          !exception.note?.trim()
        )
          problems.push(`${where}: records who granted it, when and why`);
      }
      const contract = FAMILY_SPECS[family as ArtProductFamily]?.providerSku;
      if (contract && config?.providerSku !== contract)
        problems.push(
          `${at}: ${family} providerSku must be ${contract}, the product its file is drawn for`,
        );
    }
    for (const [artworkId, layout] of Object.entries(
      entry.suppliedLayout ?? {},
    )) {
      const artwork = source?.prints.some(
        (print) => print.artworkId === artworkId,
      )
        ? findArtwork(artworkId, registry)
        : undefined;
      const size = artwork && masterSize(artwork);
      if (!size)
        problems.push(
          `${at}: suppliedLayout ${artworkId} is not a fetched artwork of this collection`,
        );
      else if (
        Math.max(size.width, size.height) >
        Math.min(size.width, size.height) * 1.02
      )
        problems.push(
          `${at}: suppliedLayout is for square works; ${artworkId} is ${orientationOf(size)}`,
        );
      if (layout !== 'landscape' && layout !== 'portrait')
        problems.push(
          `${at}: suppliedLayout ${artworkId} must be landscape or portrait`,
        );
    }
  }

  const printSkus = new Set(
    printCatalog.collections.flatMap((collection) =>
      collection.prints.flatMap((print) =>
        printVariants(collection, print).map((variant) =>
          printSku(collection, print, variant.size),
        ),
      ),
    ),
  );
  const handles = new Set<string>();
  const identities = new Set<string>();
  const skus = new Set<string>();
  for (const product of catalog.products ?? []) {
    const at = `art-product ${product.handle || '(no handle)'}`;
    const spec = FAMILY_SPECS[product.family];
    if (!spec) {
      problems.push(`${at}: unknown family ${product.family}`);
      continue;
    }
    if (!SLUG.test(product.handle ?? ''))
      problems.push(`${at}: invalid handle`);
    if (handles.has(product.handle)) problems.push(`${at}: duplicate handle`);
    handles.add(product.handle);
    // One product per artwork per product type.
    const identity = `${product.artworkId}:${product.family}`;
    if (identities.has(identity))
      problems.push(
        `${at}: ${product.artworkId} already has a ${product.family} product`,
      );
    identities.add(identity);
    if (typeof product.released !== 'boolean')
      problems.push(`${at}: released must be true or false`);

    const config = collections.get(product.collection)?.families[
      product.family
    ];
    if (!config)
      problems.push(
        `${at}: collection ${product.collection} does not offer ${product.family}`,
      );
    const collection = printCatalog.collections.find(
      (c) => c.slug === product.collection,
    );
    const print = collection?.prints.find((p) => p.slug === product.print);
    if (!collection || !print) {
      problems.push(
        `${at}: unknown print ${product.collection}/${product.print}`,
      );
      continue;
    }
    if (print.artworkId !== product.artworkId)
      problems.push(`${at}: artwork must be ${print.artworkId}, as its print`);
    const ineligible = familyIneligibility(
      product.family,
      collection,
      print,
      crops,
    );
    if (ineligible) problems.push(`${at}: ${ineligible}`);
    if (product.handle !== familyHandle(print, product.family))
      problems.push(
        `${at}: handle must be ${familyHandle(print, product.family)}`,
      );
    if (product.title !== familyTitle(print, product.family))
      problems.push(
        `${at}: title must be "${familyTitle(print, product.family)}"`,
      );
    const artwork = findArtwork(product.artworkId, registry);
    const master = artwork && masterSize(artwork);
    if (!artwork) problems.push(`${at}: unknown artwork ${product.artworkId}`);
    else if (master && orientationOf(master) !== product.orientation)
      problems.push(`${at}: orientation must be ${orientationOf(master)}`);

    const expected = familyVariantDefs(
      product.family,
      familyLayout(product, collections.get(product.collection)),
    ).map((def) => ({
      file: def.file,
      key: def.key,
      option: def.values.join(' / '),
      priceEUR: familyVariantPrice(config, def),
      providerAttributes: def.providerAttributes,
      providerSku: def.providerSku ?? config?.providerSku,
    }));
    const variants = product.variants ?? [];
    if (
      variants.length !== expected.length ||
      variants.some((variant, index) => variant.key !== expected[index].key)
    )
      problems.push(
        `${at}: variants must be ${spec.single ? expected[0].key : spec.variantDefs ? expected.map((want) => want.key).join(', ') : `the ${expected.length} case devices in manifest order`}`,
      );
    for (const [index, variant] of variants.entries()) {
      const want = expected[index];
      const where = `${at} ${variant.key}`;
      const sku = spec.single
        ? familySku(collection, print, product.family)
        : (() => {
            try {
              return familySku(collection, print, product.family, variant.key);
            } catch {
              return '(no such variant)';
            }
          })();
      if (variant.sku !== sku) problems.push(`${where}: SKU must be ${sku}`);
      if (skus.has(variant.sku) || printSkus.has(variant.sku))
        problems.push(`${where}: duplicate SKU ${variant.sku}`);
      skus.add(variant.sku);
      if (want && variant.option !== want.option)
        problems.push(`${where}: option must be "${want.option}"`);
      if (want && variant.providerSku !== want.providerSku)
        problems.push(`${where}: provider SKU must be ${want.providerSku}`);
      if (
        want &&
        JSON.stringify(variant.providerAttributes ?? null) !==
          JSON.stringify(want.providerAttributes ?? null)
      )
        problems.push(
          `${where}: provider attributes must be ${JSON.stringify(want.providerAttributes ?? null)}`,
        );
      if (want && (variant.file ?? undefined) !== want.file)
        problems.push(`${where}: file must be ${want.file ?? '(none)'}`);
      if (
        (want && variant.priceEUR !== want.priceEUR) ||
        (variant.priceEUR !== undefined && !PRICE.test(variant.priceEUR))
      )
        problems.push(
          `${where}: price must be the collection's ${want?.priceEUR ?? '(pending, none)'}`,
        );
      if (spec.suppliedFiles && product.assets) {
        const file = variant.file && product.assets.files?.[variant.file];
        if (!file)
          problems.push(`${where}: no recorded ${variant.file ?? ''} file`);
        else if (file.provenance?.aiFill?.block_identical !== true)
          problems.push(
            `${where}: ${variant.file} has no check that the museum image is unchanged`,
          );
      }
      const inventory = variant.inventory;
      if (
        inventory?.policy !== 'DENY' ||
        inventory.quantity !== 0 ||
        inventory.tracked !== !product.released
      )
        problems.push(
          product.released
            ? `${where}: a released variant is untracked with DENY`
            : `${where}: a staged variant is tracked at zero with DENY`,
        );
      if (typeof variant.mapping?.verified !== 'boolean')
        problems.push(`${where}: mapping.verified must be true or false`);
    }
    if (
      config &&
      expected.some((want) => want.priceEUR === undefined) &&
      (product.shopify?.productId || product.released)
    )
      problems.push(
        `${at}: staged or released without an approved ${product.family} price`,
      );
    if (product.released === true)
      problems.push(
        ...familyReleaseIssues(product, {catalog, crops, registry}).map(
          (issue) => `${at}: released without ${issue}`,
        ),
      );
  }
  return problems;
}
