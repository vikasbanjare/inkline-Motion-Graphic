# Storyboarding a unique film: the director's method

Every script gets its own film. The look stays the same: engraved 3D, two inks per world, foil on one hero, serif
headlines, and cuts on the beat. The story, the worlds, the cast, the order and the transitions come from the
script. Do this thinking before you touch a file. Write the answers down; the user sees them as the storyboard table.

## 1. Find the spine (one sentence)

Read the script twice. Then write: **"This is a film about ___ that ends with ___."**

- The first blank is the change the viewer should feel, not the product. Examples: "a bean's journey from hill to
  cup", "a team that stops losing notes", "a city that comes to your door".
- The second blank is the moment the product, the offer or the place appears. Examples: "an invitation to the
  store", "the app's home screen", "a card in your hand".

If you can't write this sentence, ask the user one question about the audience or the single thing they must
remember.

## 2. Pick the shape of the story

Choose one of these shapes. Every shape has 5–7 shots and lasts 26–34 seconds.

| Shape | Order | Fits |
|---|---|---|
| **Journey** | origin → travel → transformation → arrival → invitation | food and drink, fashion, craft, anything "made" (coffee, tea, textiles) |
| **Problem → turn** | the old way → the turn → what's possible now → proof → the product | apps, SaaS, fintech, services |
| **Place** | outside → threshold → inside → detail → invitation | a store, venue, hotel, restaurant, event launch |
| **Ritual** | the moment before → the ritual in close-up → the feeling → the product | beauty, wellness, coffee, everyday habits |
| **Proof stack** | hook → claim 1 → claim 2 → the number → the product | offers, cards, plans: when the script is a list of benefits |

Never stack claims flat when the script tells a story. Never force a story onto a claim list: use the proof
stack shape for a list.

## 3. One metaphor per beat, never the literal object if a metaphor reads faster

For each beat, ask: *what can I put on screen that means this without words?* Then let the headline say the
exact words.

| Beat says | Literal (weak) | Metaphor (strong) |
|---|---|---|
| "sourced from four countries" | a map with pins | routes drawing in over a turning globe (`globe`, `inbound`, `mark: ship`) |
| "roasted in small batches" | a roaster | beans riding rings around a flame (`orbit`, `bodies: beans`, fast `spin`) |
| "made by hand" | a factory | one cup, one pour, steam rising (`table`, `pour`) |
| "a new store" | a photo of a shopfront | a street that grows, a person walking in, the door opening (`city`, `enter`) |
| "zero fee" | a price tag | the number rising from a shell like a pearl (`deep`, `value`) |
| "smart / AI" | a robot | a hero at the centre of turning rings (`orbit`) |
| "choose from thousands" | a grid | a colonnade, things dropping onto plinths (`hall`) |
| "your belief" | an icon | the words themselves, one in foil (`type`) |

The cast list in `src/kit/cast.ts` gives what each model can stand for (`means`). The mannequin (`figure`) is the
person: the customer, the maker, "you". Use it when the script is about people. It walks, stands and enters doors.

## 4. Choose worlds so that neighbours contrast

- **Scale.** Alternate wide and close: a street, then a cup; a globe, then beans. Two wide worlds in a row feel
  like one long shot.
- **Ink.** Every cut changes theme; `plan.py` refuses two neighbours with the same theme. Warm and cool should
  alternate when they can (forest → honey → roastery → graphite).
- **Light.** End on contrast: a bright world into the dark object or lockup.
- **Use each world at most once.** The only exception is `table`, which can be repeated for two different rituals.
- **`type` at most once.** A film of words is not a film.

## 5. Motivate every transition

A transition is a sentence joining two shots. Pick the one whose shape matches the story's logic.

| Transition | Means | Use it when |
|---|---|---|
| `lines` (first shot only) | "it begins" | always the opener, unless the script opens on a hard fact (then `cut`) |
| `iris` | "look closer / meanwhile" | opening into a new place from a point (set `p.irisAt` on the subject) |
| `match` | "this becomes that" | the outgoing world has a round thing at its centre (globe → floor, rings, a cup seen from above) |
| `cut` (a scale step on the beat) | energy, a new fact | between two related beats; the cheapest and the punchiest; use 1–2 per film |
| `wipe` (a foil-edged diagonal) | "and now / next" | a change of chapter (process → place) |
| `print` | "and here it is" | the world you just watched becomes the object (the card, the ticket, the screen). The strongest reveal in the kit |
| `split` | "open it" | out of an object with a foil strip, into the next world |
| `dive` | "go deeper / into the brand" | into the lockup, or into a close world from a shiny hero (shell, foil) |

Rules:
- **Never use the same transition twice in a row.**
- **Use `print` at most once.** It is the turn of the film, so put it where the product appears.
- **Always end with `dive` into the lockup, or `cut`.**

## 6. Time it like music

- A shot is 3.5–6.5 s. The opener gets the most time (5.5–6.5 s); a punchy middle beat gets 3.5–4 s.
- A whole film is 26–34 s. More than 7 shots feels like a slideshow.
- `plan.py` snaps every cut to the beat (125 BPM). Give seconds; it gives frames.
- Headlines land about 20 % into a shot and leave before the next transition. One idea per headline: the 2–5 words
  a viewer remembers. Put the rest of the exact wording in `sub`.

## 7. Write the storyboard table (the user approves this)

| # | Time | World + theme | On screen (picture) | Words (exact) | Transition in | Why |
|---|---|---|---|---|---|---|

The **Why** column is one line connecting the beat to the spine. If you can't write it, cut the shot.

## 8. Check yourself before building

- Does the film still make sense with the sound off and the headlines hidden? If not, the pictures aren't
  carrying the story.
- Is every claim the script's own words? Put fictional brands and offers only in samples, and label them.
- Is any logo on screen not the brand's own file? Remove it.
- Do two neighbouring shots share a world, a theme or a transition? Change one.
- Is the product (or the invitation) on screen in the last third? The viewer must leave knowing what to do.

## Worked example: a premium coffee store launch (specs/coffee.plan.json)

**Spine:** "This is a film about a bean's journey from a hillside to a cup, that ends with an invitation to the
first store." The shape is a journey.

| # | World + theme | Picture | Words | In | Why |
|---|---|---|---|---|---|
| 1 | garden, forest | the pen lines become a hillside; coffee cherries on the bushes; a person walks through | It starts on a hillside | lines | the origin; a human from the first frame |
| 2 | globe, honey | ship routes draw in from four origins to the city | Four origins, one city | iris | the sourcing |
| 3 | orbit, roastery | beans ride fast rings round a flame | Roasted in small batches | match | the transformation (the globe becomes the rings) |
| 4 | table, honey | beans rain onto wood, a cup arrives, the pour, steam | Poured slow, by hand | cut | the ritual, close and slow after the fast roast |
| 5 | city, graphite | a street grows, the shopfront sign, a person walks in and the door opens | Our first store | wipe | the place: a new chapter |
| 6 | object (ticket), roastery | the street becomes the print on an invitation ticket, foil date | You're invited | print | the turn: the film becomes the thing in your hand |
| 7 | lockup | the logo | (the line) | dive | the brand |

Scale alternates wide → wide → mid → close → wide → object. Ink alternates cool green → warm → dark brown → warm →
neutral → dark.
