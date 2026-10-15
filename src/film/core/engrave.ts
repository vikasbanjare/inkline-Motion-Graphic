import * as THREE from "three";

/**
 * Per-object engraving material (v2). Adapted from the research prototype `engrave2` (itself a port of the calibrated
 * line-screen model: period ~0.0065 H, 45 deg, tone = line thickness, lines never close in shadow, 3-4 stop gradient map).
 *
 * v2 additions:
 *  - uSpace 1 = object-anchored, screen-oriented screen: the line phase is measured from the object's projected origin and
 *    the period scales with the object's distance, so lines scale and travel with the object but stay at the screen angle
 *    (BUILD-SPEC A2.6), instead of "swimming" over moving objects.
 *  - per-object angle offset (CRITIQUE 2.3: plates carry their own angle, 45 +-4..7 deg).
 *  - poster mode: 3-level posterise + threshold-noise flecks, no line screen (the live hero treatment, A1.3).
 *  - in-shader foil: thin-film hue ramp in overlay blend, attached to the surface (normal + object position) and driven by
 *    camera/object motion through uFoilPhase (A5.1-A5.2), masked to mid tones.
 *  - atmos: far layers lose contrast and lift toward paper (CRITIQUE 4.4).
 */
THREE.ColorManagement.enabled = false;

export type Pal = [string, number][];

// skinning chunks: a no-op on plain meshes, and lets rigged glTF characters animate under the engraving
const vert = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vNormalV; varying vec3 vPosV; varying vec3 vPosO; varying vec2 vUv;
varying vec4 vOrigin; // xy = origin in NDC, z = origin view depth
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vUv = uv; vPosO = position;
  vNormalV = normalize(normalMatrix * objectNormal);
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vPosV = mv.xyz;
  vec4 o = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 oc = projectionMatrix * o;
  vOrigin = vec4(oc.xy / oc.w, -o.z, 0.0);
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
varying vec3 vNormalV; varying vec3 vPosV; varying vec3 vPosO; varying vec2 vUv; varying vec4 vOrigin;
uniform vec2 uResolution; uniform vec3 uKeyWorld;
uniform float uKey, uWrap, uAmbient, uRim, uRimPow, uSpec, uShininess, uAlbedo;
uniform sampler2D tAlbedo; uniform float uUseAlbedoMap; uniform float uMapAmt; uniform float uMapGamma;
uniform float uAlbedoNoise, uNoiseScale;
uniform float uPeriodFrac, uAngle, uToneGamma, uDmax, uTHi, uCovGamma, uFill;
uniform float uWobble, uWobbleScale, uWidthJitter, uDetail, uAA;
uniform vec3 uStops[4]; uniform vec4 uStopPos; uniform int uStopCount;
uniform float uGrain, uMottle, uMottleScale, uSeed;
uniform float uInk, uEdge, uSpace, uRefDepth, uPoster, uFoil, uFoilPhase, uAtmos, uDim, uOpacity, uLift;
uniform float uHatch, uHatchT, uStipple, uFollow; // engraving detail: cross-hatch in the shadows, stipple in the lights, form-following lines
uniform float uWash; // tonal watercolour underlay under the line screen (0 = pure line screen)
uniform vec3 uAtmosColor;

float hash(vec2 i, float s){ return fract(sin(i.x*12.9898 + i.y*78.233 + s*37.719) * 43758.5453); }
float vnoise(vec2 p, float s){ vec2 i=floor(p), f=p-i; vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i,s), b=hash(i+vec2(1,0),s), c=hash(i+vec2(0,1),s), d=hash(i+vec2(1,1),s);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
float fbm(vec2 p, int oct, float s){ float t=0.0, a=0.5, n=0.0;
  for (int o=0;o<4;o++){ if(o>=oct) break; t+=a*(vnoise(p,s+float(o))*2.0-1.0); n+=a; p=p*2.03+vec2(17.1,9.2); a*=0.5; }
  return t/n; }
vec3 gradientMap(float v){ vec3 col=uStops[0];
  for (int i=1;i<4;i++){ if(i>=uStopCount) break;
    col = mix(col, uStops[i], clamp((v-uStopPos[i-1])/max(uStopPos[i]-uStopPos[i-1],1e-5),0.0,1.0)); }
  return col; }
