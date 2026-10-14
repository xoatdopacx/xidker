// Renders marketing/logo/logo.html to PNG.
// Usage: node marketing/render/logo.mjs <out.png> [query]   e.g. "bg=green&unit=22"
//        node marketing/render/logo.mjs --preview <out.png> <query> [<query> ...]  (IG circle crops at real sizes)
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./cdp.mjs";

const LOGO = pathToFileURL(resolve("marketing/logo/logo.html")).href;

async function renderOne(browser, query) {
  const page = await browser.newPage({ width: 1080, height: 1080 });
  await page.goto(`${LOGO}?${query}`);
  const fontOk = await page.eval("window.__ready");
  if (!fontOk) throw new Error("Pixelify Sans did not load");
  return page.shot({ clip: { x: 0, y: 0, width: 1080, height: 1080, scale: 1 } });
}

const args = process.argv.slice(2);
const browser = await launch({ port: 9341 });
try {
  if (args[0] === "--preview") {
    const [, out, ...queries] = args;
    const pngs = [];
    for (const q of queries) pngs.push({ q, b64: (await renderOne(browser, q)).toString("base64") });
    const page = await browser.newPage({ width: 1400, height: 400 * queries.length });
    await page.eval(`(() => {
      const items = ${JSON.stringify(pngs)};
      document.body.style.cssText = "margin:0;background:#fafafa;font:14px sans-serif;color:#222";
      document.body.innerHTML = items.map(({ q, b64 }) => \`
        <div style="display:flex;align-items:center;gap:28px;padding:16px 24px;border-bottom:1px solid #ddd">
          <img src="data:image/png;base64,\${b64}" style="width:340px;height:340px">
          <img src="data:image/png;base64,\${b64}" style="width:180px;height:180px;border-radius:50%">
          <img src="data:image/png;base64,\${b64}" style="width:110px;height:110px;border-radius:50%">
          <img src="data:image/png;base64,\${b64}" style="width:56px;height:56px;border-radius:50%">
          <img src="data:image/png;base64,\${b64}" style="width:32px;height:32px;border-radius:50%">
          <div style="background:#000;padding:18px;border-radius:12px;display:flex;gap:18px;align-items:center">
            <img src="data:image/png;base64,\${b64}" style="width:110px;height:110px;border-radius:50%">
            <img src="data:image/png;base64,\${b64}" style="width:32px;height:32px;border-radius:50%">
          </div>
          <code>\${q}</code>
        </div>\`).join("");
      return Promise.all([...document.images].map((i) => i.decode()));
    })()`);
    const png = await page.shot({ captureBeyondViewport: true });
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, png);
    console.log("preview", out);
  } else {
    const [out, query = ""] = args;
    const png = await renderOne(browser, query);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, png);
    console.log("wrote", out, png.length, "bytes");
  }
} finally {
  await browser.close();
}
