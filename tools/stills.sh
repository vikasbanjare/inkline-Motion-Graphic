#!/usr/bin/env bash
# Key stills as one contact sheet, for the user to check before a full render.
#   bash tools/stills.sh public/films/<slug>/props.json out/<slug>-stills 100,230,340
# Writes <dir>/f<frame>.png for each frame and <dir>/sheet.jpg (3 across).
set -euo pipefail
PROPS="${1:?props.json}"
DIR="${2:?output folder}"
LIST="${3:?comma-separated frames}"
COMP="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('composition','Film'))" "$PROPS")"
mkdir -p "$DIR"
BUNDLE="$DIR/.bundle"
[ -d "$BUNDLE" ] || npx remotion bundle --out-dir="$BUNDLE" --log=error
IFS=',' read -ra FR <<< "$LIST"
for f in "${FR[@]}"; do
  npx remotion still "$BUNDLE" "$COMP" "$DIR/f$f.png" --frame="$f" --props="$PROPS" --gl=swangle --timeout=300000 --log=error
  echo "still $f"
done
python3 - "$DIR" "$LIST" <<'PY'
import sys
from PIL import Image, ImageDraw
d, frames = sys.argv[1], sys.argv[2].split(",")
ims = [Image.open(f"{d}/f{f}.png").convert("RGB").resize((640, 360)) for f in frames]
cols = 3
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 640, rows * 360), "black")
for i, (im, f) in enumerate(zip(ims, frames)):
    ImageDraw.Draw(im).text((10, 8), f"frame {f}", fill=(255, 255, 255))
    sheet.paste(im, ((i % cols) * 640, (i // cols) * 360))
sheet.save(f"{d}/sheet.jpg", quality=88)
print(f"sheet: {d}/sheet.jpg")
PY
