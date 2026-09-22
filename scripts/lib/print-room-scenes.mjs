import path from 'node:path';
import {PRINT_ROOM_KEYS} from '../../app/lib/printCatalog.ts';

export const ROOM_KEYS = Object.freeze([...PRINT_ROOM_KEYS]);

const OUTPUT_ROOT = 'images/product-art-mockups';

export function validateRoomScenes(print) {
  const problems = [];
  const rooms = print.rooms ?? [];
  if (rooms.length !== ROOM_KEYS.length) {
    problems.push(`${print.slug}: expected four room scenes`);
  }
  const seenKeys = new Set();
  const seenAlts = new Set();
  for (const [index, room] of rooms.entries()) {
    if (room.key !== ROOM_KEYS[index]) {
      problems.push(
        `${print.slug}: room ${index + 1} must be ${ROOM_KEYS[index]}`,
      );
    }
    if (seenKeys.has(room.key)) {
      problems.push(`${print.slug}: duplicate room key ${room.key}`);
    }
    seenKeys.add(room.key);
    if (!room.alt?.trim()) problems.push(`${print.slug}/${room.key}: missing alt`);
    if (seenAlts.has(room.alt)) {
      problems.push(`${print.slug}: duplicate room alt`);
    }
    seenAlts.add(room.alt);
    if (!/^[a-z0-9-]+\.png$/i.test(room.backgroundFile ?? '')) {
      problems.push(`${print.slug}/${room.key}: invalid background file`);
    }
    const placement = room.placement ?? {};
    const values = ['left', 'top', 'width', 'height'].map(
      (key) => placement[key],
    );
    if (!values.every((value) => Number.isInteger(value) && value > 0)) {
      problems.push(`${print.slug}/${room.key}: invalid placement`);
      continue;
    }
    if (Math.abs(placement.width / placement.height - 0.8) > 0.01) {
      problems.push(`${print.slug}/${room.key}: placement must be 4:5 portrait`);
    }
  }
  return problems;
}

export function roomOutputFileName(print, room) {
  return `${print.slug}-${room.key}.jpg`;
}

export function roomMediaPlan(collection, print) {
  const problems = validateRoomScenes(print);
  if (problems.length) throw new Error(problems.join('; '));
  return print.rooms.map((room) => ({
    ...room,
    backgroundRelativePath: path.posix.join(
      collection.slug,
      room.backgroundFile,
    ),
    outputRelativePath: path.posix.join(
      collection.slug,
      roomOutputFileName(print, room),
    ),
    publicPath: path.posix.join(
      '/',
      OUTPUT_ROOT,
      collection.slug,
      roomOutputFileName(print, room),
    ),
    fileName: roomOutputFileName(print, room),
  }));
}

function mediaUrl(media) {
  return media?.image?.url || media?.preview?.image?.url || '';
}

function fileNameFromUrl(value) {
  if (!value) return '';
  try {
    const pathname = new URL(value).pathname;
    return decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1));
  } catch {
    return '';
  }
}

export function mediaMatchesRoomSource(media, planned) {
  const actual = fileNameFromUrl(mediaUrl(media));
  const expected = planned?.fileName ?? '';
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  const extensionIndex = expected.lastIndexOf('.');
  const stem = expected.slice(0, extensionIndex);
  const extension = expected.slice(extensionIndex);
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shopifySuffix =
    '(?:\\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})';
  return new RegExp(
    `^${escapedStem}_${shopifySuffix}${escapedExtension}$`,
    'i',
  ).test(actual);
}

export function resolvePrintRoomMediaPlan(existingMedia, plannedMedia, flatAlt) {
  const expectedByAlt = new Map(
    plannedMedia.map((planned) => [planned.alt, planned]),
  );
  const expectedMatches = existingMedia.filter((media) =>
    expectedByAlt.has(media?.alt),
  );
  const duplicateExpected = expectedMatches.find(
    (media, index) =>
      expectedMatches.findIndex((entry) => entry.alt === media.alt) !== index,
  );
  const invalidExpected = expectedMatches.find((media) => {
    const planned = expectedByAlt.get(media.alt);
    return (
      media?.mediaContentType !== 'IMAGE' ||
      media?.status === 'FAILED' ||
      (media?.status === 'READY' && !mediaMatchesRoomSource(media, planned))
    );
  });
  const currentByAlt = new Map(
    expectedMatches.map((media) => [media.alt, media]),
  );
  const nonRoom = existingMedia.filter(
    (media) => !expectedByAlt.has(media?.alt),
  );
  const flat = nonRoom.length === 1 ? nonRoom[0] : null;
  const validFlat =
    flat?.id &&
    flat.alt === flatAlt &&
    flat.mediaContentType === 'IMAGE' &&
    flat.status === 'READY' &&
    existingMedia[0]?.id === flat.id;
  const unexpected = nonRoom.find((media) => media?.id !== flat?.id);

  if (
    duplicateExpected ||
    invalidExpected ||
    unexpected ||
    !validFlat ||
    existingMedia.length > plannedMedia.length + 1
  ) {
    return {
      action: 'mismatch',
      currentByAlt,
      duplicateExpected,
      flat,
      invalidExpected,
      unexpected,
    };
  }

  const complete =
    existingMedia.length === plannedMedia.length + 1 &&
    plannedMedia.every((planned, index) => {
      const current = currentByAlt.get(planned.alt);
      return (
        current?.status === 'READY' &&
        mediaMatchesRoomSource(current, planned) &&
        existingMedia[index + 1]?.id === current.id
      );
    });
  return {action: complete ? 'complete' : 'migrate', currentByAlt, flat};
}
