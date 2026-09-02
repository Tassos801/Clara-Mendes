export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const PAPER = '#fbfaf6';
export const INK = '#26231f';
export const CLAY = '#9c6f5d';

/** Where the crop centres, as fractions of the image (CSS object-position). */
export type Focal = {x: number; y: number};

export type Motion =
  | {kind: 'push'; from: number; to: number}
  | {kind: 'drift'; scale: number; from: number; to: number};

export type Picture = {src: string; focal: Focal; motion: Motion};

export type LowerThird = {name: string; line: string};

export type Beat =
  | {
      kind: 'scene';
      id: string;
      seconds: number;
      picture: Picture;
      crossfadeTo?: Picture;
      caption?: string;
      lowerThird?: LowerThird;
    }
  | {kind: 'cuts'; id: string; seconds: number; pictures: Picture[]; caption: string}
  | {kind: 'trio'; id: string; seconds: number; prints: string[]; caption: string}
  | {
      kind: 'end';
      id: string;
      seconds: number;
      background: Picture;
      wordmark: string;
      url: string;
    };

const MOCKUPS = 'images/product-art-mockups';
const ART = 'images/product-art';
const EDITORIAL = 'images/home-editorial';
const BACKDROPS = 'images/backdrops';

const at = (x: number, y: number): Focal => ({x, y});
const push = (from: number, to: number): Motion => ({kind: 'push', from, to});
const drift = (scale: number, from: number, to: number): Motion => ({
  kind: 'drift',
  scale,
  from,
  to,
});
const picture = (src: string, focal: Focal, motion: Motion): Picture => ({
  src,
  focal,
  motion,
});

const print = (capsule: string, index: string): Picture =>
  picture(`${ART}/${capsule}/${capsule}-${index}.webp`, at(0.5, 0.5), push(1.0, 1.06));

export const BEATS: readonly Beat[] = [
  {
    kind: 'scene',
    id: 'open',
    seconds: 4.0,
    picture: picture(`${EDITORIAL}/quiet-form-living.jpg`, at(0.5, 0.36), push(1.04, 1.1)),
    caption: "Today we're opening Clara Mendes.",
  },
  {
    kind: 'scene',
    id: 'fifteen',
    seconds: 3.5,
    picture: picture(
      `${MOCKUPS}/quiet-form/quiet-form-01-room-detail-20x24.webp`,
      at(0.5, 0.45),
      drift(1.06, -30, 30),
    ),
    caption: 'Fifteen original works, in five capsules, made to live with.',
  },
  {
    kind: 'trio',
    id: 'trio-quiet-form',
    seconds: 3.5,
    prints: [
      `${ART}/quiet-form/quiet-form-01.webp`,
      `${ART}/quiet-form/quiet-form-02.webp`,
      `${ART}/quiet-form/quiet-form-03.webp`,
    ],
    caption: 'Each capsule holds three works composed together.',
  },
  {
    kind: 'scene',
    id: 'capsule-quiet-form',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/quiet-form/quiet-form-01-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('quiet-form', '01'),
    lowerThird: {name: 'Quiet Form', line: 'Sculptural arches, warm architectural balance'},
  },
  {
    kind: 'scene',
    id: 'capsule-patina-blue',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/patina-blue/patina-blue-01-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('patina-blue', '01'),
    lowerThird: {name: 'Patina Blue', line: 'Weathered indigo across a chalk-white field'},
  },
  {
    kind: 'scene',
    id: 'capsule-neo-deco',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/neo-deco/neo-deco-01-room-sofa-20x24.jpg`,
      at(0.5, 0.36),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('neo-deco', '01'),
    lowerThird: {name: 'Neo Deco', line: 'The discipline of Deco, none of its gilt'},
  },
  {
    kind: 'scene',
    id: 'capsule-sunlit-mosaic',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/sunlit-mosaic/sunlit-mosaic-02-room-context-20x24.webp`,
      at(0.5, 0.42),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('sunlit-mosaic', '02'),
    lowerThird: {name: 'Sunlit Mosaic', line: 'Torn paper, mineral colour, warm rhythm'},
  },
  {
    kind: 'scene',
    id: 'capsule-midnight-garden',
    seconds: 3.0,
    picture: picture(
      `${MOCKUPS}/midnight-garden/midnight-garden-01-room-detail-20x24.webp`,
      at(0.5, 0.45),
      push(1.02, 1.06),
    ),
    crossfadeTo: print('midnight-garden', '01'),
    lowerThird: {name: 'Midnight Garden', line: 'Botanicals after dark'},
  },
  {
    kind: 'cuts',
    id: 'sizes',
    seconds: 4.0,
    pictures: [
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-8x10.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-16x20.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
      picture(`${MOCKUPS}/quiet-form/quiet-form-01-room-sofa-20x24.jpg`, at(0.5, 0.4), push(1.0, 1.0)),
    ],
    caption: 'Three sizes. Printed when you order it.',
  },
  {
    kind: 'scene',
    id: 'paper',
    seconds: 3.5,
    picture: picture(`${EDITORIAL}/patina-blue-detail.jpg`, at(0.5, 0.45), push(1.02, 1.08)),
    caption: 'Giclée on 200 gsm enhanced matte paper.',
  },
  {
    kind: 'trio',
    id: 'trio-midnight-garden',
    seconds: 3.5,
    prints: [
      `${ART}/midnight-garden/midnight-garden-01.webp`,
      `${ART}/midnight-garden/midnight-garden-02.webp`,
      `${ART}/midnight-garden/midnight-garden-03.webp`,
    ],
    caption: 'Buy one now. Add its companions later.',
  },
  {
    kind: 'scene',
    id: 'open-today',
    seconds: 3.5,
    picture: picture(`${EDITORIAL}/quiet-form-living.jpg`, at(0.5, 0.36), push(1.08, 1.02)),
    caption: 'Clara Mendes is open today. Ships across the EU.',
  },
  {
    kind: 'end',
    id: 'end-card',
    seconds: 4.5,
    background: picture(`${BACKDROPS}/hero-interior.jpg`, at(0.5, 0.5), drift(1.08, 0, -40)),
    wordmark: 'Clara Mendes',
    url: 'shopclaramendes.com',
  },
];

export const framesFor = (seconds: number): number => Math.round(seconds * FPS);

export const beatFrames = (beat: Beat): number => framesFor(beat.seconds);

export const totalFrames = (beats: readonly Beat[]): number =>
  beats.reduce((sum, beat) => sum + beatFrames(beat), 0);

export const beatStarts = (beats: readonly Beat[]): number[] => {
  let from = 0;
  return beats.map((beat) => {
    const start = from;
    from += beatFrames(beat);
    return start;
  });
};

export const picturesOf = (beat: Beat): string[] => {
  switch (beat.kind) {
    case 'scene':
      return beat.crossfadeTo ? [beat.picture.src, beat.crossfadeTo.src] : [beat.picture.src];
    case 'cuts':
      return beat.pictures.map((item) => item.src);
    case 'trio':
      return beat.prints;
    case 'end':
      return [beat.background.src];
  }
};
