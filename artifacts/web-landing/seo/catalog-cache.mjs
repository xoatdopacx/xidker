/** Short-lived, bounded, request-coalesced cache of the real public catalog API.
 * Fail closed after expiration: never advertise indefinitely stale prices.
 */
export function createCatalogCache({ fetchCatalog, ttl = 60_000, now = Date.now }) {
  const entries = new Map();
  const pending = new Map();
  return async function get(lang) {
    const hit = entries.get(lang);
    if (hit && now() - hit.at < ttl) return hit.value;
    if (pending.has(lang)) return pending.get(lang);
    const job = Promise.resolve().then(() => fetchCatalog(lang)).then((value) => {
      if (!Array.isArray(value)) throw new Error("Invalid catalog response");
      entries.set(lang, { value, at: now() });
      return value;
    }).finally(() => pending.delete(lang));
    pending.set(lang, job);
    return job;
  };
}
