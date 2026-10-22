/**
 * The package a signed-out visitor chose. It waits here while they create an account or sign in, and the order
 * is placed right after. Kept for two hours at most.
 */
export type OrderIntent = { packageId: string; sampleId?: string; name: string };

const KEY = "xidker-order-intent";
const TTL_MS = 2 * 60 * 60_000;

export function saveIntent(intent: OrderIntent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch { /* storage blocked: the visitor picks the package again after signing in */ }
}

export function readIntent(): OrderIntent | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw.packageId !== "string" || typeof raw.name !== "string" || typeof raw.at !== "number") return null;
    if (Date.now() - raw.at > TTL_MS || raw.at > Date.now() + 60_000) { clearIntent(); return null; }
    return {
      packageId: raw.packageId,
      name: raw.name,
      ...(typeof raw.sampleId === "string" ? { sampleId: raw.sampleId } : {}),
    };
  } catch {
    return null;
  }
}

export function clearIntent() {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}
