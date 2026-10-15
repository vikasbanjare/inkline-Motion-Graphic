import type React from "react";
import type { WorldProps } from "../kit/common.tsx";
import { scenes as velmora } from "./velmora/index.tsx";

/**
 * Every film's own scenes, by slug. A shot with "world": "scene" and "scene": "<name>" renders FILMS[slug][name].
 * Add a film: make src/films/<slug>/ (scenes built for that script from src/build/ and the style in src/kit/common.tsx),
 * export its scenes from index.tsx and register it here.
 */
export const FILMS: Record<string, Record<string, React.FC<WorldProps>>> = {
  velmora,
};
