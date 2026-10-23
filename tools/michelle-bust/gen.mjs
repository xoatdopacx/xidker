// Michelle bust generator: MakeHuman hm08 (CC0) + CC0 targets -> stylised low-poly bust parts.
import fs from "node:fs";
import { sculpted } from "./face.mjs";
import { buildClothes } from "./clothes.mjs";
import { symDecimate, decimate } from "./decim.mjs";
import { add, sub, mul, dot, cross, len, norm, lerp, lerp3, clamp, smooth, rng, rotAxis, mix, shade, Mesh, makeCaster, vertexNormals, taubin, borderEdges, neighbours } from "./lib3.mjs";

const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const O = [0, 6.71, 0.4];
const M = sculpted();
const V = M.V.map((p) => sub(p, O));
const G = M.groups;
const gverts = (g) => [...new Set((G[g] || []).flat())];
const centre = (g) => { const ids = gverts(g); return mul(ids.reduce((s, i) => add(s, V[i]), [0, 0, 0]), 1 / ids.length); };

export const COL = { SKIN: 0xe8b48e, LIP: 0xc27667, LIP2: 0xcf8676, BLUSH: 0xe39684, LINER: +(ARGS.liner || 0x3a241c), HAIR: 0x3a2418, BROW: 0x2b1b13, TEE: 0x9a9ba0, SHIRT: 0x33415c, POCKET: 0x2b3750, SCLERA: 0xf6f1ea, IRIS: 0x5b3a24 };
const R = rng(20261023);
const vary = (h, k) => shade(h, 1 + (R() * 2 - 1) * k);

// ---------- Eyes ----------
const eyes = ["helper-l-eye", "helper-r-eye"].map((g) => {
  const c = centre(g), ids = gverts(g);
  const r = ids.reduce((s, i) => s + len(sub(V[i], c)), 0) / ids.length;
  return { c, r };
});

// ---------- Neckline (crew neck of the tee) ----------
const NECK_P = [0, -1.75, 0.22], NECK_N = norm([0, 0.84, 0.4]);
const neckF = (p) => dot(sub(p, NECK_P), NECK_N); // > 0 above the tee neckline

// ---------- Pose: arms down, slimmer shoulders (applied to every body vertex) ----------
const SHL = centre("joint-l-shoulder"), ELB = centre("joint-l-elbow");
const ARM_DIR = norm(sub(ELB, SHL));
const ARM = +(ARGS.arm || 0.55);
function poseArms(p) {
  const s = p[0] >= 0 ? 1 : -1;
  const S = [SHL[0] * s, SHL[1], SHL[2]], ad = [ARM_DIR[0] * s, ARM_DIR[1], ARM_DIR[2]];
  const rel = sub(p, S), t = dot(rel, ad), dist = len(sub(rel, mul(ad, t)));
  // Arm vertices sit within the arm radius of the shoulder->elbow axis; the torso is farther away.
  const w = smooth(-0.15, 0.45, t) * (1 - smooth(+(ARGS.armR || 0.5), +(ARGS.armR || 0.5) + 0.25, dist));
  return w > 0 ? rotAxis(p, S, [0, 0, 1], -s * ARM * w) : p;
}
// Narrower shoulders than the realistic base body, fading in below the neck.
const SLIM = +(ARGS.slim || 0.2);
// A slightly smaller torso than the realistic base body (stylised head-to-body ratio).
const BODY_K = +(ARGS.bodyK || 0.88), PIV = [0, -1.45, -0.2];
const Vp = V.map((p) => {
  const q = poseArms(p); const k = 1 - SLIM * smooth(-1.5, -2.3, q[1]);
  const r = [q[0] * k, q[1], q[2]];
  const u = 1 - (1 - BODY_K) * smooth(-1.25, -2.0, r[1]);
  return add(PIV, mul(sub(r, PIV), u));
});
Vp.forEach((p, i) => { V[i] = p; });
// ---------- Skin: head + neck, eye pockets removed ----------
const bodyTris = [];
for (const f of G.body) for (let k = 1; k + 1 < f.length; k++) bodyTris.push([f[0], f[k], f[k + 1]]);
const triCentroid = (t) => mul(add(add(V[t[0]], V[t[1]]), V[t[2]]), 1 / 3);
const triNormal = (t) => norm(cross(sub(V[t[1]], V[t[0]]), sub(V[t[2]], V[t[0]])));
function inEyePocket(t) {
  const cen = triCentroid(t), n = triNormal(t);
  for (const { c, r } of eyes) {
    const d = sub(cen, c), dl = len(d);
    if (dl > 1.25 * r) continue;
    if (dot(n, d) / dl < 0 || t.every((i) => len(sub(V[i], c)) < r)) return true;
  }
  return false;
}
const pocket = new Set(bodyTris.filter(inEyePocket).map((t) => t.join()));
const headTris = bodyTris.filter((t) => !pocket.has(t.join()) && t.every((i) => V[i][1] > -1.0));
const skinTris = bodyTris.filter((t) => !pocket.has(t.join()) && t.every((i) => neckF(V[i]) > -0.14 && V[i][1] > -2.4));
const skinBorder = new Set(borderEdges(skinTris).flat());
const eyeBorder = new Set([...skinBorder].filter((i) => eyes.some(({ c, r }) => len(sub(V[i], c)) < 1.6 * r)));
const caster = makeCaster(headTris.map((t) => t.map((i) => V[i])));

