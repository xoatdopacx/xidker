// Symmetric decimation helpers.
import { MeshoptSimplifier as MS } from "meshoptimizer";
await MS.ready;
// tris: array of [a,b,c] indices into P (array of [x,y,z]); returns {P, T} decimated, symmetric about x=0.
export function symDecimate(P, tris, target, { error = 0.05, flags = ["Regularize"], lock = null, update = false } = {}) {
  const half = tris.filter((t) => t.every((i) => P[i][0] >= -1e-6));
  const map = new Map(), pos = [], src = [];
  const id = (i) => { if (!map.has(i)) { map.set(i, src.length); src.push(i); pos.push(...P[i]); } return map.get(i); };
  const idx = new Uint32Array(half.flat().map(id));
  const fpos = new Float32Array(pos);
  const lk = new Uint8Array(src.length);
  if (lock) src.forEach((i, k) => { if (lock(P[i], i)) lk[k] = 1; });
  let out;
  if (update) {
    const ii = idx.slice(), pp = fpos.slice();
    const [n] = MS.simplifyWithUpdate(ii, pp, 3, new Float32Array(0), 0, [], lk, Math.round(target / 2) * 3, error, flags);
    out = { idx: ii.slice(0, n), pos: pp };
  } else {
    const [r] = MS.simplifyWithAttributes(idx, fpos, 3, new Float32Array(0), 0, [], lk, Math.round(target / 2) * 3, error, flags);
    out = { idx: r, pos: fpos };
  }
  // Compact + mirror.
  const used = new Map(), NP = [], NT = [], orig = [];
  const get = (k) => { if (!used.has(k)) { const p = [out.pos[k * 3], out.pos[k * 3 + 1], out.pos[k * 3 + 2]]; if (Math.abs(P[src[k]][0]) < 1e-6) p[0] = 0; used.set(k, NP.length); NP.push(p); orig.push(src[k]); } return used.get(k); };
  const tri = [];
  for (let i = 0; i < out.idx.length; i += 3) tri.push([get(out.idx[i]), get(out.idx[i + 1]), get(out.idx[i + 2])]);
  const mirror = new Map();
  const mid = (k) => Math.abs(NP[k][0]) < 1e-6;
  const m = (k) => { if (mid(k)) return k; if (!mirror.has(k)) { mirror.set(k, NP.length); NP.push([-NP[k][0], NP[k][1], NP[k][2]]); orig.push(orig[k]); } return mirror.get(k); };
  for (const [a, b, c] of tri) { NT.push([a, b, c]); NT.push([m(a), m(c), m(b)]); }
  return { P: NP, T: NT, orig };
}
// Plain (asymmetric) decimation.
export function decimate(P, tris, target, { error = 0.05, flags = ["Regularize"], lock = null } = {}) {
  const idx = new Uint32Array(tris.flat()), fpos = new Float32Array(P.flat());
  const lk = new Uint8Array(P.length);
  if (lock) P.forEach((p, i) => { if (lock(p, i)) lk[i] = 1; });
  const [r] = MS.simplifyWithAttributes(idx, fpos, 3, new Float32Array(0), 0, [], lk, target * 3, error, flags);
  const used = new Map(), NP = [], NT = [];
  const get = (k) => { if (!used.has(k)) { used.set(k, NP.length); NP.push(P[k]); } return used.get(k); };
  for (let i = 0; i < r.length; i += 3) NT.push([get(r[i]), get(r[i + 1]), get(r[i + 2])]);
  return { P: NP, T: NT };
}
