"""A storyboard in, a film plan out: check a shot plan, snap every cut to the beat, write the props, the cue sheet
and the score.

    python3 -I tools/plan.py specs/<slug>.plan.json [--no-score]

The storyboard (see specs/coffee.plan.json, and the director's method in .claude/skills/inkline-film/):
{
  "slug": "velmora",
  "brand": {"name": "Velmora", "logo": "brand/velmora.png" (optional), "line": "coffee roasters · first store"},
  "key": "D",                                   # optional: the score's key (C..B)
  "shots": [
    {"world": "garden", "sec": 6.2, "enter": "lines", "theme": "forest", "cast": ["figure", "plant", "flowers"],
     "text": {"head": "Grown slow", "sub": "on high slopes"}, "p": {"cherries": true}},
    ...
    {"world": "lockup", "enter": "dive"}
  ]
}
Worlds, their settings (p) and their cast rules are documented at the top of each file in src/kit/worlds/.
The stage (phone outro) is always 3.5 s and the lockup 3.1 s; every other shot takes the seconds you give it.
"""

import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 24
BEAT = 11.52  # 125 BPM at 24 fps
WORLDS = {"scene", "garden", "object", "globe", "hall", "deep", "city", "orbit", "table", "type", "stage", "lockup"}
ENTERS = {"lines", "bloom", "letters", "blinds", "focus", "cut", "iris", "split", "wipe", "match", "dive", "print"}
OVERLAP = {"lines": 0, "bloom": 0, "letters": 0, "blinds": 0, "focus": 0, "cut": 0, "iris": 18, "split": 24, "wipe": 16, "match": 14, "dive": 0, "print": 0}
FIXED = {"stage": 84, "lockup": 75}
OPENERS = {"lines", "bloom", "letters", "blinds", "focus", "cut", "iris"}
MIN_SEC = {"garden": 4.5, "object": 3.5, "globe": 4.0, "hall": 3.8, "deep": 3.0, "city": 4.0, "orbit": 3.2, "table": 3.8, "type": 2.4}
STYLE = {"scene": "groove", "garden": "groove", "object": "groove", "globe": "drive", "hall": "drive", "deep": "ambient", "city": "drive", "orbit": "drive", "table": "groove", "type": "ambient", "stage": "groove", "lockup": "end"}


def names_in(path, pattern):
    return set(re.findall(pattern, open(os.path.join(ROOT, path)).read()))


