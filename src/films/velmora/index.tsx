import type React from "react";
import type { WorldProps } from "../../kit/common.tsx";
import { Branch, Split } from "./origin.tsx";
import { Grind, Pour, Roast } from "./craft.tsx";
import { Art, Cafe } from "./cafe.tsx";

/** Velmora (a fictional coffee brand): this film's own scenes, built for its script. */
export const scenes: Record<string, React.FC<WorldProps>> = {
  branch: Branch,
  split: Split,
  roast: Roast,
  grind: Grind,
  pour: Pour,
  art: Art,
  cafe: Cafe,
};
