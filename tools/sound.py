"""Sound for a Story film: music in a chosen genre, foley and tuned sweeteners on the picture's events, mixed and mastered.

    python3 -I tools/sound.py public/films/<slug>/sound.json --out public/films/<slug>/score

tools/plan.py writes sound.json from the plan; read .claude/skills/inkline-film/reference/sound-design.md first.

sound.json:
  fps, frames, genre (lofi_jazz | cinematic | modern_pop | ambient), bpm, key ("F", "D#"...)
  sections: [{from, to, energy 0..1, drop?: true}]     one per shot; energy decides which layers play
  events:   [{at, fx, gain?, pan?, until?, ...}]        absolute frames; the foley set is in FX below

Writes <out>.music.wav, <out>.fx.wav and <out>.wav (the master), 44.1 kHz stereo, exactly frames / fps long.
Everything is synthesized here with numpy (every note and every sound), so it is free to use.
"""

import argparse
import json
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(11)


# ---- dsp ----------------------------------------------------------------------------------------------------------
def T(sec):
    return np.arange(max(1, int(SR * sec))) / SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    s = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    s *= 1 / np.sqrt(1 + (f / max(fc, 1)) ** (2 * order))
    return np.fft.irfft(s, len(x))


def hp(x, fc, order=2):
    s = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    s *= 1 / np.sqrt(1 + (max(fc, 1) / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(s, len(x))


def bp(x, lo, hi):
    return hp(lp(x, hi, 2), lo, 2)


def noise(sec):
    return rng.standard_normal(len(T(sec)))


def env(n, a=0.005, d=0.1, s=0.7, r=0.1):
    a_, d_, r_ = int(SR * a), int(SR * d), int(SR * r)
    e = np.full(n, s, dtype=float)
    a_ = min(a_, n)
    e[:a_] = np.linspace(0, 1, a_) if a_ else e[:a_]
    d_ = min(d_, n - a_)
    if d_ > 0:
        e[a_:a_ + d_] = np.linspace(1, s, d_)
    r_ = min(r_, n)
    if r_ > 0:
        e[-r_:] *= np.linspace(1, 0, r_)
    return e


def add(out, x, j):
    """Add mono x into out at sample j, clipped to out's bounds."""
    j = int(j)
    if j < 0:
        x, j = x[-j:], 0
    n = min(len(x), len(out) - j)
    if n > 0:
        out[j:j + n] += x[:n]


def pan2(x, p):
    p = np.clip(p, -1, 1)
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], 1)


def put(buf, x, at_sec, gain=1.0, pan=0.0):
    i = int(at_sec * SR)
    if i >= len(buf) or len(x) == 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    y = pan2(x, pan) if x.ndim == 1 else x
    n = min(len(y), len(buf) - i)
    buf[i:i + n] += y[:n] * gain


def reverb(x, sec=2.2, mix=0.25, bright=6000, seed=1, predelay=0.012):
    """Convolution with a decaying stereo noise tail (a hall when long, a room when short)."""
    r = np.random.default_rng(seed)
    n = int(SR * sec)
    tt = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(x.shape[1]):
        ir = lp(r.standard_normal(n), bright, 1) * np.exp(-tt * 6.9 / sec)
        ir = np.concatenate([np.zeros(int(SR * predelay)), ir])
        L = len(x[:, c]) + len(ir)
        nfft = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
        out[:, c] = y
    out *= (np.abs(x).max() + 1e-9) / (np.abs(out).max() + 1e-9) * 0.7
    return x * (1 - mix) + out * mix


def compress(x, thr=0.35, ratio=3.0, att=0.005, rel=0.12):
    lvl = np.abs(x).max(1)
    a, r = np.exp(-1 / (SR * att)), np.exp(-1 / (SR * rel))
    e = np.zeros_like(lvl)
    v = 0.0
    # envelope follower (vectorised in blocks for speed)
    for i in range(0, len(lvl), 64):
        blk = lvl[i:i + 64].max()
        v = blk if blk > v else v * r ** 64 + blk * (1 - r ** 64)
        e[i:i + 64] = v
    g = np.where(e > thr, (thr + (e - thr) / ratio) / np.maximum(e, 1e-9), 1.0)
    g = lp(g, 30, 1)
    return x * g[:, None]


