import type { Request } from "express";

// Public origin of the site, used to build the Whop redirect URL.
// Only hosts this app is actually served on are accepted, so a forged
// Origin header cannot point the post-payment redirect at another site.
export function resolveSiteOrigin(req: Request): string {
  const allowedHosts = [process.env.REPLIT_DOMAINS, process.env.REPLIT_DEV_DOMAIN]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of [req.get("origin"), req.get("referer")]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (allowedHosts.includes(url.host.toLowerCase())) {
        return url.origin;
      }
    } catch {
      // Not a valid URL; try the next candidate.
    }
  }

  const fallbackHost = allowedHosts[0];
  if (!fallbackHost) {
    throw new Error("Cannot determine the public site URL (REPLIT_DOMAINS is empty)");
  }
  return `https://${fallbackHost}`;
}
