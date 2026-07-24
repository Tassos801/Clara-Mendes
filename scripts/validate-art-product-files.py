#!/usr/bin/env python3
"""Validate generated art-product assets against the extension catalogue."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = REPO_ROOT / "data" / "art-product-extensions.json"
MANIFEST_PATH = REPO_ROOT / "output" / "prodigi-product-files" / "manifest.json"
PUBLIC_ROOT = REPO_ROOT / "public" / "images" / "art-product-extensions"


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    expected_production = {
        "large-print": 5,
        "classic-frame": 5,
        "greeting-card": 5,
        "postcard": 5,
        "spiral-notebook": 5,
        "gratitude-journal": 10,
        "calendar": 14,
        "stretched-canvas": 5,
        "canvas-tote": 5,
        "linen-cushion": 5,
        "fleece-blanket": 5,
        "snap-phone-case": 20,
        "collection-scene": 5,
    }
    counts = Counter(record["family"] for record in manifest["files"])
    if counts != Counter(expected_production):
        raise RuntimeError(f"Unexpected manifest counts: {dict(counts)}")

    seen_paths: set[str] = set()
    for record in manifest["files"]:
        relative_path = record["path"]
        if relative_path in seen_paths:
            raise RuntimeError(f"Duplicate manifest path: {relative_path}")
        seen_paths.add(relative_path)
        path = REPO_ROOT / relative_path
        if not path.exists() or path.stat().st_size == 0:
            raise RuntimeError(f"Missing or empty output: {path}")
        with Image.open(path) as image:
            if image.width != record["width"] or image.height != record["height"]:
                raise RuntimeError(f"Dimension mismatch: {path}")

    preview_count = 0
    for family in catalog["families"]:
        family_dir = PUBLIC_ROOT / family["id"]
        expected = 1 if family.get("collectionVariant") else 5
        files = sorted(family_dir.glob("*.webp"))
        if len(files) != expected:
            raise RuntimeError(
                f"{family['id']}: expected {expected} previews, found {len(files)}"
            )
        for path in files:
            with Image.open(path) as image:
                if image.size != (1600, 2000):
                    raise RuntimeError(
                        f"{path}: expected 1600x2000, found {image.size}"
                    )
            preview_count += 1

    print(
        f"Validated {len(manifest['files'])} production/review files and "
        f"{preview_count} Shopify preview images across "
        f"{len(catalog['families'])} product families."
    )


if __name__ == "__main__":
    main()
