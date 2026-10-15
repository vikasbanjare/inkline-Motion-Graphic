# Inkline

**Engraved 3D launch films, storyboarded and built for your script.**

Paste a script or brief into Claude Code. Inkline:
- storyboards it the way a director would: a story, a protagonist, a motif, designed cuts;
- builds that film's own 3D subjects in an engraved, two-ink style;
- scores it with original music and foley;
- renders it and checks the motion.

Every film shares the style, and none shares the content.

Built with [Remotion](https://www.remotion.dev), [Three.js](https://threejs.org) and
[Claude Code](https://claude.com/claude-code). Free to use under the MIT licence; see **Licences** below for the
parts that have their own terms.

## Showcase

**Velmora: "Two journeys, one cup"** (a fictional coffee brand's café launch, 37 s). A man walking to work and a
coffee bean travelling from the hills cross the city before sunrise and meet in one cup. Every subject was built
for this script: coffee hills, a ripening cherry, a blue-hour street, a drum roaster, a hand grinder, a gooseneck
pour-over, latte art, the café. The score is lo-fi jazz with foley timed to the picture.

[![Velmora, 5 seconds](showcase/velmora/preview.gif)](showcase/velmora/STORYBOARD.md)

**[The storyboard, in real frames](showcase/velmora/STORYBOARD.md)** · **[Watch the film](showcase/velmora/film.mp4)**

---

## Start from zero, with Claude Code (easiest)

1. **Open this repo** in Claude Code, on the web (claude.ai/code), desktop or CLI. The setup hook installs
   everything on the first start (about 1 minute). You should see `inkline ready: …`.
2. **Optional: check the install.** Ask Claude to run `bash tools/selftest.sh`, or run it yourself. You should see
   `PASS` (about 2 minutes).
3. **Paste your brief:**

   ```
   Make a film from this script using the inkline-film skill.
   Brand: <name>. Logo: <path to a white-on-transparent PNG, or "none">.
   Audience: <who it's for>. Must remember: <the one thing>.

   <your script>
   ```

4. **Approve the storyboard.** Claude shows the logline, the concept, the protagonist and arc, and a table of every
   shot (picture, words, sound, how it cuts in). Say what to change.
5. **Approve the real-frame board.** Claude builds the film's scenes and sends one rendered frame per shot. Check
   the objects, the words and the framing, then say "go".
6. **Get the film.** Claude renders it, checks it for freezes and sends the MP4. It also writes a showcase folder
   with a GIF and the storyboard in real frames.

A new film's scenes are built for it, so expect a few hours of Claude's work for a 30–40 second film, plus about
an hour of rendering.

## Start from zero, by hand

You need Node.js 22.18+, Python 3 with `numpy` and `pillow`, and ffmpeg.

```sh
git clone https://github.com/vikasbanjare/inkline-Motion-Graphic && cd inkline-Motion-Graphic
bash scripts/setup.sh                 # installs packages, finds a browser, checks python and ffmpeg
bash tools/selftest.sh                # PASS = ready (plans both examples, renders one still of each)

python3 -I tools/plan.py specs/coffee.plan.json                         # check the plan, snap cuts to the beat, write the score
bash tools/stills.sh public/films/velmora/props.json out/board 100,180,330,590,790   # real frames
bash tools/render.sh public/films/velmora/props.json out/velmora.mp4    # render, add the score, check the motion
python3 -I tools/showcase.py specs/coffee.plan.json out/velmora.mp4     # film, GIF and storyboard in showcase/
```

`npx remotion studio` previews any film in the browser (composition `Story`).

## How a film is made

| Step | What | Where |
|---|---|---|
| 1. Storyboard | Logline, concept device, motif, protagonist, arc, beat sheet, shot grammar, designed joins, sound plan | `.claude/skills/inkline-film/reference/storyboarding.md` |
| 2. Style | What every film copies: the engraving, inks, paper, foil, type, camera rhythm, transitions | `reference/style-bible.md` |
| 3. Subjects | The film's own scenes, from lathe, extrude, tube, leaf, blob, a walking person, and 2D foil line work | `src/build/`, `src/films/<slug>/` |
| 4. Plan | Shots, timing, themes, words, energy and foley | `specs/<slug>.plan.json`, `tools/plan.py` |
| 5. Sound | Music by genre (lo-fi jazz, cinematic, modern pop, ambient), foley tied to the picture, mixed and mastered | `reference/sound-design.md`, `tools/sound.py` |
| 6. Board | One real frame per shot, approved before the render | `tools/stills.sh` |
| 7. Render and QA | 120-frame chunks, the score muxed in, a check for freezes, and an every-frame check for pops and camera lurches | `tools/render.sh`, `tools/motion_qa.py`, `tools/jerk_qa.py` |
| 7b. Match a reference (optional) | Frame-matched comparison and look metrics against a film you admire | `tools/ref_compare.py`, `reference/lessons.md` |
| 8. Showcase | The film, a GIF, and the storyboard in real frames | `tools/showcase.py`, `showcase/<slug>/` |

**Openers** (each film opens its own way): `bloom` (a drop blooms open), `letters` (the world seen through a
word), `blinds` (foil bars turn open), `focus` (a rack focus out of a bright blur), `lines` (pen lines race in).

**Transitions:** `iris`, `match` (one shape becomes the next), `cut` (a scale step on the beat), `wipe` (a
foil-edged diagonal), `print` (the world becomes the print on an object), `split` (a foil strip opens), `dive`,
`lens` (the iris closes on the hero, hard cut, a new iris opens) and `sweep` (a lens edge sweeps across).

**Ready-made kit worlds** (`src/kit/worlds/`; a film uses one only when it is exactly the right picture):
- garden, globe, orbit, table, city, hall and deep;
- type (a statement in words);
- object (a card, ticket, banknote or screen);
- stage (a phone);
- lockup (your logo).

`specs/kit-tour.plan.json` shows them all.

## Your logo

Put your logo in `public/brand/` as a **white logo on a transparent PNG**, and set `"logo"` in the plan's
`brand`. With no logo file, the name is set in plain type. Use only a logo you have the right to use; never
another company's logo or name.

## The original card template

`src/film/Film.tsx` (composition `Film`) is the first film this repo made: a fixed 30-second card ad. Only its
words, its number and the logo change: `cp specs/example.json specs/mine.json`, edit, then
`python3 -I tools/film.py specs/mine.json`. Use it only when you want exactly that film.

## Licences and credits

- **Code** in this repo: MIT (see `LICENSE`).
- **Remotion** has its own licence. It is free for individuals and for companies of up to 3 people; larger
  companies need a company licence. Check [remotion.dev/license](https://www.remotion.dev/license) before
  using this for client work.
- **3D models:** Khronos glTF sample assets, CC0 and CC-BY 4.0. **Credit the CC-BY authors when you publish a
  film.** The list is in `public/models/CREDITS.md`.
- **Fonts:** Newsreader and Lexend, SIL Open Font License (`public/fonts/OFL-LICENSES.txt`).
- **Map data:** Natural Earth via `world-atlas` (public domain).
- **Music and SFX:** synthesized by `tools/sound.py` and `tools/score_to_picture.py`. Every note and sound is
  generated in code, so you can use them freely.

**Your claims are your responsibility.** Put only true, approved claims in a film. Label sample or spec work as
such.
