"""Every-frame smoothness check: finds the jerks a sampled contact sheet misses.

    python3 -I tools/jerk_qa.py out/film.mp4 [--cuts 246,303,372] [--from 0 --to 816]

Per frame (240x135 luma):
  d     mean absolute difference to the previous frame (how much changed)
  v     global image shift to the previous frame (phase correlation, px at 240 wide): the camera's speed
Flags:
  SPIKE    d jumps above 2.5x its neighbours (a pop / an unintended cut), unless the frame is a listed cut
  STUTTER  d drops below 0.3x its neighbours while they move (a repeated or late frame: a hitch)
  LURCH    the shift changes by more than 1.6 px in one frame (a speed jump: the camera snaps instead of easing)
"""

import argparse
import subprocess
import sys

import numpy as np

W, H = 240, 136


def frames(src, a, b):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"select='between(n\\,{a}\\,{b})',scale={W}:{H},format=gray", "-vsync", "0", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def shift(a, b):
    A, B = np.fft.fft2(a - a.mean()), np.fft.fft2(b - b.mean())
    R = A * np.conj(B)
    r = np.fft.ifft2(R / (np.abs(R) + 1e-6)).real
    y, x = np.unravel_index(np.argmax(r), r.shape)
    if y > H // 2:
        y -= H
    if x > W // 2:
        x -= W
    return float(x), float(y), float(r.max())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--cuts", default="")
    ap.add_argument("--from", dest="a", type=int, default=0)
    ap.add_argument("--to", dest="b", type=int, default=100000)
    o = ap.parse_args()
    cuts = {int(c) for c in o.cuts.split(",") if c}
    f = frames(o.film, o.a, o.b)
    n = len(f)
    d = np.zeros(n)
    v = np.zeros((n, 2))
    conf = np.zeros(n)
    for i in range(1, n):
        d[i] = np.abs(f[i] - f[i - 1]).mean()
        x, y, c = shift(f[i], f[i - 1])
        v[i] = (x, y)
        conf[i] = c
    issues = []
    for i in range(2, n - 2):
        fr = o.a + i
        near = np.median(np.r_[d[max(1, i - 3):i], d[i + 1:i + 4]])
        if d[i] > 2.5 * near and d[i] > 3 and not any(abs(fr - c) <= 1 for c in cuts):
            issues.append((fr, "SPIKE", f"d {d[i]:.1f} vs {near:.1f}"))
        elif near > 1.2 and d[i] < 0.3 * near:
            issues.append((fr, "STUTTER", f"d {d[i]:.2f} vs {near:.1f}"))
        if conf[i] > 0.15 and conf[i - 1] > 0.15 and np.hypot(*(v[i] - v[i - 1])) > 1.6 and not any(abs(fr - c) <= 1 for c in cuts):
            issues.append((fr, "LURCH", f"shift {v[i - 1].round(1).tolist()} -> {v[i].round(1).tolist()}"))
    for fr, kind, info in issues:
        print(f"{fr:5d}  {kind:8s} {info}")
    print(f"{len(issues)} issues in frames {o.a}-{o.a + n - 1}")


if __name__ == "__main__":
    sys.exit(main())
