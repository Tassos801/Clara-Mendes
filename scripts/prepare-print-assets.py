"""Export approved artwork sources to the storefront WebP and 300 DPI print files.

Called by `npm run product -- prepare <collection>`; not meant to be run by hand.
This is file preparation only. Resizing does not add native source detail, so
the report carries the native pixels-per-inch for every size.

Studio prints are 4:5 sources fitted to 4:5 paper. Museum prints arrive with
`"layout": "bordered"`: the plan (scripts/lib/museum-layout.mjs) gives each
size's paper and image box, the whole artwork is placed on white paper with
no crop, and the web image shows that paper on the shop's soft background.
"""
import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, ImageFilter, ImageOps

WEB_SIZE = (1120, 1400)
SOURCE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp")
PAPER_WHITE = (255, 255, 255)
WEB_PAPER_MARGIN = 0.1
# The bare bordered sheet that room mockups composite (museum prints only).
SHEET_LONG_SIDE = 1600


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


def bordered(rgb: Image.Image, paper: dict, box: dict) -> Image.Image:
    """The whole artwork resized into its box on white paper; nothing cropped."""
    canvas = Image.new("RGB", (paper["width"], paper["height"]), PAPER_WHITE)
    art = rgb.resize((box["width"], box["height"]), Image.Resampling.LANCZOS)
    canvas.paste(art, (box["left"], box["top"]))
    return canvas


def web_paper(rgb: Image.Image, web: dict) -> Image.Image:
    """The bordered print as a flat sheet centred on the shop's background."""
    sheet = bordered(rgb, web["paper"], web["image"])
    scale = min(WEB_SIZE[0] * (1 - 2 * WEB_PAPER_MARGIN) / sheet.width,
                WEB_SIZE[1] * (1 - 2 * WEB_PAPER_MARGIN) / sheet.height)
    sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)),
                         Image.Resampling.LANCZOS)
    background = tuple(int(web["background"][i:i + 2], 16) for i in (1, 3, 5))
    canvas = Image.new("RGB", WEB_SIZE, background)
    left = (WEB_SIZE[0] - sheet.width) // 2
    top = (WEB_SIZE[1] - sheet.height) // 2
    shadow = Image.new("L", WEB_SIZE, 0)
    shadow.paste(46, (left + 4, top + 10, left + sheet.width + 4, top + sheet.height + 10))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.paste((0, 0, 0), mask=shadow)
    canvas.paste(sheet, (left, top))
    return canvas


def profile_name(icc: bytes) -> str:
    if not icc:
        return "untagged"
    try:
        return ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(BytesIO(icc))).strip()
    except (OSError, ImageCms.PyCMSError):
        return "unreadable profile"


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
        is_bordered = item.get("layout") == "bordered"
        source = Path(item["source"]) if item.get("source") else find_source(source_dir, item["slug"])
        if not source.exists():
            raise SystemExit(f"Missing source artwork: {source}")
        digest = sha256(source)
        if item.get("expectedSha256") and digest != item["expectedSha256"]:
            raise SystemExit(f"{source.name}: checksum differs from the registry; re-fetch it")
        with Image.open(source) as opened:
            oriented = ImageOps.exif_transpose(opened) if is_bordered else opened
            native = oriented.size
            rgb, icc = to_rgb(oriented)
            if not is_bordered and abs(native[0] / native[1] - 0.8) > 0.01:
                raise SystemExit(f"{source.name}: source must be 4:5 portrait, got {native[0]}x{native[1]}")
            if is_bordered and list(native) != item["nativeSize"]:
                raise SystemExit(f"{source.name}: {native[0]}x{native[1]} differs from the registry {item['nativeSize']}")

            web = web_dir / (item["slug"] + ".webp")
            web_image = (web_paper(rgb, item["web"]) if is_bordered
                         else ImageOps.fit(rgb, WEB_SIZE, method=Image.Resampling.LANCZOS))
            web_image.save(web, "WEBP", quality=90, method=6, icc_profile=icc)
            sheet_path = None
            if is_bordered:
                sheet = bordered(rgb, item["web"]["paper"], item["web"]["image"])
                scale = SHEET_LONG_SIDE / max(sheet.size)
                sheet_path = web_dir / (item["slug"] + ".sheet.webp")
                sheet.resize((round(sheet.width * scale), round(sheet.height * scale)),
                             Image.Resampling.LANCZOS).save(
                    sheet_path, "WEBP", quality=90, method=6, icc_profile=icc)

            sizes = []
            for size in item["sizes"]:
                target = (size["width"], size["height"])
                output = print_dir / size["fileName"]
                exported = (bordered(rgb, size["paper"], size["image"]) if is_bordered
                            else ImageOps.fit(rgb, target, method=Image.Resampling.LANCZOS))
                exported.save(
                    output, "JPEG", quality=95, subsampling=0, dpi=(300, 300),
                    optimize=True, icc_profile=icc)
                with Image.open(output) as check:
                    dpi = tuple(round(value) for value in check.info.get("dpi", ()))
                    if check.size != target or check.mode != "RGB" or dpi != (300, 300):
                        raise SystemExit(f"{output.name}: export is not {target} RGB at 300 DPI")
                area = (size["image"]["width"], size["image"]["height"]) if is_bordered else target
                native_ppi = round(min(native[0] / (area[0] / 300), native[1] / (area[1] / 300)), 1)
                sizes.append({
                    "size": size["key"],
                    "file": str(output).replace("\\", "/"),
                    "pixels": list(target),
                    "sha256": sha256(output),
                    "nativePpi": native_ppi,
                    "upscaled": native[0] < area[0] or native[1] < area[1],
                    "croppedFraction": 0.0 if is_bordered else cropped_fraction(native, target),
                    **({"imageBox": size["image"]} if is_bordered else {}),
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
            "iccProfile": profile_name(icc),
            "web": str(web).replace("\\", "/"),
            **({"sheet": str(sheet_path).replace("\\", "/")} if sheet_path else {}),
            "sizes": sizes,
            "physicalQualityVerified": False,
        })

    Path(plan["reportPath"]).write_text(
        json.dumps({"collection": plan["collection"], "files": files}, indent=2) + "\n",
        encoding="utf-8")


if __name__ == "__main__":
    main()
