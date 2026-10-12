import React, { createContext, useContext } from "react";

/**
 * Every word, number and logo in the film, as data. The film's look, timing, worlds and transitions stay
 * exactly as built; a new script only fills these slots (tools/film.py checks that every line fits its shot).
 * Defaults are a fictional example brand.
 */
export type FilmCopy = {
  /** official logo file, white on transparent, under public/ (never redrawn) */
  logo: string;
  /** world 1, the garden: the first claim */
  claim1: { head: string; sub?: string };
  /** the card reveal: product name over the card */
  card: { head: string; sub?: string };
  /** the foil strip on the card, uppercase; [0] lands whole in the close-up, so keep it <= 18 characters */
  strip: [string, string];
  /** world 2, travel and globe */
  claim2: { head: string; sub?: string };
  /** world 3, the colonnade of products */
  claim3: { head: string; sub?: string };
  /** world 4, the shell: a small label and a big value that rises like a pearl (e.g. "JOINING FEE", "₹0") */
  hero: { label: string; value: string };
  /** outro: tiny print on the card face, the phone screen, the words either side of the phone */
  cardPrint: string;
  outro: { screen: string; title: string; rows: string[]; left: string; right: string };
  /** lockup line under the logo */
  lockup: string;
};

export const DEFAULT_COPY: FilmCopy = {
  logo: "brand/example-wordmark.png",
  claim1: { head: "5% rewards", sub: "on everyday spends" },
  card: { head: "the Inkline", sub: "rewards card" },
  strip: ["ZERO JOINING FEE", "5% REWARDS ON EVERYDAY SPENDS"],
  claim2: { head: "redeem on flights, hotels" },
  claim3: { head: "2,000+ products", sub: "in the rewards store" },
  hero: { label: "JOINING FEE", value: "₹0" },
  cardPrint: "5% REWARDS ON EVERYDAY SPENDS  ·  ZERO JOINING FEE",
  outro: {
    screen: "your card",
    title: "Inkline rewards card",
    rows: ["5% rewards on everyday spends", "zero joining fee", "redeem on flights, hotels and 2,000+ products"],
    left: "the Inkline",
    right: "rewards card.",
  },
  lockup: "rewards card · example film",
};

const Ctx = createContext<FilmCopy>(DEFAULT_COPY);
export const CopyProvider: React.FC<{ copy?: FilmCopy; children: React.ReactNode }> = ({ copy, children }) => <Ctx.Provider value={copy ?? DEFAULT_COPY}>{children}</Ctx.Provider>;
export const useCopy = () => useContext(Ctx);

/** Shrink a font so a single line of `text` stays within `maxW` px (rough width model for the film's faces). */
export const fit = (text: string, size: number, maxW: number, perChar = 0.52) => Math.min(size, maxW / Math.max(1, text.length * perChar));
