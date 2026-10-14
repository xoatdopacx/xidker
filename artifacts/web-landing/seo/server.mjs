import { createServer } from "node:http";
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
let vite;
let productionRenderer;
const server = createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
    }
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.slice(1);
    const file = resolve(publicDir, relative);
    // Only public assets, never generated index shells or private source files in production.
    if (file.startsWith(publicDir + sep) && ![".html", ""].includes(extname(file))) {
      const info = await stat(file).catch(() => null);
      if (info?.isFile()) {
        res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream",
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
      url.pathname = `${base}${match.code}/`;
      url.searchParams.delete("lang");
      res.writeHead(302, { Location: `${url.pathname}${url.search}` }); res.end(); return;
    }
    let shell = await readFile(resolve(root, development ? "index.html" : "dist/public/index.html"), "utf8");
    if (development) shell = await vite.transformIndexHtml(req.url, shell);
    const packages = home ? await catalogForPage(renderer.pathLanguage(pathname, base) ?? "en") : null;
    const page = await renderer.renderPage(shell, pathname, base, packages);
    const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
    if (!page.indexable) headers["X-Robots-Tag"] = "noindex, follow";
    res.writeHead(page.status, headers);
    res.end(req.method === "HEAD" ? undefined : page.html);
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    // No credentials, request URLs or order references in logs.
    process.stderr.write(`Page render failed: ${error.message}\n`);
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow", "Retry-After": "60", "Cache-Control": "no-store" });
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
