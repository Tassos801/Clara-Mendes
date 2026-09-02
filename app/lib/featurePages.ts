// Relative imports keep this module loadable by the plain-Node test runner.
import {
  featurePagePath,
  PERSONALISED_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from './catalogFilters.ts';

export type FeaturePage = {
  handle: string;
  path: string;
  navLabel: string;
  title: string;
  description: string;
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    priceLine: string;
    cta: string;
    image: {src: string; alt: string; width: number; height: number};
  };
  studio: {eyebrow: string; heading: string; note: string};
  occasions: Array<{title: string; line: string; image: string}>;
  how: Array<{title: string; body: string}>;
  faq: Array<{q: string; a: string}>;
  closing: string;
};

export const YOUR_SKY_PAGE: FeaturePage = {
  handle: SKY_PRODUCT_HANDLE,
  path: '/your-sky',
  navLabel: 'Your Sky',
  title: 'Your Sky — a personalised star map',
  description:
    'The real night sky over a place and a moment that matter, drawn as a fine-art print by Clara Mendes. Choose the place, date and title; printed to order in the EU.',
  hero: {
    eyebrow: 'A personalised star map',
    headline: 'The sky above you, the night it mattered.',
    sub: 'Every star as it truly stood over the place and the minute you choose — drawn as a Clara Mendes print, with your own title beneath it.',
    priceLine: 'From €39.99 · made to order in the EU · unframed or framed',
    cta: 'Design yours',
    image: {
      src: '/images/your-sky/hero-print.webp',
      alt: 'A framed Your Sky star map print — the linen edition in a natural frame on a dark wall',
      width: 2400,
      height: 1500,
    },
  },
  studio: {
    eyebrow: 'Your sky, your print',
    heading: 'Begin with a place and a date.',
    note: 'The map redraws as you type. Leave the time as it is for the evening sky, or set the exact hour.',
  },
  occasions: [
    {
      title: 'The night you met',
      line: 'The city, the date, the hour you still argue about.',
      image: '/images/your-sky/occasion-met.webp',
    },
    {
      title: 'The morning she was born',
      line: 'Her first sky, exactly as it stood over the hospital.',
      image: '/images/your-sky/occasion-born.webp',
    },
    {
      title: 'Where you said yes',
      line: 'The place, the evening, the stars that were watching.',
      image: '/images/your-sky/occasion-yes.webp',
    },
  ],
  how: [
    {
      title: 'Astronomically accurate',
      body: 'Star positions, the Moon and the visible planets are computed for your place and minute from the Hipparcos catalogue and astronomy-engine, then drawn above the true horizon.',
    },
    {
      title: 'Printed like the art',
      body: 'Giclée on 200gsm Enhanced Matte Art paper, unframed or in a natural or black classic frame — the same materials as every Clara Mendes print.',
    },
    {
      title: 'Made to order in the EU',
      body: 'Each map is printed for you after checkout, dispatched in 2–4 business days and delivered across the EU in 5–10.',
    },
  ],
  faq: [
    {
      q: 'Can I set an exact time?',
      a: 'Yes. The default is 22:00 local time — the evening sky — but any hour works, day or night; stars are shown as they stood above the horizon even by day.',
    },
    {
      q: 'Which finish should I choose?',
      a: 'Unframed if you already have a frame or want to choose one later; the natural or black classic frame arrives ready to hang.',
    },
    {
      q: 'Can it be a gift?',
      a: 'It usually is. Add the recipient’s address at checkout; the print ships in plain, white-label packaging with no price inside.',
    },
  ],
  closing: 'Begin with a place and a date.',
};

/**
 * Where a feature-page product's old product URL should go, query string
 * intact, or null when the handle has no page or the page is still dark.
 */
export function featurePageRedirect(
  handle: string | null | undefined,
  search: string,
  flags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS,
) {
  const path = featurePagePath(handle);
  if (!path || !handle || !flags[handle.toLowerCase()]) return null;
  return `${path}${search}`;
}
