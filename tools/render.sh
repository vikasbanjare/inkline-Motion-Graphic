#!/usr/bin/env bash
# Render the film in 120-frame chunks (a crash only costs one chunk), join them, add the score, run motion QA.
#   bash tools/render.sh public/films/<slug>/props.json out/<slug>.mp4
# Re-running skips chunks that already exist; delete .render/<name>/ to start over.
set -euo pipefail
PROPS="${1:?props.json from tools/film.py}"
OUT="${2:?output .mp4}"
NAME="$(basename "$OUT" .mp4)"
DIR=".render/$NAME"
mkdir -p "$DIR" "$(dirname "$OUT")"
SCORE="public/$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['score'])" "$PROPS")"
: > "$DIR/list.txt"
for r in 0-119 120-239 240-359 360-479 480-599 600-719; do
  [ -s "$DIR/c$r.mp4" ] || npx remotion render Film "$DIR/c$r.mp4" --props="$PROPS" --frames="$r" --gl=swangle --concurrency=3 --timeout=300000 --muted --log=error
  echo "file 'c$r.mp4'" >> "$DIR/list.txt"
  echo "frames $r done"
done
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -c copy "$DIR/video.mp4"
ffmpeg -v error -y -i "$DIR/video.mp4" -i "$SCORE" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
echo "rendered $OUT"
python3 -I tools/motion_qa.py "$OUT" --frames 100,272,528,626 --sheet "${OUT%.mp4}.qa.jpg" || true
