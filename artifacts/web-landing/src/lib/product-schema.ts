import type { Package } from "@workspace/api-client-react";
import type { Dict } from "./i18n";

/** One source-code product with its packages as offers. Prices are the VND amounts buyers transfer; the dollar
 * figure on the cards is only a guide, so it is not offered here. No seller, reviews or availability are inferred.
 */
export function productSchema(t: Dict, packages: Package[] | null, url: string) {
  const offers = (packages ?? []).filter((p) => Number.isFinite(p.price) && p.price > 0).map((p) => ({
    "@type": "Offer",
    identifier: p.id,
    name: p.name,
    description: [p.tagline, t.pricing.oneTime, ...p.features].filter(Boolean).join("\n"),
    url: `${url}#bang-gia`,
    price: p.price,
    priceCurrency: "VND",
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
