// Renders marketing/promo/promo.html frame by frame (its animation is a pure function of time).
// Usage:
//   node marketing/render/promo.mjs --stills <montage.jpg> <t1> <t2> ...   review chosen moments
//   node marketing/render/promo.mjs --frames <dir> [from] [to]            JPEG frames at 30 fps
//   add --lang=en anywhere for the English version (default: Vietnamese)
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { launch } from "./cdp.mjs";

const PAGE = pathToFileURL(resolve("marketing/promo/promo.html")).href;
const FPS = 30, DUR = 25;

const argv = process.argv.slice(2);
const lang = (argv.find((a) => a.startsWith("--lang=")) || "--lang=vi").slice(7);
const [mode, out, ...rest] = argv.filter((a) => !a.startsWith("--lang="));
const browser = await launch({ port: 9361, args: ["--allow-file-access-from-files"] });
try {
  const page = await browser.newPage({ width: 1080, height: 1920 });
  await page.goto(`${PAGE}?lang=${lang}`);
  if (!(await page.eval("window.__ready"))) throw new Error("fonts did not load");
  const shot = async (t) => {
    await page.eval(`window.renderAt(${t})`);
    return page.shot({ format: "jpeg", quality: 95, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
  };

  if (mode === "--stills") {
    const dir = "/tmp/promo-stills";
    await mkdir(dir, { recursive: true });
    const times = rest.map(Number);
    for (let i = 0; i < times.length; i++) await writeFile(join(dir, `s${String(i).padStart(2, "0")}.jpg`), await shot(times[i]));
    const cols = Math.min(times.length, 6), rows = Math.ceil(times.length / cols);
    await mkdir(dirname(out), { recursive: true });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", join(dir, "s%02d.jpg"),
      "-vf", `scale=360:640,tile=${cols}x${rows}:padding=8:color=white`, "-frames:v", "1", out]);
    execFileSync("bash", ["-c", `rm -f ${dir}/s*.jpg`]);
    console.log("montage", out, times.join(" "));
  } else if (mode === "--still") {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, await shot(Number(rest[0])));
    console.log("still", out);
  } else if (mode === "--frames") {
    const from = Number(rest[0] ?? 0), to = Number(rest[1] ?? FPS * DUR);
    await mkdir(out, { recursive: true });
    const t0 = Date.now();
    for (let i = from; i < to; i++) {
      await writeFile(join(out, `f${String(i).padStart(4, "0")}.jpg`), await shot(i / FPS));
      if (i % 75 === 0) console.log(`frame ${i} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    console.log(`done ${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else {
    throw new Error("usage: --stills <out.jpg> t... | --frames <dir> [from] [to]");
  }
} finally {
  await browser.close();
}