def limit(x, ceil=0.89):
    pk = np.abs(x).max(1)
    win = int(SR * 0.004)
    k = np.ones(win) / win
    pk = np.convolve(np.maximum.accumulate(pk[::-1])[::-1] * 0 + pk, k, "same")
    g = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    g = np.minimum.reduce([np.roll(g, s) for s in range(-win, win, max(1, win // 4))])
    return np.clip(x * g[:, None], -ceil, ceil)


# ---- instruments ---------------------------------------------------------------------------------------------------
def rhodes(m, sec, vel=0.7):
    """Electric piano: FM tine (ratio 1, decaying index) + a little bell partial, soft tremolo."""
    t = T(sec)
    f = hz(m)
    idx = (1.2 + 1.4 * vel) * np.exp(-t * 3.2)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    x += 0.12 * vel * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t * 18)
    x *= np.exp(-t * (1.1 + m / 120)) * env(len(t), 0.002, 0.08, 1, 0.08)
    return x * (0.18 + 0.12 * vel)


def piano(m, sec, vel=0.7):
    """Additive piano: slightly stretched partials, faster decay for the upper ones, a felt hammer."""
    t = T(sec)
    f = hz(m)
    x = np.zeros(len(t))
    for k in range(1, 11):
        fk = k * f * np.sqrt(1 + 0.00035 * k * k)
        if fk > 12000:
            break
        x += np.sin(2 * np.pi * fk * t + k) * (1 / k ** 1.25) * np.exp(-t * (0.7 + 0.35 * k + m / 90))
    ham = lp(noise(0.03), 2500) * np.exp(-T(0.03) * 120) * 0.12
    x[: len(ham)] += ham
    return x * env(len(t), 0.001, 0.05, 1, 0.12) * (0.12 + 0.12 * vel)


def upright(m, sec, vel=0.8):
    """Upright bass: warm low partials, a thumb thump, a small pitch settle."""
    t = T(sec)
    f = hz(m) * (1 + 0.012 * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.45 * np.sin(2 * ph) * np.exp(-t * 4) + 0.2 * np.sin(3 * ph) * np.exp(-t * 7)
    x *= np.exp(-t * 2.2) * env(len(t), 0.004, 0.05, 1, 0.06)
    th = lp(noise(0.04), 600) * np.exp(-T(0.04) * 90) * 0.4
    x[: len(th)] += th
    return np.tanh(x * 1.3) * 0.3 * vel


def pluck(m, sec, vel=0.7, bright=1.0):
    """Soft synth pluck: harmonic stack whose brightness falls quickly."""
    t = T(sec)
    f = hz(m)
    x = np.zeros(len(t))
    for k in range(1, 9):
        x += np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * (3 + 4 * k / bright))
    return x * env(len(t), 0.002, 0.05, 1, 0.05) * 0.16 * vel


def strings(notes, sec, cutoff=2200, att=0.6):
    """Ensemble strings / soft pad: detuned saws, slow vibrato, low-passed, slow attack. Stereo."""
    t = T(sec)
    out = np.zeros((len(t), 2))
    for i, m in enumerate(notes):
        for v in range(4):
            det = 1 + (v - 1.5) * 0.0035
            vib = 0.0025 * np.sin(2 * np.pi * (4.8 + 0.3 * v) * t + v + i)
            ph = 2 * np.pi * np.cumsum(hz(m) * det * (1 + vib)) / SR
            saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
            out[:, v % 2] += saw
    for c in range(2):
        out[:, c] = lp(out[:, c], cutoff, 2)
    return out / (4 * max(1, len(notes))) * env(len(t), att, 0.3, 1, 0.8)[:, None] * 0.55


def pulse(m, sec, cutoff=1400):
    t = T(sec)
    x = np.sign(np.sin(2 * np.pi * hz(m) * t)) * 0.5 + np.sin(2 * np.pi * hz(m) * t) * 0.5
    x = lp(x, cutoff * (0.4 + 0.6 * np.exp(-0)), 2)
    return x * env(len(t), 0.003, 0.06, 0.3, 0.05) * 0.12


def soft_kick(big=1.0):
    t = T(0.45)
    x = np.sin(2 * np.pi * (48 + 70 * np.exp(-t * 28)) * t) * np.exp(-t * 6.5)
    return np.tanh(x * 1.2) * 0.55 * big


def clap():
    t = T(0.28)
    x = np.zeros(len(t))
    for d in (0, 0.008, 0.015):
        i = int(SR * d)
        x[i:] += rng.standard_normal(len(t) - i) * np.exp(-t[: len(t) - i] * 70)
    x += rng.standard_normal(len(t)) * np.exp(-t * 16) * 0.25
    return bp(x, 900, 6000) * 0.16


def hat(open_=False):
    t = T(0.18 if open_ else 0.05)
    return bp(rng.standard_normal(len(t)), 7000, 15000) * np.exp(-t * (12 if open_ else 70)) * 0.06


def brush_tap():
    t = T(0.12)
    return bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t * 35) * 0.09


def brush_swish(sec):
    t = T(sec)
    x = bp(rng.standard_normal(len(t)), 1800, 7000)
    return x * np.sin(np.pi * t / sec) ** 2 * 0.035


def rim():
    t = T(0.1)
    x = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 60) + bp(rng.standard_normal(len(t)), 1200, 3500) * np.exp(-t * 80)
    return x * 0.07


def tom(m=40, big=1.0):
    t = T(0.9)
    x = np.sin(2 * np.pi * hz(m) * (1 + 0.6 * np.exp(-t * 18)) * t) * np.exp(-t * 4)
    x += lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 30) * 0.3
    return np.tanh(x * 1.4) * 0.5 * big


