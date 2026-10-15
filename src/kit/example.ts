import type { Plan } from "./plan.ts";

/** The coffee sample (specs/coffee.plan.json), as the Studio default. Fictional brand. */
export const EXAMPLE_PLAN: Plan = {
 "slug": "velmora",
 "brand": {
  "name": "VELMORA",
  "logo": "films/velmora/wordmark.png",
  "line": "coffee roasters · first store · sample film"
 },
 "shots": [
  {
   "world": "garden",
   "enter": "lines",
   "theme": "forest",
   "cast": [
    "figure",
    "plant",
    "plant"
   ],
   "p": {
    "cherries": true
   },
   "text": {
    "head": "It starts on a hillside",
    "sub": "coffee cherries, picked by hand"
   },
   "dur": 138
  },
  {
   "world": "globe",
   "enter": "iris",
   "theme": "honey",
   "cast": [
    "lantern"
   ],
   "p": {
    "home": [
     77.59,
     12.97
    ],
    "inbound": true,
    "mark": "ship",
    "building": "none",
    "to": [
     [
      38.76,
      9.0
     ],
     [
      -74.07,
      4.71
     ],
     [
      98.67,
      3.6
     ],
     [
      -47.88,
      -15.79
     ]
    ]
   },
   "text": {
    "head": "Four origins, one city"
   },
   "dur": 115
  },
  {
   "world": "orbit",
   "enter": "match",
   "theme": "roastery",
   "cast": [
    "lantern"
   ],
   "p": {
    "bodies": "beans",
    "count": 8,
    "spin": 2.2
   },
   "text": {
    "head": "Roasted in small batches"
   },
   "dur": 93
  },
  {
   "world": "table",
   "enter": "cut",
   "theme": "honey",
   "cast": [
    "cup",
    "dish"
   ],
   "p": {
    "pour": true,
    "beans": 36,
    "surface": "wood"
   },
   "text": {
    "head": "Poured slow, by hand"
   },
   "dur": 115
  },
  {
   "world": "city",
   "enter": "wipe",
   "theme": "graphite",
   "cast": [
    "figure",
    "car",
    "lantern"
   ],
   "p": {
    "sign": "VELMORA",
    "enter": true
   },
   "text": {
    "head": "Our first store",
    "sub": "doors open this November"
   },
   "dur": 127
  },
  {
   "world": "object",
   "enter": "print",
   "theme": "roastery",
   "p": {
    "shape": "ticket",
    "stamp": "01·11",
    "strip": [
     "FIRST CUP ON US",
     "OPENING WEEK"
    ]
   },
   "text": {
    "head": "You're invited"
   },
   "dur": 92
  },
  {
   "world": "lockup",
   "enter": "dive",
   "dur": 75
  }
 ],
 "score": undefined
};