// Lip regions (1 upper, 2 lower) on the full-resolution mesh; their outlines are locked during decimation.
const LIPS = { ys: -0.645, hw: 0.21, hu: 0.11, hl: 0.125, lift: 0.02 };
function lipRegion(p) {
  if (p[2] < 0.72 || Math.abs(p[0]) > LIPS.hw) return 0;
  const u = Math.abs(p[0]) / LIPS.hw, ys = LIPS.ys + LIPS.lift * u * u;
  const hu = LIPS.hu * Math.pow(1 - u * u, 0.8) * (1 - 0.12 * Math.exp(-((p[0] / 0.03) ** 2)));
  const hl = LIPS.hl * Math.pow(1 - u * u, 0.65);
  if (p[1] >= ys && p[1] < ys + hu) return 1;
  if (p[1] < ys && p[1] > ys - hl) return 2;
  return 0;
}
const vRegion = new Map(), vSets = new Map();
for (const t of skinTris) { const r = lipRegion(triCentroid(t)); for (const i of t) { const o = vRegion.get(i); vRegion.set(i, o === undefined || o === r ? r : -1); if (!vSets.has(i)) vSets.set(i, new Set()); vSets.get(i).add(r); } }
for (const [i, set] of vSets) {
  if (vRegion.get(i) !== -1) continue;
  const p = V[i], u = Math.min(1, Math.abs(p[0]) / LIPS.hw), ys = LIPS.ys + LIPS.lift * u * u;
  const hu = LIPS.hu * Math.pow(1 - u * u, 0.8) * (1 - 0.12 * Math.exp(-((p[0] / 0.03) ** 2)));
  const hl = LIPS.hl * Math.pow(1 - u * u, 0.65);
  let y = null;
  if (set.has(1) && set.has(2)) y = ys; else if (set.has(1)) y = ys + hu; else if (set.has(2)) y = ys - hl;
  if (y !== null && Math.abs(y - p[1]) < 0.02) p[1] = y;
}
const SKIN_TARGET = +(ARGS.skin || 2000);
const sk = symDecimate(V, skinTris, SKIN_TARGET, { lock: (p, i) => eyeBorder.has(i) || vRegion.get(i) === -1, error: 0.08 });
const decLabel = sk.orig.map((i) => vRegion.get(i) ?? 0);
const skin = new Mesh("skin", "skin", "skin");
skin.P = sk.P; skin.T = sk.T;
// Split each eye-hole border into simple cycles; keep the longest as the rim and fill the small pinched-off ones.
function cyclesNear(eye) {
  const edges = borderEdges(skin.T).filter(([a, b]) => len(sub(skin.P[a], eye.c)) < 1.6 * eye.r && len(sub(skin.P[b], eye.c)) < 1.6 * eye.r);
  const out = new Map();
  for (const [a, b] of edges) { if (!out.has(a)) out.set(a, []); out.get(a).push(b); }
  const used = new Set(), cycles = [];
  for (const [a0, b0] of edges) {
    if (used.has(a0 + "_" + b0)) continue;
    const cyc = [a0]; let a = a0, b = b0; used.add(a + "_" + b);
    while (b !== a0) {
      cyc.push(b);
      const nx = (out.get(b) || []).find((c) => !used.has(b + "_" + c));
      if (nx === undefined) break;
      used.add(b + "_" + nx); a = b; b = nx;
      // Close a sub-cycle as soon as a vertex repeats.
      const k = cyc.indexOf(b);
      if (k >= 0 && b !== a0) { cycles.push(cyc.splice(k)); }
    }
    cycles.push(cyc);
  }
  return cycles.sort((x, y) => y.length - x.length);
}
for (const eye of eyes) {
  const cyc = cyclesNear(eye);
  for (const small of cyc.slice(1)) {
    if (small.length < 3) continue;
    const cc = skin.P.length; skin.P.push(mul(small.reduce((s, i) => add(s, skin.P[i]), [0, 0, 0]), 1 / small.length));
    for (let k = 0; k < small.length; k++) skin.T.push([small[(k + 1) % small.length], small[k], cc]);
  }
  eye.rimLoopIds = cyc[0];
  if (ARGS.dbg) console.log("cycles", cyc.map((c) => c.length).join(","));
}

