// Shared loader: MakeHuman hm08 base mesh (CC0) + female-young targets.
import fs from "node:fs";
export function loadMH({ targets = [["caucasian-female-young.target", 1 / 3], ["african-female-young.target", 1 / 3], ["asian-female-young.target", 1 / 3]] } = {}) {
  const V = [], groups = {};
  let group = "";
  for (const line of fs.readFileSync(new URL("./data/base.obj", import.meta.url), "utf8").split("\n")) {
    if (line.startsWith("v ")) { const [, x, y, z] = line.trim().split(/\s+/).map(Number); V.push([x, y, z]); }
    else if (line.startsWith("g ")) group = line.slice(2).trim();
    else if (line.startsWith("f ")) (groups[group] ??= []).push(line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1));
  }
  for (const [file, w] of targets) {
    for (const line of fs.readFileSync(new URL("./data/" + file, import.meta.url), "utf8").split("\n")) {
      if (!line || line[0] === "#") continue;
      const [i, dx, dy, dz] = line.trim().split(/\s+/).map(Number);
      if (Number.isFinite(i) && V[i]) { V[i][0] += dx * w; V[i][1] += dy * w; V[i][2] += dz * w; }
    }
  }
  const verts = (g) => [...new Set((groups[g] || []).flat())];
  const center = (g) => { const ids = verts(g), s = [0, 0, 0]; for (const i of ids) for (let k = 0; k < 3; k++) s[k] += V[i][k]; return s.map((x) => x / ids.length); };
  return { V, groups, verts, center };
}
