import React from "react";
import { AbsoluteFill } from "remotion";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Backdrop, H, W, WorldLook, type WorldProps } from "../common.tsx";

/**
 * TYPE: a typographic statement on the engraved paper: words arrive one by one out of a blur, one word set in foil.
 * Best for: a belief, a promise, a line that is the point of the film and needs no picture. Use once per film, at most.
 *   p.lines   1-3 lines (each <= 22 characters reads best)
 *   p.foil    the one word to set in foil (must appear in the lines)
 * Camera: a slow push. Words land on the beat (every 3 frames per word).
 */
const ctx2d = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
const measure = (w: string, size: number) => {
  if (!ctx2d) return w.length * size * 0.5;
  ctx2d.font = `600 ${size}px Newsreader`;
  return ctx2d.measureText(w).width - 2 * Math.max(0, w.length - 1); // letterSpacing -2 per gap
};

export const TypeWorld: React.FC<WorldProps> = ({ f, shot, th }) => {
  const dur = shot.dur;
  const lines = ((shot.p?.lines as string[]) ?? [shot.text?.head ?? ""]).slice(0, 3);
  const foil = ((shot.p?.foil as string) ?? "").toLowerCase();
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.min(150, 1500 / (longest * 0.5));
  const lh = size * 1.08;
  const y0 = H / 2 - (lines.length * lh) / 2 + size * 0.78;
  const z = 1.0 + 0.06 * (f / Math.max(1, dur + shot.tail));
  let wi = 0;
  const stops: [string, number][] = [["#8f7cff", 0], ["#6fd6ea", 0.2], ["#b4f2c2", 0.42], ["#ffeea0", 0.62], ["#ffb2d4", 0.82], ["#8f7cff", 1]];
  const ph = (f / 40) % 1;
  return (
    <WorldLook th={th}>
      <AbsoluteFill>
        <Backdrop f={f} th={th} speed={2.2} lambda={120} />
        <AbsoluteFill style={{ transform: `scale(${z})` }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id={`tfoil${shot.index}`} x1="0" y1="0" x2="1" y2="0.3" gradientTransform={`translate(${ph - 0.5} 0)`} spreadMethod="repeat">
                {stops.map(([c, o], i) => (
                  <stop key={i} offset={o} stopColor={c} />
                ))}
              </linearGradient>
            </defs>
            {lines.map((line, li) => {
              const words = line.split(" ");
              // measure each word in the real face (the film's fonts are loaded before any frame renders)
              const space = size * 0.34;
              const widths = words.map((w) => measure(w, size) + space);
              const total = widths.reduce((a, b) => a + b, 0) - space;
              let x = W / 2 - total / 2;
              return (
                <g key={li}>
                  {words.map((w, k) => {
                    const at = 6 + wi++ * 3;
                    const kk = expoOut(ramp(f, at, at + 12));
                    const isFoil = foil && w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === foil.replace(/[^\p{L}\p{N}]/gu, "");
                    const xx = x;
                    x += widths[k];
                    return (
                      <g key={k} opacity={kk} transform={`translate(${xx} ${y0 + li * lh + (1 - kk) * 26})`}>
                        <text x={0} y={0} fontFamily="Newsreader" fontWeight={600} fontSize={size} letterSpacing={-2} fill={isFoil ? `url(#tfoil${shot.index})` : th.grad[0]} stroke={isFoil ? "rgba(60,50,120,0.35)" : "none"} strokeWidth={1.5} style={{ filter: `blur(${(1 - kk) * 6}px)` }}>
                          {w}
                        </text>
                        {isFoil ? <rect x={0} y={size * 0.16} width={widths[k] * 0.85 * expoOut(ramp(f, at + 8, at + 22))} height={3} fill={th.grad[1]} /> : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    </WorldLook>
  );
};
