#!/usr/bin/env python3
"""Prepare Prodigi production files for an original-art expansion size.

The source artwork is preserved at its native 4:5 ratio. The 16x20 output is a
straight high-quality resize. The 20x24 output uses a centered full-bleed 5:6
crop (about 2% from the top and bottom) before resizing to Prodigi's recommended
6000x7200 pixels. The manifest records source and crop dimensions so resized
files are never mistaken for additional native artwork detail.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "output" / "product-art"
CATALOG_PATH = REPO_ROOT / "data" / "original-art-catalog.json"
TARGET_DPI = 300
TARGETS = {
    "16x20": {
        "format": "Unframed 16 x 20 inch enhanced matte art print",
        "prodigiSku": "ART-FAP-EMA-16X20",
        "ratio": (4, 5),
        "size": (4800, 6000),
        "skuSuffix": "16X20",
    },
    "20x24": {
        "format": "Unframed 20 x 24 inch enhanced matte art print",
        "prodigiSku": "GLOBAL-FAP-20X24",
        "ratio": (5, 6),
        "size": (6000, 7200),
        "skuSuffix": "20X24",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def centered_crop(image: Image.Image, ratio: tuple[int, int]) -> tuple[Image.Image, tuple[int, int, int, int]]:
    width, height = image.size
    target_ratio = ratio[0] / ratio[1]
    source_ratio = width / height

    if abs(source_ratio - (4 / 5)) > 0.01:
        raise RuntimeError(
            f"Source must be approximately 4:5, found {width}x{height}"
        )

    if source_ratio > target_ratio:
        crop_width = round(height * target_ratio)
        left = (width - crop_width) // 2
        box = (left, 0, left + crop_width, height)
    else:
        crop_height = round(width / target_ratio)
        top = (height - crop_height) // 2
        box = (0, top, width, top + crop_height)

    return image.crop(box), box


def source_path_for(item: dict) -> Path:
    relative = item["image"].removeprefix("/images/product-art/")
    return (SOURCE_ROOT / relative).with_suffix(".png")


def normalized_dpi(image: Image.Image) -> tuple[int, int] | None:
    dpi = image.info.get("dpi")
    if not dpi:
        return None
    return tuple(round(value) for value in dpi)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", choices=sorted(TARGETS), default="16x20")
    return parser.parse_args()


def main() -> None:
    size_key = parse_args().size
    target = TARGETS[size_key]
    target_size = target["size"]
    output_root = SOURCE_ROOT / f"print-{size_key}-300dpi"
    manifest_path = output_root / "manifest.json"

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

    output_root.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []

    for item in catalog:
        source_path = source_path_for(item)
        output_path = output_root / f"{source_path.stem}-{size_key}-300dpi.jpg"

        with Image.open(source_path) as opened:
            source_size = opened.size
            art, crop_box = centered_crop(opened.convert("RGB"), target["ratio"])
            cropped_size = art.size
            resized = art.resize(target_size, Image.Resampling.LANCZOS)
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

        if actual_size != target_size:
            raise RuntimeError(
                f"{output_path.name}: expected {target_size}, found {actual_size}"
            )
        if actual_dpi != (TARGET_DPI, TARGET_DPI):
            raise RuntimeError(
                f"{output_path.name}: expected 300 DPI, found {actual_dpi}"
            )

        records.append(
            {
                "handle": item["handle"],
                "title": item["title"],
                "shopifySku": f"{item['skuPrefix']}-{target['skuSuffix']}",
                "prodigiSku": target["prodigiSku"],
                "source": {
                    "path": source_path.relative_to(REPO_ROOT).as_posix(),
                    "width": source_size[0],
                    "height": source_size[1],
                    "sha256": sha256(source_path),
                },
                "crop": {
                    "mode": "centered-full-bleed",
                    "box": list(crop_box),
                    "width": cropped_size[0],
                    "height": cropped_size[1],
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

    generated_files = sorted(output_root.glob(f"*-{size_key}-300dpi.jpg"))
    if len(generated_files) != len(catalog):
        raise RuntimeError(
            f"Expected {len(catalog)} generated files, found {len(generated_files)}"
        )

    manifest = {
        "format": target["format"],
        "prodigiSku": target["prodigiSku"],
        "target": {
            "width": target_size[0],
            "height": target_size[1],
            "dpi": TARGET_DPI,
        },
        "sourceDetailNote": (
            "Files are resized from the recorded source dimensions; pixel dimensions "
            "do not imply additional native artwork detail."
        ),
        "files": records,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Prepared and validated {len(records)}/15 files. Manifest: {manifest_path}"
    )


if __name__ == "__main__":
    main()
