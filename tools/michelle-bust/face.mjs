import fs from "node:fs";
import { loadMH } from "./mh.mjs";
export const SCULPT = {
  "t/head-age-decr": 0.5, "t/head-oval": 0.4,
  "t/l-eye-scale-incr": 0.7, "t/r-eye-scale-incr": 0.7, "t/l-eye-height2-incr": 0.4, "t/r-eye-height2-incr": 0.4,
  "t/l-eye-corner2-up": 0.3, "t/r-eye-corner2-up": 0.3, "t/l-eye-bag-decr": 0.6, "t/r-eye-bag-decr": 0.6,
  "t/l-eye-height1-incr": 0.2, "t/r-eye-height1-incr": 0.2, "t/l-eye-height3-incr": 0.2, "t/r-eye-height3-incr": 0.2,
  "t/nose-scale-horiz-decr": 0.35, "t/nose-scale-vert-decr": 0.25, "t/nose-point-width-decr": 0.4, "t/nose-flaring-decr": 0.4,
  "t/nose-point-up": 0.25, "t/nose-nostrils-width-decr": 0.3, "t/nose-volume-decr": 0.3,
  "t/mouth-upperlip-volume-incr": 0.5, "t/mouth-lowerlip-volume-incr": 0.45, "t/mouth-scale-horiz-decr": 0.2, "t/mouth-cupidsbow-incr": 0.5,
  "t/mouth-angles-up": 0.35, "t/mouth-upperlip-height-incr": 0.2,
  "t/chin-width-decr": 0.4, "t/chin-height-decr": 0.2, "t/chin-prominent-decr": 0.2, "t/chin-triangle": 0.2,
  "t/l-cheek-bones-incr": 0.35, "t/r-cheek-bones-incr": 0.35, "t/l-cheek-volume-incr": 0.15, "t/r-cheek-volume-incr": 0.15,
  "t/neck-scale-horiz-decr": 0.35, "t/neck-scale-depth-decr": 0.2, "t/forehead-scale-vert-decr": 0.15,
};
export function sculpted(extra = {}) {
  const base = [["caucasian-female-young.target", 1 / 3], ["african-female-young.target", 1 / 3], ["asian-female-young.target", 1 / 3]];
  const sc = { ...SCULPT, ...extra };
  return loadMH({ targets: [...base, ...Object.entries(sc).filter(([, w]) => w).map(([f, w]) => [f + ".target", w])] });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const extra = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  const { V, groups, center } = sculpted(extra);
  const O = [0, 6.71, 0.40];
  const P = V.map((p) => [p[0] - O[0], p[1] - O[1], p[2] - O[2]]);
  const pos = [], col = [];
  for (const f of groups.body) {
    if (!f.every((i) => P[i][1] > -2.6)) continue;
    for (let k = 1; k + 1 < f.length; k++) { for (const i of [f[0], f[k], f[k + 1]]) pos.push(...P[i]); col.push(0xe8b48e); }
  }
  const eyes = [], ecol = [];
  for (const g of ["helper-l-eye", "helper-r-eye"]) {
    const c = center(g).map((v, k) => v - O[k]);
    for (const f of groups[g]) for (let k = 1; k + 1 < f.length; k++) {
      const tri = [f[0], f[k], f[k + 1]], m = [0, 0, 0];
      for (const i of tri) { eyes.push(...P[i]); for (let a = 0; a < 3; a++) m[a] += P[i][a] / 3; }
      const d = m.map((v, a) => v - c[a]), l = Math.hypot(...d), cz = d[2] / l;
      ecol.push(cz > 0.96 ? 0x0b0807 : cz > 0.82 ? 0x5b3a24 : 0xf6f1ea);
    }
  }
  fs.writeFileSync("out/face.json", JSON.stringify({ parts: [{ name: "skin", mat: "skin", pos, col }, { name: "eyes", mat: "satin", pos: eyes, col: ecol }] }));
  console.log("ok");
}
