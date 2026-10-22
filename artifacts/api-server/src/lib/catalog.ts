import { randomBytes } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, ordersTable, siteSettingsTable, storePackagesTable, type StorePackageRow } from "@workspace/db";
import { PACKAGE_TRANSLATIONS, type PackageText } from "./packageTranslations";
import { logger } from "./logger";

// The price list lives in the database and is edited from the admin dashboard. Each package
// has Vietnamese and English text; the other site languages use the built-in translations
// while those still match the English text, else the English text.

const CACHE_MS = 30_000;
let cache: { at: number; rows: StorePackageRow[] } | null = null;

export function clearCatalogCache(): void {
  cache = null;
}

const byPrice = (a: StorePackageRow, b: StorePackageRow) => a.priceVnd - b.priceVnd || a.key.localeCompare(b.key);

/** Packages on the price list, cheapest first. */
export async function visiblePackages(): Promise<StorePackageRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await db.select().from(storePackagesTable).where(eq(storePackagesTable.visible, true)).orderBy(asc(storePackagesTable.priceVnd));
  cache = { at: Date.now(), rows: rows.sort(byPrice) };
  return cache.rows;
}

export async function allPackages(): Promise<StorePackageRow[]> {
  return (await db.select().from(storePackagesTable)).sort(byPrice);
}

export async function findPackage(key: string): Promise<StorePackageRow | null> {
  const [row] = await db.select().from(storePackagesTable).where(eq(storePackagesTable.key, key)).limit(1);
  return row ?? null;
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

/** Whether the built-in translations of this package still match its English text. */
export function translationState(key: string, en: PackageText): "built_in" | "outdated" | "none" {
  const builtIn = PACKAGE_TRANSLATIONS[key];
  if (!builtIn) return "none";
  return sameText(builtIn.source, en) ? "built_in" : "outdated";
}

export function packageText(row: StorePackageRow, lang: string): PackageText {
  if (lang === "vi") return row.textVi;
  if (lang === "en") return row.textEn;
  if (translationState(row.key, row.textEn) === "built_in") {
    const translated = PACKAGE_TRANSLATIONS[row.key]?.text[lang];
    if (translated) return translated;
  }
  return row.textEn;
}

export function publicPackage(row: StorePackageRow, lang: string, samplesOn: boolean) {
  const text = packageText(row, lang);
  return {
    id: row.key,
    name: text.name,
    tagline: text.tagline,
    features: text.features,
    price: row.priceVnd,
    priceUsd: row.priceUsd,
    recommended: row.recommended,
    // With no sample on show there is nothing to pick, so the package is ordered as usual.
    pickSample: row.pickSample && samplesOn,
  };
}

export function adminPackage(row: StorePackageRow, orders: number) {
  return {
    key: row.key,
    vi: row.textVi,
    en: row.textEn,
    priceVnd: row.priceVnd,
    priceUsd: row.priceUsd,
    visible: row.visible,
    recommended: row.recommended,
    pickSample: row.pickSample,
    orders,
    translations: translationState(row.key, row.textEn),
  };
}

/** Orders per package, cancelled ones left out. */
export async function orderCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ key: ordersTable.packageKey, n: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(ne(ordersTable.status, "cancelled"))
    .groupBy(ordersTable.packageKey);
  return new Map(rows.map((row) => [row.key, row.n]));
}

export function newPackageKey(name: string, taken: Set<string>): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/, "") || "package";
  for (;;) {
    const key = `${slug}-${randomBytes(3).toString("hex")}`;
    if (!taken.has(key)) return key;
  }
}

/** Only one package is recommended: marking one clears the mark on the others. */
export async function clearOtherRecommended(key: string): Promise<void> {
  await db
    .update(storePackagesTable)
    .set({ recommended: false, updatedAt: new Date() })
    .where(and(ne(storePackagesTable.key, key), eq(storePackagesTable.recommended, true)));
}

/* ---------------- first start ---------------- */

// The three packages the shop sold through Whop, with the same text and prices. Added once;
// after that the admin dashboard owns the price list.
const STARTING_PACKAGES: (typeof storePackagesTable.$inferInsert)[] = [
  {
    key: "personal",
    textVi: {
      name: "Source Cá Nhân",
      tagline: "Toàn bộ mã nguồn portfolio, tự tay cài đặt theo hướng dẫn.",
      features: [
        "Toàn bộ mã nguồn, sửa thoải mái",
        "Đẹp trên cả điện thoại và máy tính",
        "Hiệu ứng chuyển động dựng sẵn",
        "Sửa tên, dự án, ảnh trong một file duy nhất",
        "File README hướng dẫn đưa portfolio lên mạng từng bước",
        "Làm được 1 portfolio",
      ],
    },
    textEn: PACKAGE_TRANSLATIONS.personal.source,
    priceVnd: 299_000,
    priceUsd: 12,
    recommended: false,
    pickSample: true,
  },
  {
    key: "setup",
    textVi: {
      name: "Build Theo Yêu Cầu",
      tagline: "Bạn gửi yêu cầu, chúng tôi dựng portfolio giúp bạn.",
      features: [
        "Mọi thứ trong gói Source Cá Nhân",
        "Gửi yêu cầu bằng Word, README hoặc PDF kèm ảnh, có phác thảo càng tốt",
        "Dựng portfolio theo đúng yêu cầu của bạn",
        "Sửa 1 lần",
        "Hỗ trợ trong 30 ngày",
      ],
    },
    textEn: PACKAGE_TRANSLATIONS.setup.source,
    priceVnd: 1_290_000,
    priceUsd: 50,
    recommended: true,
    pickSample: false,
  },
  {
    key: "commercial",
    textVi: {
      name: "Trọn Gói A–Z",
      tagline: "Chúng tôi dựng, đưa lên mạng và lo luôn hosting, tên miền.",
      features: [
        "Mọi thứ trong gói Build Theo Yêu Cầu",
        "Sửa 3 lần",
        "Hosting 1 năm",
        "Tên miền 1 năm",
        "Hỗ trợ ưu tiên trong 90 ngày",
      ],
    },
    textEn: PACKAGE_TRANSLATIONS.commercial.source,
    priceVnd: 6_290_000,
    priceUsd: 250,
    recommended: false,
    pickSample: false,
  },
];

export async function seedPackages(): Promise<void> {
  const added = await db.transaction(async (tx) => {
    const [flag] = await tx
      .insert(siteSettingsTable)
      .values({ key: "packages_seeded", value: true })
      .onConflictDoNothing({ target: siteSettingsTable.key })
      .returning({ key: siteSettingsTable.key });
    if (!flag) return 0;
    const rows = await tx.insert(storePackagesTable).values(STARTING_PACKAGES).onConflictDoNothing().returning({ key: storePackagesTable.key });
    return rows.length;
  });
  if (added) {
    clearCatalogCache();
    logger.info({ added }, "Added the starting packages");
  }
}