def vinyl(sec):
    n = len(T(sec))
    x = lp(rng.standard_normal(n), 3500) * 0.006
    for _ in range(int(sec * 9)):
        i = rng.integers(0, n - 50)
        x[i:i + 30] += rng.standard_normal(30) * np.exp(-np.arange(30) / 6) * rng.uniform(0.02, 0.06)
    return x


# ---- harmony -------------------------------------------------------------------------------------------------------
NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
# chords as (root degree in semitones from the key, intervals); voiced near the previous chord
PROGS = {
    "lofi_jazz": [(2, [0, 3, 7, 10, 14]), (7, [0, 4, 10, 14, 21]), (0, [0, 4, 7, 11, 14]), (9, [0, 3, 7, 10, 14])],  # ii9 V13 Imaj9 vi9
    "cinematic": [(9, [0, 3, 7, 12]), (5, [0, 4, 7, 12]), (0, [0, 4, 7, 12]), (7, [0, 4, 7, 12])],  # vi IV I V
    "modern_pop": [(0, [0, 4, 7, 11, 14]), (9, [0, 3, 7, 10]), (5, [0, 4, 7, 11]), (7, [0, 5, 7, 10])],  # Imaj9 vi7 IVmaj7 V7sus
    "ambient": [(0, [0, 7, 11, 14, 16]), (5, [0, 7, 11, 14]), (9, [0, 7, 10, 14]), (5, [0, 4, 7, 11, 14])],
}
SCALE = [0, 2, 4, 7, 9]  # pentatonic for motifs


def voice(root, ivs, prev, lo=52, hi=76):
    """Voice a chord in [lo, hi], choosing the inversion closest to the previous voicing."""
    best, bd = None, 1e9
    for base in range(lo - 12, hi):
        if (base - root) % 12:
            continue
        v = sorted(base + i for i in ivs)
        v = [n - 12 if n > hi else n for n in v]
        v = sorted(v)
        d = sum(abs(a - b) for a, b in zip(v, prev)) if prev else abs(np.mean(v) - (lo + hi) / 2)
        if d < bd and min(v) >= lo - 2:
            best, bd = v, d
    return best or sorted(root + 48 + i for i in ivs)


