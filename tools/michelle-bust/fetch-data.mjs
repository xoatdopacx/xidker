// Downloads the MakeHuman files the generator reads into ./data/ (CC0, from the MakeHuman 1.x repository).
// Usage: node fetch-data.mjs
import fs from "node:fs";
import { SCULPT } from "./face.mjs";

const RAW = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/";
const DATA = new URL("./data/", import.meta.url);

// Detail targets live in a folder named after their region.
function folderOf(name) {
  if (/^[lr]-eye-/.test(name)) return "eyes";
  if (/^[lr]-cheek-/.test(name)) return "cheek";
  return name.split("-")[0];
}

const files = [
  ["3dobjs/base.obj", "base.obj"],
  ...["caucasian", "african", "asian"].map((race) => [`targets/macrodetails/${race}-female-young.target`, `${race}-female-young.target`]),
  ...Object.keys(SCULPT).map((key) => {
    const name = key.replace(/^t\//, "");
    return [`targets/${folderOf(name)}/${name}.target`, `t/${name}.target`];
  }),
];

fs.mkdirSync(new URL("./t/", DATA), { recursive: true });
for (const [remote, local] of files) {
  const res = await fetch(RAW + remote);
  if (!res.ok) throw new Error(`${remote}: HTTP ${res.status}`);
  fs.writeFileSync(new URL(local, DATA), Buffer.from(await res.arrayBuffer()));
}
console.log(`Downloaded ${files.length} files into data/`);