// Landmarks for colouring.
const skinBorderDec = borderEdges(skin.T);
const eyeRim = new Set(skinBorderDec.flat().filter((i) => eyes.some(({ c, r }) => len(sub(skin.P[i], c)) < 1.6 * r)));
skin.C = skin.T.map((t, i) => {
  const p = skin.centroid(i);
  const labels = t.map((v) => decLabel[v]);
  const inner = labels.find((l) => l > 0);
  const lm = inner ?? (labels.every((l) => l === -1) ? lipRegion(p) : 0);
  if (lm) return vary(lm === 1 ? COL.LIP : COL.LIP2, 0.025);
  let col = COL.SKIN;
  // Blush on the cheeks.
  const ch = Math.min(...[-1, 1].map((s) => len(sub(p, [0.43 * s, -0.36, 0.78]))));
  col = mix(col, COL.BLUSH, 0.32 * Math.exp(-(ch * ch) / 0.025));
  // Slightly warmer, darker skin toward the neck.
  col = shade(col, 1 - 0.06 * smooth(-0.9, -1.4, p[1]));
  return vary(col, 0.035);
});

// ---------- Eye rims: lash line on the upper lid, and the blink morph ----------
// Rotation about the x axis keeps asin(dx/|d|), so the rim tables are keyed by it.
const elev = (d) => Math.atan2(d[1], d[2]), azim = (d) => Math.asin(clamp(d[0] / len(d), -1, 1));
// Rim envelopes per eye: highest (upper rim) and lowest (lower rim) elevation per azimuth bin.
const interp = (tab, a) => { if (a <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (a <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (a - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0])); return tab[tab.length - 1][1]; };
const sph = (eye, a, e, rho) => add(eye.c, [rho * Math.sin(a), rho * Math.cos(a) * Math.sin(e), rho * Math.cos(a) * Math.cos(e)]);
for (const eye of eyes) {
  const pts = eye.rimLoopIds.map((i) => { const d = sub(skin.P[i], eye.c); return [azim(d), elev(d), len(d)]; });
  let pMin = pts[0], pMax = pts[0];
  for (const p of pts) { if (p[0] < pMin[0]) pMin = p; if (p[0] > pMax[0]) pMax = p; }
  const aMin = pMin[0], aMax = pMax[0];
  const eLine = (a) => lerp(pMin[1], pMax[1], (a - aMin) / (aMax - aMin));
  const table = (sel, pick) => {
    const t = [pMin, ...pts.filter(sel), pMax].sort((x, y) => x[0] - y[0]);
    const out = [];
    for (const p of t) { const last = out[out.length - 1]; if (last && p[0] - last[0] < 0.01) { if (pick(p[1], last[1])) out[out.length - 1] = p; } else out.push(p); }
    return out;
  };
  const up = table((p) => p !== pMin && p !== pMax && p[1] > eLine(p[0]), (a, b) => a > b);
  const lo = table((p) => p !== pMin && p !== pMax && p[1] <= eLine(p[0]), (a, b) => a < b);
  const U = up.map((p) => [p[0], p[1]]), L = lo.map((p) => [p[0], p[1]]);
  const Rr = [...up, ...lo].sort((x, y) => x[0] - y[0]).map((p) => [p[0], p[2]]);
  Object.assign(eye, { aMin, aMax, elU: U, elL: L, rho: Rr });
}
// Lash line: a thin dark band just above the upper rim, thicker toward the outer corner, with a small wing.
const skinCaster = makeCaster(skin.T.map((t) => t.map((i) => skin.P[i])));
const onLid = (eye, a, e, off) => { const d = norm(sub(sph(eye, a, e, 1), eye.c)); const t = skinCaster.near(eye.c, d); return add(eye.c, mul(d, (t ?? interp(eye.rho, a)) + off)); };
for (const eye of eyes) {
  const outerHigh = eye.c[0] > 0; // the outer corner is at larger x
  const aIn = outerHigh ? eye.aMin : eye.aMax, aOut = outerHigh ? eye.aMax : eye.aMin;
  const M = 14, base = [], top = [];
  for (let k = 0; k <= M; k++) {
    const f = k / M, a = lerp(aIn, aOut, lerp(0.04, 1, f));
    const e = interp(eye.elU, a), rho = interp(eye.rho, a);
    const th = (0.05 + 0.16 * f * f) * Math.min(1, f * 5 + 0.2);
    base.push(skin.v(onLid(eye, a, e + 0.015, 0.005)));
    top.push(skin.v(onLid(eye, a, e + 0.015 + th, 0.006)));
  }
  const eEnd = interp(eye.elU, aOut);
  const wing = skin.v(onLid(eye, aOut + (outerHigh ? 0.2 : -0.2), eEnd + 0.17, 0.006));
  for (let k = 0; k < M; k++) {
    const a = base[k], b = base[k + 1], c = top[k + 1], d = top[k];
    if (outerHigh) skin.quad(a, b, c, d, COL.LINER); else skin.quad(a, d, c, b, COL.LINER);
  }
  if (outerHigh) skin.tri(base[M], wing, top[M], COL.LINER); else skin.tri(base[M], top[M], wing, COL.LINER);
}
// Blink morph: upper-lid vertices rotate down around the eye centre until the rims meet.
const blink = skin.P.map(() => null);
skin.P.forEach((p, i) => {
  for (const eye of eyes) {
    const d = sub(p, eye.c);
    if (len(d) > 2.3 * eye.r || d[2] < 0) continue;
    const a = azim(d), e = elev(d);
    const eu = interp(eye.elU, a), el = interp(eye.elL, a);
    if (e < eu - 0.02) continue;
    const w = 1 - smooth(0.03, +(ARGS.lidSpan || 0.34), e - eu);
    if (w <= 0) continue;
    const beta = (eu - el) * 1.02 * w;
    const q = rotAxis(p, eye.c, [1, 0, 0], beta);
    blink[i] = sub(q, p);
  }
});
const blinkCount = blink.filter(Boolean).length;
if (ARGS.blink) skin.P = skin.P.map((p, i) => (blink[i] ? add(p, mul(blink[i], +ARGS.blink)) : p));

