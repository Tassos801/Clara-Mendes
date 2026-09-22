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
  }));
}
