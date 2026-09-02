#!/usr/bin/env node
// Reads a rendered MP4 back and asserts the film's contract:
// 45.0 s, 1920 x 1080, 24 fps, no audio track.
import {ALL_FORMATS, FilePathSource, Input} from 'mediabunny';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-render.mjs <file.mp4>');
  process.exit(2);
}

const readNumber = async (track, method, property) =>
  typeof track[method] === 'function' ? await track[method]() : track[property];

const input = new Input({formats: ALL_FORMATS, source: new FilePathSource(file)});
const duration = await input.computeDuration();
const video = await input.getPrimaryVideoTrack();
const audio = await input.getPrimaryAudioTrack();
if (!video) {
  console.error('FAIL no video track');
  process.exit(1);
}
const width = await readNumber(video, 'getDisplayWidth', 'displayWidth');
const height = await readNumber(video, 'getDisplayHeight', 'displayHeight');
const stats = await video.computePacketStats();
const fps = stats.averagePacketRate;

let failed = false;
const expect = (label, ok, actual) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}`);
  if (!ok) failed = true;
};

expect('duration 45.0 s', Math.abs(duration - 45) < 0.1, duration.toFixed(3));
expect('width 1920', width === 1920, width);
expect('height 1080', height === 1080, height);
expect('24 fps', Math.abs(fps - 24) < 0.05, fps.toFixed(3));
expect('no audio track', audio === null, audio ? 'present' : 'none');

process.exit(failed ? 1 : 0);
