#!/usr/bin/env python3
"""Generate IHMS Emergency PWA icons - red rounded square with white warning triangle."""
from PIL import Image, ImageDraw
import os

OUT = '/home/z/my-project/public/icons'
os.makedirs(OUT, exist_ok=True)

def make_icon(size, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg)
    top = (220, 38, 38)
    bottom = (153, 27, 27)
    for y in range(size):
        t = y / size
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        bd.line([(0, y), (size, y)], fill=(r, g, b, 255))

    corner = int(size * (0.14 if not maskable else 0.18))
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner, fill=255)
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2
    s = size * (0.70 if maskable else 0.76)

    halo_r = s * 0.48
    d.ellipse([cx - halo_r, cy - halo_r, cx + halo_r, cy + halo_r], fill=(255, 255, 255, 45))

    tri_h = s * 0.60
    tri_w = s * 0.68
    y_top = cy - tri_h / 2 + s * 0.05
    y_bot = cy + tri_h / 2 + s * 0.05
    pts = [(cx, y_top), (cx - tri_w / 2, y_bot), (cx + tri_w / 2, y_bot)]
    rr = max(2, int(s * 0.06))
    for extra in range(rr, 0, -1):
        scale = 1 + extra / (tri_w * 1.8)
        pts2 = [(cx + (p[0] - cx) * scale, cy + (p[1] - cy) * scale) for p in pts]
        d.polygon(pts2, fill=(255, 255, 255, 255))
    d.polygon(pts, fill=(255, 255, 255, 255))

    bar_w = s * 0.09
    d.rounded_rectangle(
        [cx - bar_w / 2, cy - s * 0.13, cx + bar_w / 2, cy + s * 0.14],
        radius=bar_w / 2, fill=(185, 28, 28, 255),
    )
    dot_r = s * 0.058
    dot_cy = cy + s * 0.235
    d.ellipse([cx - dot_r, dot_cy - dot_r, cx + dot_r, dot_cy + dot_r], fill=(185, 28, 28, 255))
    return img

for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (96, 'icon-96.png')]:
    make_icon(size).save(f'{OUT}/{name}')
make_icon(512, maskable=True).save(f'{OUT}/icon-512-maskable.png')
print('icons:', sorted(os.listdir(OUT)))
