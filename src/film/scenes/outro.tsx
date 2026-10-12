import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { expoOut, ramp } from "../../ensemble/score.ts";
import { Holo } from "./kit.tsx";
import { T } from "../core/looks.ts";
import { fit, useCopy, type FilmCopy } from "./copy.tsx";

/**
 * Outro (561-645): a clean white set, the card as a glossy flat object,
 * the card dropping into a phone that shows it in an app card screen, small words either side of the phone,
 * then the screen goes dark and the camera pushes into it, landing on the (dark) logo lockup.
 * Copy is limited to the approved claims; the logo is the official file, unmodified.
 */
const W = 1920, H = 1080;
const CW = 856, CH = 540; // card on the set
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The card face: brushed silver, triple-line circuit traces routed round the card into a large milled chip,
 * a signal-red block with a small black square. No other brand's marks; the brand's logo file sits on the red block (see Card).
 */
const craftFace = (print: string): string => {
  const Wc = 2048, Hc = 1292;
  const c = document.createElement("canvas");
  c.width = Wc;
  c.height = Hc;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, Wc, Hc);
  g.addColorStop(0, "#f3f4f5");
  g.addColorStop(0.45, "#d9dbde");
  g.addColorStop(0.7, "#eceef0");
  g.addColorStop(1, "#cfd2d6");
  x.fillStyle = g;
  x.fillRect(0, 0, Wc, Hc);
  // brushed grain
  for (let i = 0; i < 3200; i++) {
    const y = (i * 7919) % Hc, x0 = (i * 104729) % Wc, len = 80 + ((i * 31) % 300);
    x.strokeStyle = i % 2 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.18)";
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(x0, y + 0.5);
    x.lineTo(x0 + len, y + 0.5);
    x.stroke();
  }
  // circuit traces: three parallel lines with rounded corners
  const trace = (pts: [number, number][], r: number) => {
    for (let k = 0; k < 3; k++) {
      const o = (k - 1) * 16;
      x.beginPath();
      x.moveTo(pts[0][0], pts[0][1] + o);
      for (let i = 1; i < pts.length - 1; i++) x.arcTo(pts[i][0] + o, pts[i][1] + o, pts[i + 1][0] + o, pts[i + 1][1] + o, r);
      const L = pts[pts.length - 1];
      x.lineTo(L[0] + o, L[1] + o);
      x.strokeStyle = "rgba(255,255,255,0.7)";
      x.lineWidth = 6;
      x.stroke();
      x.strokeStyle = "#7c8088";
      x.lineWidth = 3;
      x.stroke();
    }
  };
  trace([[-40, 330], [1180, 330], [1180, 560], [1470, 560]], 70);
  trace([[-40, 1060], [1300, 1060], [1300, 760], [1830, 760], [1830, 520], [1790, 520]], 70);
  // the chip: milled metal, cross grooves, concentric turning marks
  const cxp = 1630, cyp = 360, cw = 330, ch = 250;
  const cg = x.createRadialGradient(cxp - 40, cyp - 40, 10, cxp, cyp, 220);
  cg.addColorStop(0, "#fbfbfc");
  cg.addColorStop(0.6, "#b9bcc2");
  cg.addColorStop(1, "#8d9097");
  x.fillStyle = cg;
  x.beginPath();
  x.roundRect(cxp - cw / 2, cyp - ch / 2, cw, ch, 46);
  x.fill();
  x.save();
  x.beginPath();
  x.roundRect(cxp - cw / 2, cyp - ch / 2, cw, ch, 46);
  x.clip();
  for (let r = 18; r < 260; r += 9) {
    x.strokeStyle = r % 2 ? "rgba(255,255,255,0.35)" : "rgba(60,62,70,0.16)";
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cxp, cyp, r, 0, Math.PI * 2);
    x.stroke();
  }
  x.restore();
  x.strokeStyle = "#5d6068";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(cxp - cw / 2 + 20, cyp - 20);
  x.bezierCurveTo(cxp - 40, cyp - 30, cxp - 20, cyp - 60, cxp - 14, cyp - ch / 2 + 16);
  x.moveTo(cxp + cw / 2 - 20, cyp - 20);
  x.bezierCurveTo(cxp + 40, cyp - 30, cxp + 20, cyp - 60, cxp + 14, cyp - ch / 2 + 16);
  x.moveTo(cxp - cw / 2 + 20, cyp + 22);
  x.bezierCurveTo(cxp - 40, cyp + 30, cxp - 20, cyp + 60, cxp - 14, cyp + ch / 2 - 16);
  x.moveTo(cxp + cw / 2 - 20, cyp + 22);
  x.bezierCurveTo(cxp + 40, cyp + 30, cxp + 20, cyp + 60, cxp + 14, cyp + ch / 2 - 16);
  x.stroke();
  x.strokeStyle = "rgba(60,62,70,0.6)";
  x.lineWidth = 3;
  x.beginPath();
  x.roundRect(cxp - cw / 2, cyp - ch / 2, cw, ch, 46);
  x.stroke();
  // red block and black square
  const rg = x.createLinearGradient(1500, 900, 2048, 1292);
  rg.addColorStop(0, "#ee4a30");
  rg.addColorStop(1, "#c9321f");
  x.fillStyle = rg;
  x.fillRect(1520, 900, 528, 392);
  x.fillStyle = "#121214";
  x.fillRect(1360, 1112, 160, 180);
  // micro line along the lower trace
  x.font = "500 22px Lexend";
  x.fillStyle = "rgba(90,94,102,0.75)";
  x.fillText(print, 120, 1015);
  return c.toDataURL("image/png");
};
const useCardImage = (print: string) => useMemo(() => craftFace(print), [print]);

