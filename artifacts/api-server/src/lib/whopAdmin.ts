import { randomBytes } from "node:crypto";
import type Whop from "@whop/sdk";
import { APIError } from "@whop/sdk";
import type { AdminPackage, AdminPackageInput } from "@workspace/api-zod";
import { getWhopClient } from "./whopClient";
import { logger } from "./logger";
import { cleanLine } from "./security";
import type { PackageText } from "./packageTranslations";
import {
  clearCatalogCache,
  isRecommended,
  mergeGroupTexts,
  metadataRecord,
  metadataText,
  productIdOf,
  readPlanTexts,
  requireEnv,
  translationState,
  type PlanTexts,
} from "./whopStore";

// The admin screen manages the one-time packages. A package is a pair of Whop plans that
// share a metadata key: the VND plan holds the Vietnamese text and the USD plan the English
// text (title = name; description = tagline, then "- feature" lines). Saving writes only
// that, so per-language metadata copies of vi/en are dropped from both plans.
// Whop limits: plan title <= 30 characters, description <= 1000, metadata values <= 500.
// The input limits in the API spec keep every package inside them.

const SHOP_CURRENCIES = ["vnd", "usd"] as const;
type ShopCurrency = (typeof SHOP_CURRENCIES)[number];
const TEXT_LANG: Record<ShopCurrency, "vi" | "en"> = { vnd: "vi", usd: "en" };
/** Copies that would win over a plan's own title and description (see readPlanTexts). */
const COPY_FIELD = /^(name|tagline|features)_(vi|en)$/;
const EMPTY_TEXT: PackageText = { name: "", tagline: null, features: [] };

type PlanState = {
  id: string;
  currency: string;
  visible: boolean;
  price: number;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  members: number;
  texts: PlanTexts;
};

type GroupState = { key: string; plans: PlanState[] };

type CleanInput = {
  vi: PackageText;
  en: PackageText;
  priceVnd: number;
  priceUsd: number;
  onSale: boolean;
  recommended: boolean;
};

type PlanWrite = {
  title: string;
  description: string | null;
  initial_price: number;
  visibility: "visible" | "hidden";
  metadata: Record<string, unknown>;
};

export class InvalidPackageError extends Error {}
export class PackageNotFoundError extends Error {}
export class PackageHasBuyersError extends Error {}
/** Whop refused the change; the message is Whop's own reason. */
export class WhopRejectedError extends Error {}

function rejection(err: unknown): WhopRejectedError | null {
  if (!(err instanceof APIError) || (err.status !== 400 && err.status !== 422)) return null;
  const body = metadataRecord(metadataRecord(err.error).error);
  const message = typeof body.message === "string" && body.message.trim() ? body.message : err.message;
  return new WhopRejectedError(message.slice(0, 300));
}

/* ---------------- reading ---------------- */

async function loadGroups(client: Whop): Promise<GroupState[]> {
  const companyId = requireEnv("WHOP_COMPANY_ID");
  const productId = requireEnv("WHOP_PRODUCT_ID");
  const groups = new Map<string, PlanState[]>();

  for await (const plan of client.plans.list({
    account_id: companyId,
    product_ids: [productId],
    visibilities: ["visible", "hidden"],
    first: 50,
  })) {
    if (productIdOf(plan.product) !== productId) continue;
    if (plan.visibility !== "visible" && plan.visibility !== "hidden") continue;
    // Subscriptions stay managed in Whop itself.
    if (plan.plan_type !== "one_time") continue;

    const metadata = metadataRecord(plan.metadata);
    const key = metadataText(metadata, "key") ?? plan.id;
    const state: PlanState = {
      id: plan.id,
      currency: plan.currency.toLowerCase(),
      visible: plan.visibility === "visible",
      price: plan.initial_price,
      title: plan.title,
      description: plan.description,
      metadata,
      members: plan.member_count ?? 0,
      texts: readPlanTexts(plan),
    };
    groups.set(key, [...(groups.get(key) ?? []), state]);
  }
  return [...groups].map(([key, plans]) => ({ key, plans }));
}

/** The plan that holds this currency's price; a visible one wins over hidden duplicates. */
function planFor(group: GroupState, currency: ShopCurrency): PlanState | undefined {
  const matches = group.plans.filter((plan) => plan.currency === currency);
  return matches.find((plan) => plan.visible) ?? matches[0];
}

