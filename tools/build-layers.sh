#!/usr/bin/env bash
# Bakes the cut-in's effects into still layers, so the animation itself only
# moves and fades images (which the GPU composites) and never re-runs a
# filter per frame. Reads art/character.webp and art/drone.webp, writes
# Resources/web/layers/*.webp:
#   body    the character with her orange rim light
#   hair    her hair alone, soft-edged, for the wind sway
#   shadow  the shadow she casts onto the band (half size, it is blurred)
#   ghost   the orange afterimage silhouette (half size)
#   white   the white impact-flash silhouette (half size)
#   drone   the drone with its rim light
# Character pixels are 2/3 of the source illustration's; all character layers
# share one 60 px padded canvas so they line up. needs: ImageMagick, cwebp
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/Resources/web/layers"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

webp() { cwebp -quiet -q "${3:-82}" -alpha_q 85 -m 6 -sharp_yuv "$1" -o "$out/$2.webp"; }

# Character: 1056x1153 plus 60 px on every side.
pad=60
magick "$root/art/character.webp" -background none -gravity center -extent "$((1056 + pad * 2))x$((1153 + pad * 2))" "$work/char.png"
size="$(magick identify -format '%wx%h' "$work/char.png")"
magick "$work/char.png" -alpha extract "$work/alpha.png"

# Rim light: the silhouette grown by 7 source px, blurred by 10, under her.
magick -size "$size" xc:'#ffa64d' \( "$work/alpha.png" -morphology Dilate Disk:4.7 -blur 0x6.7 -alpha off \) \
  -compose CopyOpacity -composite -channel A -evaluate multiply 0.95 +channel "$work/rim.png"
magick "$work/rim.png" "$work/char.png" -compose over -composite "$work/body.png"
webp "$work/body.png" body

# Hair: the wind region minus her face, goggles and wrench, feathered by 30
# source px. Shapes are in source crop pixels, mapped to this canvas.
map="affine 0.6667,0,0,0.6667,$pad,$pad"
magick -size "$size" xc:black -fill white \
  -draw "$map path 'M290 480 L380 340 L560 250 L800 230 L1050 300 L1260 460 L1280 780 L1200 980 L1020 1040 L520 1040 L300 960 L250 730 Z'" \
  -fill black \
  -draw "$map ellipse 750,790 178,205 0,360" \
  -draw "$map path 'M450 480 L600 420 L800 430 L915 480 L905 570 L760 590 L620 640 L500 680 L440 600 Z'" \
  -draw "$map path 'M960 580 L1540 -30 L1600 110 L1060 680 Z'" \
  -blur 0x20 "$work/hairmask.png"
magick "$work/alpha.png" "$work/hairmask.png" -compose multiply -composite "$work/hairalpha.png"
magick "$work/char.png" \( "$work/hairalpha.png" -alpha off \) -compose CopyOpacity -composite "$work/hair.png"
webp "$work/hair.png" hair

# Cast shadow: near-black at 80%, blurred by 24 source px.
magick -size "$size" xc:'rgb(3,3,10)' \( "$work/alpha.png" -blur 0x16 -alpha off \) \
  -compose CopyOpacity -composite -channel A -evaluate multiply 0.8 +channel -resize 50% "$work/shadow.png"
webp "$work/shadow.png" shadow 70

# Afterimage: orange at 90%, blurred by 6 source px.
magick -size "$size" xc:'rgb(255,140,46)' \( "$work/alpha.png" -blur 0x4 -alpha off \) \
  -compose CopyOpacity -composite -channel A -evaluate multiply 0.9 +channel -resize 50% "$work/ghost.png"
webp "$work/ghost.png" ghost 70

# Impact flash: a plain white silhouette.
magick -size "$size" xc:white \( "$work/alpha.png" -alpha off \) -compose CopyOpacity -composite -resize 50% "$work/white.png"
webp "$work/white.png" white 70

# Drone: 300x300 at source scale plus 40 px, rim grown by 7 and blurred by 10.
magick "$root/art/drone.webp" -background none -gravity center -extent 380x380 "$work/drone.png"
magick "$work/drone.png" -alpha extract "$work/dronealpha.png"
magick -size 380x380 xc:'#ffa64d' \( "$work/dronealpha.png" -morphology Dilate Disk:7 -blur 0x10 -alpha off \) \
  -compose CopyOpacity -composite -channel A -evaluate multiply 0.95 +channel "$work/dronerim.png"
magick "$work/dronerim.png" "$work/drone.png" -compose over -composite "$work/droneout.png"
webp "$work/droneout.png" drone

ls -l "$out"
