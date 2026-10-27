#!/usr/bin/env python3
"""SUKOT MESSENGER — app icon generator (dark + neon purple S in a chat bubble)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

BG_TOP = (28, 16, 54)      # deep purple
BG_BOTTOM = (11, 6, 20)    # near black
GLOW = (139, 92, 246)      # violet-500
ACCENT_TOP = (167, 108, 255)
ACCENT_BOT = (166, 39, 230)
GREEN = (34, 197, 94)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (11, 6, 20, 255))
    draw = ImageDraw.Draw(img)

    # vertical gradient bg
    for y in range(size):
        t = y / size
        draw.line([(0, y), (size, y)], fill=lerp(BG_TOP, BG_BOTTOM, t) + (255,))

    # rounded-square tile with gradient (the logo container)
    pad = int(size * 0.12) if not maskable else int(size * 0.18)
    tile = size - 2 * pad
    radius = int(tile * 0.28)
    tile_img = Image.new("RGBA", (tile, tile), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(tile_img)
    for y in range(tile):
        t = y / tile
        tdraw.line([(0, y), (tile, y)], fill=lerp(ACCENT_TOP, ACCENT_BOT, t) + (255,))
    # mask to rounded rect
    mask = Image.new("L", (tile, tile), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, tile - 1, tile - 1], radius=radius, fill=255)
    img.paste(tile_img, (pad, pad), mask)

    # glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.rounded_rectangle(
        [pad, pad, pad + tile, pad + tile], radius=radius, outline=GLOW + (160,), width=max(2, size // 100)
    )
    from PIL import ImageFilter
    glow = glow.filter(ImageFilter.GaussianBlur(size / 40))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # chat bubble shape (white) with lightning-ish S
    cx, cy = size / 2, size / 2
    bubble_w, bubble_h = tile * 0.62, tile * 0.52
    bx0, by0 = cx - bubble_w / 2, cy - bubble_h / 2 - tile * 0.03
    bx1, by1 = cx + bubble_w / 2, cy + bubble_h / 2 - tile * 0.03
    white = (255, 255, 255, 255)
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=int(bubble_h * 0.34), fill=white)
    # bubble tail (bottom-left for RTL feel)
    tail = [(bx0 + bubble_w * 0.18, by1 - 2), (bx0 + bubble_w * 0.10, by1 + tile * 0.10), (bx0 + bubble_w * 0.38, by1 - 2)]
    draw.polygon(tail, fill=white)

    # "S" letter inside bubble, dark purple
    font_size = int(bubble_h * 0.78)
    font = None
    for fp in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(fp):
            font = ImageFont.truetype(fp, font_size)
            break
    if font is None:
        font = ImageFont.load_default()
    s_char = "S"
    bbox = draw.textbbox((0, 0), s_char, font=font)
    sw, sh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    sx = cx - sw / 2 - bbox[0]
    sy = (by0 + by1) / 2 - sh / 2 - bbox[1] - tile * 0.01
    draw.text((sx, sy), s_char, font=font, fill=(91, 33, 182, 255))

    # green verified dot (top-right)
    dot_r = tile * 0.09
    dx, dy = bx1 - dot_r * 0.4, by0 + dot_r * 0.4
    draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=GREEN + (255,))
    outline_r = dot_r * 1.28
    draw.ellipse(
        [dx - outline_r, dy - outline_r, dx + outline_r, dy + outline_r],
        outline=(11, 6, 20, 255),
        width=max(2, int(size * 0.012)),
    )

    return img

# favicon-ish sizes
for s in [192, 512]:
    make_icon(s).save(f"{OUT}/icon-{s}.png")
make_icon(512, maskable=True).save(f"{OUT}/maskable-512.png")
make_icon(180).save(f"{OUT}/apple-touch-icon.png")
make_icon(32).save(f"{OUT}/favicon-32.png")
print("icons generated:", os.listdir(OUT))
