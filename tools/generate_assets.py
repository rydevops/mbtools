#!/usr/bin/env python3
"""Generates the PNG textures and particle JSON for the resource pack.

Only needs the standard library. Run from anywhere:  python3 tools/generate_assets.py
"""
import json
import math
import struct
import zlib
from pathlib import Path

RP = Path(__file__).resolve().parent.parent / "resource_pack"


def write_png(path, width, height, pixels):
    """pixels: list of rows, each a list of (r, g, b, a)."""
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in pixels)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def glow(size=32):
    rows = []
    c = (size - 1) / 2
    for y in range(size):
        row = []
        for x in range(size):
            d = math.hypot(x - c, y - c) / c
            a = max(0.0, 1.0 - d)
            a = a * a * (3 - 2 * a)  # smoothstep falloff
            row.append((255, 255, 255, int(a * 255)))
        rows.append(row)
    return rows


def canvas(size=16):
    return [[(0, 0, 0, 0)] * size for _ in range(size)]


def rect(img, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            img[y][x] = color


def outline(img, x0, y0, x1, y1, color):
    rect(img, x0, y0, x1, y0, color)
    rect(img, x0, y1, x1, y1, color)
    rect(img, x0, y0, x0, y1, color)
    rect(img, x1, y0, x1, y1, color)


DARK = (40, 40, 48, 255)
METAL = (150, 155, 165, 255)
LIGHT = (210, 215, 225, 255)


def module_icon(accent, outward):
    img = canvas()
    rect(img, 2, 3, 13, 12, METAL)
    outline(img, 2, 3, 13, 12, DARK)
    rect(img, 2, 7, 13, 8, DARK)  # chest seam
    rect(img, 7, 7, 8, 8, accent)  # latch
    # arrow above the chest: up = sender, down = receiver
    if outward:
        rect(img, 7, 0, 8, 2, accent)
        rect(img, 6, 1, 9, 1, accent)
    else:
        rect(img, 7, 13, 8, 15, accent)
        rect(img, 6, 14, 9, 14, accent)
    return img


def remote_icon():
    img = canvas()
    rect(img, 5, 4, 10, 14, DARK)
    rect(img, 6, 5, 9, 13, METAL)
    rect(img, 6, 5, 9, 6, (90, 200, 255, 255))  # screen
    rect(img, 6, 8, 7, 9, (255, 140, 40, 255))
    rect(img, 8, 8, 9, 9, (80, 220, 120, 255))
    rect(img, 6, 11, 9, 12, LIGHT)
    rect(img, 7, 1, 8, 3, DARK)  # antenna
    rect(img, 7, 0, 8, 0, (255, 80, 80, 255))
    return img


def pack_icon():
    img = [[(30, 34, 46, 255)] * 128 for _ in range(128)]
    for (cx, accent) in ((38, (255, 140, 40, 255)), (90, (80, 220, 120, 255))):
        for y in range(44, 84):
            for x in range(cx - 22, cx + 22):
                edge = y in (44, 83) or x in (cx - 22, cx + 21)
                img[y][x] = DARK if edge else METAL
        for y in range(62, 68):
            for x in range(cx - 22, cx + 22):
                img[y][x] = DARK
        for y in range(60, 70):
            for x in range(cx - 4, cx + 4):
                img[y][x] = accent
    for x in range(52, 76):  # link between the chests
        img[64][x] = (255, 255, 200, 255)
        img[63][x] = (255, 255, 200, 140)
    return img


def particle(identifier, size, lifetime, rgb, gradient=True):
    r, g, b = rgb
    hexc = "{:02X}{:02X}{:02X}".format(r, g, b)
    return {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": identifier,
                "basic_render_parameters": {
                    "material": "particles_blend",
                    "texture": "textures/mbtools/glow",
                },
            },
            "components": {
                "minecraft:emitter_rate_instant": {"num_particles": 1},
                "minecraft:emitter_lifetime_once": {"active_time": 1},
                "minecraft:emitter_shape_point": {},
                "minecraft:particle_lifetime_expression": {"max_lifetime": lifetime},
                "minecraft:particle_appearance_billboard": {
                    "size": [size, size],
                    "facing_camera_mode": "lookat_xyz",
                    "uv": {
                        "texture_width": 32,
                        "texture_height": 32,
                        "uv": [0, 0],
                        "uv_size": [32, 32],
                    },
                },
                "minecraft:particle_appearance_tinting": {
                    "color": {
                        "interpolant": "v.particle_age / v.particle_lifetime",
                        "gradient": {
                            "0.0": "#FF" + hexc,
                            "1.0": "#00" + hexc,
                        },
                    }
                },
            },
        },
    }


def main():
    write_png(RP / "textures/mbtools/glow.png", 32, 32, glow())
    write_png(RP / "textures/items/mbt_remote.png", 16, 16, remote_icon())
    write_png(RP / "textures/items/mbt_sender_module.png", 16, 16, module_icon((255, 140, 40, 255), True))
    write_png(RP / "textures/items/mbt_receiver_module.png", 16, 16, module_icon((80, 220, 120, 255), False))
    write_png(RP / "pack_icon.png", 128, 128, pack_icon())

    items = {
        name: {"textures": f"textures/items/{name}"}
        for name in ("mbt_remote", "mbt_sender_module", "mbt_receiver_module")
    }
    (RP / "textures/item_texture.json").write_text(json.dumps(
        {"resource_pack_name": "mbtools", "texture_name": "atlas.items", "texture_data": items}, indent=2) + "\n")

    effects = {
        "aura_sender": ("mbt:aura_sender", 0.55, 0.5, (255, 140, 30)),
        "aura_sender_idle": ("mbt:aura_sender_idle", 0.45, 0.5, (140, 150, 170)),
        "aura_receiver": ("mbt:aura_receiver", 0.55, 0.5, (60, 255, 140)),
        "transfer": ("mbt:transfer", 0.22, 0.3, (255, 250, 170)),
    }
    for fname, (ident, size, life, rgb) in effects.items():
        out = RP / "particles" / f"{fname}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(particle(ident, size, life, rgb), indent=2) + "\n")

    # BP icon is the same image
    (RP.parent / "behavior_pack/pack_icon.png").write_bytes((RP / "pack_icon.png").read_bytes())


if __name__ == "__main__":
    main()
