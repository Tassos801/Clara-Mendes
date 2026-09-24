// Relative imports keep this module loadable by the plain-Node test runner.
import {
  CAPSULES,
  listShopCapsules,
  shopCapsulePath,
  type Capsule,
} from './capsules.ts';
import {capitalize, countWord} from './catalogSummary.ts';

export type CapsuleTile = {
  href: string;
  /** Lead artwork, shown at rest. */
  image: string;
  note: string;
  /** The same print on a wall, revealed on hover or keyboard focus. */
  room: string;
  slug: string;
  title: string;
  works: number;
  worksLabel: string;
};

const MOCKUPS = '/images/product-art-mockups';

/**
 * Room scene for a capsule's lead print. Launch capsules use the 20×24
 * room-detail mockup (their sofa set carries a size ruler); print-catalog
 * collections use the pipeline's living-room scene for the same print.
 */
export function capsuleRoomImage(capsule: Pick<Capsule, 'image' | 'slug'>) {
  if (CAPSULES.some((launch) => launch.slug === capsule.slug)) {
    return `${MOCKUPS}/${capsule.slug}/${capsule.slug}-01-room-detail-20x24.webp`;
  }
  const print = capsule.image
    .split('/')
    .pop()
    ?.replace(/\.webp$/, '');
  return `${MOCKUPS}/${capsule.slug}/${print}-living-room.jpg`;
}

/** One tile per shop capsule; released print-catalog collections join automatically. */
export function capsuleTiles(
  capsules: Capsule[] = listShopCapsules(),
): CapsuleTile[] {
  return capsules.map((capsule) => {
    const works = capsule.handles.length;
    return {
      href: shopCapsulePath(capsule.slug),
      image: capsule.image,
      note: capsule.note,
      room: capsuleRoomImage(capsule),
      slug: capsule.slug,
      title: capsule.title,
      works,
      worksLabel: `${works} ${works === 1 ? 'work' : 'works'}`,
    };
  });
}

export function capsuleIndexCopy(tiles: Array<Pick<CapsuleTile, 'works'>>) {
  const totalWorks = tiles.reduce((sum, tile) => sum + tile.works, 0);
  return {
    moods: `${capitalize(countWord(tiles.length))} moods.`,
    totalWorks,
    works: `${capitalize(countWord(totalWorks))} original works, in capsules that hang together.`,
  };
}

/**
 * Columns the closing "All works" tile spans so the grid's last row is
 * always full: the rest of the row, or a whole row when the capsules
 * already fill theirs.
 */
export function closingTileSpan(tileCount: number, columns: number) {
  return columns - (tileCount % columns);
}
