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

### 1. Storyboard: the most important step (no code yet)

Read `reference/style-bible.md`, then follow `reference/storyboarding.md` in full:
1. the brief → the logline;
2. the **concept device** (parallel journeys, one take, object's POV, before/after, ritual, scale shift, reveal)
   and a **motif**;
3. a **protagonist** and a three-beat **arc**;
4. the **beat sheet** with a hook in the first 2 s and a pace curve;
5. the script's own **world** of objects;
6. one shot per beat, with its size, angle, move, action, words, sound and a designed join.

Plan the sound at the same time (`reference/sound-design.md`): the genre from the concept, the energy per shot, the
drop before the turn, and the foley each picture implies.

Show the user the board (logline, device, motif, protagonist, arc, the shot table) and wait for approval or notes.
Ask at most one question, and only if a claim or the audience is unclear.

### 2. Build the film's scenes and write the plan

1. **Make `src/films/<slug>/`**, one `React.FC<WorldProps>` per scene, built with:
   - `src/build/geo.ts`: lathe, extrude, tube, leaf, blob, textures, signs;
   - `src/build/person.tsx`: the walking `Person`, with stride-locked feet, a coat and a hat;
   - the style pieces in `src/kit/common.tsx`.

   The worked example is `src/films/velmora/`: hills, branch, street (door / walk / corner), roaster, grinder,
   pour-over, latte art, café, counter.
2. **Register the film:** export its scenes from `src/films/<slug>/index.tsx` and add the film to
   `src/films/index.ts`.
3. **Write `specs/<slug>.plan.json`** (copy `specs/coffee.plan.json`):
   - **Top level:** `"sound": {"genre", "bpm", "key"}`, plus a `"board"` with title, logline, device, motif,
     protagonist and arc.
   - **Each shot:** `{"world": "scene", "scene", "sec", "enter", "theme", "energy", "drop"?, "text"?, "p"?,
     "sfx": [...], "board": {beat, shot, action, sound, in, why}}`.
   - **The first shot** enters by an opener chosen for this film: `bloom`, `letters`, `blinds`, `focus` or `lines`.
     Never default to `lines`.
   - **The last shot** is the lockup.
4. **Typecheck:** `npx tsc --noEmit`.

### 3. Check it and score it

```sh
python3 -I tools/plan.py specs/<slug>.plan.json
```

**You should see:**
- `wrote …score.wav (genre BPM in key)`;
- `ok: <slug>: N shots, F frames`;
- the shot table.

Cuts snap to the genre's beat. It refuses a plan that breaks a rule (a line too long, neighbours in the same ink,
the lockup not last, an unknown scene); fix what it names and run it again.

### 4. The realistic board (gate)

Render one real frame per panel and look at it as a director would:

```sh
bash tools/stills.sh public/films/<slug>/props.json out/<slug>-board <one frame per shot, from step 3>
```

Look at `out/<slug>-board/sheet.jpg` yourself first:
- would someone from this industry recognise every object?
- is the protagonist in frame and readable in every shot they're in?
- are the words clear of the subjects?
- do neighbouring shots differ in scale and ink?

Fix it, re-render, then send the sheet to the user and wait for "go".

### 5. Render and check

```sh
bash tools/render.sh public/films/<slug>/props.json out/<slug>.mp4
```

This renders in 120-frame chunks, joins them, adds the score and runs `tools/motion_qa.py`.

**Expect:** `freezes: none`. The lockup's opening black frames and its slow hold are known and fine. For anything
else, look at the flagged frames in the export, not the preview, and fix the motion (overlap the moves, or keep a
drift through the hand-over).

### 6. Showcase and deliver

```sh
python3 -I tools/showcase.py specs/<slug>.plan.json out/<slug>.mp4
```

This writes `showcase/<slug>/`:
- `film.mp4`;
- `preview.gif`;
- `board/NN.jpg` (real frames from the export);
- `STORYBOARD.md`, which renders on GitHub;
- `board.html`.

Send the user the film and the board. Say plainly that the score is synthesized: clean, not a produced track.

### 7. Notes

Turn the user's timestamps into frames (seconds × 24) and look at those frames first.
- **Story notes:** change the board first, then the scenes.
- **Copy and order notes:** edit the plan, re-run step 3, delete `.render/<slug>/` and re-render.
- **Look notes:** change the film's own scenes in `src/films/<slug>/`. `reference/lessons.md` covers the motion
  pitfalls: micro-stops, chunk-safe animation and headless text rendering.
- **Sound notes:** change the shots' `energy`, `drop` and `sfx`, or the genre, and re-run step 3. That only
  re-mixes; re-run render.sh to mux the new score (delete `.render/<slug>/video.mp4` only).
