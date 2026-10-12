"""Fill the film with a new script: a copy sheet -> validated Remotion props for the Film composition.

    python3 -I tools/film.py specs/<slug>.json

The film itself never changes: same worlds, camera moves, transitions, timing and score. Only the words, numbers
and logo change. This checks every slot fits its shot, makes a plain type wordmark when no logo file is given,
optionally re-keys the score, writes public/films/<slug>/props.json, and prints the still, render and QA commands.

Copy sheet (see specs/example.json; all fields required unless marked optional):
{
  "slug": "acme",
  "brand": "Acme",                                       # used for a type wordmark when there is no logo file
  "logo": "brand/acme-logo.png",                         # optional: your logo file, white on transparent, under public/
  "key": "D",                                            # optional: re-key the score (C..B); omitted = the default score
  "claim1": {"head": "2% cashback", "sub": "on every bill you pay"},            # the garden: growth, rewards
  "card":   {"head": "the Acme everyday", "sub": "credit card"},               # the card reveal: product name
  "strip":  ["NO ANNUAL FEE", "2% CASHBACK ON EVERY BILL"],                     # foil strip; [0] <= 18 chars, lands whole
  "claim2": {"head": "redeem on travel and stays"},                            # the globe: travel, reach, worldwide
  "claim3": {"head": "500+ brands", "sub": "in the Acme store"},               # the colonnade: choice, catalogue
  "hero":   {"label": "ANNUAL FEE", "value": "₹0"},                            # the shell: a number that rises (<= 5 chars)
  "card_print": "2% CASHBACK ON EVERY BILL  ·  NO ANNUAL FEE",                 # tiny print on the outro card
  "outro": {"screen": "your card", "title": "Acme everyday credit card",
            "rows": ["2% cashback on every bill", "no annual fee", "redeem on travel and stays"],
            "left": "the Acme everyday", "right": "credit card."},
  "lockup": "everyday credit card"
}
Claims must be the script's own approved words. Never invent numbers.
"""

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_SCORE = "audio/score.wav"

# (path, max characters) - from the shots' widths at the film's type sizes
LIMITS = [
    ("claim1.head", 26), ("claim1.sub", 40), ("card.head", 30), ("card.sub", 40),
    ("strip.0", 18), ("strip.1", 34), ("claim2.head", 30), ("claim2.sub", 40),
    ("claim3.head", 26), ("claim3.sub", 40), ("hero.label", 18), ("hero.value", 5),
    ("card_print", 60), ("outro.screen", 16), ("outro.title", 44), ("outro.left", 26), ("outro.right", 26), ("lockup", 40),
]


def get(d, path):
    for k in path.split("."):
        if isinstance(d, list):
            d = d[int(k)] if int(k) < len(d) else None
        else:
            d = d.get(k) if isinstance(d, dict) else None
        if d is None:
            return None
    return d


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


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    spec_path = sys.argv[1]
    s = json.load(open(spec_path))
    slug = s.get("slug") or os.path.splitext(os.path.basename(spec_path))[0]
    errors = []
    for path, n in LIMITS:
        v = get(s, path)
        if v is None:
            if path.split(".")[-1] in ("sub",):
                continue
            errors.append(f"missing {path}")
        elif len(v) > n:
            errors.append(f"{path} is {len(v)} characters, max {n}: {v!r}")
    rows = get(s, "outro.rows") or []
    if not 2 <= len(rows) <= 4:
        errors.append("outro.rows needs 2-4 rows")
    errors += [f"outro.rows[{i}] is {len(r)} characters, max 64" for i, r in enumerate(rows) if len(r) > 64]
    if s.get("strip") and s["strip"][0] != s["strip"][0].upper():
        errors.append("strip phrases are set in capitals; write them in capitals")
    if errors:
        raise SystemExit("copy does not fit the film:\n  " + "\n  ".join(errors))

    out = os.path.join(ROOT, "public/films", slug)
    os.makedirs(out, exist_ok=True)
    logo = s.get("logo")
    if logo:
        if not os.path.exists(os.path.join(ROOT, "public", logo)):
            raise SystemExit(f"logo file not found: public/{logo}")
    else:
        wordmark(s["brand"], os.path.join(out, "wordmark.png"))
        logo = f"films/{slug}/wordmark.png"

    score = DEFAULT_SCORE
    if s.get("key") and s["key"] != "D":
        cues = json.load(open(os.path.join(ROOT, "public/audio/cues.json")))
        cues["key"] = s["key"]
        json.dump(cues, open(os.path.join(out, "cues.json"), "w"), indent=1)
        subprocess.run([sys.executable, "-I", os.path.join(HERE, "score_to_picture.py"), os.path.join(out, "cues.json"), "--out", os.path.join(out, "score")], check=True)
        score = f"films/{slug}/score.wav"

    copy = {
        "logo": logo, "claim1": s["claim1"], "card": s["card"], "strip": s["strip"][:2], "claim2": s["claim2"],
        "claim3": s["claim3"], "hero": s["hero"], "cardPrint": s["card_print"], "outro": s["outro"], "lockup": s["lockup"],
    }
    json.dump({"copy": copy, "score": score}, open(os.path.join(out, "props.json"), "w"), ensure_ascii=False, indent=1)
    rel = os.path.relpath(out, ROOT)
    keys = "100 230 272 340 440 528 600 626 690"
    print(f"ok: {slug} fits the film. props: {rel}/props.json")
    print("\n1) stills (send to the user before rendering):")
    print(f"   npx remotion bundle --out-dir=/tmp/film-bundle && for f in {keys}; do npx remotion still /tmp/film-bundle Film out/{slug}-$f.png --frame=$f --props={rel}/props.json --gl=swangle; done")
    print("2) render (chunked, with the score muxed in):")
    print(f"   bash tools/render.sh {rel}/props.json out/{slug}.mp4")
    print("3) check the export:")
    print(f"   python3 -I tools/motion_qa.py out/{slug}.mp4 --frames 100,272,528,626 --sheet out/{slug}.qa.jpg")


if __name__ == "__main__":
    main()