// ---------- Hair ----------
const C0 = [0, 0.05, -0.05];
const BUN_DIR = norm([0, 0.92, -0.42]);
const ref = norm(cross(cross(BUN_DIR, [0, 0, 1]), BUN_DIR)); // front direction projected
const ref2 = cross(BUN_DIR, ref); // +x side when looking from the front (sign checked below)
const dirOf = (th, ph) => norm(add(mul(BUN_DIR, Math.cos(th)), mul(add(mul(ref, Math.cos(ph)), mul(ref2, Math.sin(ph))), Math.sin(th))));
const angOf = (p) => { const d = norm(sub(p, C0)); const th = Math.acos(clamp(dot(d, BUN_DIR), -1, 1)); const t = sub(d, mul(BUN_DIR, dot(d, BUN_DIR))); return [th, Math.atan2(dot(t, ref2), dot(t, ref))]; };
const skinR = (d) => caster.far(C0, d) ?? 0.9;
// Hairline control points (left side, x > 0), mirrored.
const HL = [[0, 0.7, 0.95], [0.26, 0.66, 0.9], [0.47, 0.5, 0.68], [0.6, 0.27, 0.42], [0.66, 0.02, 0.24], [0.69, -0.2, 0.17], [0.72, 0.06, 0.02], [0.72, 0.1, -0.2], [0.64, -0.28, -0.42], [0.4, -0.55, -0.56], [0, -0.62, -0.58]];
const hlPts = [...HL, ...HL.slice(1, -1).reverse().map(([x, y, z]) => [-x, y, z])].map((p) => angOf(p));
hlPts.sort((a, b) => a[1] - b[1]);
function hairline(ph) {
  // Periodic linear interpolation of theta over phi, then smoothed by sampling neighbours.
  const n = hlPts.length;
  const at = (q) => {
    q = ((q + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    for (let i = 0; i < n; i++) {
      const a = hlPts[i], b = hlPts[(i + 1) % n];
      let pa = a[1], pb = b[1]; if (pb < pa) pb += 2 * Math.PI;
      let qq = q; if (qq < pa) qq += 2 * Math.PI;
      if (qq >= pa && qq <= pb) return lerp(a[0], b[0], (qq - pa) / (pb - pa));
    }
    return hlPts[0][0];
  };
  let s = 0, w = 0;
  for (let k = -3; k <= 3; k++) { const ww = 1 - Math.abs(k) / 4; s += at(ph + k * 0.06) * ww; w += ww; }
  return s / w;
}
const hair = new Mesh("hair", "hair", "head");
{
  const NS = +(ARGS.stripes || 26), COLS = NS * 2, ROWS = 8, TH0 = 0.3;
  const T0 = +(ARGS.hairT || 0.13), RIDGE = 0.028;
  const jitter = Array.from({ length: NS }, () => 1 + (R() * 2 - 1) * 0.18);
  const grid = [];
  for (let r = 0; r <= ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const ph = -Math.PI + (c / COLS) * 2 * Math.PI;
      const thH = hairline(ph);
      const u = r / ROWS, th = lerp(TH0, thH, u);
      const d = dirOf(th, ph);
      const stripe = Math.floor(c / 2), centre = c % 2 === 1;
      let t = T0 * Math.pow(1 - Math.pow(u, 2.2), 0.65) * (centre ? jitter[stripe] : 1);
      t += (centre ? RIDGE : -RIDGE * 0.6) * (1 - u * 0.75) * smooth(0, 0.25, u + 0.12);
      t = Math.max(t, 0.012);
      row.push(add(C0, mul(d, skinR(d) + t)));
    }
    grid.push(row);
  }
  const id = grid.map((row) => row.map((p) => hair.v(p)));
  // Skirt below the hairline tucks into the scalp.
  const skirt = grid[ROWS].map((p, c) => { const ph = -Math.PI + (c / COLS) * 2 * Math.PI; const d = dirOf(lerp(TH0, hairline(ph), 1.02), ph); return hair.v(add(C0, mul(d, skinR(d) - 0.03))); });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const c2 = (c + 1) % COLS, stripe = Math.floor(c / 2);
    const col = vary(COL.HAIR, 0.09);
    hair.quad(id[r][c], id[r + 1][c], id[r + 1][c2], id[r][c2], col, vary(COL.HAIR, 0.06));
  }
  for (let c = 0; c < COLS; c++) { const c2 = (c + 1) % COLS; hair.quad(id[ROWS][c], skirt[c], skirt[c2], id[ROWS][c2], shade(COL.HAIR, 0.8)); }
  // Cap over the crown hole (under the bun).
  const top = hair.v(add(C0, mul(BUN_DIR, skinR(BUN_DIR) + T0 * 0.9)));
  for (let c = 0; c < COLS; c++) hair.tri(top, id[0][c], id[0][(c + 1) % COLS], vary(COL.HAIR, 0.06));

  // Bun: a coiled tube.
  const base = add(C0, mul(BUN_DIR, skinR(BUN_DIR) + T0 * 0.75));
  const e1 = ref, e2 = ref2;
  const TURNS = 1.6, SEG = 34, SIDES = 6, AMAX = TURNS * 2 * Math.PI;
  const ringIds = [];
  for (let s = 0; s <= SEG; s++) {
    const f = s / SEG, a = f * AMAX;
    const rho = +(ARGS.bunR || 0.25) * (1 - 0.6 * f), h = 0.04 + 0.3 * f, tr = +(ARGS.bunT || 0.15) * (1 - 0.4 * f);
    const ctr = add(base, add(mul(BUN_DIR, h), add(mul(e1, rho * Math.cos(a)), mul(e2, rho * Math.sin(a)))));
    const rad = norm(add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a))));
    const ring = [];
    for (let k = 0; k < SIDES; k++) {
      const b = (k / SIDES) * 2 * Math.PI + 0.3;
      ring.push(hair.v(add(ctr, add(mul(rad, tr * Math.cos(b)), mul(BUN_DIR, tr * 0.8 * Math.sin(b))))));
    }
    ringIds.push(ring);
  }
  for (let s = 0; s < SEG; s++) for (let k = 0; k < SIDES; k++) {
    const k2 = (k + 1) % SIDES;
    hair.quad(ringIds[s][k], ringIds[s][k2], ringIds[s + 1][k2], ringIds[s + 1][k], vary(COL.HAIR, 0.1), vary(COL.HAIR, 0.07));
  }
  // End caps.
  for (const [ring, flip] of [[ringIds[0], true], [ringIds[SEG], false]]) {
    const cc = hair.v(mul(ring.reduce((s, i) => add(s, hair.P[i]), [0, 0, 0]), 1 / SIDES));
    for (let k = 0; k < SIDES; k++) { const a = ring[k], b = ring[(k + 1) % SIDES]; flip ? hair.tri(cc, b, a, vary(COL.HAIR, 0.06)) : hair.tri(cc, a, b, vary(COL.HAIR, 0.06)); }
  }
  // Face-framing strands: two locks from the front hairline over the temples to the jaw.
  const catmull = (P, n) => { const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } out.push(P[P.length - 1]); return out; };
  const SW = +(ARGS.strandW || 0.1);
  for (const s of [1, -1]) {
    const ctrl = [[0.16, 0.7, 0.86], [0.4, 0.58, 0.8], [0.58, 0.3, 0.66], [0.66, 0.0, 0.56], [0.67, -0.32, 0.5], [0.62, -0.62, 0.44], [0.54, -0.86, 0.42]];
    const lift = [0.02, 0.06, 0.07, 0.075, 0.08, 0.085, 0.09];
    const base = ctrl.map(([x, y, z], i) => { const q = [x * s, y, z]; const d = norm(sub(q, C0)); return add(C0, mul(d, skinR(d) + lift[i])); });
    const pts = catmull(base, 3), N = pts.length, rings = [];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1), p = pts[i];
      const tan = norm(sub(pts[Math.min(N - 1, i + 1)], pts[Math.max(0, i - 1)]));
      const out = norm(sub(p, C0));
      const sideSurf = norm(cross(tan, out)), sideFront = norm(cross(tan, [0, 0, 1]));
      const side = norm(add(mul(sideSurf, 0.45), mul(dot(sideFront, sideSurf) < 0 ? mul(sideFront, -1) : sideFront, 0.55)));
      const nrm = norm(cross(side, tan));
      const w = SW * (1 - 0.82 * Math.pow(f, 1.4)) * (0.75 + 0.25 * Math.min(1, f * 4)), th = lerp(0.045, 0.012, f);
      const twist = 0.02 * Math.sin(f * Math.PI * 2);
      rings.push([add(p, mul(side, w)), add(p, add(mul(nrm, th), mul(side, twist))), add(p, mul(side, -w)), add(p, mul(nrm, -th))].map((q) => hair.v(q)));
    }
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; const a = rings[i][k], b = rings[i][k2], c = rings[i + 1][k2], d = rings[i + 1][k]; hair.quad(a, b, c, d, vary(COL.HAIR, 0.09)); }
    const tip = hair.v(add(pts[N - 1], mul(norm(sub(pts[N - 1], pts[N - 2])), 0.07)));
    for (let k = 0; k < 4; k++) { const a = rings[N - 1][k], b = rings[N - 1][(k + 1) % 4]; hair.tri(a, b, tip, vary(COL.HAIR, 0.08)); }
  }
}

