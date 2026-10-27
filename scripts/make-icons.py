#!/usr/bin/env python3
"""SUKOT MESSENGER — regenerate all icons from the user's official logo."""
from PIL import Image, ImageFilter
import os

SRC = "/home/z/my-project/upload/file_0000000044e08243bf75a85059691ea2.png"
OUT = "/home/z/my-project/public/icons"
PUB = "/home/z/my-project/public"
os.makedirs(OUT, exist_ok=True)

logo = Image.open(SRC).convert("RGB")
print("source size:", logo.size)

# square center-crop
w, h = logo.size
side = min(w, h)
logo = logo.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))

BG = (11, 6, 20)  # app dark background

def make(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    scale = 0.80 if maskable else 1.0
    inner = int(size * scale)
    resized = logo.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    img.paste(resized, (off, off))
    return img

# PWA icons
make(192).save(f"{OUT}/icon-192.png")
make(512).save(f"{OUT}/icon-512.png")
make(512, maskable=True).save(f"{OUT}/maskable-512.png")
make(180).save(f"{OUT}/apple-touch-icon.png")
make(32).save(f"{OUT}/favicon-32.png")
make(256).save(f"{PUB}/logo.png")          # web splash / header logo

# Android splash (drawable) — 512 is plenty
make(512).save("/home/z/my-project/installers/android/app/src/main/res/drawable-nodpi/splash_logo.png")
make(432, maskable=True).save("/home/z/my-project/installers/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png")
make(192).save("/home/z/my-project/installers/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png")
make(144).save("/home/z/my-project/installers/android/app/src/main/res/mipmap-hdpi/ic_launcher.png")
make(192).save("/home/z/my-project/installers/android/app/src/main/res/mipmap-mdpi/ic_launcher.png")
make(512).save("/home/z/my-project/installers/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")

# Windows installer icon (256 png; electron-builder needs .ico)
try:
    make(256).save("/home/z/my-project/installers/windows/icon.png")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base = make(256)
    base.save("/home/z/my-project/installers/windows/icon.ico", sizes=ico_sizes)
except Exception as e:
    print("icon.ico warn:", e)

print("done:", sorted(os.listdir(OUT)))
