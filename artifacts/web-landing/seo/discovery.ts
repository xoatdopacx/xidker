import { LANGUAGES } from "../src/lib/languages.ts";
import { localePath, normalizedBase } from "../src/lib/locale-url.ts";
import { escapeHtml } from "./html.ts";

/** Only canonical sales pages; no invented last-modified dates. */
export function sitemapXml(origin: string, base: string): string {
  const urls = LANGUAGES.map(({ code }) =>
    `  <url><loc>${escapeHtml(new URL(localePath(code, base), origin).href)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function robotsTxt(origin: string, base: string): string {
  return `User-agent: *\nAllow: /\nSitemap: ${new URL(`${normalizedBase(base)}sitemap.xml`, origin).href}\n`;
}
