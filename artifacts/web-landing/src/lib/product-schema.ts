import type { Package } from "@workspace/api-client-react";
import type { Dict } from "./i18n";

export const CURRENCY_ORDER = ["vnd", "usd"];
export function packageCurrencies(packages: Package[]): string[] {
  return [...new Set(packages.map((p) => p.currency))].sort((a, b) => {
    const ia = CURRENCY_ORDER.indexOf(a), ib = CURRENCY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
}

export function billingLabel(p: Package, t: Dict): string {
  if (p.billing === "one_time") return t.pricing.oneTime;
  if (p.billingPeriodDays === 30 || p.billingPeriodDays === 31) return t.pricing.monthly;
  if (p.billingPeriodDays === 365) return t.pricing.yearly;
  if (p.billingPeriodDays) return t.pricing.everyNDays.replace("{n}", String(p.billingPeriodDays));
  return t.pricing.recurring;
}

/** One source-code product with alternative purchase packages, using only the currently displayed currency.
 * No seller, reviews, availability or checkout URL is inferred from a Whop plan ID.
 */
export function productSchema(t: Dict, packages: Package[] | null, currency: string, url: string) {
  const catalog = packages ?? [];
  const active = packageCurrencies(catalog).includes(currency) ? currency : packageCurrencies(catalog)[0];
  const offers = catalog.filter((p) => p.currency === active && Number.isFinite(p.price) && p.price >= 0 && /^[a-z]{3}$/i.test(p.currency)).map((p) => ({
    "@type": "Offer",
    identifier: p.id,
    name: p.name,
    description: [p.tagline, billingLabel(p, t), ...p.features].filter(Boolean).join("\n"),
    url: `${url}#bang-gia`,
    price: p.price,
    priceCurrency: p.currency.toUpperCase(),
    ...(p.billing === "recurring" && p.billingPeriodDays && p.billingPeriodDays > 0 ? {
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: p.price,
        priceCurrency: p.currency.toUpperCase(),
        billingDuration: { "@type": "QuantitativeValue", value: p.billingPeriodDays, unitCode: "DAY" },
      },
    } : {}),
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#source-code`,
    url,
    name: t.hero.eyebrow,
    description: t.stops.what.body,
    ...(offers.length ? { offers } : {}),
  };
}

/** Safe in an HTML data script, even if a catalog string contains a closing script tag. */
export function serializeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