vec3 hsv2rgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0); return c.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),c.y); }
vec3 overlay(vec3 b, vec3 s){ return mix(2.0*b*s, 1.0-2.0*(1.0-b)*(1.0-s), step(0.5, b)); }

void main(){
  vec2 frag = gl_FragCoord.xy; float H = uResolution.y; float P = uPeriodFrac * H;
  vec3 N = normalize(vNormalV); vec3 V = normalize(-vPosV);
  if (dot(N, V) < 0.0) N = -N;
  vec3 K = normalize((viewMatrix * vec4(uKeyWorld, 0.0)).xyz);
  float ndl = dot(N, K);
  float diff = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);
  float spec = pow(max(dot(N, normalize(K + V)), 0.0), uShininess) * uSpec;
  float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPow) * uRim;
  float alb = uAlbedo;
  if (uUseAlbedoMap > 0.5) {
    float m = pow(dot(texture2D(tAlbedo, vUv).rgb, vec3(0.299,0.587,0.114)), uMapGamma);
    alb *= mix(1.0, m * 1.6, uMapAmt);
  }
  alb *= 1.0 - uAlbedoNoise * (0.5 + 0.5 * fbm(vPosO.xy * uNoiseScale + vPosO.z * 1.7, 3, uSeed + 3.0));
  float t = clamp((uAmbient + uKey * diff) * alb + spec + rim + uLift, 0.0, 1.0);
  t = pow(t, uToneGamma);
  // contour: silhouettes darken (engravers cut the outline), CRITIQUE/SPEC: 2 px dark outline
  t *= mix(1.0, smoothstep(0.02, 0.32, abs(dot(N, V))), uEdge);
  float inkLine = 1.0 - smoothstep(0.1, 0.2, abs(dot(N, V)));

  // carrier coordinates: screen-locked (0) or object-anchored and scaled with distance (1)
  vec2 q = frag;
  float k = 1.0;
  if (uSpace > 0.5) {
    vec2 o = (vOrigin.xy * 0.5 + 0.5) * uResolution;
    k = uRefDepth / max(vOrigin.z, 1e-3);
    q = (frag - o) / k;
  }
  float v;
  if (uPoster > 0.5) {
    // live hero: 3 tones + mezzotint flecks, no line screen
    float n = hash(floor(q / 2.5), uSeed + 2.0) - 0.5;
    float tt = clamp(t + n * 0.28, 0.0, 1.0);
    float lv = tt < 0.36 ? 0.18 : (tt < 0.66 ? 0.55 : 0.86);
    v = lv;
  } else {
    if (uDetail > 0.0) t = clamp(t + uDetail * fbm(q / (P * 1.5), 2, uSeed + 18.0), 0.0, 1.0);
    float sc = uWobbleScale * P;
    float wob = uWobble * fbm(q / sc, 2, uSeed);
    // form-following: the lines turn to run around the form (perpendicular to the screen-space normal), as an
    // engraver's burin follows a volume; measured from the object's origin so the phase stays coherent per object
    float ang = uAngle;
    if (uFollow > 0.0) {
      vec2 o2 = (vOrigin.xy * 0.5 + 0.5) * uResolution;
      if (uSpace < 0.5) q = frag - o2;
      vec2 ld = vec2(-N.y, N.x);
      float wgt = uFollow * smoothstep(0.08, 0.6, length(ld));
      vec2 d = normalize(mix(vec2(cos(ang), sin(ang)), normalize(ld + 1e-5) * sign(dot(normalize(ld + 1e-5), vec2(cos(ang), sin(ang))) + 1e-3), wgt));
      ang = atan(d.y, d.x);
    }
    float u = dot(q, vec2(-sin(ang), cos(ang))) / P + wob;
    float fw = fwidth(u);
    float dist = 1.0 - abs(fract(u) - 0.5) * 2.0;
    float w = max(fw * 2.0 * uAA, 1e-4) * 0.5;
    float jit = uWidthJitter * (vnoise(vec2(floor(u) * 0.37, 0.0) + q / (sc * 2.5), uSeed + 11.0) * 2.0 - 1.0);
    float c = clamp(uDmax * pow(clamp((uTHi - t) / uTHi, 0.0, 1.0), uCovGamma) * (1.0 + jit), 0.0, 1.0);
    float m = 1.0 - smoothstep(c - w, c + w, dist);
    v = (1.0 - uFill * (1.0 - t)) * (1.0 - m);
    if (uHatch > 0.0) {
      // second family across the first, only where the tone is dark (cross-hatched shadows)
      float a2 = ang + 1.2;
      float u2 = dot(q, vec2(-sin(a2), cos(a2))) / (P * 1.15) + wob * 0.7;
      float dist2 = 1.0 - abs(fract(u2) - 0.5) * 2.0;
      float c2 = clamp(uDmax * pow(clamp((uHatchT - t) / uHatchT, 0.0, 1.0), 1.2), 0.0, 1.0);
      float m2 = 1.0 - smoothstep(c2 - w, c2 + w, dist2);
      v *= 1.0 - uHatch * m2;
    }
    if (uStipple > 0.0) {
      // stipple in the lights: dots on a jittered grid whose size follows the tone (banknote stipple)
      float cs = P * 0.85;
      vec2 cell = floor(q / cs);
      vec2 jitv = vec2(hash(cell, uSeed + 5.0), hash(cell, uSeed + 6.0)) - 0.5;
      vec2 cc = (cell + 0.5 + jitv * 0.6) * cs;
      float dd = length(q - cc) / cs;
      float lightT = smoothstep(0.42, 0.62, t) * (1.0 - smoothstep(0.9, 0.99, t));
      float rad = (1.0 - t) * 0.55 * uStipple * lightT;
      float dot = 1.0 - smoothstep(rad - 0.08, rad + 0.08, dd);
      v *= 1.0 - 0.85 * dot;
    }
    // watercolour wash: the smooth tone shows through under the lines (the lines become the drawing over a tint)
    if (uWash > 0.0) v = mix(v, mix(t, 1.0, 0.25), uWash);
  }
  v = mix(v, 0.0, uInk * inkLine);
  v = mix(v, 1.0, uAtmos * 0.55);
  vec3 col = gradientMap(clamp(v, 0.0, 1.0));
  if (uAtmos > 0.0) col = mix(col, uAtmosColor, uAtmos * 0.35);
  if (uFoil > 0.0) {
    // thin-film hue attached to the surface; phase only moves with the object / camera (uFoilPhase)
    float h = fract(0.58 + 0.35 * dot(N, vec3(0.7, 0.5, 0.2)) + 0.45 * fbm(vPosO.xy * 2.6 + vPosO.z * 1.9, 2, uSeed + 9.0) + 0.12 * (frag.x - frag.y) / H + uFoilPhase);
    vec3 film = hsv2rgb(vec3(h, 0.5, 0.95));
    float mask = smoothstep(0.12, 0.45, v) * (1.0 - smoothstep(0.92, 1.0, v));
    col = mix(col, overlay(col, film), uFoil * mask);
  }
  // paper grain/mottle come from the static DOM paper layer (cheaper than per-fragment noise under SwiftShader)
  gl_FragColor = vec4(clamp(col * (1.0 - uDim), 0.0, 1.0), uOpacity);
}`;

export type EOpts = {
  palette: Pal;
  key?: [number, number, number];
  keyAmt?: number;
  wrap?: number;
  ambient?: number;
  rim?: number;
  spec?: number;
  shininess?: number;
  albedo?: number;
  albedoNoise?: number;
  noiseScale?: number;
  map?: THREE.Texture | null;
  mapAmt?: number;
  mapGamma?: number;
  periodFrac?: number;
  angleDeg?: number;
  toneGamma?: number;
  fill?: number;
  wobble?: number;
  detail?: number;
  space?: 0 | 1;
  refDepth?: number;
  poster?: boolean;
  foil?: number;
  atmos?: number;
  atmosColor?: string;
  lift?: number;
  edge?: number;
  ink?: number; // crisp dark outline at the silhouette (engraver's contour), 0..1
  seed?: number;
  opacity?: number;
  res?: [number, number];
  hatch?: number; // cross-hatch amount in the shadows (0..1)
  hatchT?: number; // tone below which the second family appears
  stipple?: number; // stipple amount in the lights (0..1)
  follow?: number; // how far the lines turn to follow the form (0..1)
  wash?: number; // tonal underlay amount (0..1)
};

export const hexToVec3 = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
};

const stopsU = (pal: Pal) => {
  const stops: THREE.Vector3[] = [];
  const pos = [0, 1, 1, 1];
  pal.forEach(([hex, p], i) => {
    stops.push(hexToVec3(hex));
    pos[i] = p;
  });
  while (stops.length < 4) stops.push(stops[stops.length - 1].clone());
  return { uStops: { value: stops }, uStopPos: { value: new THREE.Vector4(...pos) }, uStopCount: { value: pal.length } };
};

export const engrave = (o: EOpts) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: (o.opacity ?? 1) < 1,
    uniforms: {
      uResolution: { value: new THREE.Vector2(...(o.res ?? [1920, 1080])) },
      uKeyWorld: { value: new THREE.Vector3(...(o.key ?? [-0.55, 0.65, 0.5])).normalize() },
      uKey: { value: o.keyAmt ?? 0.95 },
      uWrap: { value: o.wrap ?? 0.15 },
      uAmbient: { value: o.ambient ?? 0.04 },
      uRim: { value: o.rim ?? 0.12 },
      uRimPow: { value: 3.0 },
      uSpec: { value: o.spec ?? 0.15 },
      uShininess: { value: o.shininess ?? 24 },
      uAlbedo: { value: o.albedo ?? 1.0 },
      tAlbedo: { value: o.map ?? null },
      uUseAlbedoMap: { value: o.map ? 1 : 0 },
      uMapAmt: { value: o.mapAmt ?? 1 },
      uMapGamma: { value: o.mapGamma ?? 1 },
      uAlbedoNoise: { value: o.albedoNoise ?? 0.25 },
      uNoiseScale: { value: o.noiseScale ?? 3.0 },
      uPeriodFrac: { value: o.periodFrac ?? 0.0068 },
      uAngle: { value: THREE.MathUtils.degToRad(o.angleDeg ?? 45) }, // 45 = "/" rising to the right (FFT-checked)
      uToneGamma: { value: o.toneGamma ?? 1.3 },
      uDmax: { value: 0.8 },
      uTHi: { value: 0.75 },
      uCovGamma: { value: 1.6 },
      uFill: { value: o.fill ?? 0.4 },
      uWobble: { value: o.wobble ?? 0.32 },
      uWobbleScale: { value: 2.77 },
      uWidthJitter: { value: 0.1 },
      uDetail: { value: o.detail ?? 0.16 },
      uAA: { value: 1.0 },
      uGrain: { value: 0.015 },
      uMottle: { value: 0.04 },
      uMottleScale: { value: 0.012 },
      uSeed: { value: o.seed ?? 3 },
      uEdge: { value: o.edge ?? 0.85 },
      uInk: { value: o.ink ?? 0 },
      uSpace: { value: o.space ?? 1 },
      uRefDepth: { value: o.refDepth ?? 15 },
      uPoster: { value: o.poster ? 1 : 0 },
      uFoil: { value: o.foil ?? 0 },
      uFoilPhase: { value: 0 },
      uAtmos: { value: o.atmos ?? 0 },
      uAtmosColor: { value: hexToVec3(o.atmosColor ?? o.palette[o.palette.length - 1][0]) },
      uLift: { value: o.lift ?? 0 },
      uHatch: { value: o.hatch ?? 0 },
      uHatchT: { value: o.hatchT ?? 0.42 },
      uStipple: { value: o.stipple ?? 0 },
      uFollow: { value: o.follow ?? 0 },
      uWash: { value: o.wash ?? 0 },
      uDim: { value: 0 },
      uOpacity: { value: o.opacity ?? 1 },
      ...stopsU(o.palette),
    },
  });
  return m;
};

/** Live-update per-frame uniforms (deterministic: values come from the Remotion frame). */
export const setU = (m: THREE.Material, u: Record<string, number>) => {
  const sm = m as THREE.ShaderMaterial;
  for (const [k, v] of Object.entries(u)) if (sm.uniforms?.[k]) sm.uniforms[k].value = v;
};