function toAdmin(group: GroupState): AdminPackage {
  const texts = mergeGroupTexts(group.plans.map((plan) => plan.texts));
  return {
    key: group.key,
    vi: texts.vi ?? texts.en ?? EMPTY_TEXT,
    en: texts.en ?? texts.vi ?? EMPTY_TEXT,
    priceVnd: planFor(group, "vnd")?.price ?? null,
    priceUsd: planFor(group, "usd")?.price ?? null,
    onSale: group.plans.some((plan) => plan.visible),
    recommended: group.plans.some((plan) => isRecommended(plan.metadata)),
    buyers: group.plans.reduce((sum, plan) => sum + plan.members, 0),
    translations: translationState(group.key, texts.en),
  };
}

const byVndPrice = (a: AdminPackage, b: AdminPackage) =>
  (a.priceVnd ?? Infinity) - (b.priceVnd ?? Infinity) || a.key.localeCompare(b.key);

export async function listAdminPackages(): Promise<AdminPackage[]> {
  const client = await getWhopClient();
  return (await loadGroups(client)).map(toAdmin).sort(byVndPrice);
}

async function reload(client: Whop, key: string): Promise<AdminPackage> {
  const group = (await loadGroups(client)).find((g) => g.key === key);
  if (!group) throw new Error(`Package ${key} missing on Whop right after saving it`);
  return toAdmin(group);
}

/* ---------------- writing ---------------- */

function cleanCopy(copy: AdminPackageInput["vi"]): PackageText {
  // NFC keeps Vietnamese letters one character each, so the length limits mean what they say.
  // A leading bullet would turn the tagline into a feature when the description is read back.
  const line = (value: string) => cleanLine(value.normalize("NFC")).replace(/^[-•*+]\s*/, "");
  const name = cleanLine(copy.name.normalize("NFC"));
  if (!name) throw new InvalidPackageError("Name is empty");
  return {
    name,
    tagline: copy.tagline ? line(copy.tagline) || null : null,
    features: copy.features.map(line).filter(Boolean),
  };
}

function cleanInput(raw: AdminPackageInput): CleanInput {
  const cents = raw.priceUsd * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) {
    throw new InvalidPackageError("USD price can have at most 2 decimals");
  }
  return {
    vi: cleanCopy(raw.vi),
    en: cleanCopy(raw.en),
    priceVnd: raw.priceVnd,
    priceUsd: Math.round(cents) / 100,
    onSale: raw.onSale,
    recommended: raw.recommended,
  };
}

function formatDescription(text: PackageText): string | null {
  return [text.tagline, ...text.features.map((feature) => `- ${feature}`)].filter(Boolean).join("\n") || null;
}

function desiredPlan(currency: ShopCurrency, input: CleanInput, key: string, current?: PlanState): PlanWrite {
  const lang = TEXT_LANG[currency];
  const metadata: Record<string, unknown> = Object.fromEntries(
    Object.entries(current?.metadata ?? {}).filter(([field]) => !COPY_FIELD.test(field)),
  );
  metadata.key = key;
  metadata.title_lang = lang;
  metadata.recommended = String(input.recommended);
  return {
    title: input[lang].name,
    description: formatDescription(input[lang]),
    initial_price: currency === "vnd" ? input.priceVnd : input.priceUsd,
    visibility: input.onSale ? "visible" : "hidden",
    metadata,
  };
}

const sorted = (record: Record<string, unknown>) =>
  JSON.stringify(Object.keys(record).sort().map((field) => [field, record[field]]));

/** Only the fields that differ. Whop replaces metadata as a whole, so it is sent complete. */
function changes(current: PlanState, want: PlanWrite): Partial<PlanWrite> {
  const patch: Partial<PlanWrite> = {};
  if ((current.title ?? "") !== want.title) patch.title = want.title;
  if ((current.description ?? "") !== (want.description ?? "")) patch.description = want.description;
  if (current.price !== want.initial_price) patch.initial_price = want.initial_price;
  if (current.visible !== (want.visibility === "visible")) patch.visibility = want.visibility;
  if (sorted(current.metadata) !== sorted(want.metadata)) patch.metadata = want.metadata;
  return patch;
}

async function patchPlan(client: Whop, plan: PlanState, patch: Partial<PlanWrite>): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await client.plans.update(plan.id, patch);
}

