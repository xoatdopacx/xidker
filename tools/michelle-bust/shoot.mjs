// node shoot.mjs [json] [out.png] [viewsJSON] [tileW] [tileH]
import { launch, serve, sleep } from "./cdp.mjs";
const [file = "out/bust.json", out = "out/preview.png", views = "", tw = "420", th = "520"] = process.argv.slice(2);
const server = await serve(new URL(".", import.meta.url).pathname, 8771);
const page = await launch({ port: 9351, webgl: true });
try {
  const n = views ? JSON.parse(views).length : 8, cols = Math.min(4, n), rows = Math.ceil(n / cols);
  await page.viewport(+tw * cols, +th * rows);
  const url = `http://127.0.0.1:8771/${process.env.PAGE || "preview.html"}?f=${encodeURIComponent(file)}&tw=${tw}&th=${th}${views ? "&v=" + encodeURIComponent(views) : ""}`;
  await page.goto(url);
  for (let i = 0; i < 200; i++) { if (await page.eval("!!window.done")) break; await sleep(150); }
  const info = await page.eval("JSON.stringify(window.info||null)");
  await page.shot(out);
  console.log("shot", out, info);
  const errs = page.logs.filter((l) => /error|exception/i.test(l));
  if (errs.length) console.log(errs.join("\n"));
} finally { await page.close(); server.close(); }
