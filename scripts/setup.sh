#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json): makes a fresh checkout ready to make films,
# so someone can open this repo in Claude Code (web, desktop or CLI) and just type.
#
#   - installs the packages when they are missing or out of date (npm ci, quiet)
#   - finds a Chromium for Remotion and exports REMOTION_BROWSER_EXECUTABLE for the session
#   - checks python (numpy, Pillow) and ffmpeg
#   - prints ONE status line, which Claude Code adds to the session context
#
# Idempotent and fast once installed (no network, ~0.1 s). Never fails the session: always
# exits 0. Run it by hand any time:  bash scripts/setup.sh

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
KIT="$ROOT"
LOG="${TMPDIR:-/tmp}/inkline-setup.log"
STATUS=""
PROBLEM=""

say() { STATUS="${STATUS:+$STATUS; }$1"; }

finish() {
  if [ -z "$PROBLEM" ]; then
    echo "inkline ready: $STATUS. Paste a video script to make a film (inkline-film skill)."
  else
    echo "inkline setup incomplete: $STATUS."
  fi
  exit 0
}
trap finish EXIT

# Adds `export NAME=value` to the session's environment (once, however often this runs).
export_env() {
  [ -n "$CLAUDE_ENV_FILE" ] || return 1
  local line
  line=$(printf 'export %s=%q' "$1" "$2")
  grep -qxF "$line" "$CLAUDE_ENV_FILE" 2>/dev/null || printf '%s\n' "$line" >> "$CLAUDE_ENV_FILE"
}

if [ ! -f "$KIT/package.json" ]; then
  say "no package.json in $ROOT"
  PROBLEM=1
  exit 0
fi

# --- Node.js --------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  say "Node.js not found (install Node.js 22.18+ from nodejs.org, then restart)"
  PROBLEM=1
  exit 0
fi
NODE_OK=$(node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.stdout.write(a > 22 || (a === 22 && b >= 18) ? "1" : "0")' 2>/dev/null)
if [ "$NODE_OK" != "1" ]; then
  say "Node.js $(node -v 2>/dev/null) is too old (needs 22.18+)"
  PROBLEM=1
fi

# --- packages -------------------------------------------------------------------
# Install when node_modules is missing, or when what npm installed (its own record,
# node_modules/.package-lock.json) differs from package-lock.json, e.g. after a pull that
# upgraded Remotion. Compared by content, so a fresh checkout of the same lock costs nothing.
# A symlinked node_modules (shared between checkouts) is left alone.
NEED=""
if [ -L "$KIT/node_modules" ]; then
  NEED=""
elif [ ! -f "$KIT/node_modules/remotion/package.json" ]; then
  NEED="missing"
elif [ -f "$KIT/node_modules/.package-lock.json" ]; then
  NEED=$(cd "$KIT" && node -e '
    const fs = require("fs");
    const read = (f) => JSON.parse(fs.readFileSync(f, "utf8")).packages ?? {};
    const want = read("package-lock.json");
    const have = read("node_modules/.package-lock.json");
    // Optional packages for other platforms (other OS builds of a binary) are never installed.
    const stale = Object.entries(want).some(([name, p]) =>
      name && !p.link && (have[name] ? have[name].version !== p.version : !(p.optional || p.devOptional)));
    process.stdout.write(stale ? "outdated" : "");
  ' 2>/dev/null)
fi

if [ -n "$NEED" ]; then
  if (cd "$KIT" && npm ci --no-audit --no-fund --loglevel=error < /dev/null) > "$LOG" 2>&1 \
    || (cd "$KIT" && npm install --no-audit --no-fund --loglevel=error < /dev/null) >> "$LOG" 2>&1; then
    say "packages installed"
  else
    say "npm install failed (log: $LOG; needs network access to registry.npmjs.org)"
    PROBLEM=1
  fi
else
  say "packages ok"
fi

# --- browser for Remotion -------------------------------------------------------
# Remotion downloads its own Chrome Headless Shell on the first render. Where that
# download is blocked (cloud sandboxes), point it at a Playwright Chromium already on disk.
# A full Chromium (not a headless shell) also needs REMOTION_CHROME_MODE=chrome-for-testing.
BROWSER=""
MODE=""
if [ -n "$REMOTION_BROWSER_EXECUTABLE" ] && [ -x "$REMOTION_BROWSER_EXECUTABLE" ]; then
  say "browser from REMOTION_BROWSER_EXECUTABLE"
elif [ -n "$(find "$KIT/node_modules/.remotion" -name chrome-headless-shell -type f -perm -u+x 2>/dev/null | head -n 1)" ]; then
  say "browser: Remotion's own"
else
  [ -n "$REMOTION_BROWSER_EXECUTABLE" ] && say "REMOTION_BROWSER_EXECUTABLE is not an executable, looking for another"
  # Highest Playwright revision wins; headless shell (what Remotion expects) before full Chromium.
  pick() {
    local mode=$1 best="" best_rev=-1 dir pattern candidate rev
    shift
    for dir in "$PLAYWRIGHT_BROWSERS_PATH" /opt/pw-browsers "$HOME/.cache/ms-playwright"; do
      [ -n "$dir" ] && [ -d "$dir" ] || continue
      for pattern in "$@"; do
        for candidate in "$dir"/$pattern; do
          [ -x "$candidate" ] || continue
          rev=${candidate#"$dir"/}
          rev=${rev%%/*}
          rev=${rev##*-}
          case "$rev" in '' | *[!0-9]*) rev=0 ;; esac
          if [ "$rev" -gt "$best_rev" ]; then best="$candidate" best_rev=$rev; fi
        done
      done
    done
    [ -n "$best" ] && BROWSER="$best" MODE="$mode"
  }
  pick headless-shell \
    'chromium_headless_shell-*/chrome-linux/headless_shell' \
    'chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell' ||
    pick chrome-for-testing 'chromium-*/chrome-linux/chrome' 'chromium-*/chrome-linux64/chrome'

  if [ -z "$BROWSER" ]; then
    say "browser: Remotion will download one on the first render"
  elif export_env REMOTION_BROWSER_EXECUTABLE "$BROWSER"; then
    [ "$MODE" = "chrome-for-testing" ] && export_env REMOTION_CHROME_MODE chrome-for-testing
    say "browser $(basename "$(dirname "$(dirname "$BROWSER")")")"
  else
    HINT="export REMOTION_BROWSER_EXECUTABLE=$BROWSER"
    [ "$MODE" = "chrome-for-testing" ] && HINT="$HINT REMOTION_CHROME_MODE=chrome-for-testing"
    say "browser found, run: $HINT"
  fi
fi

# --- Python (tools/film.py copy check, score_to_picture, motion_qa) ------------------
if command -v python3 >/dev/null 2>&1; then
  if ! python3 -c "import numpy, PIL" >/dev/null 2>&1; then
    python3 -m pip install --quiet --user numpy pillow >>"$LOG" 2>&1 || python3 -m pip install --quiet --break-system-packages numpy pillow >>"$LOG" 2>&1
  fi
  if python3 -c "import numpy, PIL" >/dev/null 2>&1; then
    say "python ok"
  else
    say "python numpy/pillow missing (pip install numpy pillow; needed for the copy check, score and motion checks)"
  fi
else
  say "python3 not found (needed for the copy check, score and motion checks)"
fi

# --- ffmpeg ---------------------------------------------------------------------
if command -v ffmpeg >/dev/null 2>&1; then
  say "ffmpeg ok"
else
  say "ffmpeg missing (needed to join the render and add the score)"
fi

exit 0
