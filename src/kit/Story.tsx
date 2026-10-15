import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { expoOut, ramp } from "../ensemble/score.ts";
import { Holo } from "../film/scenes/kit.tsx";
import { Ground } from "../film/scenes/scenes.tsx";
import { Lockup } from "../film/core/Lockup.tsx";
import { Outro } from "../film/scenes/outro.tsx";
import { CopyProvider, DEFAULT_COPY, type FilmCopy } from "../film/scenes/copy.tsx";
import { useFilmFonts } from "../film/scenes/fonts.tsx";
import { T } from "../film/core/looks.ts";
import { Iris, irisOpen, irisClose, LensSweep } from "./lens.tsx";
import { Flood, H, W, easeInOut, type WorldProps } from "./common.tsx";
import { OVERLAP, place, totalFrames, type Placed, type Plan } from "./plan.ts";
import { theme } from "./theme.ts";
import { GardenWorld } from "./worlds/garden.tsx";
import { GlobeWorld } from "./worlds/globe.tsx";
import { TableWorld } from "./worlds/table.tsx";
import { CityWorld } from "./worlds/city.tsx";
import { HallWorld } from "./worlds/hall.tsx";
import { DeepWorld } from "./worlds/deep.tsx";
import { OrbitWorld } from "./worlds/orbit.tsx";
import { TypeWorld } from "./worlds/type.tsx";
import { ObjectWorld } from "./worlds/object.tsx";
import { FILMS } from "../films/index.ts";

/**
 * Story: any shot plan as a film. Each shot is a world in its own Sequence; the incoming shot overlaps the outgoing
 * one by the transition's OVERLAP (the outgoing keeps moving underneath), so no frame between worlds ever holds.
 */
export const STAGE_FRAMES = T.lockup - T.studio; // the stage (phone outro) is fixed-length: 84 frames
export const LOCKUP_FRAMES = T.end - T.lockup; // 75

const WORLDS: Record<string, React.FC<WorldProps>> = {
  garden: GardenWorld,
  globe: GlobeWorld,
  table: TableWorld,
  city: CityWorld,
  hall: HallWorld,
  deep: DeepWorld,
  orbit: OrbitWorld,
  type: TypeWorld,
};
/** worlds that perform an exit themselves (instead of the generic one) */
const OWN_EXIT: Record<string, string[]> = { globe: ["match"], object: ["split"] };

const stageCopy = (plan: Plan, s: Placed): FilmCopy => {
  const p = (s.p ?? {}) as Record<string, unknown>;
  return {
    ...DEFAULT_COPY,
    logo: plan.brand.logo,
    cardPrint: (p.print as string) ?? "",
    outro: { screen: (p.screen as string) ?? "", title: (p.title as string) ?? plan.brand.name, rows: (p.rows as string[]) ?? [], left: (p.left as string) ?? "", right: (p.right as string) ?? "" },
    lockup: plan.brand.line,
  };
};

const WorldView: React.FC<{ s: Placed; f: number; plan: Plan; shots: Placed[]; print?: boolean }> = ({ s, f, plan, shots, print }) => {
  const th = theme(s.theme);
  if (s.world === "object") {
    const prev = shots[s.index - 1];
    return <ObjectWorld f={f} shot={s} th={th} logo={plan.brand.logo} printOf={prev ? (ff) => <WorldView s={prev} f={ff + prev.dur} plan={plan} shots={shots} print /> : undefined} />;
  }
  const C = s.world === "scene" ? FILMS[plan.slug]?.[s.scene ?? ""] : WORLDS[s.world];
  return C ? <C f={f} shot={s} th={th} print={print} /> : null;
};

