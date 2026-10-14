import type { Language, Package } from "@workspace/api-zod";
import { getWhopClient } from "./whopClient";
import { logger } from "./logger";
import { PACKAGE_TRANSLATIONS, type PackageText } from "./packageTranslations";

// Whop is the source of truth for the catalog. Each package is a Whop plan under
// WHOP_PRODUCT_ID; the same package sold in another currency is a separate plan.
// Plan description format (editable in Whop):
//   first plain line   -> tagline
//   lines starting "-" -> features, in order
// Plan metadata:
//   key: "personal"      -> package group: plans sharing a key are one package in several currencies
//   title_lang: "vi"     -> language of the plan title + description (default "vi")
//   recommended: "true"  -> the recommended package (set on any plan of the group)
//   name_<lang>, tagline_<lang>, features_<lang> (one per line) -> text in another language
// Languages Whop holds no text for use the built-in translations (packageTranslations.ts).
// Those only apply while the group's English text still matches the text they were
// translated from, so an edit in Whop never leaves outdated translations on the site:
// until the translations are refreshed, those languages show the English text.

export type CatalogLanguage = Language;

type PlanRow = Omit<Package, "name" | "tagline" | "features">;
type Group = {
  key: string;
  recommended: boolean;
  texts: Partial<Record<string, PackageText>>;
  plans: PlanRow[];
};

const PACKAGES_CACHE_TTL_MS = 60_000;
let catalogCache: { fetchedAt: number; groups: Group[] } | null = null;

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

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
}

function metadataText(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFeatureLines(text: string | null): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•*+]\s*/, ""))
    .filter(Boolean);
}

function productIdOf(product: unknown): string | null {
  const id = metadataRecord(product).id;
  return typeof id === "string" ? id : null;
}

const normalize = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

function sameText(a: PackageText, b: PackageText): boolean {
  return (
    normalize(a.name) === normalize(b.name) &&
    normalize(a.tagline) === normalize(b.tagline) &&
    a.features.length === b.features.length &&
    a.features.every((f, i) => normalize(f) === normalize(b.features[i]))
  );
}

async function fetchCatalog(): Promise<Group[]> {
  const client = await getWhopClient();
  const companyId = requireEnv("WHOP_COMPANY_ID");
  const productId = requireEnv("WHOP_PRODUCT_ID");

  type Collected = {
    row: PlanRow;
    recommended: boolean;
    titleLang: string;
    titleText: PackageText;
    metaTexts: Record<string, PackageText>;
  };
  const byKey = new Map<string, Collected[]>();

  for await (const plan of client.plans.list({
    account_id: companyId,
    product_ids: [productId],
    visibilities: ["visible"],
    first: 50,
  })) {
    if (productIdOf(plan.product) !== productId) continue;
    if (plan.visibility !== "visible") continue;

    const meta = metadataRecord(plan.metadata);
    const key = metadataText(meta, "key") ?? plan.id;
    const recurring = plan.plan_type === "renewal";
    const { tagline, features } = parseDescription(plan.description);
    const titleText: PackageText = { name: plan.title?.trim() || "xidker", tagline, features };

    // name_<lang> starts a language entry; missing tagline/features fall back to the plan's own text.
    const metaTexts: Record<string, PackageText> = {};
    for (const field of Object.keys(meta)) {
      const lang = field.match(/^name_(.+)$/)?.[1];
      const name = lang ? metadataText(meta, field) : null;
      if (!lang || !name) continue;
      const langFeatures = parseFeatureLines(metadataText(meta, `features_${lang}`));
      metaTexts[lang] = {
        name,
        tagline: metadataText(meta, `tagline_${lang}`) ?? tagline,
        features: langFeatures.length > 0 ? langFeatures : features,
      };
    }

    const collected: Collected = {
      row: {
        id: plan.id,
        key,
        price: recurring ? plan.renewal_price : plan.initial_price,
        currency: plan.currency.toLowerCase(),
        billing: recurring ? "recurring" : "one_time",
        billingPeriodDays: recurring ? plan.billing_period : null,
        recommended: false,
      },
      recommended: meta.recommended === true || meta.recommended === "true",
      titleLang: metadataText(meta, "title_lang") ?? "vi",
      titleText,
      metaTexts,
    };
    byKey.set(key, [...(byKey.get(key) ?? []), collected]);
  }

  return [...byKey.entries()].map(([key, items]) => {
    // Vietnamese-titled plans (the original VND plans) take precedence over their twins.
    const ordered = [...items].sort((a, b) => Number(a.titleLang !== "vi") - Number(b.titleLang !== "vi"));
    const texts: Partial<Record<string, PackageText>> = {};
    for (const item of ordered) for (const [lang, text] of Object.entries(item.metaTexts)) texts[lang] ??= text;
    for (const item of ordered) texts[item.titleLang] ??= item.titleText;
    return {
      key,
      recommended: items.some((item) => item.recommended),
      texts,
      plans: items.map((item) => item.row),
    };
  });
}

