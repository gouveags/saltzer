#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asset_dir="$repo_root/apps/product/assets/images"
light_mark="$asset_dir/saltzer-mark-light.png"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 7 is required to generate Saltzer icons." >&2
  exit 1
fi

if [[ ! -f "$light_mark" ]]; then
  echo "Missing Saltzer master mark at $light_mark." >&2
  exit 1
fi

magick -size 1024x1024 xc:'#F1EBDD' \
  \( "$light_mark" -resize 700x700 \) \
  -gravity center -composite "$asset_dir/saltzer-icon.png"
magick "$light_mark" -resize 560x560 -gravity center -background none -extent 1024x1024 \
  "$asset_dir/saltzer-android-foreground.png"
magick "$light_mark" -channel RGB -fill '#171A16' -colorize 100 \
  -resize 480x480 -gravity center -background none -extent 1024x1024 \
  "$asset_dir/saltzer-android-monochrome.png"
magick "$asset_dir/saltzer-icon.png" -resize 64x64 "$asset_dir/saltzer-favicon.png"
