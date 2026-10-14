import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCatalogCache } from "./catalog-cache.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const development = process.argv.includes("--dev");
const port = Number(process.env.PORT);
const base = process.env.BASE_PATH;
if (!port || !base) throw new Error("PORT and BASE_PATH are required");
const publicDir = resolve(root, development ? "public" : "dist/public");
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "application/xml", ".woff2": "font/woff2", ".json": "application/json" };
// Never a visitor-supplied host. Development goes through the shared path router on localhost:80. A deployment
// runs every service in one container with nothing listening on localhost:80, so production calls the API service
// on the port its artifact.toml declares (artifacts/api-server: PORT 8080).
const catalogOrigin = development ? "http://localhost:80" : "http://127.0.0.1:8080";
const catalog = createCatalogCache({
  fetchCatalog: async (lang) => {
    const response = await fetch(`${catalogOrigin}/api/packages?lang=${encodeURIComponent(lang)}`, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Catalog unavailable (${response.status})`);
    return response.json();
  },
});
const CATALOG_WAIT_MS = 3_000;
/** Fresh catalog for the server render, or null. Without it the page still renders (HTTP 200) with the pricing
 * section loading, and the browser fetches prices after hydration — never stale prices, and never a 503 that
 * would also fail the deployment's startup check on "/". A slow fetch keeps running and fills the cache. */
async function catalogForPage(lang) {
  const job = catalog(lang).catch((error) => {
    process.stderr.write(`Catalog unavailable for server render: ${error.message}\n`);
    return null;
  });
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(resolve, CATALOG_WAIT_MS, null); });
  try {
    return await Promise.race([job, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
// Security headers. The workspace preview frames the dev server and Vite adds inline scripts there, so framing,
// isolation and script rules apply to the published server only.
const WHOP_PIXEL = "https://t.whop.tw"; // index.html snippet: loads s.js and its chunks, posts page views back
const commonHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  ...(development ? {} : { "X-Frame-Options": "SAMEORIGIN", "Cross-Origin-Opener-Policy": "same-origin" }),
};
/** Link previews may load the share card and the icon from other sites; every other file stays ours. */
const embeddable = new Set(["share-card.png", "favicon.svg"]);
const assetHeaders = (relative) => development ? commonHeaders
  : { ...commonHeaders, "Cross-Origin-Resource-Policy": embeddable.has(relative) ? "cross-origin" : "same-origin" };
const errorPageHeaders = development ? commonHeaders
  : { ...commonHeaders, "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'" };

const decodeAttribute = (value) => value.replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ({ amp: "&", quot: '"', "#39": "'", lt: "<", gt: ">" })[e]);
const sha256 = (text) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
/**
 * Scripts a page may run: our own files, the Whop pixel, inline scripts carrying this response's nonce, and the
 * inline event handlers written in the shell (the font stylesheet's onload). The nonce goes on the shell's scripts
 * before any rendered content is added, so nothing that comes from data can carry it.
 */
function pagePolicy(shell) {
  const nonce = randomBytes(16).toString("base64");
  const handlers = [...new Set([...shell.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => sha256(decodeAttribute(m[1]))))];
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${handlers.length ? `'unsafe-hashes' ${handlers.join(" ")} ` : ""}${WHOP_PIXEL}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${WHOP_PIXEL}`,
    "worker-src 'self' blob:", // the Whop pixel runs one check in a worker made from a blob
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  return { shell: shell.replace(/<script\b/g, `<script nonce="${nonce}"`), csp };
}

let vite;
let productionRenderer;
const server = createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { ...commonHeaders, Allow: "GET, HEAD" }); res.end(); return;
    }
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.slice(1);
    if (pathname === `${base}en/` || pathname === `${base}en`) {
      res.writeHead(301, { ...commonHeaders, Location: `${base}${url.search}` }); res.end(); return;
    }
    if (pathname === `${base}sitemap.xml` || pathname === `${base}robots.txt`) {
      const renderer = development ? await vite.ssrLoadModule("/seo/render.tsx") : productionRenderer;
      const body = renderer.discoveryFiles(base)[relative];
      res.writeHead(200, { ...assetHeaders(relative), "Content-Type": relative === "sitemap.xml" ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" });
      res.end(req.method === "HEAD" ? undefined : body); return;
    }
    const file = resolve(publicDir, relative);
    // Only public assets, never generated index shells or private source files in production.
    if (file.startsWith(publicDir + sep) && ![".html", ""].includes(extname(file))) {
      const info = await stat(file).catch(() => null);
      if (info?.isFile()) {
        res.writeHead(200, { ...assetHeaders(relative), "Content-Type": mime[extname(file)] ?? "application/octet-stream",
          "Cache-Control": relative.startsWith("assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300" });
        res.end(req.method === "HEAD" ? undefined : await readFile(file)); return;
      }
    }
    if (development && /^\/(?:@|src\/|node_modules\/|__)/.test(pathname)) {
      vite.middlewares(req, res, () => { res.writeHead(404); res.end(); }); return;
    }
    const renderer = development ? await vite.ssrLoadModule("/seo/render.tsx") : productionRenderer;
    const home = renderer.isHomePath(pathname, base);
    // Preserve old language links with an explicit redirect, avoiding hydration/locale disagreement.
    const queryLang = url.searchParams.get("lang");
    const match = renderer.LANGUAGES.find((l) => l.code.toLowerCase() === queryLang?.toLowerCase());
    if (home && match && !renderer.pathLanguage(pathname, base)) {
      url.pathname = renderer.localePath(match.code, base);
      url.searchParams.delete("lang");
      res.writeHead(302, { ...commonHeaders, Location: `${url.pathname}${url.search}` }); res.end(); return;
    }
    let shell = await readFile(resolve(root, development ? "index.html" : "dist/public/index.html"), "utf8");
    if (development) shell = await vite.transformIndexHtml(req.url, shell);
    const policy = development ? null : pagePolicy(shell);
    if (policy) shell = policy.shell;
    const packages = home ? await catalogForPage(renderer.pathLanguage(pathname, base) ?? "en") : null;
    const page = await renderer.renderPage(shell, pathname, base, packages);
    const headers = { ...commonHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
    if (policy) headers["Content-Security-Policy"] = policy.csp;
    if (!page.indexable) headers["X-Robots-Tag"] = "noindex, follow";
    res.writeHead(page.status, headers);
    res.end(req.method === "HEAD" ? undefined : page.html);
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    // No credentials, request URLs or order references in logs.
    process.stderr.write(`Page render failed: ${error.message}\n`);
    res.writeHead(503, { ...errorPageHeaders, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow", "Retry-After": "60", "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : '<!doctype html><html lang="en"><head><title>Temporarily unavailable — xidker</title><meta name="robots" content="noindex, follow"></head><body><h1>Temporarily unavailable</h1><p>Please try again shortly.</p></body></html>');
  }
});
if (development) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: "custom" });
} else {
  productionRenderer = await import("../dist/server/render.js");
}
server.listen(port, "0.0.0.0");
