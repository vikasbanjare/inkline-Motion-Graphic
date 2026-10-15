"""Publish a finished film to showcase/<slug>/: the film, a storyboard made of its real frames, and a preview GIF.

    python3 -I tools/showcase.py specs/<slug>.plan.json out/<slug>.mp4

Writes:
  showcase/<slug>/film.mp4         share-size 720p H.264 + AAC
  showcase/<slug>/preview.gif      a 5-second, 480 px loop for the README
  showcase/<slug>/board/NN.jpg     one real frame per shot (the shot's key moment, from the export itself)
  showcase/<slug>/STORYBOARD.md    the board: logline, device, motif, pace, then every panel with its frame and notes
  showcase/<slug>/board.html       the same board as a page

Board notes come from the plan: a top-level "board" (title, logline, device, motif, protagonist, arc) and a "board"
on each shot (beat, shot, action, sound, in, why). Optional "key" on a shot (0..1) picks its frame (default 0.62).
"""

import html
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 24


def run(*a):
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    spec = json.load(open(sys.argv[1]))
    film = sys.argv[2]
    slug = spec["slug"]
    props = json.load(open(os.path.join(ROOT, "public/films", slug, "props.json")))
    shots = props["plan"]["shots"]
    out = os.path.join(ROOT, "showcase", slug)
    os.makedirs(os.path.join(out, "board"), exist_ok=True)
    run("ffmpeg", "-y", "-i", film, "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-crf", "29", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", os.path.join(out, "film.mp4"))
    # the GIF: the film's most characterful 6 seconds (from the longest shot onward), 640 px, 12 fps, a shared palette
    t, starts = 0, []
    for s in shots:
        starts.append(t)
        t += s["dur"]
    pal = os.path.join(out, ".pal.png")
    g0 = (starts[1] if len(starts) > 1 else 0) / FPS
    run("ffmpeg", "-y", "-ss", f"{g0:.2f}", "-t", "5", "-i", film, "-vf", "fps=10,scale=480:-1:flags=lanczos,palettegen=max_colors=96", pal)
    run("ffmpeg", "-y", "-ss", f"{g0:.2f}", "-t", "5", "-i", film, "-i", pal, "-lavfi", "fps=10,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5", os.path.join(out, "preview.gif"))
    os.remove(pal)
    # one real frame per shot
    panels = []
    for i, (s, a) in enumerate(zip(shots, starts)):
        k = s.get("key", 0.62)
        fr = a + int(s["dur"] * k)
        img = f"board/{i + 1:02d}.jpg"
        run("ffmpeg", "-y", "-ss", f"{fr / FPS:.3f}", "-i", film, "-frames:v", "1", "-vf", "scale=960:-1", "-q:v", "3", os.path.join(out, img))
        b = s.get("board") or {}
        words = (s.get("text") or {}).get("head") or (s.get("value") or {}).get("value") or ""
        panels.append({"n": i + 1, "t0": a / FPS, "t1": (a + s["dur"]) / FPS, "img": img, "words": words, "scene": s.get("scene") or s["world"], "enter": s["enter"], **b})
    B = spec.get("board", {})
    total = t / FPS
    # markdown board
    md = [f"# {B.get('title', slug)}", "", f"*{spec.get('note', '')}*" if spec.get("note") else "", "",
          f"![The film, 5 seconds](preview.gif)", "", f"**[Watch the film (film.mp4)](film.mp4)** · {total:.1f} s · {len(shots)} shots", ""]
    for k in ("logline", "device", "motif", "protagonist", "arc"):
        if B.get(k):
            md.append(f"- **{k.capitalize()}:** {B[k]}")
    md += ["", "## The board", ""]
    for p in panels:
        md += [f"### {p['n']:02d} · {p.get('beat', '')} · {p['t0']:.1f}–{p['t1']:.1f} s", "", f"![Shot {p['n']}]({p['img']})", ""]
        if p.get("shot"):
            md.append(f"**Shot:** {p['shot']}  ")
        if p.get("action"):
            md.append(f"**Action:** {p['action']}  ")
        if p["words"]:
            md.append(f"**Words:** “{p['words']}”  ")
        if p.get("sound"):
            md.append(f"**Sound:** {p['sound']}  ")
        md.append(f"**In:** {p.get('in', p['enter'])}  ")
        if p.get("why"):
            md.append(f"**Why:** {p['why']}")
        md.append("")
    md += ["---", "", f"Made with Inkline: storyboarded by Claude from the brief, built as engraved 3D scenes (`src/films/{slug}/`), "
           f"cut to the beat with an original synthesized score. Plan: `{os.path.relpath(os.path.abspath(sys.argv[1]), ROOT)}`."]
    open(os.path.join(out, "STORYBOARD.md"), "w").write("\n".join(md) + "\n")
    # html board
    e = html.escape
    cards = "".join(
        f"""<article><img src="{p['img']}" alt="Shot {p['n']}" loading="lazy"><div class="m"><span>{p['n']:02d}</span><span>{e(p.get('beat', ''))}</span><span>{p['t0']:.1f}–{p['t1']:.1f} s</span></div>
<div class="b"><div class="s">{e(p.get('shot', ''))}</div><p>{e(p.get('action', ''))}</p>{f'<div class="w">“{e(p["words"])}”</div>' if p['words'] else ''}<div class="n"><b>Sound</b> {e(p.get('sound', ''))}</div><div class="n"><b>In</b> {e(p.get('in', p['enter']))}</div></div></article>"""
        for p in panels)
    brief = "".join(f"<div><b>{k}</b><p>{e(B[k])}</p></div>" for k in ("logline", "device", "motif", "protagonist", "arc") if B.get(k))
    page = f"""<title>{e(B.get('title', slug))}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,600&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
:root {{ --bg:#f3efe8; --card:#fbf9f5; --ink:#2a2622; --soft:#6e6862; --rule:#d8d1c6; --accent:#9a3b22; --cool:#3d5a73 }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#1b1917; --card:#24211e; --ink:#ece6dc; --soft:#a69e94; --rule:#3a352f; --accent:#e07a5a; --cool:#8fb0cc; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#1b1917; --card:#24211e; --ink:#ece6dc; --soft:#a69e94; --rule:#3a352f; --accent:#e07a5a; --cool:#8fb0cc; color-scheme:dark }}
body {{ background:var(--bg); color:var(--ink); font:15px/1.5 "Source Sans 3", sans-serif; padding-inline:18px; padding-block:26px 60px }}
.w0 {{ max-width:1200px; margin:0 auto; display:grid; gap:26px }}
h1 {{ font:600 clamp(30px,5vw,48px)/1.05 Newsreader, serif; margin:0 }}
.note {{ color:var(--soft); margin:6px 0 0 }}
.brief {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1px; background:var(--rule); border:1px solid var(--rule) }}
.brief div {{ background:var(--card); padding:14px 16px; min-width:0 }} .brief b {{ font:500 11px "IBM Plex Mono", monospace; letter-spacing:.1em; text-transform:uppercase; color:var(--accent) }} .brief p {{ margin:4px 0 0 }}
video {{ width:100%; max-width:100%; border:1px solid var(--rule); background:#000 }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:20px }}
article {{ background:var(--card); border:1px solid var(--rule); min-width:0 }} article img {{ display:block; width:100%; aspect-ratio:16/9; object-fit:cover }}
.m {{ display:flex; justify-content:space-between; gap:8px; padding:8px 12px; font:500 12px "IBM Plex Mono", monospace; color:var(--soft); border-bottom:1px solid var(--rule) }} .m span:nth-child(2) {{ color:var(--accent); text-transform:uppercase }}
.b {{ padding:10px 12px 14px; display:grid; gap:6px }} .s {{ font:500 12px "IBM Plex Mono", monospace; color:var(--cool) }} .b p {{ margin:0 }} .w {{ font:600 17px Newsreader, serif; color:var(--accent) }} .n {{ font-size:13.5px; color:var(--soft) }} .n b {{ font:500 11px "IBM Plex Mono", monospace; text-transform:uppercase }}
</style>
<div class="w0"><header><h1>{e(B.get('title', slug))}</h1><p class="note">{e(spec.get('note', ''))} · {total:.1f} s · {len(shots)} shots</p></header>
<video src="film.mp4" controls playsinline poster="board/01.jpg"></video>
<section class="brief">{brief}</section><section class="grid">{cards}</section></div>
"""
    open(os.path.join(out, "board.html"), "w").write(page)
    sizes = {f: os.path.getsize(os.path.join(out, f)) // 1024 for f in ("film.mp4", "preview.gif")}
    print(f"showcase/{slug}: film.mp4 {sizes['film.mp4']} KB, preview.gif {sizes['preview.gif']} KB, {len(panels)} board frames, STORYBOARD.md, board.html")


if __name__ == "__main__":
    main()
