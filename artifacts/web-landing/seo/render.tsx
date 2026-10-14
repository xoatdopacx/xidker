import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import App from "../src/App";
import { ErrorBoundary } from "../src/components/error-boundary";
import { loadDict } from "../src/lib/i18n";
import type { Language, Package } from "@workspace/api-client-react";
import { LANGUAGES } from "../src/lib/languages";
import { isHomePath, pathLanguage } from "../src/lib/locale-url";
import { renderLocaleHtml, escapeHtml } from "./html";
import { siteOrigin } from "./site";
import { sitemapXml, robotsTxt } from "./discovery";
import { localePath } from "../src/lib/locale-url";
import { productSchema, serializeJson } from "../src/lib/product-schema";

const dictionaries = import.meta.glob("../src/locales/*.json", { eager: true, import: "default" }) as Record<string, { meta: { title: string; description: string } }>;
const metas = Object.fromEntries(LANGUAGES.map(({ code }) => [code, dictionaries[`../src/locales/${code}.json`].meta]));

/** `packages: null` means no fresh catalog: the pricing section renders its loading state and the browser fetches. */
export async function renderPage(shell: string, pathname: string, base: string, packages: Package[] | null = null) {
  const lang = (pathLanguage(pathname, base) ?? "en") as Language;
  const dict = await loadDict(lang);
  let html = renderLocaleHtml(shell, pathname, siteOrigin, base, metas);
  if (isHomePath(pathname, base)) {
    const initial = { lang, dict, packages };
    const requestClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    let markup: string;
    try {
      markup = renderToString(<ErrorBoundary><App initial={initial} ssrPath={pathname} requestClient={requestClient} /></ErrorBoundary>);
    } finally {
      requestClient.clear();
    }
    // JSON script data cannot terminate the element or introduce HTML, even with catalog input.
    const data = JSON.stringify(initial).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    const product = productSchema(dict, packages, lang === "vi" ? "vnd" : "usd", new URL(localePath(lang, base), siteOrigin).href);
    html = html.replace("</head>", () => `<script id="product-schema" type="application/ld+json">${serializeJson(product)}</script>\n</head>`);
    html = html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div><script id="initial-page" type="application/json">${data}</script>`);
    return { html, status: 200, indexable: true };
  }
  const thanks = pathname === `${base.replace(/\/$/, "")}/cam-on`;
  const admin = pathname === `${base.replace(/\/$/, "")}/admin`;
  const title = thanks ? dict.thanks.loading : admin ? "Admin — xidker" : dict.nf.metaTitle;
  const body = thanks ? dict.thanks.loading : admin ? "Admin" : dict.nf.body;
  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*(")/g, (_, a, b) => `${a}${escapeHtml(body)}${b}`)
    .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*(")/g, (_, a, b) => `${a}${escapeHtml(title)}${b}`)
    .replace('content="index, follow"', 'content="noindex, follow"')
    .replace(/<!-- locale-seo:start -->[\s\S]*?<!-- locale-seo:end -->/, "")
    .replace('<div id="root"></div>', `<div id="root"><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><a href="${base}">${escapeHtml(dict.nf.back)}</a></main></div>`);
  return { html, status: thanks || admin ? 200 : 404, indexable: false };
}

export { isHomePath, pathLanguage, LANGUAGES };
export { localePath };
export const discoveryFiles = (base: string) => ({
  "sitemap.xml": sitemapXml(siteOrigin, base),
  "robots.txt": robotsTxt(siteOrigin, base),
});
