# Storyboarding a film that belongs to its script

You are the storyboard designer. The style is fixed (`style-bible.md`); the content is invented for each script.
**Never start from the kit's existing scenes.** Start from the script's world: what would a great director film
for this brand if money were no object? Then build that in this style.

Do steps 1–6 in writing before any code. The user approves the storyboard table.

## 1. The spine (one sentence)

Write: **"This is a film about ___ that ends with ___."**

- The first blank is the change the viewer feels. Example: "a coffee cherry's journey to a cup on a café terrace".
- The second blank is the moment the product, place or offer appears. Example: "a man in a hat walking into the
  new café".

## 2. The world of the script

List 15–25 concrete, filmable nouns and verbs that only this subject has. Use what a specialist would recognise,
not stock icons.

| Script | Its world (examples) |
|---|---|
| Premium coffee café | coffee branch with cherries clustered at the nodes, the split cherry with twin beans, drum roaster with cooling tray and sweeping arms, hand grinder crank, gooseneck kettle, cone dripper, bloom, rosetta latte art, crema, café terrace, awning, string lights |
| Space startup | launch pad and gantry, the rocket's stages separating, a fairing opening, orbit lines, a satellite unfolding its panels, a planet with rings, a lunar lander's legs, star field, ground station dish, mission patch |
| Bank card | the card's chip and guilloche, foil, a banknote's watermark, a vault door, coins stacking, a receipt printing |
| Fitness app | a running track, a stopwatch, a heart line, shoes, a dumbbell, a pulse, a finish tape |
| AI tool | a lattice of nodes and rings, a lens, a brain-like coral, a loom weaving threads into cloth |

Circle the 6–8 strongest. The best are things that move in a satisfying way: they split, pour, turn, unfold,
open or grow.

## 3. The shape

| Shape | Order | Fits |
|---|---|---|
| **Journey** | origin → transformation → craft → result → arrival | food, drink, fashion, anything made |
| **Problem → turn** | the old way → the turn → what's possible → proof → product | apps, SaaS, fintech |
| **Place** | outside → threshold → inside → detail → invitation | stores, venues, events |
| **Ritual** | before → the ritual close-up → the feeling → product | beauty, wellness, coffee, habits |
| **Proof stack** | hook → claim → claim → the number → product | benefit lists, offers |
| **Mission** | countdown → launch → separation → orbit → the view → the brand | space, ambition, "launch" stories |

## 4. One shot per beat, designed

For each beat, write:
- **Subject:** what is built, and how it is built (lathe / extrude / tube / leaf / blob / model / mannequin / 2D).
- **Its life:** the one motion that makes it satisfying (it splits, a crank turns, the stream spirals, the door
  swings).
- **Camera:** the slow move, then the scale-step at about 60 %.
- **Foil:** the one hero.
- **Theme:** the inks, different from the neighbours'.
- **Words:** the exact headline, 2–6 words.

## 5. Design the joins

- **Write the last frame of each shot and the first frame of the next together.**
- **Look for a shared shape** for a `match`:
  - round tray → grinder mouth;
  - cup from above → cup on a table;
  - planet → porthole;
  - eye → lens.
- **Look for a point** for an `iris`: the cherry, a star.
- **Give each other join a meaning:**
  - `wipe` = next chapter;
  - `cut` = punch;
  - `dive` = into the brand.
- **Never use the same join twice in a row.**

## 6. The table (the user approves this)

| # | Sec | Subject (built how) | Its life | Camera | Words | In | Why |
|---|---|---|---|---|---|---|---|

## 7. Build

1. Make `src/films/<slug>/`, with one file per group of related scenes.
2. Each scene is a `React.FC<WorldProps>` and uses:
   - `WorldLook`, `Backdrop`, `World`, `Cam`, `RefDepth`, `Detail` with `ENGRAVE`, `EMesh` with palettes from the
     theme, and `SayIt` for the words;
   - geometry from `src/build/geo.ts`, made once at module level.
3. Export the scenes from `src/films/<slug>/index.tsx`, and register the film in `src/films/index.ts`.
4. In the plan, each shot is `{"world": "scene", "scene": "<name>", "sec", "enter", "theme", "mood", "text", "p"}`.
5. Reuse a kit world (`src/kit/worlds/`) only if it already is exactly the right picture.

`src/films/velmora/` is the worked example (a fictional coffee brand):
- origin.tsx: the branch and the split;
- craft.tsx: the roaster, the grinder and the pour-over;
- cafe.tsx: the latte art and the café.

## 8. Check the stills honestly

- **Would someone from this industry recognise the objects?** If a roaster reads as a barrel, add the parts that
  make it a roaster: the hopper, the glass door, the cooling tray.
- **Does each shot have one clear subject, with a foil hero?**
- **Is anything cropped, or is a headline crossing a subject?** Fix it with the plate, a camera target or the
  headline's position.
- **Do neighbouring shots differ in scale (wide / close) and ink?**
- **Labels:** brands, claims and dates in a sample must be fictional and labelled. Real brands use only approved
  words and their own logo file.
