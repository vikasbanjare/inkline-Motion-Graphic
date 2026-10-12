import React from "react";
import { Composition } from "remotion";
import { Film, FILM_FRAMES } from "./film/Film.tsx";
import { DEFAULT_COPY } from "./film/scenes/copy.tsx";

/**
 * One composition. Pass your copy with --props=public/films/<slug>/props.json (written by tools/film.py);
 * with no props it renders the fictional example brand.
 */
export const RemotionRoot: React.FC = () => (
  <Composition id="Film" component={Film} defaultProps={{ copy: DEFAULT_COPY, score: "audio/score.wav" }} durationInFrames={FILM_FRAMES} fps={24} width={1920} height={1080} />
);