# ---- music -------------------------------------------------------------------------------------------------------------
def music(cue, N):
    fps, bpm, key, genre = cue["fps"], cue["bpm"], NOTE[cue.get("key", "D")], cue.get("genre", "lofi_jazz")
    beat = 60 / bpm
    swing = 0.6 if genre == "lofi_jazz" else 0.5
    prog = PROGS[genre]
    keys = np.zeros((N, 2))
    bass = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    pads = np.zeros((N, 2))
    lead = np.zeros((N, 2))
    duration = N / SR
    nbeats = int(duration / beat) + 2
    secs = cue["sections"]

    def section_at(sec_t):
        f = sec_t * fps
        for s in secs:
            if s["from"] <= f < s["to"]:
                return s
        return secs[-1]

    prev = None
    end_at = secs[-1]["from"] / fps if secs[-1].get("end") else duration
    for b in range(0, nbeats, 4):  # one chord per bar of 4 beats
        bar_t = b * beat
        if bar_t >= end_at:
            break
        s = section_at(bar_t)
        E, drop = s.get("energy", 0.5), s.get("drop", False)
        root, ivs = prog[(b // 4) % len(prog)]
        v = voice(key + root, ivs, prev)
        prev = v
        bar_len = min(4 * beat, end_at - bar_t)
        # pad / strings bed, always (the floor everything sits on)
        cutoff = 900 + 2400 * E
        put(pads, strings(v[:4], bar_len + 1.2, cutoff, 0.4 if b else 1.2), bar_t, 0.5 + 0.3 * E)
        if drop:
            continue
        # keys: comping (jazz: syncopated Rhodes; pop: plucks; cinematic: piano on 1; ambient: sparse piano)
        if genre == "lofi_jazz":
            for pos, vel in ((0, 0.65), (1.5 + (swing - 0.5), 0.5), (3.0, 0.45)):
                if E > 0.15 or pos == 0:
                    for k, n in enumerate(v):
                        put(keys, rhodes(n, beat * 1.6, vel), bar_t + pos * beat + k * 0.006, 0.9, pan=(k - 2) * 0.15)
        elif genre == "modern_pop":
            for j in range(8):
                if E < 0.4 and j % 2:
                    continue
                n = v[[0, 2, 1, 3, 2, 4, 3, 1][j] % len(v)] + 12
                put(keys, pluck(n, beat * 0.9, 0.7), bar_t + j * beat / 2, 0.8, pan=-0.3 if j % 2 else 0.3)
        elif genre == "cinematic":
            for k, n in enumerate(v):
                put(keys, piano(n, beat * 4, 0.55), bar_t + k * 0.01, 0.8, pan=(k - 1.5) * 0.2)
            if E >= 0.5:
                for j in range(8):
                    put(keys, pulse(key + root + 36, beat / 2 * 0.9, 900 + 1800 * E), bar_t + j * beat / 2, 0.55 + 0.35 * E)
        else:  # ambient
            for k, n in enumerate(v[::2]):
                put(keys, piano(n + 12, beat * 6, 0.4), bar_t + k * beat * 1.5, 0.7, pan=(k - 1) * 0.4)
        # bass
        if E >= 0.3 and genre != "ambient":
            r0 = key + root + 24 + (12 if key + root < 4 else 0)
            if genre == "lofi_jazz":  # walking: root, 3rd/5th, approach
                walk = [r0, r0 + (3 if 3 in ivs else 4), r0 + 7, r0 + (11 if E > 0.6 else 5)]
                for j, n in enumerate(walk):
                    put(bass, upright(n, beat * 0.95, 0.75 + 0.2 * (j == 0)), bar_t + j * beat, 0.95)
            else:
                for j in range(4 if genre == "modern_pop" else 2):
                    put(bass, upright(r0, beat * (0.9 if genre == "modern_pop" else 1.9), 0.7), bar_t + j * beat * (1 if genre == "modern_pop" else 2), 0.9)
        # drums
        if E >= 0.5:
            for j in range(4):
                bt = bar_t + j * beat
                if genre == "lofi_jazz":
                    if j in (0, 2) or (j == 1 and E > 0.7):
                        put(drums, soft_kick(0.7), bt + (0.5 * beat * (swing * 2 - 1) if j == 1 else 0), 0.75)
                    if j in (1, 3):
                        put(drums, rim(), bt, 0.8, pan=0.1)
                    put(drums, brush_swish(beat * 0.9), bt, 0.9, pan=-0.2)
                    put(drums, brush_tap(), bt + beat * swing, 0.7, pan=0.25)
                elif genre == "modern_pop":
                    put(drums, soft_kick(0.9), bt, 0.85)
                    if j in (1, 3):
                        put(drums, clap(), bt, 0.8)
                    for h in range(2):
                        put(drums, hat(h == 1 and j == 3), bt + h * beat / 2, 0.8, pan=0.3)
                elif genre == "cinematic":
                    if j == 0:
                        put(drums, tom(key + 28, 0.8 + 0.4 * E), bt, 0.8)
                    if E > 0.75 and j == 2:
                        put(drums, tom(key + 33, 0.7), bt, 0.6, pan=0.2)
        # motif: a few notes from the pentatonic, only at high energy
        if E >= 0.85 and genre != "ambient":
            for j, d in enumerate([0, 2, 4, 2]):
                n = key + 72 + SCALE[(d + b // 4) % 5]
                inst = rhodes if genre == "lofi_jazz" else (pluck if genre == "modern_pop" else piano)
                put(lead, inst(n, beat * 1.4, 0.55), bar_t + (j * 0.75 + 0.5) * beat, 0.6, pan=0.15)
    # the end: the tonic, held
    if secs[-1].get("end"):
        t0 = secs[-1]["from"] / fps
        v = voice(key, PROGS[genre][2][1] if genre == "lofi_jazz" else [0, 4, 7, 11, 14], prev)
        put(pads, strings(v, duration - t0 + 0.5, 2600, 0.05), t0, 0.8)
        inst = rhodes if genre == "lofi_jazz" else piano
        for k, n in enumerate(v):
            put(keys, inst(n, 4.5, 0.6), t0 + k * 0.03, 0.9, pan=(k - 2) * 0.2)
        put(bass, upright(key + 24 + (12 if key < 4 else 0), 3.0, 0.8), t0, 0.9)
    if genre == "lofi_jazz":
        put(keys, pan2(vinyl(duration), 0) * 1.0, 0, 1.0)
    # sidechain: pads and keys breathe with the kick in pop
    mix = reverb(keys + lead, 2.4, 0.3, 6500, seed=3) + reverb(pads, 3.0, 0.35, 5000, seed=4) + bass + reverb(drums, 0.9, 0.15, 8000, seed=6)
    for c in range(2):
        mix[:, c] = hp(mix[:, c], 30, 2)
    return compress(mix, 0.4, 2.5)


# ---- foley and sweeteners ---------------------------------------------------------------------------------------------
def fx_steps(sec, rate=1.8, surface="stone"):
    """Footsteps at `rate` steps a second: heel thump + sole scuff, slightly varied, surface-coloured."""
    out = np.zeros(len(T(sec)))
    n = int(sec * rate)
    lo, hi = {"stone": (900, 5200), "wood": (300, 2500), "grass": (1500, 7000)}.get(surface, (900, 5200))
    for i in range(n):
        at = (i + rng.uniform(-0.03, 0.03)) / rate
        t = T(0.16)
        heel = lp(rng.standard_normal(len(t)), 260) * np.exp(-t * 55) * 0.9
        scuff = bp(rng.standard_normal(len(t)), lo, hi) * np.exp(-t * 30) * 0.35
        st = (heel + scuff) * rng.uniform(0.75, 1.0)
        j = int(at * SR)
        add(out, st, j)
    return out * 0.5


def fx_door():
    """Latch click, then a short wooden creak."""
    t = T(0.9)
    latch = bp(rng.standard_normal(len(T(0.05))), 1500, 6000) * np.exp(-T(0.05) * 90)
    f = 180 + 90 * np.sin(np.pi * t / 0.9) + 25 * np.sin(2 * np.pi * 11 * t)
    creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * bp(rng.standard_normal(len(t)), 300, 2500) * 0.15
    creak *= np.sin(np.pi * np.clip((t - 0.08) / 0.8, 0, 1)) ** 2
    x = creak
    x[: len(latch)] += latch * 0.8
    return x * 0.5


def fx_bell(key):
    """A shop-door bell: two bright inharmonic bells, a jingle of the clapper."""
    out = np.zeros(len(T(2.2)))
    for k, d in enumerate((0, 0.09, 0.2)):
        t = T(2.2 - d)
        f = hz(key + 88 + (0, 4, 7)[k])
        b = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 2.6)
        j = int(d * SR)
        add(out, b * (0.6 - 0.15 * k), j)
    return out * 0.16


def fx_drop():
    """A single liquid drop: a rising 'plip' and a tiny splash."""
    t = T(0.25)
    p = np.sin(2 * np.pi * np.cumsum(700 + 1400 * (1 - np.exp(-t * 40))) / SR) * np.exp(-t * 28)
    s = bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t * 40) * 0.2
    return (p + s) * 0.35


def fx_pour(sec):
    """A thin stream into liquid: bubbly band noise with a gurgle, a soft roll-off."""
    t = T(sec)
    x = bp(rng.standard_normal(len(t)), 600, 4500)
    gurgle = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + 2 * np.sin(2 * np.pi * 0.7 * t)) * t)
    out = x * gurgle * np.minimum(1, t / 0.15) * np.minimum(1, (sec - t) / 0.3) * 0.12
    for _ in range(int(sec * 14)):  # bubbles
        at = rng.uniform(0, max(1e-3, sec - 0.1))
        bt = T(0.06)
        b = np.sin(2 * np.pi * rng.uniform(600, 1500) * (1 + 2 * bt) * bt) * np.exp(-bt * 60) * 0.05
        j = int(at * SR)
        add(out, b, j)
    return out


