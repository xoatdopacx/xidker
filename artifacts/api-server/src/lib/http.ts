import type { Response } from "express";

/** Why a customer request failed; the site shows the matching text in the visitor's language. */
export type ErrorReason =
  | "invalid_input"
  | "invalid_email"
  | "email_not_allowed"
  | "weak_password"
  | "wrong_credentials"
  | "locked"
  | "too_many"
  | "wrong_code"
  | "code_expired"
  | "mail_failed"
  | "payments_off"
  | "pending_limit"
  | "package_gone"
  | "sample_gone"
  | "sample_required"
  | "not_cancellable"
  | "no_order";

export function fail(res: Response, status: number, reason: ErrorReason, error: string): void {
  res.status(status).json({ error, reason });
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
