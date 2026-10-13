# The Inkline style bible: what every film copies

Every film copies **how** things are drawn, moved and cut, never **what** is drawn. A coffee film has coffee in it,
a space film has space in it, and both look like Inkline because of everything below.

## 1. Rendering: engraved 3D

- **3D subjects are real geometry under the engraving shader** (`EMesh` / `Rig` in `src/film/core/three.tsx`).
  The shader renders:
  - a fine near-horizontal line screen (`ENGRAVE`: period 0.0052 H, 12° angle, wobble 0.55);
  - lines that thicken in the shadows and never close;
  - cross-hatch in the deep shadows and stipple in the lights;
  - lines that follow the form on smooth shapes (`follow` 0.5–0.7 on turned and organic shapes, 0 on foliage).
- **Two inks per object.** Use a 4-stop palette from dark ink to paper (`src/kit/theme.ts`), and never more than
  three palettes in one shot: `a` for the set, `b` for the secondary, `hero` for the subject.
- **Foil on one hero per shot, at most two things** (`foil` 0.3–0.95, `foilPhase` moving with time). Foil marks
  the thing the viewer must look at: the cherry that ripens, the roaster's glass, the kettle, the rosetta.
- **Textures are tone, not colour.** A canvas texture under the line screen gives grain, tiles, stripes, a sign
  or rings (`canvasTex`, `woodTex`, `bandsTex`, `signTex` in `src/build/geo.ts`). Draw them light-on-paper with
  dark marks.
- **Ground:** paper with grain plus the slow flowing line field in the theme's field ink (`Backdrop`). A world
  never sits on a flat colour.

## 2. Subjects: build them for the script

- **Make the actual thing** the script talks about, in simple honest geometry. `src/build/geo.ts` has the tools:
  - `lathe` for anything turned: cups, kettles, drums, bottles, domes, planets with rings;
  - `extrude` for anything flat: signs, gears, keys;
  - `tube` for anything that follows a path: branches, spouts, handles, cables, orbits;
  - `leaf` and `blob` for nature: leaves, cherries, stones, clouds;
  - `scatter` for many of a thing.

  Under the line screen, a 10-point lathe profile reads as an engraved object. Detail comes from silhouette and
  tone, not polygon count.
- **Licensed models** (`src/kit/cast.ts`, `public/models/CREDITS.md`) are used only when one is exactly right (a
  chair on a terrace, a fish in the sea). Never use a model because it's there.
- **People** use `Figure`: the engraved mannequin. It walks, stands, holds, and wears a coat and hat. Use it for
  the customer, the maker or "you".
- **Do it in 2D on top of the 3D** when the line work matters more than the volume: latte art, routes on a
  globe, a signature, a chart. Use SVG in screen space with the foil gradient (`Rosetta` in
  `src/films/velmora/cafe.tsx` is the pattern).

## 3. Camera and motion

- **One slow move per framing, never a static hold.** Every frame moves: a dolly, an orbit, a crane, or the
  subject's own life (a turning drum, a swaying leaf, a walking stride).
- **The scale-step.** Each shot has one hard cut to a closer framing at about 60 % of its length (`step(f, [cutAt])`),
  on the beat. It is the film's signature rhythm.
- **Overlap the hand-overs.** The next move starts before the last one ends, or a slow drift carries through.
  Ease-in-out moves that meet at zero speed are what read as micro-stops.
- **Things arrive by growth, never by fading in.** Use `grow` and `Sprout` for things growing up, `expoOut` for
  things arriving, `pop` for drops, and an unfurl for leaves.
- **24 fps, 125 BPM** (a beat is 11.52 frames). `plan.py` snaps every cut to the beat.

## 4. Transitions (`src/kit/Story.tsx`)

| Name | Picture | Parameters |
|---|---|---|
| `lines` | pen lines race in from the edges, the scale-step to a fine field, a disc grows from the right and the world appears inside it | first shot only |
| `iris` | a circle opens from a point of the outgoing shot | `p.irisAt` [x, y] 0..1 (put it on the subject) |
| `match` | the outgoing centre grows; the incoming opens out of a circle at the centre | design both shots so a round thing sits centred: a tray from above → a grinder's mouth; a cup from above → the same cup on a table |
| `cut` | a hard cut with a 5 % scale settle | between related beats |
| `wipe` | a diagonal foil-edged wipe | a new chapter |
| `split` | a foil strip opens horizontally | out of an object shot with a strip |
| `print` | the outgoing world becomes the print on an object | the product reveal, only when the product is a flat object |
| `dive` | the camera falls into the frame, through a holographic flood | into the lockup, or out of a shiny hero |

**Design the match.** The best transitions are designed into both shots: the end of one shot and the start of the
next share a shape at the same place on screen.

## 5. Type

- **Headline:**
  - Newsreader 600, top centre (or bottom third when the subject fills the top);
  - one idea, 2–6 words;
  - a three-stop ink gradient from the theme;
  - it rises 22 px into place.
- **Sub-line:** Lexend 500, 28 px, in the theme's dark ink.
- **A soft paper plate behind the headline** (`plate`) whenever a subject could cross it.
- **Numbers that matter rise like a pearl** in foil (`Rise`).
- **Signs in the world** are the brand name in plain serif type on a board (`signTex`), never a drawn logo.

## 6. Colour

- **Change theme on every cut;** `plan.py` enforces it. Alternate warm and cool when the story allows.
- **The lockup and object shots are near-black.** The rest are paper-light.

## 7. Sound

- **Original score** from the cue sheet (`tools/score_to_picture.py`): FM bells, a pad and soft drums. Each shot
  has a `mood` (intro, groove, drive, ambient or end).
- **SFX on picture events.** Use pen scratches on the opening lines, a whoosh on an iris or wipe, a riser and
  impact on a match, a swell under each headline, pops on drops and ticks on words.
