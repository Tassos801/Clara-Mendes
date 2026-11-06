/**
 * The artists our clothing lines are inspired by, for the /artists page.
 * They are NOT museum works: each line is our own composition, credited
 * "Inspired by …", never "Art by" or as a reproduction. A line shows on
 * /artists only while its capsule has a listed piece.
 *
 * Facts: life dates and movement from the standard references (Van
 * Doesburg: De Stijl co-founder; Malevich: born in Kyiv, founder of
 * Suprematism; Taeuber-Arp: Swiss, Dada and abstract art). Line copy
 * follows each line's README and product copy.
 */
export type ClothingArtist = {
  /** The capsule collection handle. */
  capsule: string;
  name: string;
  /** Dates, then place or nationality, then movement, like the museum rows. */
  meta: string[];
  note: string;
};

export const CLOTHING_ARTISTS: readonly ClothingArtist[] = [
  {
    capsule: 'counter-diagonal',
    name: 'Theo van Doesburg',
    meta: ['1883–1931', 'Dutch', 'De Stijl'],
    note: 'Counter-Diagonal is our own composition, tilted to the 45° angle of his counter-compositions.',
  },
  {
    capsule: 'free-abyss',
    name: 'Kazimir Malevich',
    meta: ['1879–1935', 'Born in Kyiv', 'Suprematism'],
    note: 'Free Abyss is our own Suprematist composition, with the closing line of his 1919 text “Suprematism”, in our translation.',
  },
  {
    capsule: 'circle-rhythm',
    name: 'Sophie Taeuber-Arp',
    meta: ['1889–1943', 'Swiss', 'Dada and abstraction'],
    note: 'Circle Rhythm is our own composition of circles, rings and bars, with a line from her 1922 essay on ornamental design, in our translation.',
  },
];
