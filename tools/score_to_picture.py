"""Score to picture: original music + SFX for a cut, from a cue sheet (numpy only; every note is generated here).

    python3 -I tools/score_to_picture.py public/audio/cues.json --out public/audio/score

Writes <out>.music.wav, <out>.sfx.wav and <out>.wav (the mix), 44.1 kHz stereo, exactly frames / fps seconds.

The cue sheet is the film's edit as data:
  fps, frames, key ("D", "F#", ...)
  sections: [{name, from, to, beats, style, drums_from?, quiet?: [[from, to], ...]}]
      Give each section a whole number of beats so every cut in it lands on a beat.
      style: intro (filter opens; drums enter at drums_from) | groove (8th bells, kick/snap) |
             drive (16th bells, kick/snap) | ambient (no drums, high slow bells, dark pad) |
             end (final chord + long tail; put it last)
      quiet: frame ranges where the drums drop out and the bells thin (tension before a reveal)
  events: [{at, fx, gain?, pan?, ...params}] SFX on visual events (frames). fx and params:
      tick{freq} whoosh{sec, lo, hi, up} riser{until|sec} impact{big} swell{sec} (ends AT the frame)
      pop{freq} laser{until|sec} click sparkle{sec, base} bubbles{until|sec, count} pen{sec} rumble{sec}

Sound: glassy FM bells, warm pad, sub, soft kick/snap/shaker, convolution reverb. Clean and simple, not a
produced track; for a richer score use an AI music tool on a stated budget and keep these SFX.
"""

import argparse
import json
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(23)
FPS = 24


def fr(f):
    return f / FPS


# ---- dsp helpers --------------------------------------------------------------------------------------------------
def t_(sec):
    return np.arange(int(SR * sec)) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff, order=4):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (f / max(cutoff, 1)) ** order)
    return np.fft.irfft(spec, len(x))


def highpass(x, cutoff):
    return x - lowpass(x, cutoff, 2)


def bandpass(x, lo, hi):
    return highpass(lowpass(x, hi), lo)


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.2):
    e = np.ones(n) * s
    a, d, r = int(SR * a), int(SR * d), int(SR * r)
    a = min(a, n)
    e[:a] = np.linspace(0, 1, a)
    if a + d < n:
        e[a:a + d] = np.linspace(1, s, d)
    if r and r < n:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def place(buf, x, at, gain=1.0, pan=0.0):
    """Add mono or stereo x into stereo buf at time `at` (s), constant-power pan -1..1."""
    i = int(round(at * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if x.ndim == 1:
        lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * lg, x * rg], 1)
    j0 = max(0, -i)
    i = max(0, i)
    n = min(len(x) - j0, len(buf) - i)
    buf[i:i + n] += x[j0:j0 + n] * gain


def reverb(x, sec=2.4, mix=0.3, bright=6000, seed=1):
    """Stereo convolution reverb with decorrelated noise tails."""
    r = np.random.default_rng(seed)
    n = int(SR * sec)
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.standard_normal(n) * np.exp(-np.linspace(0, 6.5, n))
        ir = lowpass(ir, bright)
        ir[: int(SR * 0.012)] = 0  # pre-delay
        m = len(x) + n
        wet = np.fft.irfft(np.fft.rfft(x[:, c], m) * np.fft.rfft(ir, m), m)[: len(x)]
        out[:, c] = wet
    out *= (np.abs(x).max() + 1e-9) / (np.abs(out).max() + 1e-9)
    return x * (1 - mix) + out * mix


def soft_clip(x, drive=1.2):
    return np.tanh(x * drive) / np.tanh(drive)


# ---- instruments --------------------------------------------------------------------------------------------------
def bell(f, sec=1.6, bright=1.0):
    """FM glass bell / electric piano: carrier f, modulator 3.5f, decaying index."""
    t = t_(sec)
    idx = (2.2 * bright) * np.exp(-t * 5)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t))
    x += 0.35 * np.sin(2 * np.pi * 2 * f * t + 0.6 * idx * np.sin(2 * np.pi * 7 * f * t))
    return x * np.exp(-t * 2.6) * adsr(len(t), 0.002, 0.05, 1, 0.05) * 0.28


