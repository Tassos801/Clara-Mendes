function uniqueStrings(values = []) {
  return [
    ...new Set(values.filter((value) => typeof value === 'string' && value)),
  ];
}

/**
 * `expectedExtensionHandles` are the still-Draft families that must never
 * reach Google; `releasedExtensionHandles` are live families that may be
 * published and approved (neither required nor flagged).
 */
export function validateGooglePublicationReadiness({
  approvedHandles,
  expectedExtensionHandles,
  expectedOriginalHandles,
  googlePublicationIds,
  publicationAuditAvailable,
  publicationProducts,
  releasedExtensionHandles = [],
}) {
  const issues = [];
  const publicationIds = uniqueStrings(googlePublicationIds);

  if (!publicationAuditAvailable) {
    issues.push(
      'Google publication data is unavailable; read_publications is required',
    );
  }
  if (publicationIds.length !== 1) {
    issues.push(
      `expected exactly one Google publication, found ${publicationIds.length}`,
    );
  }

  if (!publicationAuditAvailable || publicationIds.length !== 1) {
    issues.push('Google approval status is unavailable');
    return issues;
  }

  const publicationId = publicationIds[0];
  const byHandle = new Map(
    (publicationProducts ?? []).map((product) => [product.handle, product]),
  );
  const isPublished = (product) =>
    (product?.resourcePublicationsV2?.nodes ?? []).some(
      (entry) =>
        entry?.publication?.id === publicationId && entry?.isPublished === true,
    );

  for (const handle of expectedOriginalHandles) {
    if (!isPublished(byHandle.get(handle))) {
      issues.push(`${handle}: original is not published to Google`);
    }
  }
  for (const handle of expectedExtensionHandles) {
    if (isPublished(byHandle.get(handle))) {
      issues.push(`${handle}: Draft extension leaked to Google publication`);
    }
  }

  if (!Array.isArray(approvedHandles)) {
    issues.push('Google approval status is unavailable');
    return issues;
  }

  const approved = new Set(uniqueStrings(approvedHandles));
  const expectedOriginals = new Set(expectedOriginalHandles);
  const expectedExtensions = new Set(expectedExtensionHandles);
  const releasedExtensions = new Set(releasedExtensionHandles);
  for (const handle of expectedOriginals) {
    if (!approved.has(handle)) {
      issues.push(`${handle}: original is not Google-approved`);
    }
  }
  for (const handle of approved) {
    if (expectedExtensions.has(handle)) {
      issues.push(`${handle}: Draft extension is Google-approved`);
    } else if (
      !expectedOriginals.has(handle) &&
      !releasedExtensions.has(handle)
    ) {
      issues.push(`${handle}: unexpected product is Google-approved`);
    }
  }

  return issues;
}

export function validateGoogleAttributeReadback({
  expectedExtensionHandles,
  originals,
  readback,
  releasedExtensionHandles = [],
}) {
  if (!readback || typeof readback !== 'object') {
    return ['Google product-attribute readback is required in strict mode'];
  }

  const issues = [];
  if (readback.version !== 1) issues.push('readback version must be 1');
  if (!String(readback.merchantId ?? '').trim()) {
    issues.push('readback Merchant Center ID is missing');
  }
  if (!/google|merchant/i.test(String(readback.source ?? ''))) {
    issues.push('readback source must identify Google or Merchant Center');
  }
  if (!Number.isFinite(Date.parse(String(readback.verifiedAt ?? '')))) {
    issues.push('readback verifiedAt must be an ISO date');
  }

  const expectedVariants = originals.flatMap((product) =>
    (product?.variants?.nodes ?? []).map((variant) => ({
      handle: product.handle,
      sku: String(variant?.sku ?? '').trim(),
    })),
  );
  const entries = Array.isArray(readback.products) ? readback.products : [];
  const entriesBySku = new Map();
  for (const entry of entries) {
    const sku = String(entry?.sku ?? '').trim();
    const values = entriesBySku.get(sku) ?? [];
    values.push(entry);
    entriesBySku.set(sku, values);
  }

  if (entries.length !== expectedVariants.length) {
    issues.push(
      `readback has ${entries.length} products, expected ${expectedVariants.length} variants`,
    );
  }

  for (const expected of expectedVariants) {
    const matches = entriesBySku.get(expected.sku) ?? [];
    if (matches.length !== 1) {
      issues.push(
        `${expected.sku || expected.handle}: expected one Google readback entry, found ${matches.length}`,
      );
      continue;
    }

    const entry = matches[0];
    if (entry.handle !== expected.handle) {
      issues.push(`${expected.sku}: readback handle does not match Shopify`);
    }
    if (entry.mpn !== expected.sku) {
      issues.push(`${expected.sku}: Google MPN does not match SKU`);
    }
    if (entry.customProduct !== true) {
      issues.push(`${expected.sku}: customProduct is not true`);
    }
    if (String(entry.gtin ?? '').trim()) {
      issues.push(`${expected.sku}: GTIN must be blank for original art`);
    }
    if (!String(entry.googleProductCategory ?? '').trim()) {
      issues.push(`${expected.sku}: Google Product Category is missing`);
    }
    if (entry.status !== 'approved') {
      issues.push(
        `${expected.sku}: Google status is ${entry.status || 'missing'}`,
      );
    }

    try {
      const link = new URL(String(entry.link ?? ''));
      if (
        link.protocol !== 'https:' ||
        link.hostname !== 'shopclaramendes.com' ||
        link.pathname !== `/products/${expected.handle}`
      ) {
        issues.push(`${expected.sku}: link is not the Hydrogen product URL`);
      }
    } catch {
      issues.push(`${expected.sku}: link is not the Hydrogen product URL`);
    }
  }

  const excluded = new Set(uniqueStrings(readback.excludedHandles));
  for (const handle of expectedExtensionHandles) {
    if (!excluded.has(handle)) {
      issues.push(`${handle}: Draft extension exclusion is not evidenced`);
    }
  }
  for (const handle of excluded) {
    if (
      !expectedExtensionHandles.includes(handle) &&
      !releasedExtensionHandles.includes(handle)
    ) {
      issues.push(`${handle}: unexpected excluded handle in readback`);
    }
  }

  return issues;
}
