#!/usr/bin/env bash
# Render the film in 120-frame chunks (a crash only costs one chunk), join them, add the score, run motion QA.
#   bash tools/render.sh public/films/<slug>/props.json out/<slug>.mp4
# Re-running skips chunks that already exist; delete .render/<name>/ to start over.
set -euo pipefail
PROPS="${1:?props.json from tools/film.py or tools/plan.py}"
OUT="${2:?output .mp4}"
NAME="$(basename "$OUT" .mp4)"
DIR=".render/$NAME"
mkdir -p "$DIR" "$(dirname "$OUT")"
# props from tools/film.py (the Film template) or tools/plan.py (a Story: any shot plan, any length)
read -r COMP FRAMES SCORE < <(python3 -c "
import json,sys
p=json.load(open(sys.argv[1]))
print(p.get('composition','Film'), p.get('frames',720), p.get('score') or p['plan']['score'])" "$PROPS")
SCORE="public/$SCORE"
: > "$DIR/list.txt"
for ((a=0; a<FRAMES; a+=120)); do
  b=$(( a+119 < FRAMES-1 ? a+119 : FRAMES-1 )); r="$a-$b"
  [ -s "$DIR/c$r.mp4" ] || npx remotion render "$COMP" "$DIR/c$r.mp4" --props="$PROPS" --frames="$r" --gl=swangle --concurrency=3 --timeout=300000 --muted --log=error
  echo "file 'c$r.mp4'" >> "$DIR/list.txt"
  echo "frames $r done"
done
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -c copy "$DIR/video.mp4"
ffmpeg -v error -y -i "$DIR/video.mp4" -i "$SCORE" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
echo "rendered $OUT"
python3 -I tools/motion_qa.py "$OUT" --sheet "${OUT%.mp4}.qa.jpg" || true
# every frame, not samples: pops, hitches and camera lurches (the shots' own cut frames are allowed)
CUTS="$(python3 -c "
import json,sys
p=json.load(open(sys.argv[1])); t=0; c=[]
for s in (p.get('plan') or {}).get('shots', []):
    c.append(t); t+=s['dur']
print(','.join(map(str,c[1:])))" "$PROPS")"
python3 -I tools/jerk_qa.py "$OUT" --cuts "$CUTS" || true