def pad(notes, sec, cutoff=1400):
    t = t_(sec)
    out = np.zeros((len(t), 2))
    for k, m in enumerate(notes):
        f = hz(m)
        for c, det in enumerate((0.996, 1.004)):
            ph = 2 * np.pi * f * det * t + 0.4 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * t)
            saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
            out[:, c] += saw
    for c in range(2):
        out[:, c] = lowpass(out[:, c], cutoff, 2)
    return out / (2 * len(notes)) * adsr(len(t), 0.4, 0.2, 1, 0.5)[:, None] * 0.5


def sub(m, sec):
    t = t_(sec)
    x = np.sin(2 * np.pi * hz(m) * t) + 0.15 * np.sin(2 * np.pi * 2 * hz(m) * t)
    return soft_clip(x * adsr(len(t), 0.01, 0.1, 0.8, 0.12), 1.4) * 0.42


def kick():
    t = t_(0.42)
    x = np.sin(2 * np.pi * (46 + 110 * np.exp(-t * 32)) * t) * np.exp(-t * 7.5)
    click = lowpass(rng.standard_normal(len(t)), 4000) * np.exp(-t * 300) * 0.25
    return soft_clip((x + click) * 0.95, 1.6)


def snap():
    t = t_(0.3)
    x = np.zeros(len(t))
    for dly in (0, 0.009, 0.017):  # clap: three quick taps then a tail
        i = int(SR * dly)
        x[i:] += rng.standard_normal(len(t) - i) * np.exp(-t[: len(t) - i] * 60)
    x += rng.standard_normal(len(t)) * np.exp(-t * 18) * 0.35
    return bandpass(x, 900, 7000) * 0.28


def shaker(open_=False):
    t = t_(0.12 if open_ else 0.06)
    x = bandpass(rng.standard_normal(len(t)), 5000, 14000)
    return x * adsr(len(t), 0.004, 0.02, 0.5, 0.03) * 0.12


# ---- sfx ----------------------------------------------------------------------------------------------------------
def whoosh(sec=0.7, lo=300, hi=4000, up=True):
    """Air past the lens: band-passed noise layers whose centre glides lo->hi (or back), crossfaded smoothly."""
    t = t_(sec)
    u = t / sec if up else 1 - t / sec
    out = np.zeros(len(t))
    bands = 7
    for i in range(bands):
        c = lo * (hi / lo) ** (i / (bands - 1))
        layer = bandpass(rng.standard_normal(len(t)), c * 0.7, c * 1.4)
        out += layer * np.exp(-((u - i / (bands - 1)) ** 2) / 0.03)
    env = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.6
    return out * env * 0.35


def riser(sec=1.6):
    t = t_(sec)
    f = 200 * (8 ** (t / sec))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    nz = highpass(rng.standard_normal(len(t)), 2000) * 0.12
    return (tone + nz) * (t / sec) ** 2.2


def impact(big=1.0):
    t = t_(1.6)
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 12)) * t) * np.exp(-t * 2.8)
    crack = lowpass(rng.standard_normal(len(t)), 3500) * np.exp(-t * 22) * 0.5
    return soft_clip((boom + crack) * big, 1.5) * 0.7


def reverse_swell(sec=0.9):
    t = t_(sec)
    x = bandpass(rng.standard_normal(len(t)), 3000, 12000) * (t / sec) ** 3
    return x * 0.25


def pop(f=520):
    t = t_(0.25)
    x = np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t * 40)) * t) * np.exp(-t * 22)
    return x * 0.45 + lowpass(rng.standard_normal(len(t)), 2000) * np.exp(-t * 80) * 0.2


def tick(f=2400):
    t = t_(0.06)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * 0.35


def laser(sec=0.9):
    t = t_(sec)
    f = 1800 - 900 * (t / sec)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * t)))
    return highpass(x, 600) * np.sin(np.pi * t / sec) * 0.08


