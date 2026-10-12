import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, SANS, T, expoOut, ramp } from "./look.ts";

/**
 * End lockup, cut from black on the bar (outro). The brand's own logo file (unmodified, white on transparent)
 * swings in edge-on -> face (6 frames, hinge at 90 % x), brushed metal crossfading to flat white, then the card's
 * name rises beneath it. Hold, linear fade, black.
 */
const LOGO = staticFile("brand/example-wordmark.png");

export const Lockup: React.FC<{ logo?: string; line?: string }> = ({ logo, line = "" }) => {
  const src = logo ? staticFile(logo) : LOGO;
  const fitBox = true; // any logo shape: a wide box, the file fitted inside it
  const lf = useCurrentFrame();
  const f = lf + T.lockup;
  const swing = interpolate(lf, [2, 8], [90, 0], { ...C, easing: expoOut });
  const metal = 1 - ramp(lf, 9, 19, (t) => t);
  const rise = interpolate(lf, [8, 20], [0.028 * 1080, 0], { ...C, easing: expoOut });
  const nameIn = ramp(lf, 9, 19, (t) => t);
  const fade = 1 - ramp(f, 700, 713, (t) => t);
  const h = 214; // logo box height (emblem ~10.8 % H)
  const w = fitBox ? h * 2.4 : (h * 192) / 228; // another brand's logo: a wide box, the file fitted inside it
  const drift = 1 + lf * 0.0006;
  const mask = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: fitBox ? "contain" : "100% 100%", maskSize: fitBox ? "contain" : "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } as React.CSSProperties;
  return (
    <AbsoluteFill style={{ background: "#000", opacity: 1 }}>
      <AbsoluteFill style={{ opacity: fade, transform: `scale(${drift})` }}>
        <div style={{ position: "absolute", left: 960 - w / 2, top: 0.43 * 1080 - h / 2, width: w, height: h, perspective: 700, opacity: lf >= 2 ? 1 : 0 }}>
          <div style={{ position: "absolute", inset: 0, transform: `rotateY(${swing}deg)`, transformOrigin: "90% 50%" }}>
            <Img src={src} style={{ position: "absolute", inset: 0, width: w, height: h, objectFit: "contain", opacity: 1 - metal }} />
            <div style={{ position: "absolute", inset: 0, ...mask, opacity: metal, background: `linear-gradient(${110 + lf * 4}deg, #4d4d4d 0%, #bdbdbd 30%, #8f8f8f 52%, #e0e0e0 72%, #6a6a6a 100%)` }} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0.43 * 1080 + h / 2 + 46 + rise,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.86)",
            opacity: nameIn,
          }}
        >
          {line}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
