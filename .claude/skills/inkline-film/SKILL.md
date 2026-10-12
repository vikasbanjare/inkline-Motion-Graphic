---
name: inkline-film
description: Make a 30-second engraved 3D claim film from any product script. The film is a finished template — engraved 3D worlds in duotones, the world turning into the card, a foil-strip close-up that splits open, a globe that becomes a colonnade floor, a number rising from a shell, a white-set outro where the card drops into a phone, a logo lockup, and an original score with SFX. Claude reads the script, places each real claim in the shot that suits it (the storyboard), tools/film.py checks every line fits, then stills to the user, render, motion QA and delivery. Use whenever someone pastes a video script, ad brief or feature list and wants a launch or product film made with this repo.
---

# Inkline film: a script in, a finished film out

The look, worlds, camera moves, transitions, timing and score are fixed and already tuned (`src/film/`).
Your job is to direct: put the script's real claims into the film's slots so every shot says something true
and every line fits. A worked example is `specs/example.json`.

## Hard rules

- **Copy:**
  - Every claim on screen is the script's own approved wording. Never invent a number, benefit or tagline.
    If a number looks unverified, ask.
  - No card or account numbers and no personal data.
- **Logo:** use only the brand's own logo file (white on transparent PNG). Without one, `tools/film.py` sets the
  name in plain type. Never redraw or imitate any company's logo, and never put another company's mark on screen.
- **Labelling:** if the brand did not commission the film, the user must label it as spec or concept work when
  sharing it.
- **Credits:** credit the CC-BY 3D models when the film is published (`public/models/CREDITS.md`).
- **Remotion licence:** Remotion is free for individuals and companies of up to 3 people. Tell a larger
  company it needs a Remotion company licence (remotion.dev/license).

## The storyboard (slots, shot by shot)

| Time | Shot | Slot | Best for | Limit |
|---|---|---|---|---|
| 0–6 s | Pen lines race in, a garden grows, a fox walks | `claim1` head / sub | the lead benefit: rewards, cashback, growth | head ≤ 26 chars |
| 6–8 s | The garden becomes the card's print, logo on the card | `card` head / sub | the product's full name | head ≤ 30 |
| 8–11 s | A push into the foil strip; one phrase lands whole | `strip[0]`, with `strip[1]` scrolling past | the sharpest short claim, in CAPITALS | `strip[0]` ≤ 18 |
| 11–16 s | The strip splits open onto the travel world (hotel, lantern, flights over a globe) | `claim2` | travel, redeem, worldwide, reach | head ≤ 30 |
| 16–20 s | The globe becomes the colonnade floor; products drop onto plinths | `claim3` head / sub | choice, catalogue, store, partners | head ≤ 26 |
| 20–23 s | Fish and an iridescent shell; a big number rises like a pearl | `hero` label / value | the one number: a fee, a rate, a limit ("₹0", "0%", "5X") | value ≤ 5 |
| 23–27 s | White set, lasers, the card drops into a phone, the claims tick on | `card_print`, `outro.title`, `outro.rows` (2–4), `outro.left` / `outro.right` | the claim list, with the product name either side | rows ≤ 64, left/right ≤ 26 |
| 27–30 s | Logo lockup on black | `logo`, `lockup` | the product line | ≤ 40 |

If the script has fewer than four strong claims, reuse the strongest one in two slots (for example `strip[0]`
and `hero`). Never pad with invented claims.

## Steps

### 1. Direct the script (no code)

List the script's real claims, word for word. Put each one where its shot already means something: travel
claims on the globe, a fee or rate on the shell, choice in the colonnade. Write each headline as the 1–4
words a viewer remembers, and the sub-line as the rest of the exact wording.

Show the user the filled storyboard table. Ask one question only if a claim is missing or doubtful.

### 2. Write the copy sheet

Copy `specs/example.json` to `specs/<slug>.json` and replace every value. The full schema and the limits are
at the top of `tools/film.py`. If the user has a logo file, put it in `public/brand/` and set `"logo"`.

### 3. Check it fits

```sh
python3 -I tools/film.py specs/<slug>.json
```

**You should see:** `ok: <slug> fits the film`, then the still, render and QA commands. A line that is too long
is named, with its limit. Shorten it (keep the meaning and the numbers) and run the check again.

### 4. Stills to the user (gate)

Run the printed still command (9 key frames). Tile the stills into one sheet with ffmpeg `xstack` and look first
yourself:
- every word readable;
- the logo inside the card's red block and on the card print;
- frame 272 showing `strip[0]` whole.

**Send the sheet to the user** and wait for "go".

### 5. Render and check

```sh
bash tools/render.sh public/films/<slug>/props.json out/<slug>.mp4
```

This renders in 120-frame chunks, joins them, adds the score and runs `tools/motion_qa.py`.

**Expect:** `freezes: none`. The film's own cut into the logo shows one repeated black frame and a slow logo
hold; both are known and fine. Anything else flagged is new: look at the saved frames in the export, not
the preview.

### 6. Deliver

Make a share copy:

```sh
ffmpeg -i out/<slug>.mp4 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 192k out/<slug>-share.mp4
```

Send it with the storyboard table and what QA found. Say plainly:
- the worlds (garden, travel, colonnade, shell) are the same in every film;
- the score is synthesized: clean, not a produced track.

### 7. Notes

Turn timestamps into frames (seconds × 24) and look at those frames first.
- **Copy notes:** edit the sheet, re-run step 3, then re-run `tools/render.sh`. Delete `.render/<slug>/` first
  so every chunk re-renders.
- **Look notes** (new worlds, colours or models): bespoke work in `src/film/scenes/`. Read
  `reference/transitions.md` and `reference/lessons.md` first.