// ---------- Brows ----------
const brows = new Mesh("brows", "matte", "head");
for (const s of [1, -1]) {
  const ctrl = [[0.1, 0.105], [0.19, 0.155], [0.3, 0.175], [0.4, 0.15], [0.47, 0.1]];
  const wid = [0.05, 0.048, 0.04, 0.03, 0.016];
  const top = [], bot = [], topIn = [], botIn = [];
  ctrl.forEach(([x, y], i) => {
    const hit = (yy) => { const o = [x * s, yy, 3], t = caster.near(o, [0, 0, -1]); return t == null ? [x * s, yy, 0.8] : [x * s, yy, 3 - t]; };
    const a = hit(y + wid[i] * 0.5), b = hit(y - wid[i] * 0.5);
    const n = norm(sub(add(a, b), mul(C0, 2)));
    top.push(add(a, mul(n, 0.014))); bot.push(add(b, mul(n, 0.014)));
    topIn.push(add(a, mul(n, -0.01))); botIn.push(add(b, mul(n, -0.01)));
  });
  const T = top.map((p) => brows.v(p)), B = bot.map((p) => brows.v(p)), TI = topIn.map((p) => brows.v(p)), BI = botIn.map((p) => brows.v(p));
  for (let i = 0; i < ctrl.length - 1; i++) {
    const col = vary(COL.BROW, 0.06);
    if (s > 0) { brows.quad(B[i], B[i + 1], T[i + 1], T[i], col); brows.quad(T[i], T[i + 1], TI[i + 1], TI[i], col); brows.quad(BI[i], BI[i + 1], B[i + 1], B[i], col); }
    else { brows.quad(B[i], T[i], T[i + 1], B[i + 1], col); brows.quad(T[i], TI[i], TI[i + 1], T[i + 1], col); brows.quad(BI[i], B[i], B[i + 1], BI[i + 1], col); }
  }
}

