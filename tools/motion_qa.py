"""Motion QA for a rendered film: finds freezes, hitches, cuts, dead frames and stalls (numpy + ffmpeg).

    python3 -I tools/motion_qa.py out/film.mp4
    python3 -I tools/motion_qa.py out/film.mp4 --json out/film.qa.json --frames 272,384,528 --sheet out/film.qa.jpg

What it reports (frame numbers are 0-based, as in Remotion):
  cuts      frame pairs whose picture change is a jump (mean |diff| > --cut, default 18 on a 0-255 scale)
  freezes   a frame pair that barely changes while the frames around it move: the "stopped for a millisecond" stutter.
            Usual cause: one move eases to zero speed exactly where the next starts from zero. Fix by overlapping
            the moves, keeping a slow drift through the hand-over, or starting the next move a few frames early.
  stalls    runs of >= --stall frames (default 12) with almost no motion outside the final hold: a frozen hold.
  identical exactly repeated frames (often dead black frames at a sequence boundary)
  motion    mean motion per second, to compare pacing with a reference film

--frames saves those frames (PNG) next to the sheet so you can check text at a known moment.
Exit code 1 when freezes or identical frames are found, so a render script can stop on them.
"""

import argparse
import json
import os
import subprocess
import sys

import numpy as np

W, H = 384, 216


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    num, den = out.split("/")
    return float(num) / float(den)


def frames(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def analyse(a, fps, cut=18.0, stall=12, tail=None):
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))  # d[i]: change from frame i to i+1
    n = len(a)
    jumps = [i + 1 for i, x in enumerate(d) if x > cut]
    # a whip or crane jumps on several frames in a row: count each run once, at its first frame
    cuts = [f for k, f in enumerate(jumps) if k == 0 or jumps[k - 1] != f - 1]
    near_cut = set()
    for c in jumps:
        near_cut.update(range(c - 3, c + 3))
    freezes = []
    for i in range(4, len(d) - 4):
        if i in near_cut:
            continue
        before = [d[j] for j in (i - 4, i - 3) if j not in near_cut]
        after = [d[j] for j in (i + 3, i + 4) if j not in near_cut]
        if not before or not after:
            continue
        # a freeze is a dip with motion on BOTH sides; a calm before a burst (a subject popping in) is not one
        m = float(min(np.mean(before), np.mean(after)))
        # flag only near-stops: well below the motion on both sides AND slow in absolute terms (a lull is not a stop)
        if m > 0.5 and d[i] < 0.4 * m and d[i] < 1.0:
            freezes.append({"frame": i + 1, "change": round(float(d[i]), 2), "around": round(m, 2)})
    tail = tail if tail is not None else int(fps * 2)
    identical = [i + 1 for i, x in enumerate(d) if x < 0.02 and i + 1 < n - tail]
    stalls, run = [], 0
    for i, x in enumerate(d):
        if x < 0.25 and i + 1 < n - tail:
            run += 1
        else:
            if run >= stall:
                stalls.append({"from": i + 1 - run, "to": i, "frames": run})
            run = 0
    if run >= stall:
        stalls.append({"from": len(d) - run, "to": len(d), "frames": run})
    sec = int(round(fps))
    motion = [round(float(d[s:s + sec].mean()), 2) for s in range(0, len(d), sec)]
    return {
        "frames": n,
        "fps": fps,
        "cuts": cuts,
        "cuts_per_10s": round(len(cuts) / (n / fps) * 10, 2),
        "freezes": freezes,
        "identical": identical,
        "stalls": stalls,
        "motion_per_second": motion,
        "mean_motion": round(float(d.mean()), 2),
    }


def save_frames(path, idx, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    saved = []
    for f in idx:
        p = os.path.join(out_dir, f"frame{f:05d}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", f"select=eq(n\\,{f})", "-frames:v", "1", p], check=True)
        saved.append(p)
    return saved


def sheet(path, out, cols=6, count=24):
    n = int(subprocess.run(
        ["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip())
    step = max(1, n // count)
    rows = -(-count // cols)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", f"select=not(mod(n\\,{step})),scale=320:-1,tile={cols}x{rows}", "-frames:v", "1", out], check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--json", help="write the full report here")
    ap.add_argument("--frames", help="comma-separated frame numbers to save as PNG for a text check")
    ap.add_argument("--sheet", help="write a contact sheet (JPEG) here")
    ap.add_argument("--cut", type=float, default=18.0)
    ap.add_argument("--stall", type=int, default=12)
    ap.add_argument("--tail", type=int, help="frames at the end allowed to hold still (default: 2 seconds)")
    a = ap.parse_args()
    fps = probe(a.video)
    r = analyse(frames(a.video), fps, a.cut, a.stall, a.tail)
    if a.frames:
        out_dir = os.path.splitext(a.sheet or a.json or a.video)[0] + "_frames"
        r["saved_frames"] = save_frames(a.video, [int(x) for x in a.frames.split(",") if x.strip()], out_dir)
    if a.sheet:
        sheet(a.video, a.sheet)
    if a.json:
        json.dump(r, open(a.json, "w"), indent=1)
    print(f"{r['frames']} frames @ {fps:g} fps · {len(r['cuts'])} cuts ({r['cuts_per_10s']}/10s) · mean motion {r['mean_motion']}")
    print("freezes:", ", ".join(f"{x['frame']} ({x['change']} vs {x['around']})" for x in r["freezes"]) or "none")
    print("identical frames:", r["identical"] or "none")
    print("stalls:", ", ".join(f"{s['from']}-{s['to']}" for s in r["stalls"]) or "none")
    sys.exit(1 if r["freezes"] or r["identical"] else 0)


if __name__ == "__main__":
    main()
