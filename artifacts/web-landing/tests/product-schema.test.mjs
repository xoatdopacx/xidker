import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productSchema, serializeJson, packageCurrencies, billingLabel } from "../src/lib/product-schema.ts";

const dict = JSON.parse(readFileSync(new URL("../src/locales/en.json", import.meta.url), "utf8"));
const plan = { id: "plan-test", key: "personal", name: "Personal", tagline: "Source", features: ["README"], price: 12, currency: "usd", billing: "one_time", billingPeriodDays: null, recommended: false };
const url = "https://shopoatdopac.com/";

test("one product has package offers, not currency or license products; unavailable catalog omits offers", () => {
  const packages = [plan, { ...plan, id: "vnd", currency: "vnd", price: 300000 }, { ...plan, id: "custom", key: "setup", name: "Custom", price: 50 }];
  const schema = productSchema(dict, packages, "usd", url);
  assert.equal(schema["@type"], "Product");
  assert.deepEqual(schema.offers.map((o) => o.name), ["Personal", "Custom"]);
  assert.deepEqual(schema.offers.map((o) => o.price), [12, 50]);
  assert.ok(schema.offers.every((o) => o["@type"] === "Offer" && o.priceCurrency === "USD"));
  assert.ok(!("offers" in productSchema(dict, null, "usd", url)));
  assert.ok(!("offers" in productSchema(dict, [], "usd", url)));
  assert.ok(!("aggregateRating" in schema));
  assert.ok(!("seller" in schema.offers[0]));
});

test("currency fallback agrees with the card order and no invalid prices are advertised", () => {
  const packages = [{ ...plan, currency: "eur" }, { ...plan, currency: "vnd", price: 300000 }];
  assert.deepEqual(packageCurrencies(packages), ["vnd", "eur"]);
  assert.equal(productSchema(dict, packages, "usd", url).offers[0].priceCurrency, "VND");
  for (const price of [NaN, Infinity, -1]) assert.ok(!("offers" in productSchema(dict, [{ ...plan, price }], "usd", url)));
  assert.equal(productSchema(dict, [{ ...plan, price: 0 }], "usd", url).offers[0].price, 0);
});

test("billing terms come from the card labels, and script serialization cannot introduce markup", () => {
  const recurring = { ...plan, billing: "recurring", billingPeriodDays: 14, name: '</script><script>alert(1)</script>\u2028\u2029' };
  assert.equal(billingLabel(recurring, dict), "every 14 days");
  const schema = productSchema(dict, [recurring], "usd", url);
  assert.ok(schema.offers[0].description.includes("every 14 days"));
  assert.deepEqual(schema.offers[0].priceSpecification.billingDuration, { "@type": "QuantitativeValue", value: 14, unitCode: "DAY" });
  const serialized = serializeJson(schema);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), schema);
});