/** The card as a glossy flat object: printed face, official logo, a gloss sweep that crosses once. */
const Card: React.FC<{ src: string; w: number; gloss: number; shadow?: number }> = ({ src, w, gloss, shadow = 1 }) => {
  const h = (w * CH) / CW;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.04, overflow: "hidden", boxShadow: `0 ${w * 0.04}px ${w * 0.09}px rgba(20,22,30,${0.35 * shadow})` }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: w, height: h }} />
      <Img src={staticFile(useCopy().logo)} style={{ position: "absolute", left: w * 0.87, top: h * 0.85, height: h * 0.15, maxWidth: w * 0.21, objectFit: "contain", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: w * 0.04, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.8), inset 0 -3px 8px rgba(0,0,0,0.12)" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, rgba(255,255,255,0) ${gloss * 140 - 40}%, rgba(255,255,255,0.32) ${gloss * 140 - 25}%, rgba(255,255,255,0) ${gloss * 140 - 10}%)` }} />
    </div>
  );
};

/** A front-on phone (titanium frame, black bezel, dynamic island) with a dark app card screen. */
const PW = 430, PH = 880;
const SLOT = { x: 24, y: 150, w: PW - 2 * 18 - 48 }; // card slot inside the screen
const Phone: React.FC<{ src: string; F: number; dark: number; cardIn: number }> = ({ src, F, dark, cardIn }) => {
  const row = (i: number) => expoOut(ramp(F, 609 + i * 6, 619 + i * 6));
  const copy: FilmCopy = useCopy();
  const rows = copy.outro.rows;
  return (
    <div style={{ position: "relative", width: PW, height: PH, borderRadius: 74, background: "linear-gradient(135deg, #d9d9dd, #8d8d93 40%, #e6e6ea 60%, #a6a6ac)", padding: 6, boxShadow: "0 40px 90px rgba(20,22,30,0.28), 0 10px 24px rgba(20,22,30,0.18)" }}>
      {/* side buttons */}
      <div style={{ position: "absolute", left: -4, top: 190, width: 5, height: 70, borderRadius: 3, background: "#9a9aa0" }} />
      <div style={{ position: "absolute", left: -4, top: 280, width: 5, height: 70, borderRadius: 3, background: "#9a9aa0" }} />
      <div style={{ position: "absolute", right: -4, top: 240, width: 5, height: 110, borderRadius: 3, background: "#9a9aa0" }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: 68, background: "#0b0b0d", padding: 12 }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", background: "radial-gradient(ellipse 120% 60% at 50% 0%, #1c1c22, #0c0c0f 60%)" }}>
          {/* status bar + island */}
          <div style={{ position: "absolute", left: 30, top: 18, fontFamily: "Lexend", fontWeight: 500, fontSize: 17, color: "#f2f2f2" }}>9:41</div>
          <div style={{ position: "absolute", left: "50%", top: 12, width: 118, height: 34, marginLeft: -59, borderRadius: 20, background: "#0b0b0d" }} />
          <div style={{ position: "absolute", left: 24, top: 82, fontFamily: "Newsreader", fontWeight: 600, fontSize: 30, color: "#f4f4f2", letterSpacing: -0.5 }}>{copy.outro.screen}</div>
          {/* card slot */}
          <div style={{ position: "absolute", left: SLOT.x, top: SLOT.y, opacity: cardIn }}>
            <Card src={src} w={SLOT.w} gloss={ramp(F, 606, 640)} shadow={0.6} />
          </div>
          <div style={{ position: "absolute", left: 24, top: SLOT.y + (SLOT.w * CH) / CW + 26, right: 24, opacity: expoOut(ramp(F, 606, 616)) }}>
            <div style={{ fontFamily: "Lexend", fontWeight: 600, fontSize: 19, color: "#f4f4f2" }}>{copy.outro.title}</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "18px 0 10px" }} />
            {rows.map((r, i) => (
              <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", opacity: row(i), transform: `translateY(${(1 - row(i)) * 10}px)` }}>
                <div style={{ flex: "0 0 24px", height: 24, borderRadius: 12, background: "#2fa36f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontFamily: "Lexend" }}>✓</div>
                <div style={{ fontFamily: "Lexend", fontWeight: 400, fontSize: 16, lineHeight: 1.35, color: "rgba(244,244,242,0.82)" }}>{r}</div>
              </div>
            ))}
          </div>
          {/* a glass glare that slides across the screen as the phone turns */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, rgba(255,255,255,0) ${ramp(F, 600, 640) * 160 - 50}%, rgba(255,255,255,0.10) ${ramp(F, 600, 640) * 160 - 32}%, rgba(255,255,255,0) ${ramp(F, 600, 640) * 160 - 14}%)` }} />
          {/* the screen goes dark before the push-in */}
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dark }} />
        </div>
      </div>
    </div>
  );
};

/** Words that arrive one by one, small sans, as in the reference. */
const Words: React.FC<{ text: string; F: number; at: number; align: "left" | "right"; x: number }> = ({ text, F, at, align, x }) => (
  <div style={{ position: "absolute", top: H / 2 - 30, [align]: x, width: 600, textAlign: align, fontFamily: "Lexend", fontWeight: 500, fontSize: fit(text, 46, 600, 0.5), whiteSpace: "nowrap", lineHeight: 1.2, color: "#17171b", letterSpacing: -0.5 } as React.CSSProperties}>
    {text.split(" ").map((w, i) => {
      const k = expoOut(ramp(F, at + i * 3, at + i * 3 + 10));
      return (
        <span key={i} style={{ display: "inline-block", marginRight: 10, opacity: k, filter: `blur(${(1 - k) * 8}px)`, transform: `translateY(${(1 - k) * 12}px)` }}>
          {w}
        </span>
      );
    })}
  </div>
);

export const Outro: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const copy = useCopy();
  const src = useCardImage(copy.cardPrint);
  // 1. pull back from the card's foil stripe (the shell's iridescence was the stripe)
  const pull = expoOut(ramp(F, T.studio, T.studio + 18));
  const stripe = { x: (1630 / 2048) * CW, y: (360 / 1292) * CH }; // the pull-back starts on the milled chip
  // 2. the card floats, then tilts back and drops into the phone
  const drop = smooth(ramp(F, 582, 606));
  const drift = ramp(F, T.studio + 10, 600); // the floating card keeps turning until the drop takes over
  const phoneIn = expoOut(ramp(F, 586, 606));
  const phoneY = H / 2 - PH / 2 + 980 * (1 - phoneIn);
  // card position: centre of the set -> the phone's card slot
  const slotX = W / 2 - PW / 2 + 6 + 12 + SLOT.x, slotY = phoneY + 6 + 12 + SLOT.y;
  const cardW = CW + (SLOT.w - CW) * drop;
  const cx = W / 2 - CW / 2 + (slotX - (W / 2 - CW / 2)) * drop;
  const cy = H / 2 - CH / 2 - 10 + Math.sin(((F - T.studio) / 24) * 1.4) * 6 * (1 - drop) + (slotY - (H / 2 - CH / 2)) * drop;
  const tiltX = (10 - 4 * drift) * (1 - drop) + 55 * Math.sin(Math.PI * drop), tiltY = (-16 + 12 * drift) * (1 - drop);
  const handed = F >= 606; // the card now lives inside the phone's screen
  // 3. the screen goes dark and the camera pushes into it
  const dark = ramp(F, 630, 638);
  const push = ramp(F, 634, T.lockup);
  // a slow continuous push from the moment the phone lands, so the hold never freezes
  const z = (1 + 0.08 * ramp(F, 590, 640)) * (1 + 9 * push * push);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, #ffffff, #ececea 70%, #e2e2df)" }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)", backgroundSize: "120px 120px", backgroundPosition: "center" }} />
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${W / 2}px ${phoneY + PH / 2}px` }}>
        {F >= 584 ? (
          <>
            <div style={{ position: "absolute", left: W / 2 - 300, width: 600, top: H / 2 + PH / 2 + 10, height: 70, borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(20,22,30,0.28), rgba(20,22,30,0) 70%)", opacity: phoneIn, transform: `scale(${0.6 + 0.4 * phoneIn})` }} />
            <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 2200 }}>
              <div style={{ position: "absolute", left: W / 2 - PW / 2, top: phoneY, transformStyle: "preserve-3d", transform: `rotateY(${-22 * (1 - phoneIn) + 5 * Math.sin((F - 586) / 24 * 0.9) * phoneIn}deg) rotateX(${8 * (1 - phoneIn) + 2 * Math.sin((F - 586) / 24 * 0.7)}deg)` }}>
                <Phone src={src} F={F} dark={dark} cardIn={handed ? 1 : 0} />
              </div>
            </div>
          </>
        ) : null}
        {!handed ? (
          <AbsoluteFill style={{ perspective: 1600 }}>
            <div style={{ position: "absolute", left: cx, top: cy, transformOrigin: `${stripe.x}px ${stripe.y}px`, transform: `scale(${1 + 5 * (1 - pull)}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }}>
              <Card src={src} w={cardW} gloss={ramp(F, 568, 592)} />
            </div>
          </AbsoluteFill>
        ) : null}
        {/* red laser scan across the card (the reference's inspection lasers) */}
        {F > 570 && F < 592 ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - CH / 2 + CH * ramp(F, 571, 590), height: 3, background: "#ff3b22", boxShadow: "0 0 14px 4px rgba(255,70,40,0.55)", opacity: 1 - ramp(F, 586, 591) }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: W / 2 - CW / 2 + CW * ramp(F, 573, 589), width: 3, background: "#ff3b22", boxShadow: "0 0 14px 4px rgba(255,70,40,0.55)", opacity: 1 - ramp(F, 585, 590) }} />
          </>
        ) : null}
        {F >= 604 ? (
          <>
            <Words text={copy.outro.left} F={F} at={606} align="right" x={W / 2 + PW / 2 + 70} />
            <Words text={copy.outro.right} F={F} at={614} align="left" x={W / 2 + PW / 2 + 70} />
          </>
        ) : null}
      </AbsoluteFill>
      {/* the shell's iridescence resolving into the stripe */}
      <AbsoluteFill style={{ opacity: 1 - ramp(F, T.studio, T.studio + 10) }}>
        <Holo phase={0.35 + 0.4 * Math.sin((F - T.card) / 14)} style={{ inset: 0, mixBlendMode: "normal", opacity: 1, transform: `scale(${1 + 0.02 * Math.max(0, F - (T.whip - 6))})` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
