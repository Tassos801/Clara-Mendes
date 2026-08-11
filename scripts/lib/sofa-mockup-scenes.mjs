export const LEGACY_SOFA_ALT_FOR = (shortTitle) =>
  `${shortTitle} 16 by 20 inch art print shown at scale above a sofa in a warm neutral living room`;

export const SOFA_SCENES = Object.freeze(
  [
    Object.freeze({
      heightInches: 10,
      key: 'sofa-8x10',
      label: '8 by 10 inch',
      sizeKey: '8x10',
      widthInches: 8,
    }),
    Object.freeze({
      heightInches: 20,
      key: 'sofa-16x20',
      label: '16 by 20 inch',
      sizeKey: '16x20',
      widthInches: 16,
    }),
    Object.freeze({
      heightInches: 24,
      key: 'sofa-20x24',
      label: '20 by 24 inch',
      sizeKey: '20x24',
      widthInches: 20,
    }),
  ].map((scene) =>
    Object.freeze({
      ...scene,
      fileSuffix: `room-sofa-${scene.sizeKey}`,
      altFor: (shortTitle) =>
        `${shortTitle} unframed ${scene.label} art print shown at relative scale above a sofa in a warm neutral living room`,
    }),
  ),
);

export function expectedSofaMockupAlts(shortTitle) {
  return SOFA_SCENES.map((scene) => scene.altFor(shortTitle));
}

export function sofaMockupFileName(sourceFileName, scene) {
  const base = sourceFileName.replace(/\.[a-z0-9]+$/i, '');
  return `${base}-${scene.fileSuffix}.jpg`;
}

export function sofaMockupRelativePath(catalogImagePath, scene) {
  const relative = catalogImagePath.replace(/^\/images\/product-art\//, '');
  const directory = relative.includes('/')
    ? relative.slice(0, relative.lastIndexOf('/'))
    : '';
  const file = sofaMockupFileName(
    relative.slice(relative.lastIndexOf('/') + 1),
    scene,
  );
  return directory ? `${directory}/${file}` : file;
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

export function mediaMatchesPlannedSource(media, planned) {
  const actual = fileNameFromUrl(mediaUrl(media));
  const expected = fileNameFromUrl(planned?.originalSource);
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  const extensionIndex = expected.lastIndexOf('.');
  const stem = expected.slice(0, extensionIndex);
  const extension = expected.slice(extensionIndex);
  const escapedStem = stem.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const escapedExtension = extension.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const shopifySuffix = '(?:\\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})';
  return new RegExp(
    `^${escapedStem}_${shopifySuffix}${escapedExtension}$`,
    'i',
  ).test(actual);
}

export function isSofaMedia(media) {
  const identity = `${media?.alt ?? ''} ${mediaUrl(media)}`.toLowerCase();
  return identity.includes('-room-sofa-') || identity.includes('above a sofa');
}

export function resolveSofaMediaPlan(existingMedia, plannedMedia, shortTitle) {
  const expectedByAlt = new Map(
    plannedMedia.map((planned) => [planned.alt, planned]),
  );
  const expectedMatches = existingMedia.filter((media) =>
    expectedByAlt.has(media?.alt),
  );
  const invalidExpected = expectedMatches.find((media) => {
    const planned = expectedByAlt.get(media.alt);
    return (
      media?.mediaContentType !== 'IMAGE' ||
      media?.status !== 'READY' ||
      !mediaMatchesPlannedSource(media, planned)
    );
  });
  const duplicateExpected = expectedMatches.find(
    (media, index) =>
      expectedMatches.findIndex((entry) => entry.alt === media.alt) !== index,
  );
  const currentByAlt = new Map(
    expectedMatches.map((media) => [media.alt, media]),
  );
  const legacy = existingMedia.find(
    (media) => media?.alt === LEGACY_SOFA_ALT_FOR(shortTitle),
  );
  const unexpectedSofa = existingMedia.find((media) => {
    if (!isSofaMedia(media)) return false;
    return !expectedByAlt.has(media?.alt) && media?.id !== legacy?.id;
  });
  const nonSofaCount = existingMedia.filter(
    (media) => !isSofaMedia(media),
  ).length;

  if (
    unexpectedSofa ||
    invalidExpected ||
    duplicateExpected ||
    nonSofaCount !== 7
  ) {
    return {
      action: 'mismatch',
      currentByAlt,
      duplicateExpected,
      invalidExpected,
      legacy,
      unexpectedSofa,
    };
  }

  if (
    currentByAlt.size === plannedMedia.length &&
    !legacy &&
    existingMedia.length === 10
  ) {
    return {action: 'complete', currentByAlt, legacy: null};
  }

  return {action: 'migrate', currentByAlt, legacy: legacy ?? null};
}
