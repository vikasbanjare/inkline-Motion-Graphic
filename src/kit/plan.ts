/**
 * A film is a shot plan: an ordered list of shots, each a world with its own theme, cast, words and the transition it
 * enters by. tools/plan.py checks a plan, snaps every cut to the beat grid and writes it here as props (with frames).
 */
export type Enter = "lines" | "bloom" | "letters" | "blinds" | "focus" | "cut" | "iris" | "split" | "wipe" | "match" | "dive" | "print";
export type WorldName = "scene" | "garden" | "object" | "globe" | "hall" | "deep" | "city" | "orbit" | "table" | "type" | "stage" | "lockup";
export type Say = { head: string; sub?: string };
export type Value = { label: string; value: string };

export type Shot = {
  world: WorldName;
  /** with world "scene": the name of one of this film's own scenes (src/films/<slug>/index.tsx) */
  scene?: string;
  /** the score's style under this shot (intro, groove, drive, ambient, end); default from the world */
  mood?: string;
  /** frames (written by tools/plan.py from seconds, snapped to the beat) */
  dur: number;
  enter: Enter;
  theme?: string;
  /** cast ids (src/kit/cast.ts); what each world does with them is in its file */
  cast?: string[];
  text?: Say;
  value?: Value;
  /** world-specific settings (documented at the top of each world's file) */
  p?: Record<string, unknown>;
};

export type Brand = { name: string; logo: string; line: string };
export type Plan = { slug: string; brand: Brand; shots: Shot[]; score?: string };

/** Frames the incoming shot overlaps the outgoing one (the outgoing keeps playing under the transition). */
export const OVERLAP: Record<Enter, number> = { lines: 0, bloom: 0, letters: 0, blinds: 0, focus: 0, cut: 0, iris: 18, split: 24, wipe: 16, match: 14, dive: 0, print: 0 };

export type Placed = Shot & { start: number; index: number; exit: Enter | null; tail: number };
export const place = (plan: Plan): Placed[] => {
  let t = 0;
  return plan.shots.map((s, i) => {
    const next = plan.shots[i + 1];
    const p: Placed = { ...s, start: t, index: i, exit: next ? next.enter : null, tail: next ? OVERLAP[next.enter] : 0 };
    t += s.dur;
    return p;
  });
};
export const totalFrames = (plan: Plan) => plan.shots.reduce((a, s) => a + s.dur, 0);
