#!/usr/bin/env python3
"""Create deterministic Prodigi print files and Shopify preview images.

The source artwork is preserved exactly. Product-specific files use resizing,
cropping, framing, and layout only; they do not regenerate or repaint the art.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = REPO_ROOT / "output" / "product-art"
PRODIGI_ASSET_ROOT = REPO_ROOT / "output" / "prodigi-assets"
PRODUCTION_ROOT = REPO_ROOT / "output" / "prodigi-product-files"
PUBLIC_ROOT = REPO_ROOT / "public" / "images" / "art-product-extensions"
BOARD_ROOT = PRODUCTION_ROOT / "capsule-scenes"
ORIGINAL_CATALOG_PATH = REPO_ROOT / "data" / "original-art-catalog.json"
EXTENSION_CATALOG_PATH = REPO_ROOT / "data" / "art-product-extensions.json"
PROVENANCE_PATH = PRODUCTION_ROOT / "manifest.json"
CLASSIC_FRAME_GENERATOR = REPO_ROOT / "scripts" / "generate-classic-frame-mockups.mjs"

PREVIEW_SIZE = (1600, 2000)
SCENE_SIZE = (1800, 1200)
WARM_WHITE = (244, 239, 230)
INK = (31, 29, 27)
MUTED = (115, 108, 99)


@dataclass(frozen=True)
class Capsule:
    name: str
    code: str
    items: tuple[dict, ...]

    def item(self, sequence: int) -> dict:
        if sequence <= 0:
            return self.items[0]
        return next(item for item in self.items if item["sequence"] == sequence)


def slugify(value: str) -> str:
    return (
        value.lower()
        .replace(" ", "-")
        .replace("—", "-")
        .replace("–", "-")
        .replace("×", "x")
    )


def font(size: int, *, serif: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        [Path("C:/Windows/Fonts/georgiab.ttf"), Path("C:/Windows/Fonts/georgia.ttf")]
        if serif
        else [Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/segoeui.ttf")]
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)


def load_catalogs() -> tuple[list[dict], dict]:
    original = json.loads(ORIGINAL_CATALOG_PATH.read_text(encoding="utf-8"))
    extensions = json.loads(EXTENSION_CATALOG_PATH.read_text(encoding="utf-8"))
    return original, extensions


def group_capsules(original: list[dict], order: list[str]) -> list[Capsule]:
    code_by_name = {
        "Quiet Form": "QF",
        "Patina Blue": "PB",
        "Neo Deco": "ND",
        "Midnight Garden": "MG",
        "Sunlit Mosaic": "SM",
    }
    grouped: list[Capsule] = []
    for name in order:
        items = tuple(
            sorted(
                (item for item in original if item["capsule"] == name),
                key=lambda item: item["sequence"],
            )
        )
        if len(items) != 3:
            raise RuntimeError(f"{name}: expected three artworks, found {len(items)}")
        grouped.append(Capsule(name=name, code=code_by_name[name], items=items))
    return grouped


def source_path(item: dict) -> Path:
    relative = item["image"].removeprefix("/images/product-art/")
    png_path = (SOURCE_ROOT / relative).with_suffix(".png")
    if png_path.exists():
        return png_path
    webp_path = REPO_ROOT / "public" / "images" / "product-art" / relative
    if webp_path.exists():
        return webp_path
    raise FileNotFoundError(f"Missing source artwork for {item['handle']}")


def open_art(item: dict) -> Image.Image:
    with Image.open(source_path(item)) as opened:
        return opened.convert("RGB")


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def contain(image: Image.Image, size: tuple[int, int], color=WARM_WHITE) -> Image.Image:
    canvas = Image.new("RGB", size, color)
    fitted = ImageOps.contain(image, size, method=Image.Resampling.LANCZOS)
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return canvas


def save_jpeg(image: Image.Image, path: Path, *, dpi: int) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(
        path,
        "JPEG",
        quality=95,
        subsampling=0,
        optimize=True,
        dpi=(dpi, dpi),
    )


def save_png(image: Image.Image, path: Path, *, dpi: int) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True, dpi=(dpi, dpi))


def art_triptych(capsule: Capsule, size: tuple[int, int], *, gap: int = 24) -> Image.Image:
    canvas = Image.new("RGB", size, WARM_WHITE)
    cell_width = (size[0] - gap * 4) // 3
    cell_height = size[1] - gap * 2
    for index, item in enumerate(capsule.items):
        art = cover(open_art(item), (cell_width, cell_height))
        canvas.paste(art, (gap + index * (cell_width + gap), gap))
    return canvas


def mirrored_pattern(capsule: Capsule, size: tuple[int, int]) -> Image.Image:
    tile_width = max(700, size[0] // 2)
    tile_height = max(700, size[1] // 2)
    first = cover(open_art(capsule.items[0]), (tile_width, tile_height))
    second = cover(open_art(capsule.items[2]), (tile_width, tile_height))
    tile = Image.new("RGB", (tile_width * 2, tile_height * 2), WARM_WHITE)
    tile.paste(first, (0, 0))
    tile.paste(ImageOps.mirror(first), (tile_width, 0))
    tile.paste(ImageOps.flip(second), (0, tile_height))
    tile.paste(ImageOps.mirror(ImageOps.flip(second)), (tile_width, tile_height))
    return cover(tile, size)


def greeting_card_file(capsule: Capsule) -> Image.Image:
    width, height = 6117, 2161
    quarter = width // 4
    art = cover(open_art(capsule.item(2)), (quarter, height))
    rear = Image.new("RGB", (quarter, height), dominant_color(open_art(capsule.item(2))))
    inside = Image.new("RGB", (width - quarter * 2, height), WARM_WHITE)
    canvas = Image.new("RGB", (width, height), WARM_WHITE)
    canvas.paste(rear, (0, 0))
    canvas.paste(art, (quarter, 0))
    canvas.paste(inside, (quarter * 2, 0))
    return canvas


def postcard_file(capsule: Capsule) -> Image.Image:
    width, height = 4323, 1559
    half = width // 2
    canvas = Image.new("RGB", (width, height), WARM_WHITE)
    art = cover(open_art(capsule.item(2)), (width - half, height))
    canvas.paste(art, (half, 0))
    draw = ImageDraw.Draw(canvas)
    draw.line((half // 2, 220, half // 2, height - 220), fill=(202, 194, 181), width=4)
    draw.rectangle(
        (half - 430, 170, half - 180, 330),
        outline=(183, 174, 160),
        width=4,
    )
    return canvas


def notebook_file(capsule: Capsule, size: tuple[int, int]) -> Image.Image:
    art = cover(open_art(capsule.item(3)), size)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, max(90, size[0] // 18), size[1]), fill=(28, 27, 26, 210))
    return Image.alpha_composite(art.convert("RGBA"), overlay).convert("RGB")


def journal_files(capsule: Capsule) -> tuple[Image.Image, Image.Image]:
    size = (1748, 2480)
    front = notebook_file(capsule, size)
    back = ImageOps.mirror(cover(open_art(capsule.item(3)), size))
    tint = Image.new("RGBA", size, (*dominant_color(back), 80))
    back = Image.alpha_composite(back.convert("RGBA"), tint).convert("RGB")
    return front, back


def phone_file(capsule: Capsule, size: tuple[int, int]) -> Image.Image:
    art = cover(open_art(capsule.item(2)), size)
    # Keep the camera corner visually quiet without inventing new artwork.
    draw = ImageDraw.Draw(art)
    quiet = dominant_color(art)
    radius = max(60, size[0] // 14)
    draw.rounded_rectangle(
        (size[0] * 0.07, size[1] * 0.06, size[0] * 0.38, size[1] * 0.25),
        radius=radius,
        fill=quiet,
    )
    return art


def calendar_files(original: list[dict]) -> list[tuple[str, Image.Image]]:
    size = (3508, 2480)
    selected = original[:12]
    exports: list[tuple[str, Image.Image]] = []
    for month, item in enumerate(selected, start=1):
        art = contain(open_art(item), size, color=WARM_WHITE)
        exports.append((f"{month:02d}-{slugify(item['shortTitle'])}.jpg", art))
    cover_grid = Image.new("RGB", size, WARM_WHITE)
    cell_w, cell_h = size[0] // 5, size[1]
    capsule_leads = [item for item in original if item["sequence"] == 1]
    for index, item in enumerate(capsule_leads):
        cover_grid.paste(cover(open_art(item), (cell_w, cell_h)), (index * cell_w, 0))
    exports.insert(0, ("00-front-cover.jpg", cover_grid))
    back = art_triptych_from_items(original[-3:], size)
    exports.append(("13-back-cover.jpg", back))
    return exports


def art_triptych_from_items(items: Iterable[dict], size: tuple[int, int]) -> Image.Image:
    items = list(items)
    gap = 24
    canvas = Image.new("RGB", size, WARM_WHITE)
    cell_width = (size[0] - gap * (len(items) + 1)) // len(items)
    for index, item in enumerate(items):
        art = cover(open_art(item), (cell_width, size[1] - gap * 2))
        canvas.paste(art, (gap + index * (cell_width + gap), gap))
    return canvas


def dominant_color(image: Image.Image) -> tuple[int, int, int]:
    small = image.resize((1, 1), Image.Resampling.BOX)
    return tuple(small.getpixel((0, 0)))


def shadowed_layer(
    canvas: Image.Image,
    layer: Image.Image,
    position: tuple[int, int],
    *,
    blur: int = 26,
    offset: tuple[int, int] = (18, 24),
) -> None:
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_shape = Image.new("RGBA", layer.size, (0, 0, 0, 110))
    shadow.paste(shadow_shape, (position[0] + offset[0], position[1] + offset[1]), shadow_shape)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(layer.convert("RGBA"), position)


def preview_base() -> Image.Image:
    canvas = Image.new("RGBA", PREVIEW_SIZE, (238, 232, 222, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 1360, PREVIEW_SIZE[0], PREVIEW_SIZE[1]), fill=(222, 211, 196, 255))
    return canvas


def framed_object(art: Image.Image, *, frame_color=(166, 137, 100)) -> Image.Image:
    outer = Image.new("RGBA", (950, 1320), (*frame_color, 255))
    inner = contain(art, (790, 1030), color=(250, 248, 243))
    outer.paste(inner, (80, 110))
    return outer


def preview_for(family: dict, capsule: Capsule) -> Image.Image:
    kind = family["assetKind"]
    if kind == "classic_frame":
        preview_path = PUBLIC_ROOT / family["id"] / f"{slugify(capsule.name)}.webp"
        with Image.open(preview_path) as preview:
            return preview.convert("RGB")

    canvas = preview_base()
    art = open_art(capsule.item(max(1, family.get("sourceSequence", 1))))
    draw = ImageDraw.Draw(canvas)

    if kind in {"large_print", "canvas"}:
        obj = framed_object(art, frame_color=(248, 246, 241))
        shadowed_layer(canvas, obj, (325, 210))
    elif kind in {"greeting_card", "postcard"}:
        card = contain(art, (850, 1190), color=WARM_WHITE).convert("RGBA")
        shadowed_layer(canvas, card, (375, 340))
    elif kind in {"notebook", "journal"}:
        cover_image = contain(art, (760, 1120), color=WARM_WHITE).convert("RGBA")
        draw_cover = ImageDraw.Draw(cover_image)
        draw_cover.rectangle((0, 0, 72, cover_image.height), fill=(34, 32, 30, 220))
        shadowed_layer(canvas, cover_image, (420, 320))
        for y in range(360, 1390, 48):
            draw.line((405, y, 455, y), fill=(95, 89, 82), width=6)
    elif kind == "tote":
        bag = Image.new("RGBA", (1050, 1260), (0, 0, 0, 0))
        bag_draw = ImageDraw.Draw(bag)
        bag_draw.rounded_rectangle((90, 250, 960, 1240), radius=55, fill=(239, 232, 217, 255))
        bag_draw.arc((280, 15, 770, 510), 180, 360, fill=(34, 32, 30, 255), width=36)
        panel = contain(art, (650, 820), color=WARM_WHITE)
        bag.paste(panel, (200, 340))
        shadowed_layer(canvas, bag, (275, 270))
    elif kind == "cushion":
        pillow = Image.new("RGBA", (1030, 1030), (0, 0, 0, 0))
        pattern = mirrored_pattern(capsule, (930, 930))
        mask = Image.new("L", pattern.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 929, 929), radius=130, fill=255)
        pillow.paste(pattern, (50, 50), mask)
        shadowed_layer(canvas, pillow, (285, 500))
    elif kind == "blanket":
        blanket = art_triptych(capsule, (930, 1240), gap=14).convert("RGBA")
        blanket = blanket.rotate(-5, expand=True, resample=Image.Resampling.BICUBIC)
        shadowed_layer(canvas, blanket, (300, 290))
    elif kind == "phone_case":
        case = cover(art, (650, 1240)).convert("RGBA")
        mask = Image.new("L", case.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 649, 1239), radius=110, fill=255)
        shaped = Image.new("RGBA", case.size, (0, 0, 0, 0))
        shaped.paste(case, (0, 0), mask)
        ImageDraw.Draw(shaped).rounded_rectangle((45, 55, 250, 300), radius=58, fill=dominant_color(art))
        shadowed_layer(canvas, shaped, (475, 300))
    else:
        raise RuntimeError(f"Unsupported preview kind: {kind}")

    # Small deterministic label outside the product image itself.
    draw = ImageDraw.Draw(canvas)
    draw.text((90, 80), "CLARA MENDES", fill=MUTED, font=font(34))
    draw.text((90, 130), capsule.name, fill=INK, font=font(62, serif=True))
    draw.text((90, 1880), family["title"], fill=INK, font=font(34))
    return canvas.convert("RGB")


def calendar_preview(cover_grid: Image.Image, family: dict) -> Image.Image:
    canvas = preview_base()
    page = contain(cover_grid, (1030, 760), color=WARM_WHITE).convert("RGBA")
    shadowed_layer(canvas, page, (285, 420))
    draw = ImageDraw.Draw(canvas)
    for x in range(420, 1200, 95):
        draw.ellipse((x, 380, x + 28, 430), fill=(56, 53, 49))
    for row in range(4):
        for column in range(7):
            x = 390 + column * 115
            y = 1240 + row * 92
            draw.rectangle((x, y, x + 62, y + 40), outline=(164, 154, 141), width=3)
    draw.text((90, 80), "CLARA MENDES", fill=MUTED, font=font(34))
    # The headline is the manifest title minus the brand, so an edition roll
    # cannot leave the preview and the product title on different years.
    headline = family["title"].removeprefix("Clara Mendes ")
    draw.text((90, 130), headline, fill=INK, font=font(62, serif=True))
    draw.text((90, 1880), family["title"], fill=INK, font=font(34))
    return canvas.convert("RGB")


def capsule_scene(capsule: Capsule) -> Image.Image:
    canvas = Image.new("RGBA", SCENE_SIZE, (239, 233, 224, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 785, SCENE_SIZE[0], SCENE_SIZE[1]), fill=(219, 205, 187, 255))

    wall = framed_object(open_art(capsule.item(1)), frame_color=(176, 146, 108))
    wall.thumbnail((520, 720), Image.Resampling.LANCZOS)
    shadowed_layer(canvas, wall, (170, 100), blur=18, offset=(12, 18))

    notebook = contain(open_art(capsule.item(3)), (330, 470), color=WARM_WHITE).convert("RGBA")
    ImageDraw.Draw(notebook).rectangle((0, 0, 34, notebook.height), fill=(36, 34, 32, 230))
    notebook = notebook.rotate(7, expand=True, resample=Image.Resampling.BICUBIC)
    shadowed_layer(canvas, notebook, (770, 635), blur=14, offset=(10, 12))

    cushion = mirrored_pattern(capsule, (420, 420)).convert("RGBA")
    mask = Image.new("L", cushion.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 419, 419), radius=65, fill=255)
    shaped_cushion = Image.new("RGBA", cushion.size, (0, 0, 0, 0))
    shaped_cushion.paste(cushion, (0, 0), mask)
    shadowed_layer(canvas, shaped_cushion, (1230, 640), blur=18, offset=(15, 18))

    phone = cover(open_art(capsule.item(2)), (210, 430)).convert("RGBA")
    phone_mask = Image.new("L", phone.size, 0)
    ImageDraw.Draw(phone_mask).rounded_rectangle((0, 0, 209, 429), radius=40, fill=255)
    shaped_phone = Image.new("RGBA", phone.size, (0, 0, 0, 0))
    shaped_phone.paste(phone, (0, 0), phone_mask)
    ImageDraw.Draw(shaped_phone).rounded_rectangle((16, 18, 78, 104), radius=18, fill=dominant_color(phone))
    shadowed_layer(canvas, shaped_phone, (1100, 660), blur=12, offset=(8, 10))

    draw.text((760, 130), "ART FOR", fill=MUTED, font=font(40))
    draw.text((760, 180), "EVERYDAY LIVING", fill=INK, font=font(64, serif=True))
    draw.text((760, 280), capsule.name, fill=INK, font=font(48))
    draw.text(
        (760, 350),
        "Original art adapted for walls,\npaper, textiles and objects.",
        fill=MUTED,
        font=font(30),
        spacing=12,
    )
    return canvas.convert("RGB")


def file_record(path: Path, *, family: str, capsule: str, purpose: str) -> dict:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with Image.open(path) as image:
        dpi = image.info.get("dpi")
        return {
            "path": path.relative_to(REPO_ROOT).as_posix(),
            "family": family,
            "capsule": capsule,
            "purpose": purpose,
            "width": image.width,
            "height": image.height,
            "dpi": list(dpi) if dpi else None,
            "sha256": digest,
        }


def export_family(family: dict, capsule: Capsule, records: list[dict]) -> None:
    family_dir = PRODUCTION_ROOT / family["id"]
    slug = slugify(capsule.name)
    source_sequence = max(1, family.get("sourceSequence", 1))
    art = open_art(capsule.item(source_sequence))
    kind = family["assetKind"]
    expected_count = (
        len(json.loads(EXTENSION_CATALOG_PATH.read_text(encoding="utf-8"))["deviceVariants"])
        if kind == "phone_case"
        else 2
        if kind == "journal"
        else 1
    )
    existing_outputs = sorted(family_dir.glob(f"{slug}-*"))
    if len(existing_outputs) >= expected_count:
        for output in existing_outputs:
            records.append(
                file_record(
                    output,
                    family=family["id"],
                    capsule=capsule.name,
                    purpose="production",
                )
            )
        preview = preview_for(family, capsule)
        preview_path = PUBLIC_ROOT / family["id"] / f"{slug}.webp"
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview.save(preview_path, "WEBP", quality=90, method=6)
        return

    if kind in {"large_print", "classic_frame"}:
        image = cover(art, (4800, 6000))
        output = family_dir / f"{slug}-16x20-300dpi.jpg"
        save_jpeg(image, output, dpi=300)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "canvas":
        image = cover(art, (2400, 3000))
        output = family_dir / f"{slug}-16x20-150dpi.jpg"
        save_jpeg(image, output, dpi=150)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "greeting_card":
        output = family_dir / f"{slug}-7x5-card-300dpi.jpg"
        save_jpeg(greeting_card_file(capsule), output, dpi=300)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "postcard":
        output = family_dir / f"{slug}-7x5-postcard-300dpi.jpg"
        save_jpeg(postcard_file(capsule), output, dpi=300)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "notebook":
        template = Image.open(PRODIGI_ASSET_ROOT / "notebook-a5-us.png")
        output = family_dir / f"{slug}-notebook-cover-300dpi.png"
        save_png(notebook_file(capsule, template.size), output, dpi=300)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "journal":
        front, back = journal_files(capsule)
        for side, image in (("front", front), ("back", back)):
            output = family_dir / f"{slug}-journal-{side}-300dpi.jpg"
            save_jpeg(image, output, dpi=300)
            records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose=f"production-{side}"))
    elif kind == "tote":
        template = Image.open(PRODIGI_ASSET_ROOT / "tote-template.png")
        output = family_dir / f"{slug}-tote-150dpi.jpg"
        save_jpeg(mirrored_pattern(capsule, template.size), output, dpi=150)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "cushion":
        template = Image.open(PRODIGI_ASSET_ROOT / "cushion-24-single.psd")
        output = family_dir / f"{slug}-cushion-24x24-150dpi.jpg"
        save_jpeg(mirrored_pattern(capsule, template.size), output, dpi=150)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "blanket":
        output = family_dir / f"{slug}-blanket-30x40-150dpi.jpg"
        save_jpeg(art_triptych(capsule, (4500, 6000), gap=80), output, dpi=150)
        records.append(file_record(output, family=family["id"], capsule=capsule.name, purpose="production"))
    elif kind == "phone_case":
        extension_catalog = json.loads(EXTENSION_CATALOG_PATH.read_text(encoding="utf-8"))
        for device in extension_catalog["deviceVariants"]:
            template = Image.open(PRODIGI_ASSET_ROOT / device["template"])
            output = family_dir / f"{slug}-{device['code'].lower()}-300dpi.png"
            save_png(phone_file(capsule, template.size), output, dpi=300)
            records.append(
                file_record(
                    output,
                    family=family["id"],
                    capsule=capsule.name,
                    purpose=f"production-{device['code']}",
                )
            )
    else:
        raise RuntimeError(f"Unsupported family kind: {kind}")

    preview = preview_for(family, capsule)
    preview_path = PUBLIC_ROOT / family["id"] / f"{slug}.webp"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path, "WEBP", quality=90, method=6)


def export_calendar(family: dict, original: list[dict], records: list[dict]) -> None:
    family_dir = PRODUCTION_ROOT / family["id"]
    # Rendered once: the production pages and the preview's cover grid come
    # from the same pass instead of regenerating all fourteen sides twice.
    files = calendar_files(original)
    for filename, image in files:
        output = family_dir / filename
        save_jpeg(image, output, dpi=300)
        records.append(
            file_record(
                output,
                family=family["id"],
                capsule="All capsules",
                purpose="production",
            )
        )
    preview = calendar_preview(files[0][1], family)
    preview_path = PUBLIC_ROOT / family["id"] / "all-capsules.webp"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path, "WEBP", quality=90, method=6)


def main() -> None:
    subprocess.run(
        ["node", str(CLASSIC_FRAME_GENERATOR)],
        cwd=REPO_ROOT,
        check=True,
    )
    original, extensions = load_catalogs()
    capsules = group_capsules(original, extensions["capsuleOrder"])
    records: list[dict] = []

    for family in extensions["families"]:
        if family.get("collectionVariant"):
            export_calendar(family, original, records)
            continue
        for capsule in capsules:
            export_family(family, capsule, records)

    BOARD_ROOT.mkdir(parents=True, exist_ok=True)
    for capsule in capsules:
        scene_path = BOARD_ROOT / f"{slugify(capsule.name)}-collection-scene.jpg"
        save_jpeg(capsule_scene(capsule), scene_path, dpi=144)
        records.append(
            file_record(
                scene_path,
                family="collection-scene",
                capsule=capsule.name,
                purpose="creative-review",
            )
        )

    manifest = {
        "version": 1,
        "sourcePolicy": "Deterministic crop, resize, layout, and mockup composition only",
        "sourceArtworkCount": len(original),
        "capsuleCount": len(capsules),
        "familyCount": len(extensions["families"]),
        "files": records,
    }
    PROVENANCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROVENANCE_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Prepared {len(records)} production/review files across "
        f"{len(extensions['families'])} product families."
    )
    print(f"Public previews: {PUBLIC_ROOT}")
    print(f"Production manifest: {PROVENANCE_PATH}")


if __name__ == "__main__":
    main()
