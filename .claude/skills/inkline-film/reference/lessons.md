# Lessons from building the film (read before changing it)

1. **Measure the reference before designing.** Frame-by-frame metrics (detail, saturation, empty space, cuts
   per 10 s, motion) showed v5 was the wrong medium before taste could. Reference averages for the reference film:
   detail 0.115, vivid 11%, contrast 42, empty space 30%, cuts 2.8 / 10 s.
2. **Real subjects beat abstract shapes.** Licensed 3D models run through an engraving shader read as
   "premium print", where drawn primitives read as "template".
3. **Gradient text in Chrome headless:** `background-clip: text` combined with a `transform` or `filter`
   renders as a solid gradient box in the export, while the preview can look fine. Use SVG `<text>` with a
   gradient `fill`.
4. **Check the export, not the preview.** The ₹0 box only showed up in the rendered MP4.
5. **Micro-stops come from easing.** An ease-in-out move that ends where the next one starts from rest
   reads as a stutter. Overlap moves, keep a drift, or start the next move early. `tools/motion_qa.py`
   finds these.
6. **Don't put a prop into a close-up.** The magnifying glass covered the strip text, so the 0 read as a 5.
   Transition out of a close-up by changing the object itself, as the strip split does.
7. **A slow opening loses people.** Fill the frame with motion within 0.5 s and land the first claim by
   about 2.6 s.
8. **Keep subjects inside the frame.** A low camera horizon cut the fox at the bottom of the frame. Raise
   the camera, move the subject to mid-ground and give it contrast.
9. **Mockups need the real product mood.** Most fintech apps are dark, so a white UI read as generic.
10. **Gradient phases must stay in range.** Pushing a foil gradient's phase past its colour stops froze it
    into one flat colour for 2 frames.
11. **Timestamps → frames at the composition's own fps.** This film is 24 fps, so 0:22 is frame 528, not 660.
12. **Stills to the user first, every time**, then motion. It saves whole render cycles.
13. **Be honest about tools and limits.** Built with Remotion, Three.js and Claude Code. Synthesized music is
    basic. Claude Design cannot do the 3D engraving.