def fx_drip(sec, rate=2.0):
    out = np.zeros(len(T(sec)))
    for i in range(int(sec * rate)):
        d = fx_drop() * 0.4
        j = int((i / rate + rng.uniform(0, 0.05)) * SR)
        add(out, d, j)
    return out


def fx_steam(sec):
    t = T(sec)
    return bp(rng.standard_normal(len(t)), 3000, 11000) * np.sin(np.pi * t / sec) ** 0.7 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.6 * t)) * 0.03


def fx_grind(sec, rate=3.0):
    """A hand grinder: a crunchy granular texture pulsing with each crank turn."""
    t = T(sec)
    grains = np.zeros(len(t))
    for _ in range(int(sec * 900)):
        j = rng.integers(0, len(t) - 200)
        grains[j:j + 120] += rng.standard_normal(120) * np.exp(-np.arange(120) / 25) * rng.uniform(0.2, 1)
    crank = 0.55 + 0.45 * np.sin(2 * np.pi * rate * t) ** 2
    return bp(grains, 900, 7000) * crank * np.minimum(1, t / 0.1) * np.minimum(1, (sec - t) / 0.2) * 0.1


def fx_drum(sec):
    """A roaster: a low rotating hum and beans rattling round in rhythm."""
    t = T(sec)
    hum = (np.sin(2 * np.pi * 55 * t) + 0.4 * np.sin(2 * np.pi * 110 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t)) * 0.05
    rattle = np.zeros(len(t))
    for _ in range(int(sec * 140)):
        j = rng.integers(0, len(t) - 400)
        rattle[j:j + 300] += bp(rng.standard_normal(300), 2000, 7000) * np.exp(-np.arange(300) / 40) * rng.uniform(0.1, 0.5)
    rattle *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.8 * t) ** 2
    return (hum + rattle * 0.12) * np.minimum(1, t / 0.3) * np.minimum(1, (sec - t) / 0.3)


