#!/usr/bin/env python3
"""Prepare web previews and 8x10 sample-print files from generated PNG art."""

import json
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "output" / "product-art"
PUBLIC_ROOT = REPO_ROOT / "public" / "images" / "product-art"
PRINT_ROOT = SOURCE_ROOT / "print-8x10-300dpi"
CATALOG_PATH = REPO_ROOT / "data" / "original-art-catalog.json"


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


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    expected_count = len(catalog)
    sources = sorted(
        source
        for source in SOURCE_ROOT.glob("*/*.png")
        if source.parent.name != PRINT_ROOT.name
    )
    if len(sources) != expected_count:
        raise RuntimeError(
            f"Expected {expected_count} source PNGs, found {len(sources)}"
        )

    PRINT_ROOT.mkdir(parents=True, exist_ok=True)

    for source in sources:
        relative = source.relative_to(SOURCE_ROOT)
        web_path = (PUBLIC_ROOT / relative).with_suffix(".webp")
        print_path = PRINT_ROOT / f"{source.stem}-8x10-300dpi.jpg"
        web_path.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as opened:
            image = crop_to_four_by_five(opened.convert("RGB"))
            web_image = image.resize((1120, 1400), Image.Resampling.LANCZOS)

            web_image.save(web_path, "WEBP", quality=88, method=6)
            image.resize((2400, 3000), Image.Resampling.LANCZOS).save(
                print_path,
                "JPEG",
                quality=95,
                subsampling=0,
                dpi=(300, 300),
                optimize=True,
            )

        print(f"{relative.as_posix()} -> {web_path.name} + {print_path.name}")

    web_files = list(PUBLIC_ROOT.glob("*/*.webp"))
    print_files = list(PRINT_ROOT.glob("*.jpg"))
    if len(web_files) != expected_count or len(print_files) != expected_count:
        raise RuntimeError(
            f"Expected {expected_count} web and print files, found "
            f"{len(web_files)} and {len(print_files)}"
        )


if __name__ == "__main__":
    main()
