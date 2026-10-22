import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productSchema, serializeJson } from "../src/lib/product-schema.ts";

const dict = JSON.parse(readFileSync(new URL("../src/locales/en.json", import.meta.url), "utf8"));
const plan = { id: "personal", name: "Personal", tagline: "Source", features: ["README"], price: 300000, priceUsd: 12, recommended: false, pickSample: true };
const url = "https://shopoatdopac.com/";

test("one product offers every package at the VND amount to transfer; an unavailable catalog omits offers", () => {
  const packages = [plan, { ...plan, id: "custom", name: "Custom", price: 1250000, priceUsd: null, pickSample: false }];
  const schema = productSchema(dict, packages, url);
  assert.equal(schema["@type"], "Product");
  assert.equal(schema.url, url);
  assert.deepEqual(schema.offers.map((o) => o.name), ["Personal", "Custom"]);
  assert.deepEqual(schema.offers.map((o) => o.price), [300000, 1250000]);
  assert.ok(schema.offers.every((o) => o["@type"] === "Offer" && o.priceCurrency === "VND" && o.url === `${url}#bang-gia`));
  assert.ok(!("offers" in productSchema(dict, null, url)));
  assert.ok(!("offers" in productSchema(dict, [], url)));
  assert.ok(!("aggregateRating" in schema));
  assert.ok(!("seller" in schema.offers[0]));
});

test("invalid or free prices are never advertised", () => {
  for (const price of [NaN, Infinity, -1, 0]) assert.ok(!("offers" in productSchema(dict, [{ ...plan, price }], url)));
});

test("offer text lists the package terms, and script serialization cannot introduce markup", () => {
  const evil = { ...plan, name: '</script><script>alert(1)</script>\u2028\u2029' };
  const schema = productSchema(dict, [evil], url);
  assert.ok(schema.offers[0].description.includes(dict.pricing.oneTime));
  assert.ok(schema.offers[0].description.includes("README"));
  const serialized = serializeJson(schema);
  assert.ok(!serialized.includes("<"));
  assert.ok(!/[\u2028\u2029]/.test(serialized));
  assert.deepEqual(JSON.parse(serialized), schema);
});
