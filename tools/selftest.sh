#!/usr/bin/env bash
# Check a fresh install end to end, in about two minutes: tools, typecheck, both example plans (with their scores),
# and one real still from each film. Prints PASS or the step that failed.
#   bash tools/selftest.sh
set -uo pipefail
cd "$(dirname "$0")/.."
fail() { echo "FAIL: $1"; exit 1; }
step() { printf '%-44s' "$1"; }
step "node, python (numpy, Pillow), ffmpeg";  { node -v && python3 -c "import numpy, PIL" && ffmpeg -version; } >/dev/null 2>&1 || fail "missing tools: run bash scripts/setup.sh"; echo ok
step "packages";                             [ -d node_modules/remotion ] || npm ci --no-audit --no-fund >/dev/null 2>&1 || fail "npm ci"; echo ok
step "typecheck";                            npx tsc --noEmit -p . >/dev/null 2>&1 || fail "npx tsc --noEmit (run it to see the errors)"; echo ok
for spec in coffee kit-tour; do
  step "plan + score: specs/$spec.plan.json"; python3 -I tools/plan.py "specs/$spec.plan.json" >/dev/null 2>&1 || fail "python3 -I tools/plan.py specs/$spec.plan.json"; echo ok
done
step "stills (one per film)"
OUT="out/selftest"; rm -rf "${OUT:?}"; mkdir -p "$OUT"
npx remotion bundle --out-dir="$OUT/.bundle" --log=error >/dev/null 2>&1 || fail "remotion bundle"
for pair in "velmora 590" "kit-tour 343"; do
  set -- $pair
  npx remotion still "$OUT/.bundle" Story "$OUT/$1.png" --frame="$2" --props="public/films/$1/props.json" --gl=swangle --timeout=300000 --log=error >/dev/null 2>&1 || fail "still of $1 (frame $2)"
  [ -s "$OUT/$1.png" ] || fail "empty still for $1"
done
echo ok
echo "PASS: ready to make films. Stills in $OUT/. Paste a script and use the inkline-film skill."
