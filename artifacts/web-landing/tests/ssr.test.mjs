import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPage, LANGUAGES } from "../dist/server/render.js";
import { createCatalogCache } from "../seo/catalog-cache.mjs";

const shell = readFileSync(new URL("../dist/public/index.html", import.meta.url), "utf8");
const dict = (code) => JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url), "utf8"));

test("production SSR includes all localized sales sections, FAQ and live Whop packages without JavaScript", async () => {
  for (const { code } of LANGUAGES) {
    const response = await fetch(`http://localhost:80/api/packages?lang=${code}`);
    assert.equal(response.status, 200);
    const packages = await response.json();
    assert.ok(packages.length > 0, "Test requires the real Whop catalog");
    const { html, status, indexable } = await renderPage(shell, `/${code}/`, "/", packages);
    assert.equal(status, 200);
    assert.equal(indexable, true);
    assert.match(html, /<h1\b/);
    for (const id of ["bang-gia", "hoi-dap"]) assert.ok(html.includes(`id="${id}"`));
    const boot = JSON.parse(html.match(/<script id="initial-page" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(boot.lang, code);
    assert.deepEqual(boot.packages, packages);
    const currency = code === "vi" ? "vnd" : "usd";
    const visible = packages.filter((p) => p.currency === currency);
    for (const p of visible.length ? visible : packages.filter((p) => p.currency === packages[0].currency)) {
      assert.ok(html.includes(`data-testid="button-buy-${p.id}"`));
    }
    for (let i = 0; i < dict(code).faq.items.length; i++) assert.ok(html.includes(`id="faq-a-${i}"`));
    assert.ok(html.includes(`lang="${code}"`));
    assert.ok(html.includes(`href="https://shopoatdopac.com/${code}/"`));
  }
});

test("utility pages are noindex and unknown paths return 404 in the production renderer", async () => {
  for (const path of ["/cam-on", "/admin", "/missing", "/en/missing", "/vi/index.html", "/cam-on/"]) {
    const page = await renderPage(shell, path, "/");
    assert.equal(page.status, ["/cam-on", "/admin"].includes(path) ? 200 : 404);
    assert.equal(page.indexable, false);
    assert.ok(page.html.includes('content="noindex, follow"'));
    assert.ok(!page.html.includes('rel="canonical"'));
    assert.ok(!page.html.includes('id="initial-page"'));
  }
});

test("HTTP responses enforce indexing and status before scripts run, including query variants", async () => {
  for (const path of ["/cam-on", "/cam-on?ref=", "/cam-on?ref=unknown-order&lang=vi", "/missing?ref=anything", "/en/missing", "/vi/index.html"]) {
    const response = await fetch(`http://localhost:80${path}`);
    assert.equal(response.status, path.startsWith("/cam-on") ? 200 : 404);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
    const html = await response.text();
    assert.ok(html.includes('content="noindex, follow"'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes("unknown-order"));
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

test("catalog input cannot break out of serialized hydration data", async () => {
  const malicious = '</script><script>alert("x")</script>';
  const page = await renderPage(shell, "/", "/", [{ id: "test", key: "test", name: malicious, tagline: "test", features: [], price: 1, currency: "usd", billing: "one_time", billingPeriodDays: null, recommended: false }]);
  assert.ok(!page.html.includes(malicious));
  const data = page.html.match(/<script id="initial-page" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).packages[0].name, malicious);
});
