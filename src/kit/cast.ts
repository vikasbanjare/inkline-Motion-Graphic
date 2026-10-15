/**
 * The cast: every licensed 3D model the worlds can place (public/models/CREDITS.md), with how to draw it.
 *   kind  walker  rigged, walks/runs across (clip names in `clips`)
 *         flora   grows up from its base (gardens, foregrounds)
 *         swimmer swims a curve (the deep)
 *         object  a still-life subject: drops onto plinths, slides onto tables, spins on a pedestal
 *         vehicle drives along a street or a road
 * `means` is for the director: what the model can stand for in a script. Never use it literally when a metaphor reads
 * better (a fox for a sharp shopper, a chess knight for a clever move).
 */
export type CastKind = "walker" | "flora" | "swimmer" | "object" | "vehicle";
export type CastEntry = {
  url: string;
  kind: CastKind;
  size: number;
  keep?: string[]; // material names to keep (drop glass, labels)
  drop?: string[]; // material names to drop
  clips?: string[];
  foil?: number;
  means: string;
};

export const CAST: Record<string, CastEntry> = {
  fox: { url: "Fox.glb", kind: "walker", size: 2.4, clips: ["Walk", "Run", "Survey"], foil: 0.35, means: "a sharp, quick, clever customer; agility; the hero walking through a world" },
  plant: { url: "DiffuseTransmissionPlant.glb", kind: "flora", size: 3.2, keep: ["leaves"], means: "growth, nature, origin, calm" },
  flowers: { url: "GlassVaseFlowers.glb", kind: "flora", size: 2.4, keep: ["Flowers"], means: "reward, bloom, delight, gifting" },
  fish: { url: "BarramundiFish.glb", kind: "swimmer", size: 1.0, means: "flow, depth, freedom, a crowd moving together" },
  shell: { url: "IridescenceAbalone.glb", kind: "object", size: 2.6, foil: 0.95, means: "a treasure, something precious inside, a pearl of a number" },
  lantern: { url: "Lantern.glb", kind: "object", size: 3.6, foil: 0.5, means: "guidance, the way home, evening, hospitality" },
  car: { url: "ToyCar.glb", kind: "vehicle", size: 1.3, drop: ["Glass"], means: "travel, delivery, getting there, play" },
  boombox: { url: "BoomBox.glb", kind: "object", size: 1.5, means: "music, entertainment, youth, retro" },
  bottle: { url: "WaterBottle.glb", kind: "object", size: 1.7, means: "fitness, hydration, everyday essentials" },
  shoe: { url: "MaterialsVariantsShoe.glb", kind: "object", size: 1.7, foil: 0.6, means: "fashion, shopping, running, a step forward" },
  avocado: { url: "Avocado.glb", kind: "object", size: 1.2, means: "food, groceries, fresh, healthy" },
  lamp: { url: "AnisotropyBarnLamp.glb", kind: "object", size: 2.0, drop: ["Lamp Glass"], means: "an idea, light, craft, a workshop, home" },
  king: { url: "ChessKing.glb", kind: "object", size: 2.2, foil: 0.5, means: "leadership, the top choice, strategy, premium" },
  knight: { url: "ChessKnight.glb", kind: "object", size: 1.8, means: "a clever move, strategy, an unexpected angle" },
  pawn: { url: "ChessPawn.glb", kind: "object", size: 1.4, means: "the small player, a first step, the many" },
  corset: { url: "Corset.glb", kind: "object", size: 2.0, means: "fashion, tailoring, heritage craft" },
  cup: { url: "DiffuseTransmissionTeacup.glb", kind: "object", size: 1.6, means: "coffee, tea, a pause, hospitality, a café" },
  sofa: { url: "GlamVelvetSofa.glb", kind: "object", size: 2.6, keep: ["GlamVelvetSofa_legs", "GlamVelvetSofa_feet", "GlamVelvetSofa_fabric_champagne"], means: "home, comfort, a lounge, interiors" },
  dish: { url: "IridescentDishWithOlives.glb", kind: "object", size: 1.6, drop: ["glassCover"], foil: 0.5, means: "food, dining, a restaurant, hosting" },
  amber: { url: "MosquitoInAmber.glb", kind: "object", size: 1.6, drop: ["eclats"], foil: 0.4, means: "preserved, timeless, memory, data kept safe" },
  chair: { url: "SheenChair.glb", kind: "object", size: 2.0, drop: ["label"], means: "a seat at the table, workspace, waiting room, design" },
};

export const castOf = (id: string): CastEntry => {
  const c = CAST[id];
  if (!c) throw new Error(`unknown cast "${id}". Known: ${Object.keys(CAST).join(", ")}`);
  return c;
};
export const keepFn = (c: CastEntry) => (n: string) => (c.keep ? c.keep.includes(n) : true) && !(c.drop ?? []).includes(n);