def fx_clink():
    """Porcelain cup on a saucer: inharmonic ceramic partials, a short ring."""
    t = T(0.6)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a for f, d, a in ((2150, 9, 1), (3420, 12, 0.6), (5230, 16, 0.4), (7810, 22, 0.25)))
    return x * 0.1


def fx_rustle(sec):
    t = T(sec)
    x = bp(rng.standard_normal(len(t)), 1500, 8000) * (np.abs(lp(rng.standard_normal(len(t)), 8)) * 3)
    return x * np.sin(np.pi * t / sec) * 0.06


def fx_pluck():
    t = T(0.12)
    return (lp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 50) + np.sin(2 * np.pi * 220 * t) * np.exp(-t * 40) * 0.5) * 0.25


def fx_lamp():
    t = T(0.06)
    return bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 120) * 0.25


def fx_hum(sec):
    t = T(sec)
    return (np.sin(2 * np.pi * 120 * t) + 0.3 * np.sin(2 * np.pi * 240 * t)) * np.minimum(1, t / 0.2) * np.minimum(1, (sec - t) / 0.3) * 0.015


def fx_wind(sec):
    t = T(sec)
    x = lp(rng.standard_normal(len(t)), 700) * (0.6 + 0.4 * lp(rng.standard_normal(len(t)), 1.5) * 4)
    return x * np.minimum(1, t / 0.6) * np.minimum(1, (sec - t) / 0.6) * 0.05