const { tee, rib, shirt, collar, pockets } = buildClothes({ Vp, bodyTris, neckF, NECK_N, COL, vary, R, ARGS });

// ---------- Output ----------
const parts = [skin, hair, brows, tee, rib, shirt, collar, pockets];
const eyeParts = [];
{
  // Preview-only eyeballs.
  const eb = new Mesh("eyes", "satin", "head");
  for (const { c, r } of eyes) {
    const n1 = 18, n2 = 14, ids = [];
    for (let i = 0; i <= n2; i++) { const row = []; for (let j = 0; j < n1; j++) { const a = (i / n2) * Math.PI, b = (j / n1) * 2 * Math.PI; row.push(eb.v(add(c, mul([Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)], r * 0.97)))); } ids.push(row); }
    for (let i = 0; i < n2; i++) for (let j = 0; j < n1; j++) {
      const a = ids[i][j], b = ids[i + 1][j], cc = ids[i + 1][(j + 1) % n1], d = ids[i][(j + 1) % n1];
      const ang = ((i + 0.5) / n2) * 180;
      const col = ang < 11 ? 0x0b0807 : ang < 27 ? COL.IRIS : COL.SCLERA;
      eb.quad(a, b, cc, d, col);
    }
  }
  eyeParts.push(eb);
  const sock = new Mesh("socket", "skin", "head");
  for (const { c, r } of eyes) {
    const n1 = 10, n2 = 8, ids = [];
    for (let i = 0; i <= n2; i++) { const row = []; for (let j = 0; j < n1; j++) { const a = (i / n2) * Math.PI, b = (j / n1) * 2 * Math.PI; row.push(sock.v(add(c, mul([Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)], r * 1.25)))); } ids.push(row); }
    for (let i = 0; i < n2; i++) for (let j = 0; j < n1; j++) sock.quad(ids[i][j], ids[i][(j + 1) % n1], ids[i + 1][(j + 1) % n1], ids[i + 1][j], 0x4a2a22);
  }
  eyeParts.push(sock);
}
const stats = parts.map((p) => `${p.name}:${p.T.length}`).join(" ");
console.log("tris", stats, "total", parts.reduce((s, p) => s + p.T.length, 0));
const only = ARGS.only ? ARGS.only.split(",") : null;
fs.writeFileSync(ARGS.out || "out/bust.json", JSON.stringify({ parts: [...parts, ...eyeParts].filter((p) => !only || only.includes(p.name)).map((p) => p.toJSON()) }));
export { parts, eyes };
if (ARGS.dbg) for (const e of eyes) console.log("eye", e.c.map((v) => v.toFixed(2)).join(","), "U", e.elU.map(([a, b]) => `${a.toFixed(2)}:${b.toFixed(2)}`).join(" "), "\n   L", e.elL.map(([a, b]) => `${a.toFixed(2)}:${b.toFixed(2)}`).join(" "));
if (ARGS.dbg2) { const e = eyes[0]; console.log("aMin", e.aMin.toFixed(3), "aMax", e.aMax.toFixed(3)); console.log("U", e.elU.map(([a, b]) => b.toFixed(2)).join(" ")); console.log("L", e.elL.map(([a, b]) => b.toFixed(2)).join(" ")); console.log("rho", e.rho.map(([a, b]) => b.toFixed(3)).join(" ")); }

