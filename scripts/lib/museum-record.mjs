/**
 * What every museum adapter shares (scripts/lib/museum-<key>.mjs): a
 * normalised candidate becomes a registry record, attribution and possible
 * other impressions are flagged, and a JPEG header gives an image's pixel
 * size. Pure functions, covered by scripts/museumArt.node-test.mjs.
 *
 * A normalised candidate has: museum, objectId, accessionNumber, apiUrl,
 * artistDisplayName, artistPrefix, artists[], creditLine, date, dimensions,
 * imageUrl, medium, objectUrl, publicDomain, rightsEvidenceUrl, series,
 * title, proposedShortTitle and, for capped image servers, fullResolution.
 */

import {artworkId, MUSEUMS} from '../../app/lib/artRegistry.ts';
import {proposeShortTitle} from './museum-met.mjs';

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/**
 * Pixel size from the start of a JPEG (its SOF segment), so search can show
 * which print sizes a candidate supports from a small range request instead
 * of downloading the original. Null when the bytes end before the SOF.
 */
export function jpegDimensions(bytes) {
  const data = Buffer.from(bytes);
  if (data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > data.length) return null;
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * Artist + short title, folded: equal keys flag possible other impressions
 * of the same design. Only a flag — impressions differ and are compared by
 * eye, never treated as interchangeable. Titles are shortened by the Met's
 * rules (series clauses, alternate titles, a trailing bracket) for every
 * museum, which at worst flags two works for a look.
 */
export function impressionKey(candidate) {
  const fold = (value) =>
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return `${fold(candidate.artistDisplayName)}|${fold(proposeShortTitle(candidate.title))}`;
}

/**
 * Reasons a candidate cannot be attributed to one artist automatically.
 * Disputed or collaborative attributions stay outside automated release.
 */
export function attributionIssues(candidate) {
  const issues = [];
  if (candidate.artistPrefix)
    issues.push(`attribution qualifier "${candidate.artistPrefix}"`);
  if (candidate.artists.length > 1)
    issues.push(`${candidate.artists.length} artist constituents`);
  if (!candidate.artistDisplayName) issues.push('no artist name');
  return issues;
}

/**
 * The registry record for a fetched object. `previous` keeps the people's
 * decisions unless the evidence they were made on has changed.
 */
export function artworkRecord(
  candidate,
  {
    artistId,
    evidenceFile,
    fetchedAt,
    metadataSha256,
    original,
    previous,
    shortTitle,
  },
) {
  const metadataChanged =
    previous && previous.source?.metadataSha256 !== metadataSha256;
  const imageChanged =
    previous?.original?.sha256 &&
    original?.sha256 &&
    previous.original.sha256 !== original.sha256;
  const reset = (review, reason) =>
    review && review.status !== 'pending'
      ? {
          note: `${reason} on ${fetchedAt.slice(0, 10)}; review again`,
          status: 'pending',
        }
      : (review ?? {status: 'pending'});
  const museum = MUSEUMS[candidate.museum];
  if (!museum) throw new Error(`unknown museum ${candidate.museum}`);
  return {
    id: artworkId(candidate.museum, candidate.objectId),
    artistId,
    title: candidate.title,
    shortTitle:
      shortTitle ||
      previous?.shortTitle ||
      candidate.proposedShortTitle ||
      candidate.title,
    date: candidate.date,
    medium: candidate.medium,
    ...(candidate.dimensions ? {dimensions: candidate.dimensions} : {}),
    ...(candidate.series ? {series: candidate.series} : {}),
    source: {
      museum: candidate.museum,
      institution: museum.institution,
      objectId: candidate.objectId,
      ...(candidate.accessionNumber
        ? {accessionNumber: candidate.accessionNumber}
        : {}),
      objectUrl: candidate.objectUrl,
      apiUrl: candidate.apiUrl,
      imageUrl: candidate.imageUrl,
      ...(candidate.fullResolution
        ? {fullResolution: candidate.fullResolution}
        : {}),
      artistDisplayName: candidate.artistDisplayName,
      artistPrefix: candidate.artistPrefix,
      creditLine: candidate.creditLine,
      rights: {
        publicDomain: candidate.publicDomain,
        designation: museum.rightsDesignation,
        evidenceUrl: candidate.rightsEvidenceUrl,
      },
      evidenceFile,
      fetchedAt,
      metadataSha256,
    },
    ...(original ? {original} : {}),
    reviews: {
      rights: metadataChanged
        ? reset(previous.reviews?.rights, 'museum record changed')
        : (previous?.reviews?.rights ?? {status: 'pending'}),
      master:
        metadataChanged || imageChanged
          ? reset(previous.reviews?.master, 'museum image or record changed')
          : (previous?.reviews?.master ?? {status: 'pending'}),
    },
    // A trim is in the original's pixels, so it only survives an unchanged image.
    ...(previous?.trim && !imageChanged ? {trim: previous.trim} : {}),
  };
}

/**
 * Why a downloaded image cannot be the museum's own pixels: a file larger
 * than the full resolution the museum reports was upscaled on the way.
 */
export function servedImageIssues(candidate, original) {
  const full = candidate.fullResolution;
  if (!full || !original) return [];
  return original.width > full.width || original.height > full.height
    ? [
        `served ${original.width}×${original.height} exceeds the museum's full resolution ${full.width}×${full.height} (upscaled)`,
      ]
    : [];
}
