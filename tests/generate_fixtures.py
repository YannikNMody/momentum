#!/usr/bin/env python3
"""Generates the synthetic test-fixture photos used to sanity-check text
readability over worst-case background images (all-white, all-black, mid
grey, high-frequency noise, and a hard white/black split). Pure standard
library (zlib + struct) PNG writer - no third-party imaging dependency.

Regenerate with: python3 tests/generate_fixtures.py

These fixtures are dev-only tooling, excluded from the packaged extension
(see the "tests/" line in .gitignore-equivalent packaging step / README).
"""

import os
import random
import struct
import zlib

WIDTH = 640
HEIGHT = 400
OUT_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def write_png(path, pixel_fn):
    raw = bytearray()
    for y in range(HEIGHT):
        raw.append(0)  # filter type 0 (none) for each scanline
        for x in range(WIDTH):
            r, g, b = pixel_fn(x, y)
            raw += bytes((r, g, b))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)


def solid(r, g, b):
    return lambda x, y: (r, g, b)


def split(x, y):
    return (255, 255, 255) if x < WIDTH // 2 else (0, 0, 0)


def noise(x, y):
    # Deterministic per-pixel pseudo-random high-frequency grey noise.
    v = random.Random((x * 73856093) ^ (y * 19349663)).randint(0, 255)
    return (v, v, v)


FIXTURES = {
    "white.png": solid(255, 255, 255),
    "black.png": solid(0, 0, 0),
    "grey.png": solid(128, 128, 128),
    "noise.png": noise,
    "split.png": split,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, fn in FIXTURES.items():
        write_png(os.path.join(OUT_DIR, name), fn)
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
