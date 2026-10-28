"""Optimize Sukot logo for web delivery."""
from PIL import Image

src = "/home/z/my-project/recovered/user-image.png"
out = "/home/z/my-project/public/logo.png"

img = Image.open(src).convert("RGBA")
print("original:", img.size)

# 640x640 keeps splash crisp on phones while staying light
img = img.resize((640, 640), Image.LANCZOS)
img.save(out, "PNG", optimize=True)

import os
print("saved:", out, f"{os.path.getsize(out)//1024} KB")
