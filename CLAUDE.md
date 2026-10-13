# Inkline

A 30-second engraved 3D claim film, filled from a script. When someone pastes a video script, ad brief or
feature list, use the `inkline-film` skill (.claude/skills/inkline-film/SKILL.md).

- Unique films: composition `Story` (`src/kit/`), from a shot plan `specs/<slug>.plan.json` checked by
  `python3 -I tools/plan.py`. Storyboard first: `.claude/skills/inkline-film/reference/storyboarding.md`.
- The fixed template is `src/film/Film.tsx` (composition `Film`, 1920x1080, 24 fps, 720 frames). Copy comes in as props
  (`public/films/<slug>/props.json`, written by `tools/film.py`).
- Check copy: `python3 -I tools/film.py specs/<slug>.json`. Render: `bash tools/render.sh <props> out/<slug>.mp4`.
  Check motion: `python3 -I tools/motion_qa.py out/<slug>.mp4`.
- Show the user the storyboard table and a stills sheet before any full render.
- Never invent claims, never draw or imitate a company's logo, credit the CC-BY models when publishing.
