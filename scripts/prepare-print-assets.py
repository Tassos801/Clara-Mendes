"""Export approved artwork sources to the storefront WebP and 300 DPI print files.

Called by `npm run product -- prepare <collection>`; not meant to be run by hand.
This is file preparation only. Resizing does not add native source detail, so
the report carries the native pixels-per-inch for every size.
"""
import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

WEB_SIZE = (1120, 1400)
SOURCE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_source(source_dir: Path, slug: str) -> Path:
    for extension in SOURCE_EXTENSIONS:
        candidate = source_dir / (slug + extension)
        if candidate.exists():
            return candidate
    raise SystemExit(f"Missing source artwork: {source_dir / slug}.(png|jpg|tif)")


def to_rgb(opened: Image.Image) -> tuple[Image.Image, bytes]:
    """RGB pixels plus an ICC profile that actually describes them.

    RGB sources keep their own profile. A CMYK or greyscale profile must not
    be embedded in an RGB file, so those sources are colour-managed into sRGB
    (or, without a profile, converted plainly and saved untagged).
    """
    icc = opened.info.get("icc_profile") or b""
    if opened.mode in ("RGB", "RGBA", "RGBX", "P", "PA"):
        return opened.convert("RGB"), icc
    if icc:
        srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))
        rgb = ImageCms.profileToProfile(
            opened, ImageCms.ImageCmsProfile(BytesIO(icc)), srgb, outputMode="RGB")
        return rgb, srgb.tobytes()
    return opened.convert("RGB"), b""


def cropped_fraction(native: tuple[int, int], target: tuple[int, int]) -> float:
    """Share of the source lost when it is fitted to the target aspect ratio."""
    native_ratio = native[0] / native[1]
    target_ratio = target[0] / target[1]
    kept = min(native_ratio, target_ratio) / max(native_ratio, target_ratio)
    return round(1 - kept, 4)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True, help="JSON plan written by product.mjs")
    args = parser.parse_args()
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))

    source_dir = Path(plan["sourceDir"])
    print_dir = Path(plan["printDir"])
    web_dir = Path(plan["webDir"])
    print_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)

    files = []
    for item in plan["prints"]:
        source = find_source(source_dir, item["slug"])
        digest = sha256(source)
        with Image.open(source) as opened:
            native = opened.size
            rgb, icc = to_rgb(opened)
            if abs(native[0] / native[1] - 0.8) > 0.01:
                raise SystemExit(f"{source.name}: source must be 4:5 portrait, got {native[0]}x{native[1]}")

            web = web_dir / (item["slug"] + ".webp")
            ImageOps.fit(rgb, WEB_SIZE, method=Image.Resampling.LANCZOS).save(
                web, "WEBP", quality=90, method=6, icc_profile=icc)

            sizes = []
            for size in item["sizes"]:
                target = (size["width"], size["height"])
                output = print_dir / size["fileName"]
                ImageOps.fit(rgb, target, method=Image.Resampling.LANCZOS).save(
                    output, "JPEG", quality=95, subsampling=0, dpi=(300, 300),
                    optimize=True, icc_profile=icc)
                with Image.open(output) as check:
                    dpi = tuple(round(value) for value in check.info.get("dpi", ()))
                    if check.size != target or check.mode != "RGB" or dpi != (300, 300):
                        raise SystemExit(f"{output.name}: export is not {target} RGB at 300 DPI")
                native_ppi = round(min(native[0] / (target[0] / 300), native[1] / (target[1] / 300)), 1)
                sizes.append({
                    "size": size["key"],
                    "file": str(output).replace("\\", "/"),
                    "pixels": list(target),
                    "sha256": sha256(output),
                    "nativePpi": native_ppi,
                    "upscaled": native[0] < target[0] or native[1] < target[1],
                    "croppedFraction": cropped_fraction(native, target),
                })

        if sha256(source) != digest:
            raise SystemExit(f"{source.name}: source changed during export")
        with Image.open(web) as check:
            if check.size != WEB_SIZE:
                raise SystemExit(f"{web.name}: web export is not {WEB_SIZE}")
        files.append({
            "slug": item["slug"],
            "source": str(source).replace("\\", "/"),
            "nativeWidth": native[0],
            "nativeHeight": native[1],
            "sourceSha256": digest,
            "web": str(web).replace("\\", "/"),
            "sizes": sizes,
            "physicalQualityVerified": False,
        })

    Path(plan["reportPath"]).write_text(
        json.dumps({"collection": plan["collection"], "files": files}, indent=2) + "\n",
        encoding="utf-8")


if __name__ == "__main__":
    main()
