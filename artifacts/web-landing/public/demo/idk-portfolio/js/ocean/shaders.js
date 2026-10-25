/**
 * idk portfolio — ocean shaders (GLSL ES 3.00, compiled by three.js ShaderMaterial).
 * Written for this template. Colours arrive in linear space; three.js adds tone mapping
 * and the sRGB conversion through the two #include lines at the end of each visible shader.
 */

/* ---------------------------------------------------------------------------
   Noise: 3D simplex noise (Perlin's simplex lattice) with hashed gradients.
   The integer hash is PCG3D from Jarzynski & Olano, "Hash Functions for GPU
   Rendering" (JCGT 2020).
   --------------------------------------------------------------------------- */
export const NOISE_GLSL = /* glsl */ `
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

vec3 cornerGradient(vec3 cell) {
  uvec3 h = pcg3d(uvec3(ivec3(cell) + 4096));
  vec2 r = vec2(h.xy >> 8u) * (1.0 / 16777216.0);
  float z = r.x * 2.0 - 1.0;
  float a = r.y * 6.2831853;
  float s = sqrt(1.0 - z * z);
  return vec3(s * cos(a), s * sin(a), z);
}

float simplex3(vec3 p) {
  const float SKEW = 1.0 / 3.0;
  const float UNSKEW = 1.0 / 6.0;
  vec3 cell = floor(p + dot(p, vec3(SKEW)));
  vec3 d0 = p - cell + dot(cell, vec3(UNSKEW));
  // Which of the six tetrahedra inside the skewed cube holds the point.
  vec3 rank = step(d0.yzx, d0);
  vec3 o1 = min(rank, 1.0 - rank.zxy);
  vec3 o2 = max(rank, 1.0 - rank.zxy);
  vec3 d1 = d0 - o1 + UNSKEW;
  vec3 d2 = d0 - o2 + 2.0 * UNSKEW;
  vec3 d3 = d0 - 1.0 + 3.0 * UNSKEW;
  vec4 w = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  w *= w;
  w *= w;
  vec4 g = vec4(
    dot(cornerGradient(cell), d0),
    dot(cornerGradient(cell + o1), d1),
    dot(cornerGradient(cell + o2), d2),
    dot(cornerGradient(cell + 1.0), d3)
  );
  return 42.0 * dot(w, g);
}
`;

/* ---------------------------------------------------------------------------
   Dusk sky, shared by the sky dome and by the water's reflections and haze.
   --------------------------------------------------------------------------- */
const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGlow;
uniform vec3 uSkyRim;

vec3 skyColor(vec3 d) {
  float y = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.18, y));
  col = mix(col, uSkyZenith, smoothstep(0.12, 0.7, y));

  // Afterglow: a warm band on the horizon around the sun, a cool rim on the opposite side.
  vec2 dirFlat = d.xz / max(length(d.xz), 1e-4);
  float facing = dot(dirFlat, normalize(uSunDir.xz)) * 0.5 + 0.5;
  float band = exp(-y * 30.0);
  col += uSkyGlow * (pow(facing, 24.0) * 0.9 + pow(facing, 4.0) * 0.05) * band;
  col += uSkyRim * pow(1.0 - facing, 2.0) * exp(-y * 12.0) * 0.5;

  // Halo around the sun.
  float s = max(dot(d, uSunDir), 0.0);
  col += uSkyGlow * (pow(s, 600.0) * 0.6 + pow(s, 60.0) * 0.04);
  col += uSunColor * pow(s, 1500.0);
  return col;
}
`;

export const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAGMENT = /* glsl */ `
${SKY_GLSL}
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyColor(d);
  col += uSunColor * smoothstep(0.99990, 0.99996, dot(d, uSunDir)) * 10.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ---------------------------------------------------------------------------
   Water surface.
   Vertex: 4-octave simplex swell (octaves the grid cannot show fade out with
   distance) plus the height of the wake simulation.
   Fragment: two drifting ripple normal maps, wake slopes and foam, Fresnel
   sky reflection, sun glint with soft-knee compression, the lantern's light
   pool, and haze into the horizon.
   --------------------------------------------------------------------------- */
export const WATER_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uSwellAmp;
uniform float uSwellScale;
uniform float uSwellFlow;
uniform vec2 uWind;
uniform vec3 uFootprint;
uniform sampler2D uWake;
uniform vec4 uWakeRect;
uniform float uWakeLift;

