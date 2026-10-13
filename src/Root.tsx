import React from "react";
import { Composition } from "remotion";
import { Film, FILM_FRAMES } from "./film/Film.tsx";
import { DEFAULT_COPY } from "./film/scenes/copy.tsx";
import { Story, storyMetadata } from "./kit/Story.tsx";
import { EXAMPLE_PLAN } from "./kit/example.ts";

/**
 * Two compositions:
 *   Film   the fixed 30-second template; copy comes in as props (tools/film.py)
 *   Story  any shot plan, a unique film per script (tools/plan.py writes public/films/<slug>/props.json)
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} defaultProps={{ copy: DEFAULT_COPY, score: "audio/score.wav" }} durationInFrames={FILM_FRAMES} fps={24} width={1920} height={1080} />
    <Composition id="Story" component={Story} defaultProps={{ plan: EXAMPLE_PLAN }} calculateMetadata={storyMetadata} durationInFrames={720} fps={24} width={1920} height={1080} />
  </>
);
