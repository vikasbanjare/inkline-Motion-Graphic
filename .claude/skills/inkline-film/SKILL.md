---
name: inkline-film
description: Make an engraved 3D launch film from any script, with its own storyboard and its own subjects. The style is fixed (engraving shader, two-ink duotones, paper and line field, foil on one hero, serif headlines, scale-step cuts on the beat, the transition set, an original score), and the content is designed for the script. Claude storyboards like a director (spine, the script's world of objects, shape, a designed shot per beat, designed joins), builds that film's own scenes in src/films/<slug>/ from the subject builder (lathe, extrude, tube, leaf, blob, mannequin, 2D foil overlays), then checks it with tools/plan.py (beat grid and score), sends stills to the user, renders, runs motion QA and delivers. Use whenever someone pastes a video script, ad brief, product or store launch, or feature list, or asks for a brand film in this style.
---
# Inkline film: a script in, a unique film out

**Copy the style, never the content.** The style is the engraving, the inks, the paper, the foil, the type, the
camera rhythm, the transitions and the score (`reference/style-bible.md`). The content is invented for each
script: a coffee film has a coffee branch, a roaster, a pour-over and a café, and a space film has a rocket, stage
separation and orbits. Re-using the garden, the card or the colonnade for a script they don't belong to is the
failure this skill exists to prevent.

There are two compositions:
- **`Story`** (use this): any shot plan. Its shots are the film's own scenes (`src/films/<slug>/`, `"world":
  "scene"`) and, only where one fits exactly, a kit world (`src/kit/worlds/`). It runs from
  `specs/<slug>.plan.json` through `tools/plan.py`.
- **`Film`**: the original fixed 30-second card film; only its words change (`tools/film.py`). Use it only when
  the user asks for "the same film as the example".

## Hard rules

- **Copy:**
  - Every claim on screen is the script's own approved wording. Never invent a number, offer, date or address.
    If one is missing, ask.
  - For a sample or a pitch with no real brand, use a clearly fictional brand. Label the film as a sample, and
    keep its claims in the spec's `note`.
  - No card or account numbers and no personal data.
- **Logo:**
  - Use only the brand's own logo file (white on transparent PNG). With no file, `plan.py` sets the name in
    plain type.
  - Never redraw or imitate a logo, and never put another company's mark on screen. The shopfront sign in `city`
    is the name in plain type.
- **Labelling:** if the brand didn't commission the film, the user must label it as spec or concept work.
- **Credits:** credit the CC-BY 3D models when the film is published (`public/models/CREDITS.md`).
- **Remotion licence:** Remotion is free for individuals and companies of up to 3 people. Tell a larger
  company it needs a Remotion company licence (remotion.dev/license).

## Steps

### 1. Direct (no code yet)

Read `reference/style-bible.md`, then follow `reference/storyboarding.md`:
1. the spine;
2. the script's world (15–25 specific objects and actions);
3. the shape;
4. one designed shot per beat (subject and how it is built, its life, the camera, the foil, the theme, the words);
5. designed joins.

Show the user the storyboard table and wait for approval or notes. Ask at most one question, and only if a
claim or the audience is unclear.

### 2. Build the film's scenes and write the plan

1. **Make `src/films/<slug>/`**, with one `React.FC<WorldProps>` per scene, built with `src/build/geo.ts` and the
   style pieces in `src/kit/common.tsx`. Follow the worked example in `src/films/velmora/` (a fictional coffee
   brand).
2. **Register the film:** export its scenes from `src/films/<slug>/index.tsx` and add it to `src/films/index.ts`.
3. **Write `specs/<slug>.plan.json`** (copy `specs/coffee.plan.json`). Each shot is `{"world": "scene",
   "scene": "<name>", "sec", "enter", "theme", "mood", "text", "p"}`, and the last shot is
   `{"world": "lockup", "enter": "dive"}`.
4. **Typecheck:** `npx tsc --noEmit`.

### 3. Check it and score it

```sh
python3 -I tools/plan.py specs/<slug>.plan.json
```

**You should see:**
- `ok: <slug>: N shots, F frames`;
- the shot table with frames;
- the stills and render commands.

It refuses a plan that breaks a rule: a line too long, two neighbours in the same ink, `print` into a non-object,
the lockup not last, and so on. Fix what it names and run it again. It also writes the cue sheet and the score
(`public/films/<slug>/score.wav`).

### 4. Stills to the user (gate)

```sh
bash tools/stills.sh public/films/<slug>/props.json out/<slug>-stills <frames from step 3>
```

Look at `out/<slug>-stills/sheet.jpg` yourself first:
- every word is readable and clear of the subjects;
- the cast is in frame (feet not cut off), with no empty or black frames;
- each world's ink differs from its neighbours'.

Fix what you can, then send the sheet to the user and wait for "go".

### 5. Render and check

```sh
bash tools/render.sh public/films/<slug>/props.json out/<slug>.mp4
```

This renders in 120-frame chunks, joins them, adds the score and runs `tools/motion_qa.py`.

**Expect:** `freezes: none`. The lockup's opening black frames and its slow hold are known and fine. For anything
else, look at the flagged frames in the export, not the preview, and fix the motion (overlap the moves, or keep a
drift through the hand-over).

### 6. Deliver

```sh
ffmpeg -i out/<slug>.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 192k out/<slug>-share.mp4
```

Send the film with the storyboard table and what QA found. Say plainly that the score is synthesized: clean, not a
produced track.

### 7. Notes

Turn the user's timestamps into frames (seconds × 24) and look at those frames first.
- **Copy and order notes:** edit the plan, re-run step 3, delete `.render/<slug>/` and re-render.
- **Look notes:** change the film's own scenes in `src/films/<slug>/`. `reference/lessons.md` covers the motion
  pitfalls: micro-stops, chunk-safe animation and headless text rendering.