function textFor(group: Group, language: CatalogLanguage): PackageText {
  const own = group.texts[language];
  if (own) return own;
  const en = group.texts.en;
  const builtIn = PACKAGE_TRANSLATIONS[group.key];
  if (builtIn && en && sameText(builtIn.source, en)) {
    const translated = builtIn.text[language];
    if (translated) return translated;
  }
  return en ?? group.texts.vi ?? Object.values(group.texts)[0] ?? { name: "xidker", tagline: null, features: [] };
}

/** Every visible package in every currency, sorted by currency then price. */
export async function listPackages(language: CatalogLanguage = "vi"): Promise<Package[]> {
  if (!catalogCache || Date.now() - catalogCache.fetchedAt >= PACKAGES_CACHE_TTL_MS) {
    catalogCache = { fetchedAt: Date.now(), groups: await fetchCatalog() };
    const stale = catalogCache.groups
      .filter((group) => {
        const builtIn = PACKAGE_TRANSLATIONS[group.key];
        return builtIn && group.texts.en && !sameText(builtIn.source, group.texts.en);
      })
      .map((group) => group.key);
    if (stale.length > 0) {
      logger.warn({ keys: stale }, "Package English text changed in Whop; built-in translations skipped until refreshed");
    }
  }
  return catalogCache.groups
    .flatMap((group) => {
      const text = textFor(group, language);
      return group.plans.map((row) => ({ ...row, recommended: group.recommended, ...text }));
    })
    .sort((a, b) => a.currency.localeCompare(b.currency) || a.price - b.price);
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
  planId: string | null;
  /** Buyer email as Whop holds it; null when Whop does not share it with this API key. */
  email: string | null;
};

type PaymentLike = {
  id: string;
  status: string | null;
  substatus: string;
  total: number | null;
  subtotal: number | null;
  currency: string;
  paid_at: string | null;
  plan: { id: string } | null;
  user: { email: string | null } | null;
};

function verified(payment: PaymentLike): VerifiedPayment | null {
  if (payment.status !== "paid") return null;
  if (payment.substatus === "refunded" || payment.substatus === "auto_refunded") return null;
  return {
    id: payment.id,
    amount: payment.total ?? payment.subtotal ?? null,
    currency: payment.currency,
    paidAt: payment.paid_at,
    planId: payment.plan?.id ?? null,
    email: payment.user?.email ?? null,
  };
}

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
    const paid = verified(payment);
    if (paid) return paid;
  }
  return null;
}

/** The payment with this Whop id if it belongs to this store, is paid and was not refunded; else null. */
export async function findPaidPaymentById(paymentId: string): Promise<VerifiedPayment | null> {
  const client = await getWhopClient();
  const companyId = requireEnv("WHOP_COMPANY_ID");
  let payment;
  try {
    payment = await client.payments.retrieve(paymentId);
  } catch (err) {
    const status = (err as { status?: unknown }).status;
    // Unknown, malformed or other stores' ids are a plain "no such order".
    if (status === 400 || status === 403 || status === 404 || status === 422) return null;
    throw err;
  }
  if (payment.company && payment.company.id !== companyId) return null;
  return verified(payment);
}
