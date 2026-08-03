#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asset_dir="$repo_root/apps/product/assets/images"
font_file="$repo_root/node_modules/.pnpm/node_modules/@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 7 is required to generate Saltzer icons." >&2
  exit 1
fi

if [[ ! -f "$font_file" ]]; then
  echo "Run pnpm install before generating Saltzer icons." >&2
  exit 1
fi

draw_mark=(
  -fill none -stroke '#171a16' -strokewidth 18 -draw 'circle 512,512 512,198'
  -fill '#171a16' -stroke none -font "$font_file" -pointsize 470 -gravity center -annotate +0+38 'S'
)

magick -size 1024x1024 xc:'#f1ebdd' "${draw_mark[@]}" "$asset_dir/saltzer-icon.png"
magick -size 1024x1024 xc:none "${draw_mark[@]}" -resize 512x512 "$asset_dir/saltzer-android-foreground.png"
magick -size 1024x1024 xc:none "${draw_mark[@]}" -resize 432x432 "$asset_dir/saltzer-android-monochrome.png"
magick -size 1024x1024 xc:'#f1ebdd' "${draw_mark[@]}" -resize 64x64 "$asset_dir/saltzer-favicon.png"