varying vec3 vWorld;
varying vec2 vSlope;
varying float vCrest;
varying vec2 vWakeUv;

${NOISE_GLSL}

float swell(vec2 p, float footprint) {
  vec2 q = vec2(dot(p, uWind), dot(p, vec2(-uWind.y, uWind.x)));
  float t = uTime * uSwellFlow;
  float freq = uSwellScale;
  float amp = 1.0;
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    float keep = 1.0 - smoothstep(0.2, 0.4, footprint * freq);
    float travel = t * 1.58 / sqrt(freq);
    h += amp * keep * simplex3(vec3((q.x - travel) * freq, q.y * freq * 0.45, t * 0.09 + float(i) * 7.13));
    q = mat2(0.82, -0.57, 0.57, 0.82) * q;
    freq *= 2.03;
    amp *= 0.47;
  }
  return h;
}

void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  float dist = length(p.xz - cameraPosition.xz);
  float footprint = max(dist * uFootprint.x, dist * uFootprint.y + uFootprint.z);
  float e = max(footprint, 0.35);
  float h0 = swell(p.xz, footprint);
  float hx = swell(p.xz + vec2(e, 0.0), footprint);
  float hz = swell(p.xz + vec2(0.0, e), footprint);
  vSlope = vec2(hx - h0, hz - h0) * (uSwellAmp / e);
  vCrest = h0;
  p.y += h0 * uSwellAmp;

  vec2 wakeUv = (p.xz - uWakeRect.xy) * uWakeRect.w;
  vWakeUv = wakeUv;
  vec2 edge = min(wakeUv, 1.0 - wakeUv);
  float inside = smoothstep(0.0, 0.07, min(edge.x, edge.y));
  if (inside > 0.0) p.y += textureLod(uWake, wakeUv, 0.0).r * uWakeLift * inside;

  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

