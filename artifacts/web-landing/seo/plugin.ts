import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { LANGUAGES } from "../src/lib/languages.ts";
import { localePath } from "../src/lib/locale-url.ts";
import { renderLocaleHtml, type LocaleMeta } from "./html.ts";

export function localeSeo(base: string, origin: string): Plugin {
  const site = new URL(origin);
  if (!["https:", "http:"].includes(site.protocol) || site.pathname !== "/" || site.search || site.hash) {
    throw new Error("SEO site origin must be an HTTP(S) origin without a path, query or fragment.");
  }
  const metas: LocaleMeta = Object.fromEntries(LANGUAGES.map((l) => [
    l.code, JSON.parse(readFileSync(new URL(`../src/locales/${l.code}.json`, import.meta.url), "utf8")).meta,
  ]));
  return {
    name: "locale-seo",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const pathname = (context.originalUrl ?? context.path ?? "/").split("?")[0];
        return renderLocaleHtml(html, pathname, origin, base, metas);
      },
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        if (!bundle["index.html"]) return; // Server bundle has no HTML entry.
        const index = bundle["index.html"];
        if (!index || index.type !== "asset") throw new Error("Missing built index.html");
        // Keep Vite's final hashed scripts/CSS, replacing only locale-specific metadata.
        const built = String(index.source);
        for (const l of LANGUAGES) {
          const output = renderLocaleHtml(built, localePath(l.code, base), origin, base, metas);
          this.emitFile({ type: "asset", fileName: `${l.code}/index.html`, source: output });
        }
      },
    },
  };
}
