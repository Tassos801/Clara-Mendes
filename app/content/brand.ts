/**
 * The brand voice in one place. Pages import these sentences instead of
 * holding their own, so the line reads the same everywhere and a change
 * is one edit. "Original" is no longer the umbrella claim: the capsules
 * are "our own work", museum reproductions are "borrowed from museums",
 * and everything else is called what it is.
 *
 * Relative imports only: scripts/brand.node-test.mjs loads this file in
 * plain Node, which cannot resolve the Vite "~" alias.
 */

export const BRAND = {
  /** The homepage hero says this and nothing else (owner, 2026-10-29). */
  hero: {
    headline: 'Wherever it leads.',
  },
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
  newsletter: {
    footerLine: (code: string | null) =>
      `Letters from Nicosia — new work first${code ? ', 10 % off your first order' : ''}.`,
    label: 'Email address',
    placeholder: 'your@email.com',
    button: 'Sign me up',
    submitting: 'Signing you up…',
    success: (code: string | null) =>
      code
        ? `You're in. Your code: ${code} — 10 % off your first order.`
        : "You're in. New work reaches you first.",
    already: "You're already on the list. New work reaches you first.",
    invalid: "That doesn't look like an email address.",
    slowDown: 'One moment, then try again.',
    disabled:
      "Sign-ups aren't open yet. Write to hello@shopclaramendes.com and we'll add you by hand.",
    failed: "That didn't go through. Try again, or write to hello@shopclaramendes.com.",
    consent: 'By signing up you agree to receive emails from Clara Mendes. Unsubscribe any time.',
    privacyLabel: 'Privacy',
  },
  collection: {
    eyebrow: 'The collection',
    title: 'The collection so far.',
    /** `${works}` and `${capsules}` are number words from catalogSummary. */
    intro: (works: string, capsules: string) =>
      `Our own work: ${works} pieces in ${capsules} capsules, printed to order.`,
    cta: 'Shop the prints',
    note:
      'Unframed giclée prints in up to three sizes, on 200gsm Enhanced Matte Art paper, printed to order.',
  },
  ourStory: {
    title: "We like art. That's the plan.",
    intro: [
      'Clara Mendes started with fifteen prints of our own. Then we put art on phone cases, clothing and plant pots, and borrowed a few masterpieces from museums.',
      "We don't know what comes next. We promise it won't be boring.",
    ],
    capsulesLede:
      'Each capsule is a small family of our own works, composed so a single print carries a room and a pair or trio reads as one arrangement. Buy one now and add its companions later.',
    caseNote:
      'Every one of our own prints on a matte, dual-layer tough case for iPhone, Samsung Galaxy and Google Pixel.',
    closing: "Come back soon. It'll be different.",
    /** Meta description; kept under 155 characters. */
    description:
      "Clara Mendes started with fifteen prints of our own. Now: museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.",
  },
  shopAll: {
    heading: "Everything we've made so far",
    eyebrow: 'Our own work, borrowed masterpieces, curious objects',
    description:
      'Shop Clara Mendes: our own art prints, museum masterpieces, canvas, cards, phone cases, ceramic plant pots, book nook kits and activewear.',
    printsOnlyDescription:
      'Shop our own Clara Mendes art prints, from quiet geometry to cinematic imagined worlds.',
    collectionFallback: 'A Clara Mendes collection: art on things worth living with.',
  },
  footer: {
    blurb: 'We like art and follow it wherever it goes.',
  },
  seo: {
    homeTitle: 'Art Prints, Clothing and Curious Objects | Clara Mendes',
    homeDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    defaultDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    manifestDescription:
      'Our own prints, museum masterpieces, clothing, phone cases, plant pots and book nooks.',
    journalDescription:
      "Karina of Time — καρίνα, Greek for keel — is the Clara Mendes journal: notes on art, colour, and whatever we're making next. New issues by email.",
  },
} as const;
