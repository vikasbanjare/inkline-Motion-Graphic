---
name: inkline-film
description: Make an engraved 3D launch film from any script, with its own storyboard. Claude directs. It reads the script, finds the story's spine, picks a shape (journey, problem→turn, place, ritual, proof stack), casts each beat as a metaphor in one of the kit's worlds (garden, globe, orbit, table, city, hall, deep, type, an object that the previous world prints onto, a phone stage, the lockup), and motivates every transition (lines, iris, match, cut, wipe, print, split, dive). tools/plan.py snaps it to the beat, writes the cue sheet and an original score, then stills go to the user, render, motion QA, delivery. Use whenever someone pastes a video script, ad brief, product or store launch, feature list, or asks for a brand film.
---

# Inkline film: a script in, a unique film out

The look is fixed and tuned: engraved 3D subjects in two-ink duotones, foil on one hero, serif headlines, cuts on
the beat, an original score. **The film is not fixed.** You are the storyboard designer: every script gets its own
order of worlds, cast, metaphors and transitions. Two scripts should never give the same film.

There are two compositions:
- **`Story`** (use this): any shot plan built from the kit in `src/kit/`. It runs from `specs/<slug>.plan.json`
  through `tools/plan.py`.
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

Read `reference/storyboarding.md` and follow it:
1. the spine sentence;
2. the shape;
3. one metaphor per beat;
4. contrasting worlds;
5. motivated transitions;
6. the timing.

Each world's settings and best uses are at the top of its file in `src/kit/worlds/`. The cast and what each model
can mean are in `src/kit/cast.ts`, and the themes (inks) are in `src/kit/theme.ts`.

Show the user the storyboard table (#, world + theme, picture, exact words, transition in, why). Wait for
approval or notes. Ask at most one question, and only if a claim or the audience is unclear.

### 2. Write the plan

Copy `specs/coffee.plan.json` to `specs/<slug>.plan.json` and write your shots: `world`, `sec`, `enter`, `theme`,
`cast`, `text` / `value`, and `p` (the world's settings).

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
- **New worlds or subjects:** bespoke work in `src/kit/worlds/`. Read `reference/transitions.md` and
  `reference/lessons.md` first.