// ---------- Packed output for the template: header JSON + gzip(binary) ----------
if (ARGS.pack) {
  const zlib = await import("node:zlib");
  const Q = 8000;
  const order = [skin, hair, brows, tee, rib, shirt, collar, pockets];
  const boneOf = { skin: 2, head: 1, chest: 0 };
  const head = { q: Q, parts: [], eyes: eyes.map(({ c, r }) => [...c.map((v) => +v.toFixed(4)), +r.toFixed(4)]) };
  const pos = [], idx = [], col = [];
  for (const m of order) {
    head.parts.push([m.name, m.mat, boneOf[m.bone], m.P.length, m.T.length]);
    for (const p of m.P) for (const v of p) { const q = Math.round(v * Q); if (Math.abs(q) > 32767) throw new Error("range " + m.name); pos.push(q); }
    for (const t of m.T) idx.push(...t);
    for (const c of m.C) col.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
  }
  const bl = [];
  blink.forEach((d, i) => { if (d) bl.push([i, d]); });
  head.blink = bl.length;
  const buf = Buffer.alloc(pos.length * 2 + idx.length * 2 + bl.length * 8 + col.length);
  let o = 0;
  // Positions: planar (all x, all y, all z) and delta coded; indices delta coded. Both compress much better.
  for (let k = 0; k < 3; k++) { let prev = 0; for (let i = k; i < pos.length; i += 3) { buf.writeInt16LE(pos[i] - prev, o); prev = pos[i]; o += 2; } }
  { let prev = 0; for (const v of idx) { buf.writeInt16LE(v - prev, o); prev = v; o += 2; } }
  for (const [i] of bl) { buf.writeUInt16LE(i, o); o += 2; }
  for (const [, d] of bl) for (const v of d) { buf.writeInt16LE(Math.round(v * Q), o); o += 2; }
  for (const v of col) { buf.writeUInt8(v, o); o += 1; }
  const gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(ARGS.pack, JSON.stringify({ head, data: gz.toString("base64") }));
  console.log("packed raw", buf.length, "gz", gz.length, "b64", gz.toString("base64").length, "blink verts", bl.length);
}
