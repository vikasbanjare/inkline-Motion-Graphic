# Sound design: what the film sounds like, and why

Sound is half the film. A viewer forgives a soft frame; they do not forgive a cheap sound. The old way (a bell
arpeggio on every film, a whoosh on every cut, a beep under every word) sounds like a 1990s corporate video. The
rules below are what modern brand films do instead.

Design the sound in the storyboard (a "Sound" line per panel), not after the picture.

## 1. Pick the music from the concept, not from a default

| Concept and tone | Genre (`sound.genre`) | Tempo | Palette | Avoid |
|---|---|---|---|---|
| warm, crafted, human (coffee, bakery, a bookshop, slow living) | `lofi_jazz` | 76–90 BPM, swung | Rhodes, upright bass, brushes, vinyl air, a few soft piano notes | four-on-the-floor kicks, bright synths |
| epic, ambitious, launch (space, a new product line, mobility) | `cinematic` | 90–110 BPM | low strings, pulses, piano motif, taiko and toms, sub hits, rising tension | swing, cute plucks |
| bright, modern, product (an app, fintech, SaaS, D2C) | `modern_pop` | 105–122 BPM | soft plucks, a sidechained pad, a tight kick and clap, airy hats | jazz chords, vinyl |
| calm, premium, wellness (beauty, a spa, luxury) | `ambient` | 60–80 BPM | piano, evolving pad, glassy texture, no drums | busy rhythm, hits |

**Music has a shape.** Give each shot an `energy` from 0 to 1:
- **0–0.2:** pad and keys only;
- **0.3:** add bass;
- **0.5:** add light percussion;
- **0.7:** full groove;
- **1:** add the motif or arps.

Build energy through the journey, drop it before the turn (`"drop": true` thins it to one sustained chord), and
land the payoff on the fullest, warmest chord. End on the tonic with a long tail.

## 2. SFX: say what the picture shows

**Foley, not effects.** Every sound comes from something on screen: footsteps when he walks (in sync with his
stride), the door latch and bell, the pour, the drip, the grinder, the drum's rattle, the cup on the saucer.
Real-world sounds are what make a stylised picture feel alive.

**Transitions are carried by foley and the music's phrasing, not a whoosh.** If a join needs air, use `air`: a
soft, short, low-level breath tuned to the key. Never use more than one or two in a film.

**Sweeteners are tuned.** Hits, swells and shimmers use the current chord, so they sit inside the music. A
reverse swell into a reveal is one of the strongest tools; use it once.

**One silence.** Just before the payoff, drop everything to one chord or room tone for half a second. The payoff
lands twice as hard.

**Ambience glues the world:** the city at dawn, wind on the hills, café murmur. Keep it low, and change it with the
location.

## 3. What not to do

- A sound on every cut, or a "tick" under every word. Text arriving is silent; the music carries it.
- Laser zaps, cartoon pops or 8-bit blips in a premium film.
- Random noise bursts with no source on screen.
- Effects louder than the music's melody. SFX sit inside the mix, not on top of it.
- Using `riser` → `impact` on every transition. It's for one moment per film, if any.
- A track that ignores the picture. Phrase changes must land on cuts, which is why `plan.py` snaps cuts to the
  genre's beat.

## 4. The mix

- **Levels:** music about −18 LUFS; foley sits 3–6 dB under the music's lead; ambience 12 dB under. The engine
  masters to about −16 LUFS with a peak limiter.
- **Ducking:** the music dips (about −4 dB) under the payoff's key foley (the door bell, the first sip), never
  under footsteps.
- **Space:** keys and pads get the hall reverb; foley gets a small room reverb so it sits in the scene;
  ambience is wide.
- **Panning:** a sound follows its source on screen. Footsteps travel with the walker; the kettle is where the
  kettle is.

## 5. Writing it in the plan

```json
"sound": {"genre": "lofi_jazz", "bpm": 84, "key": "F"},
"shots": [
  {"scene": "door", "energy": 0.4, "sfx": [
     {"at": 4, "fx": "door", "pan": -0.3},
     {"at": 10, "until": 80, "fx": "steps", "rate": 1.8, "surface": "stone", "pan_from": -0.4, "pan_to": 0.5},
     {"at": 0, "until": 80, "fx": "city", "gain": 0.4}]},
  {"scene": "enter", "energy": 0.2, "drop": true, "sfx": [{"at": 6, "fx": "bell"}]}
]
```

`at` and `until` are frames from the start of the shot. The foley set (see `tools/sound.py`):
- **People and places:** `steps`, `door`, `bell`, `lamp`, `hum`.
- **Liquids and steam:** `drop`, `pour`, `drip`, `steam`.
- **Machines and objects:** `grind`, `drum`, `clink`.
- **Nature:** `rustle`, `pluck`, `wind`, `birds`.
- **Rooms:** `city`, `cafe`.
- **Sweeteners:** `air`, `swell`, `hit`, `shimmer`.

## 6. Synthesized or produced?

Everything here is synthesized in `tools/sound.py`: free, offline, and timed exactly to the picture. It is clean
and tasteful, but not a session band. For a hero film, a produced track is better: an AI music tool on a stated
budget, or a licensed track. Keep the engine's foley either way. Never spend credits without the user's yes on
the cost.
