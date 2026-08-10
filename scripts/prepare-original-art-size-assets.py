#!/usr/bin/env python3
"""Prepare the 16x20 Prodigi files for every original-art product.

The source artwork is preserved. This script performs only the existing 4:5
crop and a high-quality resize to Prodigi's recommended 4800x6000 pixels. The
manifest records the source dimensions so the resize is never mistaken for
additional native detail.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "output" / "product-art"
OUTPUT_ROOT = SOURCE_ROOT / "print-16x20-300dpi"
CATALOG_PATH = REPO_ROOT / "data" / "original-art-catalog.json"
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"
TARGET_SIZE = (4800, 6000)
TARGET_DPI = 300
PRODIGI_SKU = "ART-FAP-EMA-16X20"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def crop_to_four_by_five(image: Image.Image) -> Image.Image:
    width, height = image.size
    target_ratio = 4 / 5
    source_ratio = width / height

    if abs(source_ratio - target_ratio) > 0.01:
        raise RuntimeError(
            f"Source must be approximately 4:5, found {width}x{height}"
        )

    if source_ratio > target_ratio:
        crop_width = round(height * target_ratio)
        left = (width - crop_width) // 2
        return image.crop((left, 0, left + crop_width, height))

    crop_height = round(width / target_ratio)
    top = (height - crop_height) // 2
    return image.crop((0, top, width, top + crop_height))


def source_path_for(item: dict) -> Path:
    relative = item["image"].removeprefix("/images/product-art/")
    return (SOURCE_ROOT / relative).with_suffix(".png")


def output_path_for(item: dict) -> Path:
    source = source_path_for(item)
    return OUTPUT_ROOT / f"{source.stem}-16x20-300dpi.jpg"


def normalized_dpi(image: Image.Image) -> tuple[int, int] | None:
    dpi = image.info.get("dpi")
    if not dpi:
        return None
    return tuple(round(value) for value in dpi)


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if len(catalog) != 15:
        raise RuntimeError(f"Expected 15 original artworks, found {len(catalog)}")

    missing = [
        source_path_for(item) for item in catalog if not source_path_for(item).exists()
    ]
    if missing:
        raise RuntimeError(
            "Missing source artwork:\n" + "\n".join(f"  {path}" for path in missing)
        )

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []

    for item in catalog:
        source_path = source_path_for(item)
        output_path = output_path_for(item)

        with Image.open(source_path) as opened:
            source_size = opened.size
            art = crop_to_four_by_five(opened.convert("RGB"))
            resized = art.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
            resized.save(
                output_path,
                "JPEG",
                quality=95,
                subsampling=0,
                optimize=True,
                dpi=(TARGET_DPI, TARGET_DPI),
            )

        with Image.open(output_path) as generated:
            actual_size = generated.size
            actual_dpi = normalized_dpi(generated)

        if actual_size != TARGET_SIZE:
            raise RuntimeError(
                f"{output_path.name}: expected {TARGET_SIZE}, found {actual_size}"
            )
        if actual_dpi != (TARGET_DPI, TARGET_DPI):
            raise RuntimeError(
                f"{output_path.name}: expected 300 DPI, found {actual_dpi}"
            )

        records.append(
            {
                "handle": item["handle"],
                "title": item["title"],
                "shopifySku": f"{item['skuPrefix']}-16X20",
                "prodigiSku": PRODIGI_SKU,
                "source": {
                    "path": source_path.relative_to(REPO_ROOT).as_posix(),
                    "width": source_size[0],
                    "height": source_size[1],
                    "sha256": sha256(source_path),
                },
                "output": {
                    "path": output_path.relative_to(REPO_ROOT).as_posix(),
                    "width": actual_size[0],
                    "height": actual_size[1],
                    "dpi": list(actual_dpi),
                    "sha256": sha256(output_path),
                },
            }
        )
        print(f"  READY  {item['handle']} -> {output_path.name}")

    generated_files = sorted(OUTPUT_ROOT.glob("*-16x20-300dpi.jpg"))
    if len(generated_files) != len(catalog):
        raise RuntimeError(
            f"Expected {len(catalog)} generated files, found {len(generated_files)}"
        )

    manifest = {
        "format": "Unframed 16 x 20 inch enhanced matte art print",
        "prodigiSku": PRODIGI_SKU,
        "target": {"width": 4800, "height": 6000, "dpi": 300},
        "sourceDetailNote": (
            "Files are resized from the recorded source dimensions; pixel dimensions "
            "do not imply additional native artwork detail."
        ),
        "files": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared and validated {len(records)}/15 files. Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
