// Films the live site at phone size in real time (CDP screencast during a scripted smooth scroll)
// and writes a constant-frame-rate JPEG sequence for the promo composition.
// Usage: node marketing/render/record-site.mjs <outDir> [fps]
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { launch } from "./cdp.mjs";

const OUT = process.argv[2] || "generated-artifacts/promo/footage";
const FPS = Number(process.argv[3] || 30);
const W = 390, H = 844, DPR = 2;

// Timeline in page milliseconds: hold on the hero, glide down the road, settle.
const HOLD_START = 1400, SCROLL = 4600, HOLD_END = 700;
const SCROLL_TO = 1900;

const browser = await launch({ port: 9353 });
try {
  const page = await browser.newPage({ width: W, height: H, dpr: DPR, mobile: true });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await page.goto("http://localhost:80/?lang=vi");
  await page.eval(`document.fonts.ready.then(() => true)`);
  await sleep(3500); // let the first-load cover and hero build finish

  const frames = [];
  page.on("Page.screencastFrame", (p) => {
    frames.push({ data: p.data, ts: p.metadata.timestamp });
    page.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
  });
  await page.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
  await sleep(150);

  // Page-side clock marks so frame timestamps can be aligned to the scripted motion.
  const marks = await page.eval(`new Promise((resolve) => {
    const ease = (k) => 0.5 - Math.cos(Math.PI * k) / 2;
    const t0 = performance.now();
    const wall0 = Date.now();
    function step(now) {
      const t = now - t0;
      let y = 0;
      if (t > ${HOLD_START}) y = ${SCROLL_TO} * ease(Math.min(1, (t - ${HOLD_START}) / ${SCROLL}));
      window.scrollTo({ top: y, behavior: "instant" });
      if (t < ${HOLD_START + SCROLL + HOLD_END}) requestAnimationFrame(step);
      else resolve({ wall0, wall1: Date.now() });
    }
    requestAnimationFrame(step);
  })`);
  await sleep(200);
  await page.send("Page.stopScreencast");

  const start = marks.wall0 / 1000, end = marks.wall1 / 1000;
  const inWindow = frames.filter((f) => f.ts >= start - 0.2 && f.ts <= end + 0.2);
  console.log(`captured ${frames.length} frames, ${inWindow.length} in window over ${(end - start).toFixed(2)}s => ${(inWindow.length / (end - start)).toFixed(1)} fps`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const n = Math.round((end - start) * FPS);
  let j = 0, written = 0;
  for (let i = 0; i < n; i++) {
    const t = start + i / FPS;
    while (j + 1 < frames.length && frames[j + 1].ts <= t) j++;
    await writeFile(join(OUT, `f${String(i).padStart(4, "0")}.jpg`), Buffer.from(frames[j].data, "base64"));
    written++;
  }
  console.log(`wrote ${written} frames at ${FPS} fps to ${OUT}`);
} finally {
  await browser.close();
}