/** The pen-line opening: lines race in, the field, then the world grows inside a disc from the right. */
const LinesOpen: React.FC<{ f: number; disc: string; children: React.ReactNode }> = ({ f, disc, children }) => {
  const r = 1120 * expoOut(ramp(f, 18, 46)) + 1700 * Math.pow(ramp(f, 40, 72), 2);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${f < 25 ? 1.22 - 0.16 * expoOut(f / 25) : 1.04 - 0.04 * expoOut(ramp(f, 25, 60))})` }}>
        <Ground F={f} disc={disc} />
      </AbsoluteFill>
      {f >= 22 ? <AbsoluteFill style={{ clipPath: `circle(${Math.max(1, r)}px at ${W * 1.12}px ${H * 0.42}px)` }}>{children}</AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

/**
 * Openers (first shot only). Each film should open its own way; pick the one that suits the spine:
 *   lines    pen lines race in, a fine field, the world grows inside a disc        (drawn, crafted, "it begins")
 *   bloom    a drop falls onto the paper and blooms open into the world            (liquids, ink, food, beauty, nature)
 *   letters  the first word, huge; the world is seen through its letters, then fills (manifestos, launches, a name)
 *   blinds   foil bars turn open across the frame                                   (premium, finance, product reveals)
 *   focus    out of a bright blur, the lens racks into focus                        (tech, optics, mornings, calm)
 */
const BloomOpen: React.FC<{ f: number; th: ReturnType<typeof theme>; children: React.ReactNode }> = ({ f, th, children }) => {
  const fall = Math.min(1, f / 10);
  const dropY = 90 + (H / 2 - 90) * fall * fall;
  const r = 1300 * expoOut(ramp(f, 11, 40));
  const ink = th.a[0][0];
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: th.paper }} />
      {f >= 11 ? <AbsoluteFill style={{ clipPath: `circle(${Math.max(1, r)}px at 50% 50%)` }}>{children}</AbsoluteFill> : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {f < 11 ? (
          <>
            <ellipse cx={W / 2} cy={dropY} rx={30} ry={30 + 24 * fall} fill={ink} />
            <path d={`M ${W / 2 - 4} ${dropY - 30 - 60 * fall} Q ${W / 2} ${dropY - 10} ${W / 2 + 4} ${dropY - 30 - 60 * fall}`} fill={ink} opacity={0.5} />
          </>
        ) : null}
        {f >= 11 && f < 50
          ? [0, 1, 2].map((k) => {
              const u = ramp(f, 11 + k * 5, 44 + k * 5);
              return u > 0 && u < 1 ? <circle key={k} cx={W / 2} cy={H / 2} r={Math.max(1, r * (1 - k * 0.12))} fill="none" stroke={ink} strokeWidth={10 * (1 - u) + 1} opacity={0.8 * (1 - u)} /> : null;
            })
          : null}
        {f >= 11 && f < 26
          ? Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2 + 0.3;
              const u = ramp(f, 11, 26);
              const d = 40 + 260 * expoOut(u);
              return <circle key={i} cx={W / 2 + Math.cos(a) * d} cy={H / 2 + Math.sin(a) * d * 0.8 - 80 * Math.sin(Math.PI * u)} r={7 * (1 - u) + 1} fill={ink} />;
            })
          : null}
      </svg>
    </AbsoluteFill>
  );
};

const LettersOpen: React.FC<{ f: number; th: ReturnType<typeof theme>; word: string; id: string; children: React.ReactNode }> = ({ f, th, word, id, children }) => {
  const size = Math.min(520, 1700 / Math.max(1, word.length * 0.56));
  const z = 1 + 9 * Math.pow(ramp(f, 14, 40), 2.2);
  const full = ramp(f, 30, 40);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: th.paper }} />
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            <text x={W / 2} y={H / 2 + size * 0.34} textAnchor="middle" fontFamily="Newsreader" fontWeight={700} fontSize={size} letterSpacing={-size * 0.03} transform={`translate(${W / 2} ${H / 2}) scale(${z}) translate(${-W / 2} ${-H / 2})`}>
              {word}
            </text>
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>{children}</AbsoluteFill>
      {full > 0 ? <AbsoluteFill style={{ opacity: full }}>{children}</AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

const BlindsOpen: React.FC<{ f: number; th: ReturnType<typeof theme>; children: React.ReactNode }> = ({ f, th, children }) => {
  const n = 9;
  return (
    <AbsoluteFill>
      {children}
      {Array.from({ length: n }, (_, i) => {
        const fromMid = Math.abs(i - (n - 1) / 2);
        const k = easeInOut(ramp(f, 4 + fromMid * 3, 20 + fromMid * 3));
        if (k >= 1) return null;
        const h = H / n;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * h, height: h, transform: `scaleY(${1 - k})`, transformOrigin: i < n / 2 ? "50% 0%" : "50% 100%", background: th.a[0][0], overflow: "hidden" }}>
            <Holo phase={f / 30 + i * 0.1} style={{ left: 0, right: 0, top: i < n / 2 ? h - 6 : 0, height: 6, mixBlendMode: "normal", opacity: 1 }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FocusOpen: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const k = expoOut(ramp(f, 0, 34));
  const leak = ramp(f, 6, 40);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: k < 1 ? `blur(${(1 - k) * 26}px) brightness(${1 + 0.5 * (1 - k)})` : undefined, transform: `scale(${1.22 - 0.22 * k})` }}>{children}</AbsoluteFill>
      {leak > 0 && leak < 1 ? <Holo phase={leak} style={{ left: -400 + 2600 * leak, top: -300, width: 260, height: H + 600, transform: "rotate(18deg)", opacity: 0.35 * Math.sin(Math.PI * leak), mixBlendMode: "screen" }} /> : null}
    </AbsoluteFill>
  );
};

const FoilBand: React.FC<{ top: number; bottom: number; o: number; ph: number }> = ({ top, bottom, o, ph }) => {
  if (o >= 1) return null;
  const th = 14 + 30 * (1 - o);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Holo phase={ph} style={{ left: 0, right: 0, top: top - th, height: th, mixBlendMode: "normal", opacity: 1, boxShadow: "0 -6px 24px rgba(0,0,0,0.25)" }} />
      <Holo phase={ph + 0.3} style={{ left: 0, right: 0, top: bottom, height: th, mixBlendMode: "normal", opacity: 1, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" }} />
    </AbsoluteFill>
  );
};

const ShotLayer: React.FC<{ s: Placed; plan: Plan; shots: Placed[] }> = ({ s, plan, shots }) => {
  const f = useCurrentFrame();
  const th = theme(s.theme);
  const ov = OVERLAP[s.enter];
  let world: React.ReactNode;
  if (s.world === "stage") {
    world = (
      <CopyProvider copy={stageCopy(plan, s)}>
        <Outro from={T.studio} />
      </CopyProvider>
    );
  } else if (s.world === "lockup") {
    world = (
      <AbsoluteFill style={{ transform: `scale(${1 + 0.0016 * f})` }}>
        <Lockup logo={plan.brand.logo} line={plan.brand.line} />
      </AbsoluteFill>
    );
  } else {
    world = <WorldView s={s} f={f} plan={plan} shots={shots} />;
  }

  // ---- exit (the outgoing side of the next transition), unless the world performs it itself -----------------------
  let exitT = "";
  let flood = 0;
  if (s.exit && !(OWN_EXIT[s.world] ?? []).includes(s.exit)) {
    const d = s.dur;
    if (s.exit === "dive") {
      const k = ramp(f, d - 14, d);
      exitT = `scale(${1 + 5 * Math.pow(k, 2.4)})`;
      flood = ramp(f, d - 12, d - 1);
    } else if (s.exit === "match") {
      const k = ramp(f, d - 10, d + s.tail);
      exitT = `scale(${1 + 1.6 * k * k})`;
    } else if (s.exit === "iris" || s.exit === "wipe" || s.exit === "split") {
      exitT = `scale(${1 + 0.07 * ramp(f, d - 20, d + s.tail)})`;
    }
  }
  // ---- enter ------------------------------------------------------------------------------------------------------
  let clip: string | undefined;
  let enterT = "";
  let over: React.ReactNode = null;
  if (s.enter === "cut") enterT = `scale(${1 + 0.05 * (1 - expoOut(ramp(f, 0, 10)))})`;
  if (s.enter === "iris" && f < ov + 2) {
    const at = (s.p?.irisAt as [number, number]) ?? [0.5, 0.5];
    clip = `circle(${Math.max(1, 1250 * easeInOut(ramp(f, 0, ov)))}px at ${at[0] * 100}% ${at[1] * 100}%)`;
    enterT = `scale(${1.08 - 0.08 * expoOut(ramp(f, 0, ov + 10))})`;
  }
  if (s.enter === "split" && f < ov + 2) {
    const o = easeInOut(ramp(f, 0, ov));
    const half = (H / 2 + 40) * o;
    clip = `inset(${H / 2 - half}px 0px ${H / 2 - half}px 0px)`;
    over = <FoilBand top={H / 2 - half} bottom={H / 2 + half} o={o} ph={f / 70} />;
  }
  if (s.enter === "wipe" && f < ov + 2) {
    const x = -300 + (W + 700) * easeInOut(ramp(f, 0, ov));
    clip = `polygon(0px 0px, ${x}px 0px, ${x - 300}px ${H}px, 0px ${H}px)`;
    const ang = (Math.atan2(H, 300) * 180) / Math.PI;
    over = <Holo phase={f / 40} style={{ left: x - 150 - 14, top: -200, width: 28, height: H + 400, transform: `rotate(${90 - ang}deg)`, mixBlendMode: "normal", opacity: 1 }} />;
  }
  if (s.enter === "match" && f < ov + 2) {
    clip = `circle(${450 + 1800 * Math.pow(easeInOut(ramp(f, 0, ov)), 1.4)}px at 50% 50%)`;
    enterT = `scale(${0.94 + 0.06 * expoOut(ramp(f, 0, ov))})`;
  }
  // lens grammar: a hard cut, then a dark iris opens; the outgoing shot closes its own iris first (see ./lens.tsx)
  let irisR = 2300;
  if (s.enter === "lens") irisR = irisOpen(f, 1, 28);
  if (s.exit === "lens") irisR = Math.min(irisR, irisClose(f, s.dur - 16, s.dur));
  if (s.enter === "sweep" && f < ov) clip = f < ov / 2 ? "inset(0px 0px 0px 100%)" : undefined;
  if (s.enter === "sweep" && f < ov + 1) over = <LensSweep f={f} a={0} b={ov} />;
  let inFlood = 0;
  if (s.enter === "dive") {
    inFlood = 1 - ramp(f, 0, 10);
    enterT = `scale(${1.12 - 0.12 * expoOut(ramp(f, 0, 16))})`;
  }
  const word = (s.p?.openWord as string) ?? (s.text?.head ?? plan.brand.name).split(" ")[0];
  const body =
    s.enter === "lines" ? <LinesOpen f={f} disc={th.disc}>{world}</LinesOpen>
    : s.enter === "bloom" ? <BloomOpen f={f} th={th}>{world}</BloomOpen>
    : s.enter === "letters" ? <LettersOpen f={f} th={th} word={word} id={`open${s.index}`}>{world}</LettersOpen>
    : s.enter === "blinds" ? <BlindsOpen f={f} th={th}>{world}</BlindsOpen>
    : s.enter === "focus" ? <FocusOpen f={f}>{world}</FocusOpen>
    : world;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>
        <Iris r={irisR}>
          <AbsoluteFill style={{ transform: `${enterT} ${exitT}`.trim() || undefined }}>{body}</AbsoluteFill>
          <Flood f={f + s.start} o={Math.max(flood, inFlood)} />
        </Iris>
      </AbsoluteFill>
      {over}
    </AbsoluteFill>
  );
};

export type StoryProps = { plan: Plan };

export const Story: React.FC<StoryProps> = ({ plan }) => {
  useFilmFonts();
  const shots = place(plan);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {shots.map((s) => (
        <Sequence key={s.index} from={s.start} durationInFrames={s.dur + s.tail} name={`${s.index + 1}. ${s.world} (${s.enter})`}>
          <ShotLayer s={s} plan={plan} shots={shots} />
        </Sequence>
      ))}
      {plan.score ? <Audio src={staticFile(plan.score)} /> : null}
    </AbsoluteFill>
  );
};

export const storyMetadata: CalculateMetadataFunction<StoryProps> = ({ props }) => ({ durationInFrames: Math.max(1, totalFrames(props.plan)) });
