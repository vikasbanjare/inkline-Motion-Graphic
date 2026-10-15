# Transition library (all used in the film)

Each entry says when to use it, how it is built, and how it failed before it worked.

| Transition | Use when | How it is built | Watch for |
|---|---|---|---|
| **World becomes the object** | A world must turn into the product (garden → card print) | Render the world inside the product's face, then animate the face's transform: scale 1 → 0.45, `rotateX` back about 38°, so the world keeps moving inside the print | The world must keep animating inside the print (the fox never stops) |
| **Continuous push to a detail** | Going from the whole object to text on it | One eased transform: scale to about 3×, rotate the detail level, translate its centre to frame centre (`cardPose` in `v6/scenes.tsx`) | Land on a whole phrase. Slow any sliding text to a drift so it reads; never let an edge or prop cut a letter |
| **Strip split-open** | Leaving a close-up of a band or strip for the next world | The next world is clipped to a horizontal band (`inset()` clip) that opens from the strip's centre line to full frame over about 24 frames. Two foil edges ride the band edges. The next world arrives already composed, with a gentle settle (scale 1.16 → 1.04) | Don't use a magnifying glass or another prop: a prop entering a close-up breaks it |
| **Shape match** | Two worlds share a shape (globe ↔ round floor, coin ↔ plate) | Glide the shape to frame centre and scale it to the exact screen size of the matching shape in the next shot. Reveal the next shot inside that circle over about 8 frames, then open the circle out while the next camera is already moving | No full-frame dissolve: it reads as muddy double exposure. Keep both shots moving across the match |
| **Iris from a point** | Entering a quiet world (underwater, night) | `clipPath: circle()` grows from a point near the subject | Start the world's motion before the iris opens |
| **Dive into the material** | Leaving a world through its hero material (shell iridescence → card foil) | Scale toward the material, accelerating (`1 + 9 t^2.4`), while a foil flood fades up. The next shot fades the same flood out on top of itself | The flood must keep shimmering. A gradient pushed past its stops turns into one flat colour and freezes; oscillate the phase instead |
| **Drop into a device** | Product → app mockup | The object tilts back (up to 55° at mid-drop), shrinks to the UI slot's width and lands in it; the device rises from below at the same time | Start the drop while the object is still turning, so the hand-over never stops |
| **Push into the screen** | Mockup → logo lockup | The screen dims, then the camera scale accelerates into it (`1 + 9 t^2`). The lockup sequence starts about 6 frames early on top | Without the overlap you get 3–4 identical black frames |
| **Scale-step cut** | Inside a world, on a beat | A hard cut to a tighter or looser framing of the same scene; the camera keeps drifting on both sides | Put it exactly on a beat of the cue sheet |

## The lens grammar (plan `enter` values `lens` and `sweep`)

The best engraved films never dissolve. Every change is a hard cut on the beat, or something optical (a lens) or
physical (a creature) passing across the frame. Prefer these over flood, mosaic or cross-fade.

| Transition | Use when | How it is built | Watch for |
|---|---|---|---|
| **`lens`: iris close, cut, iris open** | Leaving one world on its hero and arriving in another | The outgoing shot closes a soft dark iris onto its centre over its last 16 frames; hard cut; the new shot opens its own iris from loupe size to full frame over 28 frames (`src/kit/lens.tsx`: `Iris`, `irisOpen`, `irisClose`) | The close eases in (accelerates into the cut) and the open eases out (leaves the cut moving). An ease-in-out open repeats the first frame: a visible hitch |
| **`sweep`: lens-edge sweep** | A cut inside one place, or between two close worlds | A huge soft black disc passes left to right over 16 frames; the new shot appears behind its darkest point (`LensSweep`) | The disc must cover the whole frame at the swap frame |
| **Persistent loupe + hard cuts** | Several close-ups in a row | Fade a dark radial mask in once and keep it; hard cut on the beat inside it (build it in the film's scene with `Iris`) | Never fade the lens out before the cut: it reads as a blink |
| **Creature wipe** | Hiding a cut, or crossing the words | A fish, bird or leaf very close to camera, fast, crosses the frame | Close and fast, or it reads as a prop |
| **Crane on the cut** | One shape becomes a floor or a horizon | The camera move starts on the cut frame, ease-out over about 44 frames, while an iris opens | No hold before it starts |
