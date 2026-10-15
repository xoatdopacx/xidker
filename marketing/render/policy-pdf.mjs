// Renders marketing/policy/refund-policy.html to an A4 PDF (the refund policy file uploaded to Whop).
// Usage: node marketing/render/policy-pdf.mjs [out.pdf]   (default generated-artifacts/policy/refund-policy.pdf)
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./cdp.mjs";

const SRC = pathToFileURL(resolve("marketing/policy/refund-policy.html")).href;
const out = resolve(process.argv[2] ?? "generated-artifacts/policy/refund-policy.pdf");

const browser = await launch({ port: 9343 });
try {
  const page = await browser.newPage({ width: 794, height: 1123 });
  await page.goto(SRC);
  // Every weight used, with the page's own text, so all Vietnamese subsets are loaded before printing.
  const fontsOk = await page.eval(`(async () => {
    const text = document.body.innerText;
    const faces = ['400 16px "Be Vietnam Pro"', '600 16px "Be Vietnam Pro"', '800 16px "Be Vietnam Pro"', '700 22px "Pixelify Sans"'];
    await Promise.all(faces.map((f) => document.fonts.load(f, text)));
    await document.fonts.ready;
    return faces.every((f) => document.fonts.check(f, f.includes("Pixelify") ? "xidker" : text));
  })()`);
  if (!fontsOk) throw new Error("Be Vietnam Pro / Pixelify Sans did not load; the PDF would fall back to another font");
  const { data } = await page.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(data, "base64"));
  console.log(out);
} finally {
  await browser.close();
}