export const WATER_FRAGMENT = /* glsl */ `
${SKY_GLSL}
uniform float uTime;
uniform sampler2D uRipples;
uniform float uRippleStrength;
uniform sampler2D uWake;
uniform float uWakeTexel;
uniform float uWakeSlope;
uniform float uWakeCrest;
uniform vec3 uDeepColor;
uniform vec3 uScatterColor;
uniform vec3 uFoamColor;
uniform float uCrestFoam;
uniform vec4 uLantern;
uniform vec3 uLanternColor;
uniform float uFogDensity;
uniform vec2 uGlint;

varying vec3 vWorld;
varying vec2 vSlope;
varying float vCrest;
varying vec2 vWakeUv;

float softKnee(float x, float knee, float compression) {
  float over = max(x - knee, 0.0);
  return min(x, knee) + over / (1.0 + over * compression);
}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  float dist = length(toCamera.xz);
  vec3 V = normalize(toCamera);
  float near = 1.0 - smoothstep(60.0, 700.0, dist);

  // Small waves: one ripple texture read twice at different scales, drifting apart.
  vec4 rippleA = texture2D(uRipples, vWorld.xz * 0.043 + uTime * vec2(0.012, -0.008));
  vec4 rippleB = texture2D(uRipples, vWorld.xz * 0.121 + vec2(0.37, 0.61) - uTime * vec2(0.007, 0.019));
  vec2 ripple = (rippleA.xy * 2.0 - 1.0) * 0.6 + (rippleB.xy * 2.0 - 1.0) * 0.4;
  vec2 slope = vSlope + ripple * uRippleStrength * mix(0.35, 1.0, near);

  // Wake: slopes from the simulated heights, foam from its third channel.
  float foam = 0.0;
  float wakeHeight = 0.0;
  vec2 edge = min(vWakeUv, 1.0 - vWakeUv);
  float inside = smoothstep(0.0, 0.07, min(edge.x, edge.y));
  if (inside > 0.0) {
    vec2 dx = vec2(uWakeTexel, 0.0);
    vec2 dy = vec2(0.0, uWakeTexel);
    float hl = texture2D(uWake, vWakeUv - dx).r;
    float hr = texture2D(uWake, vWakeUv + dx).r;
    float hd = texture2D(uWake, vWakeUv - dy).r;
    float hu = texture2D(uWake, vWakeUv + dy).r;
    slope += vec2(hr - hl, hu - hd) * uWakeSlope * inside;
    vec4 here = texture2D(uWake, vWakeUv);
    wakeHeight = here.r * inside;
    foam = here.b * inside;
  }
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

  float cosV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 reflection = skyColor(R);

  // Water body: dark depths, light scattered through the crests (the wake's included), warmer when backlit.
  float crest = clamp(vCrest * 0.5 + 0.5 + wakeHeight * uWakeCrest, 0.0, 1.0);
  vec2 viewFlat = -V.xz / max(length(V.xz), 1e-4);
  float backlit = pow(max(dot(viewFlat, normalize(uSunDir.xz)), 0.0), 3.0);
  vec3 body = uDeepColor + uScatterColor * (0.3 + 1.6 * crest * crest) + uSkyGlow * 0.05 * backlit * crest * crest;
  vec3 col = mix(body, reflection, fresnel);

  // Sun glint: sharp up close, wider far away where the ripples are too small to see.
  float sunAlign = max(dot(R, uSunDir), 0.0);
  float shininess = mix(1200.0, 90.0, smoothstep(30.0, 1600.0, dist));
  float glint = softKnee(pow(sunAlign, shininess) * shininess * 0.01, uGlint.x, uGlint.y);

  // Lantern: a pool of light on the water and its sparkle on the ripples.
  vec2 fromLantern = vWorld.xz - uLantern.xy;
  float r2 = dot(fromLantern, fromLantern);
  vec3 L = normalize(vec3(uLantern.x, uLantern.w, uLantern.y) - vWorld);
  float sparkle = pow(max(dot(N, normalize(L + V)), 0.0), 140.0) * 2.4 / (1.0 + r2 * 0.015);
  float pool = exp(-r2 * 0.08) * 0.75 + exp(-r2 * 0.01) * 0.14;
  col += uLanternColor * (pool + sparkle) * uLantern.z;

  // Foam: lacy patches whose coverage grows with the amount of foam, plus a little on the highest crests.
  float breakup = texture2D(uRipples, vWorld.xz * 0.12 + vec2(uTime * 0.013, 0.0)).z * 0.6
    + texture2D(uRipples, vWorld.xz * 0.27 - vec2(0.0, uTime * 0.021)).z * 0.4;
  float cover = clamp(foam, 0.0, 1.0);
  float threshold = 0.72 - 0.42 * cover;
  float foamMask = smoothstep(threshold - 0.08, threshold + 0.2, breakup) * smoothstep(0.0, 0.15, cover);
  foamMask = foamMask * 0.75 + cover * 0.25; // a faint sheen joins the patches into one trail
  foamMask += smoothstep(0.78, 0.98, crest) * uCrestFoam * smoothstep(0.55, 0.7, breakup) * near;
  foamMask = clamp(foamMask, 0.0, 1.0);
  vec3 foamLight = uFoamColor * (0.24 + 0.3 * max(dot(N, uSunDir), 0.0)) + uSkyGlow * 0.03 + uLanternColor * pool * 0.9;
  col = mix(col, foamLight * (0.55 + 0.7 * breakup), foamMask * 0.8);

  // Haze: far water fades into the sky colour right above the horizon.
  vec3 hazeDir = normalize(vec3(-V.x, 0.0, -V.z) + vec3(0.0, 1e-4, 0.0));
  float haze = 1.0 - exp(-dist * uFogDensity);
  col = mix(col, skyColor(hazeDir), haze);
  col += uSunColor * glint * (0.25 + fresnel) * (1.0 - haze * 0.55);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ---------------------------------------------------------------------------
   Lantern core: a small additive glow drawn over the water.
   --------------------------------------------------------------------------- */
export const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  float core = exp(-r * r * 28.0) * 2.4 + exp(-r * r * 5.0) * 0.45;
  gl_FragColor = vec4(uColor * core * uStrength * (1.0 - smoothstep(0.8, 1.0, r)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ---------------------------------------------------------------------------
   Full-screen passes: the generated ripple map and the wake simulation.
   --------------------------------------------------------------------------- */
export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Sum of directional waves with whole numbers of cycles per tile, so the map tiles without seams. */
export const RIPPLE_FRAGMENT = /* glsl */ `
uniform vec4 uWaves[WAVE_COUNT];
uniform float uSlopeScale;
uniform float uHeightScale;
varying vec2 vUv;

