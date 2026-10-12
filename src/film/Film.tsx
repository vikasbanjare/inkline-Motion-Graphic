import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { T } from "./core/looks.ts";
import { Lockup } from "./core/Lockup.tsx";
import { useFilmFonts } from "./scenes/fonts.tsx";
import { CardTake, MATCH, OPEN, ProductsTake, RewardsTake, ShellTake, TravelTake } from "./scenes/scenes.tsx";
import { Outro } from "./scenes/outro.tsx";
import { CopyProvider, DEFAULT_COPY, type FilmCopy } from "./scenes/copy.tsx";

/**
 * Inkline: a 30-second claim film.
 * Engraved real subjects (licensed glTF models) in duotones, one metaphor per claim, foil on one hero per world,
 * loupe vignette, serif headlines top-centre, scale-step cuts on the beat.
 */
export const FILM_FRAMES = T.end;

/** The lockup keeps breathing: a slow push so the final hold never reads as a freeze. */
const Drift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${1 + 0.0016 * f})` }}>{children}</AbsoluteFill>;
};

/** The film. `copy` swaps every word, number and the logo (see specs/ and tools/film.py); `score` swaps the soundtrack. */
export const Film: React.FC<{ copy?: FilmCopy; score?: string }> = ({ copy = DEFAULT_COPY, score = "audio/score.wav" }) => {
  useFilmFonts();
  return (
    <CopyProvider copy={copy}>
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={T.reveal + 2} name="opening lines, field, green disc; 5% rewards: fox in the hedge">
        <RewardsTake from={0} />
      </Sequence>
      <Sequence from={T.reveal} durationInFrames={OPEN + 28 - T.reveal} name="card: the world becomes the print; one continuous push into the foil strip, which splits open">
        <CardTake from={T.reveal} />
      </Sequence>
      <Sequence from={OPEN - 4} durationInFrames={MATCH + 24 - (OPEN - 4)} name="travel: revealed through the split strip; hotel, flights over the globe; the globe becomes the colonnade floor">
        <TravelTake from={OPEN - 4} />
      </Sequence>
      <Sequence from={MATCH - 4} durationInFrames={T.card + 22 - (MATCH - 4)} name="products: the globe matches the sunburst floor from above; colonnade still life">
        <ProductsTake from={MATCH - 4} />
      </Sequence>
      <Sequence from={T.card} durationInFrames={T.studio + 16 - T.card} name="zero joining fee: abalone in the deep">
        <ShellTake from={T.card} />
      </Sequence>
      <Sequence from={T.studio} durationInFrames={T.lockup - T.studio} name="outro: the card on a white set drops into the phone; push into the dark screen">
        <Outro from={T.studio} />
      </Sequence>
      <Sequence from={T.lockup - 6} durationInFrames={T.end - T.lockup + 6} name="lockup (official logo file); overlaps the push so no frame is dead black">
        <Drift>
          <Lockup logo={copy.logo} line={copy.lockup} />
        </Drift>
      </Sequence>
      <Audio src={staticFile(score)} />
    </AbsoluteFill>
    </CopyProvider>
  );
};
