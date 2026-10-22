/** HTTP status of a failed API call; 0 when the request never got an answer (offline, blocked, timed out). */
export function statusOf(err: unknown): number {
  const s = (err as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : 0;
}

/** The `error` string from an API error body, or "" when there is none. */
export function serverError(err: unknown): string {
  const e = (err as { data?: { error?: unknown } | null } | null)?.data?.error;
  return typeof e === "string" ? e : "";
}

/** The machine-readable `reason` from an API error body, or "" when there is none. */
export function reasonOf(err: unknown): string {
  const r = (err as { data?: { reason?: unknown } | null } | null)?.data?.reason;
  return typeof r === "string" ? r : "";
}
