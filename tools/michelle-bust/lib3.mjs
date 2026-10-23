// Small vector + mesh helpers for the bust generator.
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Rotate p around an axis through c.
export function rotAxis(p, c, axis, ang) {
  const k = norm(axis), v = sub(p, c), cs = Math.cos(ang), sn = Math.sin(ang);
  const r = add(add(mul(v, cs), mul(cross(k, v), sn)), mul(k, dot(k, v) * (1 - cs)));
  return add(c, r);
}
// Colour helpers (hex <-> rgb 0..1, sRGB space).
export const hex2rgb = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
export const rgb2hex = (c) => (Math.round(clamp(c[0], 0, 1) * 255) << 16) | (Math.round(clamp(c[1], 0, 1) * 255) << 8) | Math.round(clamp(c[2], 0, 1) * 255);
export const mix = (a, b, t) => rgb2hex(lerp3(hex2rgb(a), hex2rgb(b), t));
export const shade = (h, k) => rgb2hex(mul(hex2rgb(h), k));

// Indexed triangle mesh with per-face colours.
export class Mesh {
  constructor(name, mat, bone) { this.name = name; this.mat = mat; this.bone = bone; this.P = []; this.T = []; this.C = []; }
  v(p) { this.P.push(p); return this.P.length - 1; }
  tri(a, b, c, col) { this.T.push([a, b, c]); this.C.push(col); }
  quad(a, b, c, d, col, col2 = col) { this.tri(a, b, c, col); this.tri(a, c, d, col2); }
  append(m, colFn) { const o = this.P.length; this.P.push(...m.P); m.T.forEach((t, i) => this.tri(t[0] + o, t[1] + o, t[2] + o, colFn ? colFn(i) : m.C[i])); return this; }
  normal(i) { const [a, b, c] = this.T[i]; return norm(cross(sub(this.P[b], this.P[a]), sub(this.P[c], this.P[a]))); }
  centroid(i) { const [a, b, c] = this.T[i]; return mul(add(add(this.P[a], this.P[b]), this.P[c]), 1 / 3); }
  toJSON() { const pos = []; for (const t of this.T) for (const i of t) pos.push(...this.P[i]); return { name: this.name, mat: this.mat, pos, col: this.C }; }
}

// Brute-force ray caster against a triangle soup (array of [p0,p1,p2]).
export function makeCaster(tris) {
  const T = tris.map(([a, b, c]) => ({ a, e1: sub(b, a), e2: sub(c, a) }));
  return {
    // All hit distances along the ray (t > 0).
    hits(o, d) {
      const out = [];
      for (const { a, e1, e2 } of T) {
        const p = cross(d, e2), det = dot(e1, p);
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det, s = sub(o, a), u = dot(s, p) * inv;
        if (u < -1e-6 || u > 1 + 1e-6) continue;
        const q = cross(s, e1), v = dot(d, q) * inv;
        if (v < -1e-6 || u + v > 1 + 1e-6) continue;
        const t = dot(e2, q) * inv;
        if (t > 1e-6) out.push(t);
      }
      return out.sort((x, y) => x - y);
    },
    far(o, d) { const h = this.hits(o, d); return h.length ? h[h.length - 1] : null; },
    near(o, d) { const h = this.hits(o, d); return h.length ? h[0] : null; },
  };
}

// Vertex normals (area weighted) for an indexed mesh.
export function vertexNormals(P, T) {
  const N = P.map(() => [0, 0, 0]);
  for (const [a, b, c] of T) { const n = cross(sub(P[b], P[a]), sub(P[c], P[a])); for (const i of [a, b, c]) { N[i][0] += n[0]; N[i][1] += n[1]; N[i][2] += n[2]; } }
  return N.map(norm);
}
// Vertex adjacency.
export function neighbours(P, T) {
  const nb = P.map(() => new Set());
  for (const [a, b, c] of T) { nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  return nb.map((s) => [...s]);
}
// Taubin smoothing in place; fixed(i) keeps a vertex still.
export function taubin(P, T, iters, fixed = () => false, lam = 0.5, mu = -0.53) {
  const nb = neighbours(P, T);
  for (let it = 0; it < iters; it++) for (const f of [lam, mu]) {
    const D = P.map((p, i) => { if (fixed(i) || !nb[i].length) return [0, 0, 0]; const m = [0, 0, 0]; for (const j of nb[i]) { m[0] += P[j][0]; m[1] += P[j][1]; m[2] += P[j][2]; } const k = 1 / nb[i].length; return [(m[0] * k - p[0]) * f, (m[1] * k - p[1]) * f, (m[2] * k - p[2]) * f]; });
    P.forEach((p, i) => { p[0] += D[i][0]; p[1] += D[i][1]; p[2] += D[i][2]; });
  }
}
// Border edges (used once) of a triangle list, as [a,b] pairs in triangle order.
export function borderEdges(T) {
  const m = new Map();
  for (const [a, b, c] of T) for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u + "_" + v : v + "_" + u; m.set(k, m.has(k) ? null : [u, v]); }
  return [...m.values()].filter(Boolean);
}