def card_click():
    a = lowpass(rng.standard_normal(int(SR * 0.05)), 5000) * np.exp(-np.linspace(0, 12, int(SR * 0.05)))
    b = pop(180)[: int(SR * 0.12)]
    x = np.zeros(int(SR * 0.2))
    x[: len(a)] += a * 0.6
    x[int(SR * 0.035): int(SR * 0.035) + len(b)] += b * 0.8
    return x


def sparkle(sec=1.2, base=88):
    out = np.zeros(int(SR * sec))
    for i, m in enumerate([0, 4, 7, 11, 14, 16, 19, 23]):
        b = bell(hz(base + m), 0.8, 0.6)
        j = int(SR * i * 0.07)
        out[j:j + len(b)] += b[: len(out) - j] * 0.55
    return out


def bubbles(sec=4.0, count=22):
    out = np.zeros(int(SR * sec))
    for _ in range(count):
        at = rng.uniform(0, sec - 0.2)
        f0 = rng.uniform(500, 1400)
        t = t_(0.09)
        b = np.sin(2 * np.pi * f0 * (1 + 2.5 * t) * t) * np.exp(-t * 45) * rng.uniform(0.04, 0.1)
        i = int(at * SR)
        out[i:i + len(b)] += b[: len(out) - i]
    return out


def pen(sec=0.4):
    t = t_(sec)
    x = bandpass(rng.standard_normal(len(t)), 2500, 9000) * np.sin(np.pi * t / sec) ** 2
    return x * 0.06


# ---- composition --------------------------------------------------------------------------------------------------
NOTES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
# D major colour; transposed to the cue sheet's key
DMAJ9 = [50, 57, 61, 64, 66]
BM11 = [47, 54, 57, 62, 64]
GMAJ9 = [43, 50, 54, 57, 62]
ASUS = [45, 52, 57, 59, 62]
PROG = [DMAJ9, BM11, GMAJ9, ASUS]
ROOTS = [38, 35, 31, 33]
ARP = [0, 2, 4, 3, 1, 4, 2, 3]


def in_ranges(f, ranges):
    return any(a <= f < b for a, b in ranges or [])


