"""Generate the app icons without any imaging library.

Draws a white ECG-pulse line on an iOS-blue background and writes PNGs
by hand (zlib + struct). Rerun after editing: python3 make_icons.py
"""

import struct
import zlib

BG = (10, 132, 255)   # #0A84FF
FG = (255, 255, 255)

# Pulse polyline in normalized coordinates.
PULSE = [
    (0.12, 0.52), (0.34, 0.52), (0.42, 0.30), (0.52, 0.74),
    (0.60, 0.40), (0.65, 0.52), (0.88, 0.52),
]


def seg_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def make_icon(size, path):
    segs = [
        (PULSE[i][0] * size, PULSE[i][1] * size, PULSE[i + 1][0] * size, PULSE[i + 1][1] * size)
        for i in range(len(PULSE) - 1)
    ]
    radius = size * 0.042
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            d = min(seg_distance(x + 0.5, y + 0.5, *s) for s in segs)
            # Smooth edge over ~1.5px for anti-aliasing.
            if d <= radius - 0.75:
                a = 1.0
            elif d >= radius + 0.75:
                a = 0.0
            else:
                a = (radius + 0.75 - d) / 1.5
            row += bytes(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3))
        rows.append(bytes(row))

    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n")
        fh.write(chunk(b"IHDR", ihdr))
        fh.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        fh.write(chunk(b"IEND", b""))
    print(f"wrote {path} ({size}x{size})")


for size, name in [(180, "icon-180.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    make_icon(size, name)
