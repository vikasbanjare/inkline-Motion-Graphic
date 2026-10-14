# Inkline

Engraved 3D launch films, storyboarded and built per script. When someone pastes a video script, brief or feature
list, or asks for a film, use the `inkline-film` skill (`.claude/skills/inkline-film/SKILL.md`). It starts with
the storyboard; animation comes after the user approves it.

- **The film:** composition `Story` (`src/kit/Story.tsx`) renders a plan, `specs/<slug>.plan.json`. Each film's
  own scenes live in `src/films/<slug>/` (registered in `src/films/index.ts`), built with `src/build/` (geometry,
  the walking `Person`) and the style pieces in `src/kit/common.tsx`.
- **Pipeline:**
  - `python3 -I tools/plan.py specs/<slug>.plan.json` checks the plan and writes the props and score;
  - `bash tools/stills.sh <props> out/<slug>-board <frames>` makes the real-frame board;
  - `bash tools/render.sh <props> out/<slug>.mp4` renders and runs QA;
  - `python3 -I tools/showcase.py specs/<slug>.plan.json out/<slug>.mp4` writes the showcase.
- **Health check:** `bash tools/selftest.sh` (expect `PASS`).
- **Rules:**
  - Copy the style, never the content (`reference/style-bible.md`).
  - Storyboard first (`reference/storyboarding.md`); design the sound with it (`reference/sound-design.md`).
  - Show the user the storyboard, then the real-frame board, before any full render.
  - Never invent claims. Never draw or imitate a company's logo. Label sample films as fictional.
  - Credit the CC-BY models when publishing.
- **The old fixed card template** is `src/film/Film.tsx` (composition `Film`, `tools/film.py`). Use it only when
  someone asks for exactly that film.
