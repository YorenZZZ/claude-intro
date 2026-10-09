#!/usr/bin/env bash
# Rebuilds art/character.webp and art/drone.webp from a source
# illustration: lifts the subjects out with macOS Vision, crops, and saves
# them as WebP with alpha, then bakes the animation layers (build-layers.sh).
#
# usage: tools/build-portrait.sh <image> [character offset X+Y] [drone crop WxH+X+Y]
#   character: a 1584x1730 crop of the cut-out, from offset X+Y (default +0+220)
#   drone:     a crop of the source holding the drone   (default 300x300+1250+830)
# needs: macOS 14+, swiftc (Xcode Command Line Tools), ImageMagick, cwebp
#
# Resources/web/intro.js places the glows, the hair mask and the goggle glint in the
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

magick "$work/character/all.png" -crop "1584x1730$character_offset" +repage -resize '1056x1153!' "$work/character.png"
magick "$work/drone/all.png" -resize '300x300!' "$work/drone.png"
cwebp -quiet -q 82 -alpha_q 85 -m 6 -sharp_yuv "$work/character.png" -o "$root/art/character.webp"
cwebp -quiet -q 82 -alpha_q 85 -m 6 "$work/drone.png" -o "$root/art/drone.webp"

# 1584x1730 source pixels stored at 1056x1153; the drone at its source 300x300.
bash "$root/tools/build-layers.sh"
