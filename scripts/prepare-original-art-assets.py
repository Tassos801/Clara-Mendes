#!/usr/bin/env python3
"""Prepare web previews and 8x10 sample-print files from generated PNG art."""

from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "output" / "product-art"
PUBLIC_ROOT = REPO_ROOT / "public" / "images" / "product-art"
PRINT_ROOT = SOURCE_ROOT / "print-8x10-300dpi"


def main() -> None:
    sources = sorted(
        source
        for source in SOURCE_ROOT.glob("*/*.png")
        if source.parent.name != PRINT_ROOT.name
    )
    if len(sources) != 9:
        raise RuntimeError(f"Expected 9 source PNGs, found {len(sources)}")

    PRINT_ROOT.mkdir(parents=True, exist_ok=True)

    for source in sources:
        relative = source.relative_to(SOURCE_ROOT)
        web_path = (PUBLIC_ROOT / relative).with_suffix(".webp")
        print_path = PRINT_ROOT / f"{source.stem}-8x10-300dpi.jpg"
        web_path.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as opened:
            image = opened.convert("RGB")
            if image.size != (1120, 1400):
                raise RuntimeError(
                    f"{source.name} must be 1120x1400, found {image.size}"
                )

            image.save(web_path, "WEBP", quality=88, method=6)
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
    if len(web_files) != 9 or len(print_files) != 9:
        raise RuntimeError(
            f"Expected 9 web and 9 print files, found {len(web_files)} and "
            f"{len(print_files)}"
        )


if __name__ == "__main__":
    main()