void main() {
  float h = 0.0;
  vec2 g = vec2(0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 w = uWaves[i];
    float phase = 6.2831853 * dot(w.xy, vUv) + w.w;
    h += w.z * cos(phase);
    g -= w.z * 6.2831853 * w.xy * sin(phase);
  }
  gl_FragColor = vec4(clamp(g * uSlopeScale * 0.5 + 0.5, 0.0, 1.0), clamp(h * uHeightScale * 0.5 + 0.5, 0.0, 1.0), 1.0);
}
`;

/**
 * One step of the wake: a damped wave equation on a height/velocity grid (red/green), with foam in blue.
 * The lantern acts as a moving pressure patch with a raised bow, churning the water along its path.
 */
export const WAKE_FRAGMENT = /* glsl */ `
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uWaveSpeed2;
uniform float uDamping;
uniform float uFoamDecay;
uniform vec4 uHull;
uniform vec2 uHullDir;
uniform vec2 uHullSize;
uniform float uHullPush;
uniform float uHullPulse;
uniform float uHullBob;
uniform float uTurbulence;
uniform float uChurnScale;
uniform float uFoamGain;
uniform float uFoamSteep;
uniform uint uSeed;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec4 c = texture2D(uState, vUv);
  vec4 l = texture2D(uState, vUv - vec2(uTexel.x, 0.0));
  vec4 r = texture2D(uState, vUv + vec2(uTexel.x, 0.0));
  vec4 d = texture2D(uState, vUv - vec2(0.0, uTexel.y));
  vec4 u = texture2D(uState, vUv + vec2(0.0, uTexel.y));
  float corners = texture2D(uState, vUv - uTexel).r + texture2D(uState, vUv + uTexel).r
    + texture2D(uState, vUv + vec2(uTexel.x, -uTexel.y)).r + texture2D(uState, vUv + vec2(-uTexel.x, uTexel.y)).r;
  // Nine-point Laplacian: rounder ripples than the plain four-neighbour version.
  float laplacian = (4.0 * (l.r + r.r + d.r + u.r) + corners - 20.0 * c.r) / 6.0;

  float velocity = c.g + laplacian * uWaveSpeed2;

  // The hull: water rises ahead of it and drops behind it, with a slight beat that leaves a train of
  // crests along the arms of the V.
  vec2 rel = vUv - uHull.zw;
  float along = dot(rel, uHullDir) / uHullSize.x;
  float across = dot(rel, vec2(-uHullDir.y, uHullDir.x)) / uHullSize.y;
  float hull = exp(-(along * along + across * across));
  velocity += uHullPush * hull * (along + 0.45 * uHullPulse);
  velocity += uHullBob * hull;

  // Churned water along the stretch travelled during this step.
  vec2 seg = uHull.zw - uHull.xy;
  float t = clamp(dot(vUv - uHull.xy, seg) / max(dot(seg, seg), 1e-10), 0.0, 1.0);
  vec2 off = vUv - (uHull.xy + seg * t);
  float trail = exp(-dot(off, off) / (uHullSize.y * uHullSize.y * 2.5));
  // Smooth noise (blobs of about one world unit), a new pattern every step.
  float churn = simplex3(vec3(vUv * uChurnScale, float(uSeed & 1023u) * 1.618));
  velocity += churn * uTurbulence * trail;

  velocity *= uDamping;
  float height = (c.r + velocity) * 0.9995;

  // Soak up waves near the borders so nothing bounces back.
  vec2 edge = min(vUv, 1.0 - vUv);
  float soak = mix(0.9, 1.0, smoothstep(0.0, 0.06, min(edge.x, edge.y)));
  height *= soak;
  velocity *= soak;

  // Foam: born in the churned trail and on steep wake crests, spreads a little, then fades.
  float steep = length(vec2(r.r - l.r, u.r - d.r));
  float foam = mix(c.b, (l.b + r.b + d.b + u.b) * 0.25, 0.08) * uFoamDecay;
  foam += (trail + max(steep - uFoamSteep, 0.0) * 3.0) * uFoamGain;

  gl_FragColor = vec4(height, velocity, clamp(foam, 0.0, 1.0), 1.0);
}
`;
