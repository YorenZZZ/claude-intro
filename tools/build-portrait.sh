#!/usr/bin/env bash
# Rebuilds hooks/portrait.ts (the character and drone layers) from a source
# illustration: lifts the subjects out with macOS Vision, crops, and embeds
# them as WebP with alpha.
#
# usage: tools/build-portrait.sh <image> [character offset X+Y] [drone crop WxH+X+Y]
#   character: a 1584x1730 crop of the cut-out, from offset X+Y (default +0+220)
#   drone:     a crop of the source holding the drone   (default 300x300+1250+830)
# needs: macOS 14+, swiftc (Xcode Command Line Tools), ImageMagick, cwebp
#
# intro-svg.ts places the glows, the hair mask and the goggle glint in the
# character layer's own pixels; a different illustration needs those moved.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
source_image="${1:?usage: tools/build-portrait.sh <image> [character offset] [drone crop]}"
character_offset="${2:-+0+220}"
drone_crop="${3:-300x300+1250+830}"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir "$work/character" "$work/drone"

swiftc -O -o "$work/cutout" "$root/tools/cutout.swift"
"$work/cutout" "$source_image" "$work/character" >/dev/null
magick "$source_image" -crop "$drone_crop" +repage "$work/drone-source.png"
"$work/cutout" "$work/drone-source.png" "$work/drone" >/dev/null

magick "$work/character/all.png" -crop "1584x1730$character_offset" +repage -resize '500x546!' "$work/character.png"
magick "$work/drone/all.png" -resize '150x150!' "$work/drone.png"
cwebp -quiet -q 74 -alpha_q 75 -m 6 -sharp_yuv "$work/character.png" -o "$work/character.webp"
cwebp -quiet -q 78 -alpha_q 80 -m 6 "$work/drone.png" -o "$work/drone.webp"

{
  printf '%s\n' \
    '// Layers for the awakening cut-in. The artwork is AI-generated (Doubao' \
    '// Seedream 5.0, 2026-10-09) and cut out with macOS Vision subject lifting:' \
    '// the character and the drone beside her, WebP with alpha, embedded so the' \
    '// intro needs nothing but this plugin. Rebuild with tools/build-portrait.sh.' \
    '' \
    '// 1584x1730 in source pixels, stored at 500x546.' \
    'export const CHARACTER_WEBP ='
  printf "  'data:image/webp;base64,%s'\n\n" "$(base64 -i "$work/character.webp" | tr -d '\n')"
  printf '%s\n' "// 300x300 in source pixels (source x 1250, y 830), stored at 150x150." 'export const DRONE_WEBP ='
  printf "  'data:image/webp;base64,%s'\n" "$(base64 -i "$work/drone.webp" | tr -d '\n')"
} > "$root/hooks/portrait.ts"

echo "wrote $root/hooks/portrait.ts ($(wc -c < "$root/hooks/portrait.ts" | tr -d ' ') bytes)"