def fx_birds(sec):
    out = np.zeros(len(T(sec)))
    for _ in range(int(sec * 1.5)):
        at = rng.uniform(0, max(1e-3, sec - 0.4))
        t = T(rng.uniform(0.08, 0.18))
        f0 = rng.uniform(2800, 4200)
        c = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(2 * np.pi * 18 * t))) / SR) * np.sin(np.pi * t / t[-1])
        j = int(at * SR)
        add(out, c * 0.02, j)
    return out


def fx_city(sec):
    t = T(sec)
    rumble = lp(rng.standard_normal(len(t)), 220) * 0.06
    air = bp(rng.standard_normal(len(t)), 300, 2500) * 0.012
    car = np.zeros(len(t))
    for _ in range(max(1, int(sec / 4))):
        cl = min(3.0, sec)
        a = rng.uniform(0, max(1e-3, sec - cl))
        ct = T(cl)
        c = lp(rng.standard_normal(len(ct)), 500) * np.sin(np.pi * ct / cl) ** 2 * 0.05
        j = int(a * SR)
        add(car, c, j)
    return (rumble + air + car) * np.minimum(1, t / 0.5) * np.minimum(1, (sec - t) / 0.5)


def fx_cafe(sec):
    """Café murmur: many soft formant-filtered voices far away, a cup now and then."""
    t = T(sec)
    x = np.zeros(len(t))
    for k in range(6):
        v = bp(rng.standard_normal(len(t)), 250 + 80 * k, 900 + 200 * k) * (0.5 + 0.5 * np.abs(lp(rng.standard_normal(len(t)), 3)) * 4)
        x += v
    x *= 0.012
    for _ in range(int(sec / 2.5)):
        c = fx_clink() * 0.25
        j = rng.integers(0, max(1, len(t) - len(c)))
        add(x, c, j)
    return x * np.minimum(1, t / 0.5) * np.minimum(1, (sec - t) / 0.5)


def fx_air(sec, key):
    """A soft breath for a join: low-level band air with a faint tuned tone gliding a fifth."""
    t = T(sec)
    a = bp(rng.standard_normal(len(t)), 500, 3500) * np.sin(np.pi * t / sec) ** 2 * 0.05
    f = hz(key + 60) * (1 + 0.5 * t / sec)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / sec) ** 3 * 0.015
    return a + tone


def fx_swell(sec, key):
    """A reverse swell of the key's chord: rises into the moment it ends on."""
    t = T(sec)
    x = sum(np.sin(2 * np.pi * hz(key + n) * t) for n in (60, 64, 67, 71, 74)) / 5
    x += bp(rng.standard_normal(len(t)), 2000, 9000) * 0.3
    return x * (t / sec) ** 3 * 0.12


def fx_hit(key, big=1.0):
    """A tuned hit: sub drop + soft transient + a chord stab in the key, with a tail."""
    t = T(2.0)
    sub_ = np.sin(2 * np.pi * (hz(key + 24) * (1 + np.exp(-t * 14)) ) * t) * np.exp(-t * 2.5) * 0.4
    trans = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 40) * 0.2
    stab = sum(rhodes(key + n, 2.0, 0.7)[: len(t)] for n in (48, 55, 64, 71)) * 0.6
    return (sub_ + trans + stab) * big * 0.7


def fx_shimmer(sec, key):
    out = np.zeros(len(T(sec)))
    for i, n in enumerate((84, 88, 91, 95, 98)):
        b = rhodes(key + n, sec - i * 0.08, 0.4)
        j = int(i * 0.08 * SR)
        add(out, b * 0.35, j)
    return out


