#!/usr/bin/env python3
"""Rebuilds behavior_pack.zip and resource_pack.zip from the pack folders.

The zips contain the pack contents at the archive root (manifest.json at the
top), so extracting one into development_behavior_packs/<name>/ or
development_resource_packs/<name>/ updates the pack in place.
Output is deterministic (sorted entries, fixed timestamps), so unchanged packs
produce byte-identical zips.
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXED_TIME = (2024, 1, 1, 0, 0, 0)


def build(folder: str) -> Path:
    src = ROOT / folder
    out = ROOT / f"{folder}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(p for p in src.rglob("*") if p.is_file()):
            info = zipfile.ZipInfo(path.relative_to(src).as_posix(), FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, path.read_bytes())
    return out


if __name__ == "__main__":
    for name in ("behavior_pack", "resource_pack"):
        print("built", build(name).name)