async function createPlan(client: Whop, currency: ShopCurrency, want: PlanWrite): Promise<string> {
  const plan = await client.plans.create({
    account_id: requireEnv("WHOP_COMPANY_ID"),
    product_id: requireEnv("WHOP_PRODUCT_ID"),
    plan_type: "one_time",
    release_method: "buy_now",
    currency,
    initial_price: want.initial_price,
    title: want.title,
    description: want.description,
    metadata: want.metadata,
    visibility: want.visibility,
    unlimited_stock: true,
    override_tax_type: "exclusive",
  });
  return plan.id;
}

/** One recommended package at most: marking one clears the mark everywhere else. */
async function clearOtherRecommended(client: Whop, groups: GroupState[], key: string): Promise<void> {
  for (const group of groups) {
    if (group.key === key) continue;
    for (const plan of group.plans) {
      if (isRecommended(plan.metadata)) {
        await client.plans.update(plan.id, { metadata: { ...plan.metadata, recommended: "false" } });
      }
    }
  }
}

function newKey(name: string, taken: Set<string>): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "source";
  for (;;) {
    const key = `${slug}-${randomBytes(3).toString("hex")}`;
    if (!taken.has(key)) return key;
  }
}

export async function createPackage(raw: AdminPackageInput): Promise<AdminPackage> {
  const input = cleanInput(raw);
  const client = await getWhopClient();
  const groups = await loadGroups(client);
  const key = newKey(input.en.name, new Set(groups.map((group) => group.key)));
  const hidden: CleanInput = { ...input, onSale: false };

  // Both plans are made hidden and only then shown together: the site never lists a
  // package that has its Vietnamese plan but not yet its English one.
  const created: string[] = [];
  try {
    for (const currency of SHOP_CURRENCIES) {
      created.push(await createPlan(client, currency, desiredPlan(currency, hidden, key)));
    }
  } catch (err) {
    for (const id of created) {
      await client.plans.delete(id).catch((cleanupErr: unknown) => {
        logger.error({ err: cleanupErr, planId: id }, "Could not remove a half-created package plan");
      });
    }
    throw rejection(err) ?? err;
  }

  try {
    if (input.recommended) await clearOtherRecommended(client, groups, key);
    if (input.onSale) {
      for (const id of created) await client.plans.update(id, { visibility: "visible" });
    }
  } catch (err) {
    throw rejection(err) ?? err;
  } finally {
    clearCatalogCache();
  }
  return reload(client, key);
}

export async function updatePackage(key: string, raw: AdminPackageInput): Promise<AdminPackage> {
  const input = cleanInput(raw);
  const client = await getWhopClient();
  const groups = await loadGroups(client);
  const group = groups.find((g) => g.key === key);
  if (!group) throw new PackageNotFoundError();

  try {
    const handled = new Set<string>();
    for (const currency of SHOP_CURRENCIES) {
      const plan = planFor(group, currency);
      const want = desiredPlan(currency, input, key, plan);
      if (plan) {
        handled.add(plan.id);
        await patchPlan(client, plan, changes(plan, want));
      } else {
        await createPlan(client, currency, want);
      }
    }
    // Duplicates and other currencies follow the on-sale switch and the recommended mark.
    for (const plan of group.plans) {
      if (handled.has(plan.id)) continue;
      const patch: Partial<PlanWrite> = {};
      if (!input.onSale && plan.visible) patch.visibility = "hidden";
      if (!input.recommended && isRecommended(plan.metadata)) patch.metadata = { ...plan.metadata, recommended: "false" };
      await patchPlan(client, plan, patch);
    }
    if (input.recommended) await clearOtherRecommended(client, groups, key);
  } catch (err) {
    throw rejection(err) ?? err;
  } finally {
    clearCatalogCache();
  }
  return reload(client, key);
}

/** Only packages nobody owns can be deleted; the others can be hidden. */
export async function deletePackage(key: string): Promise<void> {
  const client = await getWhopClient();
  const group = (await loadGroups(client)).find((g) => g.key === key);
  if (!group) throw new PackageNotFoundError();
  if (group.plans.some((plan) => plan.members > 0)) throw new PackageHasBuyersError();

  try {
    // Hidden first: if Whop refuses one of the deletes, the package is at least off the site.
    for (const plan of group.plans) {
      if (plan.visible) await client.plans.update(plan.id, { visibility: "hidden" });
    }
    for (const plan of group.plans) await client.plans.delete(plan.id);
  } catch (err) {
    throw rejection(err) ?? err;
  } finally {
    clearCatalogCache();
  }
}
