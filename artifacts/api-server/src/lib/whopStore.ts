import type { Package } from "@workspace/api-zod";
import { getWhopClient } from "./whopClient";

// Whop is the source of truth for the catalog. Each package is a Whop plan
// under WHOP_PRODUCT_ID. Plan description format (editable in Whop):
//   first plain line   -> tagline
//   lines starting "-" -> features, in order
// The plan title + description are the Vietnamese text. Plan metadata holds:
//   recommended: "true"  -> the recommended package
//   name_en, tagline_en  -> English name / tagline
//   features_en          -> English features, one per line
// Missing English fields fall back to the Vietnamese text.

export type CatalogLanguage = "vi" | "en";

const PACKAGES_CACHE_TTL_MS = 60_000;
let packagesCache: {
  fetchedAt: number;
  byLanguage: Record<CatalogLanguage, Package[]>;
} | null = null;

function requireEnv(name: "WHOP_COMPANY_ID" | "WHOP_PRODUCT_ID"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function parseDescription(description: string | null): {
  tagline: string | null;
  features: string[];
} {
  const lines = (description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let tagline: string | null = null;
  const features: string[] = [];
  for (const line of lines) {
    const bullet = line.match(/^[-•*+]\s*(.+)$/);
    if (bullet) {
      features.push(bullet[1].trim());
    } else if (tagline === null) {
      tagline = line;
    } else {
      features.push(line);
    }
  }
  return { tagline, features };
}

function isRecommended(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const flag = (metadata as Record<string, unknown>).recommended;
  return flag === true || flag === "true";
}

function metadataText(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFeatureLines(text: string | null): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•*+]\s*/, ""))
    .filter(Boolean);
}

function productIdOf(product: unknown): string | null {
  if (!product || typeof product !== "object") return null;
  const id = (product as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

async function fetchPackages(): Promise<Record<CatalogLanguage, Package[]>> {
  const client = await getWhopClient();
  const companyId = requireEnv("WHOP_COMPANY_ID");
  const productId = requireEnv("WHOP_PRODUCT_ID");

  const vi: Package[] = [];
  const en: Package[] = [];
  for await (const plan of client.plans.list({
    account_id: companyId,
    product_ids: [productId],
    visibilities: ["visible"],
    first: 50,
  })) {
    if (productIdOf(plan.product) !== productId) continue;
    if (plan.visibility !== "visible") continue;

    const recurring = plan.plan_type === "renewal";
    const shared = {
      id: plan.id,
      price: recurring ? plan.renewal_price : plan.initial_price,
      currency: plan.currency.toLowerCase(),
      billing: recurring ? ("recurring" as const) : ("one_time" as const),
      billingPeriodDays: recurring ? plan.billing_period : null,
      recommended: isRecommended(plan.metadata),
    };

    const { tagline, features } = parseDescription(plan.description);
    const title = plan.title?.trim() || null;
    vi.push({ ...shared, name: title ?? "Gói thiết kế", tagline, features });

    const featuresEn = parseFeatureLines(metadataText(plan.metadata, "features_en"));
    en.push({
      ...shared,
      name: metadataText(plan.metadata, "name_en") ?? title ?? "Design package",
      tagline: metadataText(plan.metadata, "tagline_en") ?? tagline,
      features: featuresEn.length > 0 ? featuresEn : features,
    });
  }

  const byPrice = (a: Package, b: Package) => a.price - b.price;
  return { vi: vi.sort(byPrice), en: en.sort(byPrice) };
}

export async function listPackages(
  language: CatalogLanguage = "vi",
): Promise<Package[]> {
  if (
    !packagesCache ||
    Date.now() - packagesCache.fetchedAt >= PACKAGES_CACHE_TTL_MS
  ) {
    packagesCache = { fetchedAt: Date.now(), byLanguage: await fetchPackages() };
  }
  return packagesCache.byLanguage[language];
}

export async function createWhopCheckout(input: {
  planId: string;
  redirectUrl: string;
  ref: string;
}): Promise<{ checkoutConfigurationId: string; purchaseUrl: string }> {
  const client = await getWhopClient();
  const config = await client.checkoutConfigurations.create({
    plan_id: input.planId,
    redirect_url: input.redirectUrl,
    metadata: { ref: input.ref },
  });
  if (!config.purchase_url) {
    throw new Error(`Whop returned no purchase_url for checkout ${config.id}`);
  }
  return { checkoutConfigurationId: config.id, purchaseUrl: config.purchase_url };
}

export type VerifiedPayment = {
  id: string;
  amount: number | null;
  currency: string;
  paidAt: string | null;
};

// Asks Whop (never the redirect) whether this checkout has a successful payment.
export async function findPaidPayment(
  checkoutConfigurationId: string,
): Promise<VerifiedPayment | null> {
  const client = await getWhopClient();
  const companyId = requireEnv("WHOP_COMPANY_ID");

  for await (const payment of client.payments.list({
    company_id: companyId,
    checkout_configuration_ids: [checkoutConfigurationId],
    first: 20,
  })) {
    if (payment.checkout_configuration_id !== checkoutConfigurationId) continue;
    if (payment.status !== "paid") continue;
    if (payment.substatus === "refunded" || payment.substatus === "auto_refunded") {
      continue;
    }
    return {
      id: payment.id,
      amount: payment.total ?? payment.subtotal ?? null,
      currency: payment.currency,
      paidAt: payment.paid_at,
    };
  }
  return null;
}