FX = {
    "steps": lambda e, s, k: fx_steps(s or 3.0, e.get("rate", 1.8), e.get("surface", "stone")),
    "door": lambda e, s, k: fx_door(),
    "bell": lambda e, s, k: fx_bell(k),
    "drop": lambda e, s, k: fx_drop(),
    "pour": lambda e, s, k: fx_pour(s or 2.5),
    "drip": lambda e, s, k: fx_drip(s or 2.0, e.get("rate", 2.0)),
    "steam": lambda e, s, k: fx_steam(s or 2.5),
    "grind": lambda e, s, k: fx_grind(s or 2.5, e.get("rate", 3.0)),
    "drum": lambda e, s, k: fx_drum(s or 3.0),
    "clink": lambda e, s, k: fx_clink(),
    "rustle": lambda e, s, k: fx_rustle(s or 1.0),
    "pluck": lambda e, s, k: fx_pluck(),
    "lamp": lambda e, s, k: fx_lamp(),
    "hum": lambda e, s, k: fx_hum(s or 2.0),
    "wind": lambda e, s, k: fx_wind(s or 3.0),
    "birds": lambda e, s, k: fx_birds(s or 3.0),
    "city": lambda e, s, k: fx_city(s or 3.0),
    "cafe": lambda e, s, k: fx_cafe(s or 3.0),
    "air": lambda e, s, k: fx_air(s or 0.6, k),
    "swell": lambda e, s, k: fx_swell(s or 0.9, k),
    "hit": lambda e, s, k: fx_hit(k, e.get("big", 1.0)),
    "shimmer": lambda e, s, k: fx_shimmer(s or 2.0, k),
}
ROOMY = {"steps", "door", "pour", "drip", "grind", "drum", "clink", "lamp", "pluck", "drop"}
AMBIENT = {"wind", "birds", "city", "cafe", "steam", "hum"}


def effects(cue, N):
    fps, key = cue["fps"], NOTE[cue.get("key", "D")]
    foley = np.zeros((N, 2))
    amb = np.zeros((N, 2))
    sweet = np.zeros((N, 2))
    duck = np.ones(N)
    for e in cue.get("events", []):
        fx = e["fx"]
        if fx not in FX:
            raise SystemExit(f"unknown fx {fx!r} at frame {e['at']}; known: {sorted(FX)}")
        span = (e["until"] - e["at"]) / fps if "until" in e else e.get("sec")
        x = FX[fx](e, span, key)
        at = e["at"] / fps
        if fx == "swell":
            at -= len(x) / SR  # a swell ends on its frame
        g = e.get("gain", 1.0)
        if "pan_from" in e:  # a moving source (footsteps that travel with the walker)
            p = np.linspace(e["pan_from"], e.get("pan_to", e["pan_from"]), len(x))
            st = np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], 1)
            put(foley if fx in ROOMY else amb, st, at, g)
        else:
            put(foley if fx in ROOMY else (amb if fx in AMBIENT else sweet), x, at, g, e.get("pan", 0.0))
        if fx in ("bell", "hit", "clink") and e.get("duck", True):
            i0, w = int(at * SR), int(SR * 1.2)
            seg = duck[i0:i0 + w]
            duck[i0:i0 + w] = np.minimum(seg, 0.62 + 0.38 * np.linspace(0, 1, len(seg)) ** 2)
    # bus gains: foley sits ~6-9 dB under the music, ambience ~12 dB under, sweeteners inside the music
    out = 4.0 * reverb(foley, 0.6, 0.18, 7000, seed=8, predelay=0.004) + 3.0 * reverb(amb, 1.5, 0.3, 6000, seed=9) + 1.6 * reverb(sweet, 2.6, 0.35, 7000, seed=10)
    return out, duck


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cue")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    cue = json.load(open(a.cue))
    N = int(round(cue["frames"] / cue["fps"] * SR))
    m = music(cue, N)
    fx, duck = effects(cue, N)
    m *= lp(duck, 20, 1)[:, None]
    mix = m * 0.8 + fx * 1.0
    # master: gentle glue, loudness to about -16 LUFS (RMS proxy), peak limit
    mix = compress(mix, 0.45, 2.0, 0.01, 0.2)
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix *= 10 ** (-17.5 / 20) / rms
    mix = limit(mix, 0.89)
    fade = int(SR * 0.02)
    mix[:fade] *= np.linspace(0, 1, fade)[:, None]
    tail = int(SR * 0.6)
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    write(a.out + ".music.wav", m / (np.abs(m).max() + 1e-9) * 0.8)
    write(a.out + ".fx.wav", fx / (np.abs(fx).max() + 1e-9) * 0.8)
    write(a.out + ".wav", mix)
    print(f"wrote {a.out}.wav {N / SR:.2f}s ({cue.get('genre')} {cue.get('bpm')} BPM in {cue.get('key')})")


if __name__ == "__main__":
    main()
