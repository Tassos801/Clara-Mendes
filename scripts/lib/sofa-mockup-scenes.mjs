export const SOFA_SCENE = Object.freeze({
  key: 'sofa-16x20',
  sizeKey: '16x20',
  fileSuffix: 'room-sofa-16x20',
  altFor: (shortTitle) =>
    `${shortTitle} 16 by 20 inch art print shown at scale above a sofa in a warm neutral living room`,
});

export function expectedSofaMockupAlt(shortTitle) {
  return SOFA_SCENE.altFor(shortTitle);
}

export function sofaMockupFileName(sourceFileName) {
  const base = sourceFileName.replace(/\.[a-z0-9]+$/i, '');
  return `${base}-${SOFA_SCENE.fileSuffix}.jpg`;
}

export function sofaMockupRelativePath(catalogImagePath) {
  const relative = catalogImagePath.replace(/^\/images\/product-art\//, '');
  const directory = relative.includes('/')
    ? relative.slice(0, relative.lastIndexOf('/'))
    : '';
  const file = sofaMockupFileName(
    relative.slice(relative.lastIndexOf('/') + 1),
  );
  return directory ? `${directory}/${file}` : file;
}

function mediaUrl(media) {
  return media?.image?.url || media?.preview?.image?.url || '';
}

export function resolveSofaMediaPlan(existingMedia, plannedMedia) {
  const exact = existingMedia.find((media) => media?.alt === plannedMedia.alt);
  if (exact) {
    return existingMedia.length === 8
      ? {action: 'complete', media: exact}
      : {action: 'mismatch', media: exact};
  }

  const possibleDuplicate = existingMedia.find((media) => {
    const identity = `${media?.alt ?? ''} ${mediaUrl(media)}`.toLowerCase();
    return (
      identity.includes(`-${SOFA_SCENE.fileSuffix}.`) ||
      identity.includes('shown at scale above a sofa')
    );
  });
  if (possibleDuplicate || existingMedia.length !== 7) {
    return {action: 'mismatch', media: possibleDuplicate ?? null};
  }

  return {action: 'append', media: null};
}
