import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { renderPage, LANGUAGES } from "../dist/server/render.js";
import { createCatalogCache } from "../seo/catalog-cache.mjs";

const shell = readFileSync(new URL("../dist/public/index.html", import.meta.url), "utf8");
const dict = (code) => JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url), "utf8"));
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

test("production SSR includes all localized sales sections, FAQ and the live catalog without JavaScript", async () => {
  for (const { code } of LANGUAGES) {
    const response = await fetch(`http://localhost:80/api/packages?lang=${code}`);
    assert.equal(response.status, 200);
    const packages = await response.json();
    assert.ok(packages.length > 0, "Test requires the live catalog");
    const { html, status, indexable } = await renderPage(shell, `/${code}/`, "/", packages);
    assert.equal(status, 200);
    assert.equal(indexable, true);
    assert.match(html, /<h1\b/);
    for (const id of ["bang-gia", "hoi-dap"]) assert.ok(html.includes(`id="${id}"`));
    const boot = JSON.parse(html.match(/<script id="initial-page" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(boot.lang, code);
    assert.deepEqual(boot.packages, packages);
    for (const p of packages) assert.ok(html.includes(`data-testid="button-buy-${p.id}"`), `${code}: no buy button for ${p.id}`);
    for (let i = 0; i < dict(code).faq.items.length; i++) assert.ok(html.includes(`id="faq-a-${i}"`));
    // The refund policy must reach visitors and crawlers in every language, in the pricing note and in the FAQ.
    assert.ok(html.includes(escapeHtml(dict(code).pricing.refund)), `${code}: refund note missing`);
    assert.ok(html.includes(escapeHtml(dict(code).faq.items.at(-1).a)), `${code}: refund FAQ answer missing`);
    assert.ok(html.includes(`lang="${code}"`));
    const canonical = `https://shopoatdopac.com/${code === "en" ? "" : `${code}/`}`;
    assert.ok(html.includes(`href="${canonical}"`));
    const product = JSON.parse(html.match(/<script id="product-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(product["@type"], "Product");
    assert.equal(product.name, dict(code).hero.eyebrow);
    assert.equal(product.url, canonical);
    assert.equal(product.offers.length, packages.length);
    for (const p of packages) {
      const offer = product.offers.find((o) => o.identifier === p.id);
      assert.equal(offer.name, p.name);
      assert.equal(offer.price, p.price);
      assert.equal(offer.priceCurrency, "VND");
      for (const f of p.features) assert.ok(offer.description.includes(f));
    }
  }
});

const ORDER = "/don-hang/XIDAB12CD";
const SIGNED_IN_PAGES = ["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/tai-khoan", ORDER, "/quan-tri"];

test("sign-in, account, order and admin pages are noindex; unknown paths return 404 in the production renderer", async () => {
  const missing = ["/missing", "/en/missing", "/vi/index.html", "/don-hang/xidab12cd", "/don-hang/XID123", "/don-hang"];
  // The server redirects /cam-on and /admin before rendering; a client-side visit still gets their new page.
  for (const path of [...SIGNED_IN_PAGES, "/tai-khoan/", `${ORDER}/`, "/cam-on", "/admin", ...missing]) {
    const page = await renderPage(shell, path, "/");
    assert.equal(page.status, missing.includes(path) ? 404 : 200, path);
    assert.equal(page.indexable, false);
    assert.ok(page.html.includes('content="noindex, follow"'));
    assert.ok(!page.html.includes('rel="canonical"'));
    assert.ok(!page.html.includes('id="initial-page"'));
    assert.ok(!page.html.includes("application/ld+json"));
  }
});

test("HTTP responses enforce indexing and status before scripts run, including query variants", async () => {
  const cases = [
    ["/tai-khoan", 200], ["/dang-nhap?next=%2Ftai-khoan", 200], [`${ORDER}?ref=unknown-order`, 200], ["/quan-tri", 200],
    ["/missing?ref=unknown-order", 404], ["/en/missing", 404], ["/vi/index.html", 404],
  ];
  for (const [path, status] of cases) {
    const response = await fetch(`http://localhost:80${path}`);
    assert.equal(response.status, status, path);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
    const html = await response.text();
    assert.ok(html.includes('content="noindex, follow"'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes("unknown-order"));
  }
  // Old addresses move for good, keeping their query.
  for (const [from, to] of [["/cam-on", "/tai-khoan"], ["/cam-on?ref=abc&lang=vi", "/tai-khoan?ref=abc&lang=vi"], ["/admin", "/quan-tri"], ["/admin/", "/quan-tri"]]) {
    const response = await fetch(`http://localhost:80${from}`, { redirect: "manual" });
    assert.equal(response.status, 301, from);
    assert.equal(response.headers.get("location"), to);
  }
  const redirect = await fetch("http://localhost:80/?lang=vi", { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/vi/");
  const missingAsset = await fetch("http://localhost:80/assets/not-real.js");
  assert.equal(missingAsset.status, 404);
  const head = await fetch("http://localhost:80/missing", { method: "HEAD" });
  assert.equal(head.status, 404);
  assert.equal(await head.text(), "");
});

test("template demos run sandboxed, stay out of search and serve video in byte ranges", async () => {
  for (const slug of ["reelmark", "jack", "mainframe", "iris", "michelle", "kin"]) {
    const response = await fetch(`http://localhost:80/demo/${slug}/`);
    assert.equal(response.status, 200, slug);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(response.headers.get("content-security-policy"), /^sandbox allow-scripts /);
  }
  // Pictures next to a demo page load from the sandbox too.
  const picture = await fetch("http://localhost:80/demo/kin/assets/place.webp");
  assert.equal(picture.status, 200);
  assert.equal(picture.headers.get("content-type"), "image/webp");
  assert.equal(picture.headers.get("cross-origin-resource-policy"), "cross-origin");
  const moved = await fetch("http://localhost:80/demo/jack", { redirect: "manual" });
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), "/demo/jack/");
  const video = readdirSync(new URL("../public/demo/mainframe/assets/", import.meta.url)).find((f) => f.endsWith(".mp4"));
  const part = await fetch(`http://localhost:80/demo/mainframe/assets/${video}`, { headers: { Range: "bytes=10-19" } });
  assert.equal(part.status, 206);
  assert.equal((await part.arrayBuffer()).byteLength, 10);
  // The sandboxed page has the origin "null", so its module scripts need CORS.
  assert.equal(part.headers.get("access-control-allow-origin"), "*");
  const beyond = await fetch(`http://localhost:80/demo/mainframe/assets/${video}`, { headers: { Range: "bytes=999999999-" } });
  assert.equal(beyond.status, 416);
});

test("catalog cache revalidates, coalesces requests and refuses expired data on failure", async () => {
  let now = 0, calls = 0, fail = false;
  const get = createCatalogCache({ ttl: 60, now: () => now, fetchCatalog: async (lang) => {
    calls++;
    if (fail) throw new Error("Unavailable");
    return [{ lang, price: calls }];
  } });
  const [a, b] = await Promise.all([get("en"), get("en")]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  now = 59; await get("en"); assert.equal(calls, 1);
  now = 60; assert.equal((await get("en"))[0].price, 2);
  await get("vi"); assert.equal(calls, 3);
  now = 120; fail = true;
  await assert.rejects(get("en"), /Unavailable/);
  fail = false; assert.equal((await get("en"))[0].price, 5);
});

const bootData = (html) => JSON.parse(html.match(/<script id="initial-page" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test("without catalog data the home page still renders, with prices left to the browser", async () => {
  const page = await renderPage(shell, "/en/", "/", null);
  assert.equal(page.status, 200);
  assert.equal(page.indexable, true);
  for (const id of ["bang-gia", "hoi-dap"]) assert.ok(page.html.includes(`id="${id}"`));
  assert.ok(!page.html.includes('data-testid="button-buy-'));
  assert.equal(bootData(page.html).packages, null);
  const product = JSON.parse(page.html.match(/<script id="product-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(!("offers" in product));
});

test("English duplicates redirect permanently; discovery files are XML/text for GET and HEAD", async () => {
  for (const path of ["/en", "/en/", "/en/?utm_source=test&ref=example"]) {
    const response = await fetch(`http://localhost:80${path}`, { redirect: "manual" });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), `/${new URL(path, "http://localhost").search}`);
  }
  const legacy = await fetch("http://localhost:80/?lang=en&utm_source=test", { redirect: "manual" });
  assert.equal(legacy.headers.get("location"), "/?utm_source=test");
  for (const [path, type] of [["sitemap.xml", "application/xml"], ["robots.txt", "text/plain"]]) {
    const response = await fetch(`http://localhost:80/${path}`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").startsWith(type));
    assert.equal(response.headers.get("x-robots-tag"), null);
    assert.equal(await response.text(), readFileSync(new URL(`../dist/public/${path}`, import.meta.url), "utf8"));
    const head = await fetch(`http://localhost:80/${path}`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  }
});

async function startProductionServer(port, nodeArgs) {
  const child = spawn(process.execPath, [...nodeArgs, fileURLToPath(new URL("../seo/server.mjs", import.meta.url))], {
    env: { ...process.env, PORT: String(port), BASE_PATH: "/", NODE_ENV: "production" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`http://127.0.0.1:${port}/favicon.svg`).then(() => true, () => false)) return child;
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`Production server did not start: ${stderr}`);
}

test("production server passes the deployment startup check on / with and without a reachable catalog", async () => {
  // Simulates a catalog outage inside the server process; the startup check must still get 200.
  const blockCatalog = "data:text/javascript," + encodeURIComponent(
    'const f = globalThis.fetch; globalThis.fetch = (i, o) => String(i?.url ?? i).includes("/api/packages") ? Promise.reject(new TypeError("simulated outage")) : f(i, o);');
  for (const [port, nodeArgs, catalogReachable] of [[18597, [], true], [18596, ["--import", blockCatalog], false]]) {
    const child = await startProductionServer(port, nodeArgs);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.equal(Array.isArray(bootData(html).packages), catalogReachable);
      assert.equal(html.includes('data-testid="button-buy-'), catalogReachable);
    } finally {
      child.kill();
    }
  }
});

test("catalog input cannot break out of serialized hydration data", async () => {
  const malicious = '</script><script>alert("x")</script>';
  const page = await renderPage(shell, "/", "/", [{ id: "test", name: malicious, tagline: "test", features: [], price: 300000, priceUsd: null, recommended: false, pickSample: false }]);
  assert.ok(!page.html.includes(malicious));
  const data = page.html.match(/<script id="initial-page" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).packages[0].name, malicious);
  const product = JSON.parse(page.html.match(/<script id="product-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(product.offers[0].name, malicious);
});

test("published pages send security headers, and only the shell's own scripts carry the per-response nonce", async () => {
  const port = 18595;
  const child = await startProductionServer(port, []);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    for (const [name, value] of [
      ["x-content-type-options", "nosniff"], ["x-frame-options", "SAMEORIGIN"],
      ["referrer-policy", "strict-origin-when-cross-origin"], ["cross-origin-opener-policy", "same-origin"],
    ]) assert.equal(response.headers.get(name), value, name);
    assert.match(response.headers.get("permissions-policy"), /camera=\(\), microphone=\(\), geolocation=\(\)/);
    const csp = response.headers.get("content-security-policy");
    const directive = (name) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
    assert.equal(directive("frame-ancestors"), "frame-ancestors 'self'");
    assert.equal(directive("object-src"), "object-src 'none'");
    assert.ok(!directive("script-src").includes("'unsafe-inline'"), "inline scripts need the nonce");
    const nonce = directive("script-src").match(/'nonce-([^']+)'/)[1];
    const html = await response.text();
    for (const tag of html.match(/<script\b[^>]*>/g)) {
      if (/type="application\/(?:ld\+)?json"/.test(tag)) continue; // data blocks never run
      assert.ok(tag.includes(`nonce="${nonce}"`), tag);
    }
    const handler = html.match(/onload="([^"]+)"/)[1];
    assert.ok(directive("script-src").includes(`'sha256-${createHash("sha256").update(handler).digest("base64")}'`));
    const next = (await fetch(`http://127.0.0.1:${port}/vi/`)).headers.get("content-security-policy");
    assert.notEqual(next.match(/'nonce-([^']+)'/)[1], nonce);
    const asset = await fetch(`http://127.0.0.1:${port}/robots.txt`);
    assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
    assert.equal(asset.headers.get("cross-origin-resource-policy"), "same-origin");
    const card = await fetch(`http://127.0.0.1:${port}/share-card.png`);
    assert.equal(card.headers.get("cross-origin-resource-policy"), "cross-origin");
  } finally {
    child.kill();
  }
});