def wordmark(name, out_png):
    """A plain white type wordmark for a brand with no logo file (never an imitation of a real logo)."""
    from PIL import Image, ImageDraw, ImageFont
    font = None
    for f in ("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(f):
            font = ImageFont.truetype(f, 200)
            break
    font = font or ImageFont.load_default()
    box = ImageDraw.Draw(Image.new("RGBA", (10, 10))).textbbox((0, 0), name, font=font)
    w, h = box[2] - box[0] + 40, box[3] - box[1] + 40
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((20 - box[0], 20 - box[1]), name, font=font, fill=(255, 255, 255, 255))
    img.save(out_png)


def check(spec):
    cast_ids = names_in("src/kit/cast.ts", r"\n  (\w+): \{ url:") | {"figure"}
    themes = names_in("src/kit/theme.ts", r"\n  (\w+): \{ paper:")
    errs = []
    shots = spec.get("shots") or []
    if len(shots) < 3:
        errs.append("a film needs at least 3 shots")
    for i, s in enumerate(shots):
        tag = f"shot {i + 1} ({s.get('scene') or s.get('world')})"
        w, e = s.get("world"), s.get("enter")
        if w not in WORLDS:
            errs.append(f"{tag}: unknown world; one of {sorted(WORLDS)}")
        if e not in ENTERS:
            errs.append(f"{tag}: unknown enter {e!r}; one of {sorted(ENTERS)}")
        if i == 0 and e not in OPENERS:
            errs.append(f"{tag}: the first shot enters by an opener: {sorted(OPENERS)}")
        if i > 0 and e in OPENERS - {"cut", "iris"}:
            errs.append(f"{tag}: {e!r} is an opener, only for the first shot")
        if e == "print" and w != "object":
            errs.append(f"{tag}: only an object shot enters by print")
        if w == "object" and e != "print":
            errs.append(f"{tag}: an object shot enters by print (the previous world becomes its print)")
        if w == "object" and i > 0 and shots[i - 1].get("world") in ("object", "stage", "lockup", "type", "scene"):
            errs.append(f"{tag}: the shot before an object must be a 3D world (it becomes the print)")
        if w == "lockup" and i != len(shots) - 1:
            errs.append(f"{tag}: the lockup is the last shot")
        if e == "split" and (i == 0 or shots[i - 1].get("world") != "object" or not (shots[i - 1].get("p") or {}).get("strip")):
            errs.append(f"{tag}: split opens out of an object shot that has a foil strip (p.strip)")
        if w == "scene":
            src = os.path.join(ROOT, "src/films", spec.get("slug", ""), "index.tsx")
            have = set(re.findall(r"\n  (\w+): \w+,", open(src).read())) if os.path.exists(src) else set()
            if s.get("scene") not in have:
                errs.append(f"{tag}: scene {s.get('scene')!r} is not in src/films/{spec.get('slug')}/index.tsx (has {sorted(have)})")
            if float(s.get("sec", 0)) < 2.4:
                errs.append(f"{tag}: needs at least 2.4 s")
        if w not in FIXED and w in MIN_SEC and float(s.get("sec", 0)) < MIN_SEC[w]:
            errs.append(f"{tag}: needs at least {MIN_SEC[w]} s, has {s.get('sec')}")
        if s.get("theme") and s["theme"] not in themes:
            errs.append(f"{tag}: unknown theme {s['theme']!r}; one of {sorted(themes)}")
        for c in s.get("cast") or []:
            if c not in cast_ids:
                errs.append(f"{tag}: unknown cast {c!r}; one of {sorted(cast_ids)}")
        t = s.get("text") or {}
        if t.get("head") and len(t["head"]) > 30:
            errs.append(f"{tag}: text.head is {len(t['head'])} characters, max 30")
        if t.get("sub") and len(t["sub"]) > 48:
            errs.append(f"{tag}: text.sub is {len(t['sub'])} characters, max 48")
        v = s.get("value") or {}
        if v.get("value") and len(v["value"]) > 6:
            errs.append(f"{tag}: value is {len(v['value'])} characters, max 6")
        p = s.get("p") or {}
        if p.get("strip"):
            if len(p["strip"][0]) > 18:
                errs.append(f"{tag}: p.strip[0] is {len(p['strip'][0])} characters, max 18 (it lands whole in the close-up)")
            if any(x != x.upper() for x in p["strip"]):
                errs.append(f"{tag}: strip phrases are set in capitals")
        for ln in p.get("lines") or []:
            if len(ln) > 24:
                errs.append(f"{tag}: p.lines entry is {len(ln)} characters, max 24: {ln!r}")
        if w == "stage":
            rows = p.get("rows") or []
            if not 2 <= len(rows) <= 4:
                errs.append(f"{tag}: the stage needs 2-4 p.rows")
        if i > 0 and s.get("theme") and s.get("theme") == shots[i - 1].get("theme") and w not in ("object", "lockup"):
            errs.append(f"{tag}: same theme as the shot before; change ink on every cut")
    if shots and shots[-1].get("world") != "lockup":
        errs.append("the last shot is the lockup")
    return errs


def frames(shots):
    """Seconds -> frames, with every cut snapped to the nearest beat (cumulative, so errors never add up)."""
    out, t_sec, prev = [], 0.0, 0
    for s in shots:
        if s["world"] in FIXED:
            d = FIXED[s["world"]]
            out.append(d)
            prev += d
            t_sec = prev / FPS
            continue
        t_sec += float(s["sec"])
        edge = int(round(round(t_sec * FPS / BEAT) * BEAT))
        d = max(24, edge - prev)
        out.append(d)
        prev += d
    return out


def cues(spec, shots, durs):
    secs, ev, t = [], [], 0
    for i, (s, d) in enumerate(zip(shots, durs)):
        w, e = s["world"], s["enter"]
        sec = {"name": f"{i + 1} {w}", "from": t, "to": t + d, "beats": max(1, round(d / BEAT)), "style": s.get("mood") or STYLE[w]}
        if i == 0:
            sec["style"] = "intro"
            sec["drums_from"] = min(d - 12, 62)
        nxt = shots[i + 1]["enter"] if i + 1 < len(shots) else None
        if nxt in ("split", "dive") or w == "stage":
            sec["quiet"] = [[t + d - 22, t + d]]
        secs.append(sec)
        # sound on the picture's events
        if e == "lines":
            for k in range(13):
                ev.append({"at": round(abs(k - 6) * 1.6, 1), "fx": "pen", "sec": 0.35, "gain": 0.9, "pan": 0.6 if k % 2 else -0.6})
            ev += [{"at": 18, "fx": "whoosh", "sec": 0.9, "lo": 200, "hi": 1800, "gain": 0.7, "pan": 0.5}, {"at": 25, "fx": "tick", "freq": 1800, "gain": 0.8}]
        elif e == "cut":
            ev.append({"at": t, "fx": "impact", "big": 0.5, "gain": 0.7})
        elif e == "iris":
            ev += [{"at": t + OVERLAP[e], "fx": "whoosh", "sec": 0.7, "lo": 300, "hi": 3000, "gain": 0.6}]
        elif e == "wipe":
            ev += [{"at": t + OVERLAP[e], "fx": "whoosh", "sec": 0.6, "lo": 400, "hi": 4000, "gain": 0.6, "pan": 0.4}, {"at": t + 4, "fx": "sparkle", "sec": 0.6, "gain": 0.4}]
        elif e == "split":
            ev += [{"at": t + 2, "fx": "whoosh", "sec": 0.8, "lo": 300, "hi": 5000, "gain": 0.8}, {"at": t + 8, "fx": "sparkle", "sec": 0.8, "gain": 0.6}]
        elif e == "match":
            ev += [{"at": t, "fx": "riser", "sec": 1.1, "gain": 0.5}, {"at": t + 2, "fx": "impact", "big": 0.6, "gain": 0.6}]
        elif e == "dive":
            ev += [{"at": t, "fx": "riser", "sec": 0.6, "gain": 0.6}, {"at": t + 2, "fx": "swell", "sec": 0.5, "gain": 0.6}]
        elif e == "print":
            ev += [{"at": t, "fx": "swell", "sec": 1.0, "gain": 0.9}, {"at": t + 1, "fx": "impact", "big": 0.8, "gain": 0.8}]
        if s.get("text"):
            ev.append({"at": t + int(d * 0.22), "fx": "swell", "sec": 0.5, "gain": 0.5})
        if s.get("value"):
            ev += [{"at": t + 22, "fx": "swell", "sec": 0.7, "gain": 0.8}, {"at": t + 30, "fx": "sparkle", "sec": 0.9, "gain": 0.6}]
        p = s.get("p") or {}
        if w == "hall":
            at0 = 25 if e == "match" else 8
            for k in range(min(5, len(s.get("cast") or []))):
                ev.append({"at": t + at0 + k * 12 + (13 if k == 3 else 0), "fx": "pop", "freq": 520 + 80 * k, "gain": 0.6})
        if w == "table":
            for k in range(min(4, len(s.get("cast") or []))):
                ev.append({"at": t + 6 + k * 12, "fx": "click", "gain": 0.5})
            if p.get("beans"):
                ev.append({"at": t + 6, "fx": "bubbles", "sec": 1.2, "count": 18, "gain": 0.45})
            if p.get("pour"):
                ev.append({"at": t + int(d * 0.3), "fx": "rumble", "sec": 1.6, "gain": 0.35})
        if w == "city" and p.get("enter"):
            ev.append({"at": t + int(d * 0.5), "fx": "click", "gain": 0.6})
        if w == "orbit":
            ev.append({"at": t + 6, "fx": "riser", "sec": 1.2, "gain": 0.35})
        if w == "type":
            n = sum(len(x.split()) for x in p.get("lines") or [])
            for k in range(n):
                ev.append({"at": t + 6 + k * 3, "fx": "tick", "freq": 1600 + 90 * k, "gain": 0.35})
        if w == "stage":
            ev += [{"at": t + 10, "fx": "laser", "sec": 1.0, "gain": 0.4}, {"at": t + 45, "fx": "pop", "freq": 700, "gain": 0.6}]
        if w == "lockup":
            ev += [{"at": t + 2, "fx": "impact", "big": 1.0, "gain": 0.9}]
        t += d
    return {"title": spec.get("slug"), "fps": FPS, "frames": t, "key": spec.get("key", "D"), "sections": secs, "events": ev}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        raise SystemExit(__doc__)
    spec = json.load(open(args[0]))
    errs = check(spec)
    if errs:
        raise SystemExit("the storyboard does not fit:\n  " + "\n  ".join(errs))
    slug = spec["slug"]
    out = os.path.join(ROOT, "public/films", slug)
    os.makedirs(out, exist_ok=True)
    brand = dict(spec["brand"])
    if brand.get("logo"):
        if not os.path.exists(os.path.join(ROOT, "public", brand["logo"])):
            raise SystemExit(f"logo file not found: public/{brand['logo']}")
    else:
        wordmark(brand["name"], os.path.join(out, "wordmark.png"))
        brand["logo"] = f"films/{slug}/wordmark.png"
    shots = spec["shots"]
    durs = frames(shots)
    plan_shots = []
    for s, d in zip(shots, durs):
        q = {k: v for k, v in s.items() if k != "sec"}
        q["dur"] = d
        plan_shots.append(q)
    total = sum(durs)
    cue = cues(spec, shots, durs)
    json.dump(cue, open(os.path.join(out, "cues.json"), "w"), indent=1)
    score = f"films/{slug}/score.wav"
    if "--no-score" not in sys.argv:
        subprocess.run([sys.executable, "-I", os.path.join(HERE, "score_to_picture.py"), os.path.join(out, "cues.json"), "--out", os.path.join(out, "score")], check=True)
    plan = {"slug": slug, "brand": {"name": brand["name"], "logo": brand["logo"], "line": brand.get("line", "")}, "shots": plan_shots, "score": score}
    json.dump({"composition": "Story", "frames": total, "plan": plan}, open(os.path.join(out, "props.json"), "w"), ensure_ascii=False, indent=1)
    rel = os.path.relpath(out, ROOT)
    t, keys = 0, []
    print(f"ok: {slug}: {len(shots)} shots, {total} frames ({total / FPS:.1f} s). props: {rel}/props.json")
    print("\n  #  frames      world   enter   text")
    for i, (s, d) in enumerate(zip(shots, durs)):
        head = (s.get("text") or {}).get("head") or (s.get("value") or {}).get("value") or " / ".join((s.get("p") or {}).get("lines") or [])
        print(f"  {i + 1:<2} {t:>4}-{t + d - 1:<5} {(s.get('scene') or s['world']):<7} {s['enter']:<7} {head}")
        keys.append(t + int(d * 0.62))
        t += d
    print("\n1) stills sheet (send to the user before rendering):")
    print(f"   bash tools/stills.sh {rel}/props.json out/{slug}-stills {','.join(map(str, keys))}")
    print("2) render (chunked, score muxed in, motion QA):")
    print(f"   bash tools/render.sh {rel}/props.json out/{slug}.mp4")


if __name__ == "__main__":
    main()
