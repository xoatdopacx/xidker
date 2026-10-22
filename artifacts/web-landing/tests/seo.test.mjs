import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { LANGUAGES } from "../src/lib/languages.ts";
import { languageHref, localePath, pathLanguage, isHomePath } from "../src/lib/locale-url.ts";
import { renderLocaleHtml, escapeHtml } from "../seo/html.ts";
import { localeSeo } from "../seo/plugin.ts";
import { sitemapXml, robotsTxt } from "../seo/discovery.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const origin = "https://shopoatdopac.com";
const metas = Object.fromEntries(LANGUAGES.map((l) => [l.code, JSON.parse(read(`../src/locales/${l.code}.json`)).meta]));
const shell = read("../index.html");

test("33 stable locale URLs, including regional Chinese, respect artifact prefixes", () => {
  assert.equal(LANGUAGES.length, 33);
  for (const { code } of LANGUAGES) {
    assert.equal(pathLanguage(localePath(code)) ?? "en", code);
    assert.equal(pathLanguage(localePath(code, "/shop/"), "/shop/") ?? "en", code);
    assert.equal(pathLanguage(`/shop/${code}`, "/shop/"), code);
    assert.equal(isHomePath(localePath(code)), true);
  }
  assert.equal(pathLanguage("/tai-khoan"), null);
  assert.equal(pathLanguage("/xx/"), null);
  assert.equal(pathLanguage("/ar/admin"), null);
});

test("switching languages preserves unrelated parameters and hashes, including on order pages", () => {
  assert.equal(languageHref("ja", new URL(`${origin}/vi/?lang=vi&utm_source=test#bang-gia`)), "/ja/?utm_source=test#bang-gia");
  assert.equal(languageHref("ar", new URL(`${origin}/don-hang/XIDAB12CD?utm_source=mail#receipt`)), "/don-hang/XIDAB12CD?utm_source=mail&lang=ar#receipt");
  assert.equal(languageHref("zh-TW", new URL(`${origin}/shop/vi/?test=1`), "/shop/"), "/shop/zh-TW/?test=1");
  assert.equal(languageHref("en", new URL(`${origin}/vi/?utm_source=test#bang-gia`)), "/?utm_source=test#bang-gia");
  assert.equal(languageHref("en", new URL(`${origin}/shop/vi/`), "/shop/"), "/shop/");
});

function checkHtml(html, code, path) {
  assert.match(html, new RegExp(`<html lang="${code}" dir="${LANGUAGES.find((l) => l.code === code).dir}">`));
  assert.ok(html.includes(`<title>${escapeHtml(metas[code].title)}</title>`), code);
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${origin}${path}"`));
  assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 34);
  for (const { code: alt } of LANGUAGES) {
    assert.ok(html.includes(`hreflang="${alt}" href="${origin}${localePath(alt)}"`));
    assert.ok(html.includes(`<a href="${localePath(alt)}" hreflang="${alt}"`));
  }
  assert.ok(html.includes(`hreflang="x-default" href="${origin}/"`));
  assert.ok(html.includes(`property="og:url" content="${origin}${path}"`));
  assert.ok(html.includes(`property="og:image" content="${origin}/share-card.png"`));
  assert.ok(html.includes(`name="twitter:image" content="${origin}/share-card.png"`));
}

test("every initial HTML response has reciprocal alternates, localized metadata and social images without JS", () => {
  checkHtml(renderLocaleHtml(shell, "/", origin, "/", metas), "en", "/");
  for (const { code } of LANGUAGES) {
    const html = renderLocaleHtml(shell, `/${code}/`, origin, "/", metas);
    checkHtml(html, code, localePath(code));
    checkHtml(renderLocaleHtml(html, `/${code}/`, origin, "/", metas), code, localePath(code));
  }
});

test("Vite's dev transform uses path when originalUrl is not supplied", () => {
  const plugin = localeSeo("/", origin);
  for (const { code } of LANGUAGES) {
    const html = plugin.transformIndexHtml.handler(shell, { path: `/${code}/` });
    checkHtml(html, code, localePath(code));
  }
});

test("the built HTML for all locales keeps Vite assets and the correct metadata", () => {
  assert.ok(existsSync(new URL("../dist/public/index.html", import.meta.url)), "Run the landing build first");
  checkHtml(read("../dist/public/index.html"), "en", "/");
  for (const { code } of LANGUAGES) {
    const html = read(code === "en" ? "../dist/public/index.html" : `../dist/public/${code}/index.html`);
    checkHtml(html, code, localePath(code));
    const script = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
    assert.match(script ?? "", /^\/assets\/.*\.js$/);
    assert.ok(existsSync(new URL(`../dist/public${script}`, import.meta.url)));
    assert.ok(!html.includes("<!-- locale-seo -->"));
  }
});

test("sitemap and robots list only the 33 canonical sales URLs and honor origin/base", () => {
  for (const base of ["/", "/shop/"]) {
    const xml = sitemapXml(origin, base);
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    assert.equal(urls.length, 33);
    assert.equal(new Set(urls).size, 33);
    for (const { code } of LANGUAGES) assert.ok(urls.includes(`${origin}${localePath(code, base)}`));
    assert.ok(!/\/en\/|\/admin|\/cam-on|\/quan-tri|\/tai-khoan|\/dang-|\/quen-mat-khau|\/don-hang|\/demo|<lastmod>/.test(xml));
    assert.ok(robotsTxt(origin, base).includes(`Sitemap: ${origin}${base}sitemap.xml`));
  }
  assert.equal(read("../dist/public/sitemap.xml"), sitemapXml(origin, "/"));
  assert.equal(read("../dist/public/robots.txt"), robotsTxt(origin, "/"));
  assert.ok(!existsSync(new URL("../dist/public/en/index.html", import.meta.url)));
});

test("production uses the HTML server instead of a wildcard SPA rewrite", () => {
  const config = read("../.replit-artifact/artifact.toml");
  assert.ok(config.includes("[services.production.run]"));
  assert.ok(config.includes('"serve"'));
  assert.ok(!config.includes('serve = "static"'));
  assert.ok(!config.includes('from = "/*"'));
});

test("public sharing asset is an actual 1200×630 PNG", () => {
  const image = readFileSync(new URL("../public/share-card.png", import.meta.url));
  assert.equal(image.subarray(1, 4).toString(), "PNG");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(existsSync(new URL("../dist/public/share-card.png", import.meta.url)));
});
