import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { LANGUAGES } from "../src/lib/languages.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function checkFontLinks(html) {
  const fallback = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1];
  assert.ok(fallback, "Font stylesheet needs a no-JavaScript fallback");
  const activeHtml = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  const links = activeHtml.match(/<link\b[^>]*>/g) ?? [];
  const fontLinks = links.filter((link) => /fonts\.googleapis\.com\/css2/.test(link));
  assert.equal(fontLinks.length, 1);
  const link = fontLinks[0];
  assert.match(link, /rel="stylesheet"/);
  assert.match(link, /media="print"/);
  const href = link.match(/href="([^"]+)"/)?.[1];
  assert.ok(fallback.includes(`href="${href}"`));
  const params = new URL(href.replaceAll("&amp;", "&")).searchParams;
  assert.deepEqual(params.getAll("family"), [
    "Be Vietnam Pro:wght@400;500;600;700;800",
    "Pixelify Sans:wght@500;700",
    "Silkscreen:wght@400;700",
    "JetBrains Mono:wght@400",
  ]);
  assert.equal(params.get("display"), "swap");
  assert.ok(!links.some((tag) => /rel="preload"/.test(tag) && /fonts\.|as="font"/.test(tag)));
  const stylesheet = { media: "print", onload: () => {} };
  runInNewContext(`(function () { ${link.match(/onload="([^"]+)"/)?.[1]} }).call(stylesheet)`, { stylesheet });
  assert.equal(stylesheet.media, "all");
  assert.equal(stylesheet.onload, null);
}

test("base fonts load asynchronously with matching noscript and only used weights", () => {
  checkFontLinks(read("../index.html"));
});

test("application CSS has no remote font import and retains system fallbacks", () => {
  const css = read("../src/index.css");
  assert.doesNotMatch(css, /@import[^;]*https?:/);
  assert.match(css, /--app-font-sans:[^;]*sans-serif/);
  assert.match(css, /--app-font-mono:[^;]*monospace/);
  assert.match(css, /\.font-num\{[^}]*monospace/);
});

test("production HTML for every locale retains asynchronous font loading", () => {
  checkFontLinks(read("../dist/public/index.html"));
  // English is served from the root page, so the build writes no en/ copy.
  for (const { code } of LANGUAGES) if (code !== "en") checkFontLinks(read(`../dist/public/${code}/index.html`));
  const assets = new URL("../dist/public/assets/", import.meta.url);
  for (const file of readdirSync(assets).filter((name) => name.endsWith(".css"))) {
    assert.doesNotMatch(readFileSync(new URL(file, assets), "utf8"), /@import[^;]*https?:/);
  }
});
