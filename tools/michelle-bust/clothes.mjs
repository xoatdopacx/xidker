// Garments shrink-wrapped over the posed MakeHuman torso: tee, open overshirt with collar and pockets, ribbed tee neckline.
import { add, sub, mul, dot, cross, len, norm, lerp, clamp, smooth, Mesh, makeCaster } from "./lib3.mjs";

export function buildClothes({ Vp, bodyTris, neckF, NECK_N, COL, vary, R, ARGS }) {
  const Y_BOT = +(ARGS.ybot || -3.95), Y_EQ = +(ARGS.yeq || -2.55), ZC = +(ARGS.zc || -0.1);
  const cast = makeCaster(bodyTris.filter((t) => t.every((i) => Vp[i][1] > Y_BOT - 0.5 && Vp[i][1] < -0.85 && !(Vp[i][2] > 0.15 && Vp[i][1] > -1.3))).map((t) => t.map((i) => Vp[i])));
  const C = [0, Y_EQ, ZC];
  const sphDir = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)];
  const hitFrom = (o, d) => { const t = cast.far(o, d); return t == null ? null : add(o, mul(d, t)); };
  // Surface sample for a column angle th and a "row" coordinate v: v >= 0 is the elevation above the equator (sphere),
  // v < 0 is a height below the equator (cylinder).
  const memo = new Map();
  function sample(th, v) {
    const key = th.toFixed(5) + "|" + v.toFixed(5);
    if (memo.has(key)) return memo.get(key);
    let o, d;
    if (v >= 0) { o = C; d = sphDir(th, v); } else { o = [0, Y_EQ + v, ZC]; d = [Math.sin(th), 0, Math.cos(th)]; }
    let p = hitFrom(o, d), miss = false;
    if (!p) { p = add(o, mul(d, 0.6)); miss = true; }
    const r = { p, d, miss };
    memo.set(key, r);
    return r;
  }
  // Elevation where the surface reaches a given neckline level.
  function topElev(th, level) {
    const lv = typeof level === "function" ? level(th) : level;
    const above = (v) => { const r = sample(th, v); return r.miss || neckF(r.p) >= lv; };
    let lo = 0, hi = 1.5;
    for (let v = 0.03; v <= 1.5; v += 0.03) { if (above(v)) { hi = v; break; } lo = v; }
    for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (above(m)) hi = m; else lo = m; }
    return lo;
  }
  const yRows = (n) => Array.from({ length: n }, (_, j) => lerp(-(Y_BOT - Y_EQ) * -1, 0, j / n)).map((v) => v); // unused helper

  // Build a wrapped grid. cols: array of column angles; rowsUp: elevation fractions (0..1 of the top elevation);
  // rowsDown: heights below the equator (negative). offset(p, d, th, v) -> outward offset.
  function wrap(cols, level, nUp, nDown, offset, jitter = 0) {
    const tops = cols.map((th) => topElev(th, level));
    const rows = [];
    for (let j = nDown; j >= 1; j--) rows.push({ kind: "down", f: j / nDown });
    for (let j = 0; j <= nUp; j++) rows.push({ kind: "up", f: j / nUp });
    const P = rows.map((row) => cols.map((th, c) => {
      const v = row.kind === "down" ? (Y_BOT - Y_EQ) * row.f : tops[c] * Math.pow(row.f, 0.85);
      const { p, d } = sample(th, v);
      let q = add(p, mul(d, offset(p, d, th, v)));
      if (jitter) q = add(q, mul(d, (R() * 2 - 1) * jitter));
      return q;
    }));
    return { P, rows, tops };
  }
  // Mirror helper: compute columns for th >= 0 then mirror x; columns span -A..A.
  function symCols(n, a0, a1) { // n columns from a0 to a1 (radians, a1 <= PI)
    return Array.from({ length: n }, (_, i) => lerp(a0, a1, i / (n - 1)));
  }
  function gridMesh(m, P, closedRing, col, flip = false) {
    const ids = P.map((row) => row.map((p) => m.v(p)));
    const R_ = P.length, Cn = P[0].length;
    for (let r = 0; r < R_ - 1; r++) for (let c = 0; c < (closedRing ? Cn : Cn - 1); c++) {
      const c2 = (c + 1) % Cn;
      const a = ids[r][c], b = ids[r][c2], cc = ids[r + 1][c2], d = ids[r + 1][c];
      const k1 = col(r, c), k2 = col(r, c, true);
      if (flip) m.quad(a, d, cc, b, k1, k2); else m.quad(a, b, cc, d, k1, k2);
    }
    return ids;
  }

  // ---- Tee: a front panel under the overshirt opening (the rest is hidden), crew neckline raised at the centre.
  const teeLevel = (th) => +(ARGS.crew || 0.07) * Math.pow(Math.max(0, Math.cos(th)), 3);
  const NT = 16, TEE_SPAN = +(ARGS.teeSpan || 0.85);
  const teeCols = Array.from({ length: NT + 1 }, (_, i) => lerp(-TEE_SPAN, TEE_SPAN, i / NT));
  const teeW = wrap(teeCols, teeLevel, 6, 4, () => 0.035, 0.006);
  for (const row of teeW.P) for (let i = 0; i <= NT / 2; i++) { const a = row[i], b = row[NT - i]; const m = [(a[0] - b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; row[i] = [m[0], m[1], m[2]]; row[NT - i] = [-m[0], m[1], m[2]]; }
  const tee = new Mesh("tee", "cloth", "chest");
  gridMesh(tee, teeW.P, false, () => vary(COL.TEE, 0.035), true);
  if (ARGS.dbgTee) { console.log("tee rows", teeW.P.length); for (const r of [teeW.P.length - 3, teeW.P.length - 2, teeW.P.length - 1]) console.log(r, teeW.P[r].filter((_, i) => i % 2 === 0).map((p) => p.map((v) => v.toFixed(2)).join(",")).join("  ")); console.log("tops", teeW.tops.map((v) => v.toFixed(2)).join(" ")); }
  // Neckline ring all the way round (the back part sits under the collar).
  const RING = 28;
  const ringCols = Array.from({ length: RING }, (_, i) => -Math.PI + (i / RING) * 2 * Math.PI);
  const ringTop = ringCols.map((th) => { const v = topElev(th, teeLevel); const { p, d } = sample(th, v); return add(p, mul(d, 0.035)); });
  for (let i = 1; i < RING / 2; i++) { const a = ringTop[i], b = ringTop[RING - i]; const m = [(a[0] - b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; ringTop[i] = m; ringTop[RING - i] = [-m[0], m[1], m[2]]; }

  // ---- Neckline rib on the tee.
  const rib = new Mesh("rib", "cloth", "chest");
  {
    const top = ringTop;
    const ctr = mul(top.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / top.length);
    const up = NECK_N;
    const prof = top.map((p, i) => {
      const out = norm(sub(sub(p, ctr), mul(up, dot(sub(p, ctr), up))));
      // Full rib at the front; tucked in at the back, where the collar covers it.
      const k = lerp(0.2, 1, smooth(-0.3, 0.4, Math.cos(ringCols[i])));
      return [add(p, add(mul(out, -0.035), mul(up, -0.05))), add(p, add(mul(out, 0.03 * k - 0.01 * (1 - k)), mul(up, -0.01))), add(p, add(mul(out, 0.02 * k - 0.01 * (1 - k)), mul(up, 0.06))), add(p, add(mul(out, -0.05), mul(up, 0.075)))];
    });
    const ids = prof.map((ring) => ring.map((q) => rib.v(q)));
    for (let c = 0; c < ids.length; c++) {
      const c2 = (c + 1) % ids.length;
      for (let k = 0; k < 3; k++) rib.quad(ids[c][k], ids[c2][k], ids[c2][k + 1], ids[c][k + 1], vary(shadeHex(COL.TEE, 0.9), 0.03));
    }
  }

  // ---- Overshirt: from the left opening edge around the back to the right one.
  const openW = (y) => lerp(+(ARGS.open0 || 0.36), +(ARGS.open1 || 0.58), smooth(-1.8, Y_BOT, y));
  const SH_LEVEL = -0.03;
  const looseness = (p) => 0.1 + 0.06 * smooth(-2.4, Y_BOT, p[1]) + 0.025 * smooth(1.1, 1.6, Math.abs(p[0]));
  // For each row, find the edge angle where |x| reaches openW on the front.
  const NS = 30, nUp = 6, nDown = 4;
  const rowsV = [];
  for (let j = nDown; j >= 1; j--) rowsV.push({ kind: "down", f: j / nDown });
  for (let j = 0; j <= nUp; j++) rowsV.push({ kind: "up", f: j / nUp });
  // Top elevation per angle (shirt neckline), evaluated lazily.
  const topCache = new Map();
  const topAt = (th) => { const k = th.toFixed(4); if (!topCache.has(k)) topCache.set(k, topElev(th, SH_LEVEL)); return topCache.get(k); };
  const pointAt = (th, row) => { const v = row.kind === "down" ? (Y_BOT - Y_EQ) * row.f : topAt(th) * Math.pow(row.f, 0.85); return sample(th, v); };
  function edgeAngle(row) {
    let lo = 0.02, hi = 1.4;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; const { p } = pointAt(m, row); if (Math.abs(p[0]) < openW(p[1])) lo = m; else hi = m; }
    return hi;
  }
  const edges = rowsV.map(edgeAngle);
  const shirtP = rowsV.map((row, r) => Array.from({ length: NS + 1 }, (_, i) => {
    const a = lerp(edges[r], 2 * Math.PI - edges[r], i / NS); // around the back
    const th = a > Math.PI ? a - 2 * Math.PI : a;
    const { p, d } = pointAt(th, row);
    const j = i === 0 || i === NS ? 0 : (R() * 2 - 1) * 0.012;
    return add(p, mul(d, looseness(p) + j));
  }));
  // Exact mirror symmetry (column i <-> NS - i).
  for (const row of shirtP) for (let i = 0; i <= NS / 2; i++) { const a = row[i], b = row[NS - i]; const m = [(a[0] - b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; row[i] = m; row[NS - i] = [-m[0], m[1], m[2]]; }
  const shirt = new Mesh("shirt", "cloth", "chest");
  const shIds = gridMesh(shirt, shirtP, false, () => vary(COL.SHIRT, 0.05), false);

  // Hem thickness along the opening edges and the bottom: a short inward band.
  const inward = (p) => { const d = norm([p[0], 0, p[2] - ZC]); return mul(d, -0.07); };
  for (const [col, flip] of [[0, false], [NS, true]]) {
    for (let r = 0; r < shirtP.length - 1; r++) {
      const a = shirtP[r][col], b = shirtP[r + 1][col];
      const ia = shirt.v(add(a, inward(a))), ib = shirt.v(add(b, inward(b)));
      const A = shIds[r][col], B = shIds[r + 1][col];
      if (flip) shirt.quad(A, B, ib, ia, vary(shadeHex(COL.SHIRT, 0.85), 0.03)); else shirt.quad(A, ia, ib, B, vary(shadeHex(COL.SHIRT, 0.85), 0.03));
    }
  }

  // ---- Collar on the overshirt neckline.
  const collar = new Mesh("collar", "cloth", "chest");
  {
    const top = shirtP[shirtP.length - 1];
    const ctr = mul(top.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / top.length);
    const up = NECK_N;
    const n = top.length;
    const ring = top.map((p, i) => {
      const f = Math.abs(i / (n - 1) - 0.5) * 2; // 0 at the back, 1 at the front ends
      const out = norm(sub(sub(p, ctr), mul(up, dot(sub(p, ctr), up))));
      const stand = 0.17 - 0.05 * f;
      const W = lerp(0.3, 0.46, f * f);
      const base = add(p, mul(out, -0.03));
      const top1 = add(base, add(mul(up, stand), mul(out, -0.02)));
      const fold = add(base, add(mul(up, stand + 0.03), mul(out, 0.06)));
      let edge = add(p, add(mul(out, W), mul(up, -0.05 - 0.04 * f)));
      return [base, top1, fold, edge];
    });
    // Pointed tips: pull the front-end outer edges down along the opening.
    for (const i of [0, n - 1]) { const r = ring[i]; r[3] = add(r[3], [0, -0.3, 0.06]); }
    for (const i of [1, n - 2]) { const r = ring[i]; r[3] = add(r[3], [0, -0.1, 0.03]); }
    const ids = ring.map((r) => r.map((q) => collar.v(q)));
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < 3; k++) {
      const a = ids[i][k], b = ids[i + 1][k], c = ids[i + 1][k + 1], d = ids[i][k + 1];
      collar.quad(a, d, c, b, vary(k === 2 ? COL.SHIRT : shadeHex(COL.SHIRT, k === 0 ? 0.8 : 0.92), 0.04));
    }
    // Underside of the fall so it reads as a folded flap from below.
    for (let i = 0; i < n - 1; i++) {
      const a = ids[i][3], b = ids[i + 1][3];
      const ua = collar.v(add(ring[i][3], mul(norm(sub(ring[i][2], ring[i][3])), 0.05))), ub = collar.v(add(ring[i + 1][3], mul(norm(sub(ring[i + 1][2], ring[i + 1][3])), 0.05)));
      collar.quad(a, b, ub, ua, vary(shadeHex(COL.SHIRT, 0.75), 0.03));
    }
  }

  // ---- Chest pockets with flaps.
  const shirtCast = makeCaster(shirt.T.map((t) => t.map((i) => shirt.P[i])));
  const pockets = new Mesh("pockets", "cloth", "chest");
  for (const s of [1, -1]) {
    const cx = +(ARGS.pkx || 0.86) * s, cy = +(ARGS.pky || -2.66), w = 0.42, h = 0.44, NG = 4;
    const at = (x, y, off) => { const o = [x, y, 3]; const t = shirtCast.near(o, [0, 0, -1]); const z = t == null ? 0.9 : 3 - t; return [x, y, z + off]; };
    const g = [];
    for (let r = 0; r <= NG; r++) { const row = []; for (let c = 0; c <= NG; c++) row.push(pockets.v(at(cx + (c / NG - 0.5) * w, cy - h / 2 + (r / NG) * h * 0.78, 0.03))); g.push(row); }
    const pc = vary(COL.POCKET, 0.03);
    for (let r = 0; r < NG; r++) for (let c = 0; c < NG; c++) pockets.quad(g[r][c], g[r][c + 1], g[r + 1][c + 1], g[r + 1][c], vary(COL.POCKET, 0.03));
    // Flap: wider than the pocket, a shallow point at the bottom centre.
    const us = [-0.54, -0.27, 0, 0.27, 0.54];
    const fTop = cy + h / 2 + 0.01, fBot = cy + h / 2 - h * 0.3;
    const Ft = us.map((u) => pockets.v(at(cx + u * w, fTop, 0.04)));
    const Fb = us.map((u) => pockets.v(at(cx + u * w, fBot - 0.05 * (1 - Math.abs(u) / 0.54), 0.055)));
    const Fe = us.map((u) => pockets.v(at(cx + u * w, fBot - 0.05 * (1 - Math.abs(u) / 0.54), 0.012)));
    // Shadow under the flap, on the pocket.
    const Sd = us.map((u) => pockets.v(at(cx + u * w * 0.93, fBot - 0.05 * (1 - Math.abs(u) / 0.54) - 0.045, 0.036)));
    const Su = us.map((u) => pockets.v(at(cx + u * w * 0.93, fBot - 0.05 * (1 - Math.abs(u) / 0.54) + 0.01, 0.036)));
    for (let k = 0; k < us.length - 1; k++) {
      pockets.quad(Fb[k], Fb[k + 1], Ft[k + 1], Ft[k], vary(shadeHex(COL.SHIRT, 1.06), 0.03));
      pockets.quad(Fe[k], Fe[k + 1], Fb[k + 1], Fb[k], vary(0x1f2940, 0.03));
      pockets.quad(Sd[k], Sd[k + 1], Su[k + 1], Su[k], vary(0x1c2539, 0.02));
    }
  }
  // Fix winding for mirrored pockets is not needed: materials are double-sided.

  return { tee, rib, shirt, collar, pockets, info: { Y_BOT, Y_EQ } };
}

function shadeHex(hex, k) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k)), g = Math.min(255, Math.round(((hex >> 8) & 255) * k)), b = Math.min(255, Math.round((hex & 255) * k));
  return (r << 16) | (g << 8) | b;
}
export function debugTee(ARGS2) {}
