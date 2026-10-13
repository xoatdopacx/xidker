import type { Request } from "express";

// Hosts this app is actually served on (published domains and the dev domain).
export function allowedHosts(): string[] {
  return [process.env.REPLIT_DOMAINS, process.env.REPLIT_DEV_DOMAIN]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the value is a URL on one of this app's own hosts. */
export function isOwnOrigin(value: string): boolean {
  try {
    return allowedHosts().includes(new URL(value).host.toLowerCase());
  } catch {
    return false;
  }
}

// Public origin of the site, used to build the Whop redirect URL.
// Only hosts this app is actually served on are accepted, so a forged
// Origin header cannot point the post-payment redirect at another site.
export function resolveSiteOrigin(req: Request): string {
  for (const candidate of [req.get("origin"), req.get("referer")]) {
    if (candidate && isOwnOrigin(candidate)) {
      return new URL(candidate).origin;
    }
  }

  const fallbackHost = allowedHosts()[0];
  if (!fallbackHost) {
    throw new Error("Cannot determine the public site URL (REPLIT_DOMAINS is empty)");
  }
  return `https://${fallbackHost}`;
}
