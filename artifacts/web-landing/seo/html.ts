import { LANGUAGES } from "../src/lib/languages.ts";
import { localePath, normalizedBase, pathLanguage } from "../src/lib/locale-url.ts";

type Meta = { title: string; description: string };
export type LocaleMeta = Record<string, Meta>;
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Origin comes from the confirmed site configuration, never a guessed host. */
export function renderLocaleHtml(shell: string, pathname: string, origin: string, base: string, metas: LocaleMeta): string {
  const code = pathLanguage(pathname, base) ?? "en";
  const lang = LANGUAGES.find((l) => l.code === code)!;
  const meta = metas[code];
  const canonical = new URL(localePath(code, base), origin).href;
  const absolute = (path: string) => escapeHtml(new URL(path, origin).href);
  const alternates = LANGUAGES.map((l) =>
    `    <link rel="alternate" hreflang="${l.code}" href="${absolute(localePath(l.code, base))}" />`).join("\n");
  const links = LANGUAGES.map((l) =>
    `<a href="${localePath(l.code, base)}" hreflang="${l.code}" lang="${l.code}" dir="${l.dir}">${escapeHtml(l.native)}</a>`).join(" · ");
  return shell
    .replace(/<html[^>]*>/, `<html lang="${code}" dir="${lang.dir}">`)
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*(")/g, `$1${escapeHtml(meta.description).replace(/\$/g, "$$$$")}$2`)
    .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*(")/g, `$1${escapeHtml(meta.title).replace(/\$/g, "$$$$")}$2`)
    .replace(/<!-- locale-seo -->|<!-- locale-seo:start -->[\s\S]*?<!-- locale-seo:end -->/, `<!-- locale-seo:start -->
    <link rel="canonical" href="${escapeHtml(canonical)}" />
${alternates}
    <link rel="alternate" hreflang="x-default" href="${absolute(normalizedBase(base))}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:locale" content="${lang.locale.replace(/-/g, "_")}" />
    <meta property="og:image" content="${absolute(`${normalizedBase(base)}share-card.png`)}" />
    <meta name="twitter:image" content="${absolute(`${normalizedBase(base)}share-card.png`)}" />
    <!-- locale-seo:end -->`)
    .replace("<!-- locale-links -->", `<noscript><nav aria-label="Languages">${links}</nav></noscript>`);
}