def music(cue, N, tr):
    dur = N / SR
    m = np.zeros((N, 2))
    pads = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    duck = np.ones(N)
    prog = [[n + tr for n in c] for c in PROG]
    roots = [r + tr for r in ROOTS]
    for si, s in enumerate(cue["sections"]):
        a, b, k, style = s["from"], s["to"], s["beats"], s["style"]
        bl = fr((b - a) / k)
        bt = [fr(a) + i * bl for i in range(k)]
        start, end = fr(a), fr(b)
        quiet = s.get("quiet")
        drums_from = fr(s.get("drums_from", a))
        if style == "end":
            for i, note in enumerate(prog[0] + [69 + tr, 73 + tr, 78 + tr]):
                place(m, bell(hz(note + 12), 4.5, 0.7), start + i * 0.035, 0.5, pan=(i % 3 - 1) * 0.4)
            place(pads, pad(prog[0], dur - start, 1800), start, 1.0)
            place(m, sub(roots[0], 2.2), start, 0.5)
            continue
        for j in range(0, k, 2):
            ci = (si + j // 2) % 4
            sec = min(bl * 2 + 0.6, dur - bt[j])
            cut = 900 + 2600 * (bt[j] - start) / max(1e-6, end - start) if style == "intro" else (700 if style == "ambient" else 2400)
            place(pads, pad(prog[ci], sec, cut), bt[j], 0.9)
            if style != "ambient":
                place(m, sub(roots[ci], bl * 2 * 0.95), bt[j], 0.32 if bt[j] >= drums_from else 0.0)
        div = {"drive": 4, "ambient": 1}.get(style, 2)
        for j in range(k * div):
            at = start + j * bl / div
            if at >= end:
                break
            ci = (si + int(j // div) // 2) % 4
            note = prog[ci][ARP[j % len(ARP)]] + (24 if style == "ambient" else 12)
            g = 0.75 if div == 4 and j % 2 else 1.0
            if in_ranges(at * FPS, quiet):
                g *= 0.4
            place(m, bell(hz(note), 2.6 if style == "ambient" else 1.4, 0.8 if style == "ambient" else 1.0), at, 0.55 * g, pan=-0.35 if j % 2 else 0.35)
        if style == "ambient":
            continue
        for j, at in enumerate(bt):
            for h in range(2):
                place(drums, shaker(h == 1), at + h * bl / 2, 0.9, pan=0.25)
            if at < drums_from or in_ranges(at * FPS, quiet):
                continue
            if j % 2 == 0:
                place(drums, kick(), at, 0.9)
                i0, w = int(at * SR), int(SR * 0.22)
                seg = duck[i0:i0 + w]
                duck[i0:i0 + w] = np.minimum(seg, 0.55 + 0.45 * np.linspace(0, 1, len(seg)))
            else:
                place(drums, snap(), at, 0.8, pan=-0.1)
    pads *= duck[:, None]
    for c in range(2):
        pads[:, c] = highpass(pads[:, c], 160)  # leave the low end to the sub and kick
    mix = reverb(m + pads * 0.85, 2.6, 0.32, 7000, seed=3) + drums
    tail = int(SR * min(2.2, dur / 4))
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
    mix[: int(SR * 0.01)] *= np.linspace(0, 1, int(SR * 0.01))[:, None]
    return mix


def rumble(sec=1.1):
    return lowpass(rng.standard_normal(int(SR * sec)), 160) * np.sin(np.pi * t_(sec) / sec) * 0.5


def sfx(cue, N):
    s = np.zeros((N, 2))
    for e in cue.get("events", []):
        at, fx = e["at"], e["fx"]
        span = fr(e["until"] - at) if "until" in e else e.get("sec")
        if fx == "tick":
            x = tick(e.get("freq", 2400))
        elif fx == "whoosh":
            x = whoosh(e.get("sec", 0.8), e.get("lo", 300), e.get("hi", 3000), e.get("up", True))
        elif fx == "riser":
            x = riser(span or 1.5)
        elif fx == "impact":
            x = impact(e.get("big", 0.8))
        elif fx == "swell":
            x = reverse_swell(e.get("sec", 0.8))
            at -= e.get("sec", 0.8) * FPS  # a swell ends on its frame
        elif fx == "pop":
            x = pop(e.get("freq", 520))
        elif fx == "laser":
            x = laser(span or 0.8)
        elif fx == "click":
            x = card_click()
        elif fx == "sparkle":
            x = sparkle(e.get("sec", 1.2), e.get("base", 86))
        elif fx == "bubbles":
            x = bubbles(span or 3.0, e.get("count", 22))
        elif fx == "pen":
            x = pen(e.get("sec", 0.35))
        elif fx == "rumble":
            x = rumble(e.get("sec", 1.1))
        else:
            raise SystemExit(f"unknown fx '{fx}' at frame {at}")
        place(s, x, fr(at), e.get("gain", 0.8), pan=e.get("pan", 0.0))
    return reverb(s, 1.4, 0.18, 8000, seed=5)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def main():
    global FPS
    ap = argparse.ArgumentParser()
    ap.add_argument("cues", help="cue sheet JSON")
    ap.add_argument("--out", required=True, help="output path prefix, e.g. public/music/film-score")
    a = ap.parse_args()
    cue = json.load(open(a.cues))
    FPS = cue.get("fps", 24)
    N = int(SR * cue["frames"] / FPS)
    tr = NOTES[cue.get("key", "D")] - 2
    if tr > 5:
        tr -= 12
    mu, fx = music(cue, N, tr), sfx(cue, N)
    mu *= 0.5 / (np.abs(mu).max() + 1e-9)
    fx *= 0.55 / (np.abs(fx).max() + 1e-9)
    mix = mu * 0.95 + fx * 0.85
    mix *= 0.89 / (np.abs(mix).max() + 1e-9)
    write(a.out + ".music.wav", mu)
    write(a.out + ".sfx.wav", fx)
    write(a.out + ".wav", mix)
    print("wrote", a.out + ".wav", f"{len(mix) / SR:.2f}s")


if __name__ == "__main__":
    main()
