"""Measure a film (or a folder of stills) against a reference film on the look, not the content.

    python3 -I tools/ref_compare.py REF.mp4 OURS.mp4 [--ref-span 0:69] [--ours-span 0:34] [--json out.json]
    python3 -I tools/ref_compare.py REF.mp4 STILLS_DIR --ref-span 4:12          (stills: no motion or cut numbers)

Per frame (480x270, 4 fps), averaged over the span:
  empty     share of flat 8x8 blocks (no line work)            the reference fills its frames with engraving
  vivid     share of saturated pixels (S > 0.45, V > 0.25)     colour weight
  detail    share of pixels on an edge (gradient > 18)         line density
  contrast  luma standard deviation
  dark      share of near-black pixels (V < 0.12)              lens vignettes, black stages
Film only (12 fps):
  motion    median mean-absolute frame difference
  stills    share of frames that barely change (< 0.4)
  cuts/10s  hard cuts per 10 seconds

similarity per metric = 1 - |ours - ref| / max(ours, ref); the score is their mean. Hue is reported, not scored: the
film keeps its own palette. The numbers guard the look; the side-by-side frames are still the judge.
"""

import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

W, H = 480, 270
# small shares are noisy: below these, a difference counts against this floor instead of the tiny value
FLOOR = {"empty": 0.1, "vivid": 0.05, "detail": 0.05, "dark": 0.08, "stills": 0.1, "cuts/10s": 2.0, "motion": 2.0}


def span(s):
    a, b = s.split(":")
    return float(a), float(b)


def frames(src, fps, t0, t1):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(t0), "-t", str(t1 - t0), "-i", src, "-vf", f"fps={fps},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)


def stills(folder):
    out = []
    for f in sorted(os.listdir(folder)):
        if f.lower().endswith((".png", ".jpg", ".jpeg")):
            out.append(np.asarray(Image.open(os.path.join(folder, f)).convert("RGB").resize((W, H), Image.LANCZOS), np.float32))
    return np.stack(out)


def static(fr):
    r, g, b = fr[..., 0] / 255, fr[..., 1] / 255, fr[..., 2] / 255
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    luma = 0.299 * fr[..., 0] + 0.587 * fr[..., 1] + 0.114 * fr[..., 2]
    blocks = luma[:, : H // 8 * 8, : W // 8 * 8].reshape(len(fr), H // 8, 8, W // 8, 8).std(axis=(2, 4))
    gx = np.abs(np.diff(luma, axis=2))[:, :-1, :]
    gy = np.abs(np.diff(luma, axis=1))[:, :, :-1]
    hue = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    w = (sat > 0.3) & (mx > 0.25)
    hist = np.histogram(hue[w], bins=12, range=(0, 360))[0]
    return {
        "empty": float((blocks < 3.5).mean()),
        "vivid": float(((sat > 0.45) & (mx > 0.25)).mean()),
        "detail": float(((gx + gy) > 18).mean()),
        "contrast": float(luma.std(axis=(1, 2)).mean()),
        "dark": float((mx < 0.12).mean()),
        "hues": (hist / max(1, hist.sum())).round(3).tolist(),
    }


def moving(src, t0, t1):
    fr = frames(src, 12, t0, t1)
    luma = 0.299 * fr[..., 0] + 0.587 * fr[..., 1] + 0.114 * fr[..., 2]
    d = np.abs(np.diff(luma, axis=0)).mean(axis=(1, 2))
    cuts = int((d > 28).sum())
    return {"motion": float(np.median(d)), "stills": float((d < 0.4).mean()), "cuts/10s": cuts / ((t1 - t0) / 10)}


def measure(src, sp):
    if os.path.isdir(src):
        return static(stills(src))
    t0, t1 = sp
    m = static(frames(src, 4, t0, t1))
    m.update(moving(src, t0, t1))
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ref")
    ap.add_argument("ours")
    ap.add_argument("--ref-span", default=None)
    ap.add_argument("--ours-span", default=None)
    ap.add_argument("--json")
    a = ap.parse_args()

    def dur(v):
        return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", v], capture_output=True, text=True).stdout)

    rs = span(a.ref_span) if a.ref_span else (0, dur(a.ref))
    os_ = span(a.ours_span) if a.ours_span else ((0, dur(a.ours)) if not os.path.isdir(a.ours) else None)
    R, O = measure(a.ref, rs), measure(a.ours, os_)
    keys = [k for k in ("empty", "vivid", "detail", "contrast", "dark", "motion", "stills", "cuts/10s") if k in R and k in O]
    sims = {}
    print(f"{'metric':10} {'ref':>8} {'ours':>8} {'match':>6}")
    for k in keys:
        r, o = R[k], O[k]
        s = 1 - abs(o - r) / max(abs(o), abs(r), FLOOR.get(k, 1e-6))
        sims[k] = s
        print(f"{k:10} {r:8.3f} {o:8.3f} {s * 100:5.0f}%")
    score = 100 * sum(sims.values()) / len(sims)
    print(f"look score: {score:.0f}%  (mean of the matches above)")
    print("hue mix (12 bins from red), not scored:\n  ref ", R["hues"], "\n  ours", O["hues"])
    if a.json:
        json.dump({"ref": R, "ours": O, "match": sims, "score": score}, open(a.json, "w"), indent=1)


if __name__ == "__main__":
    sys.exit(main())
