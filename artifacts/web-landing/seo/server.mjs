import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
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
const mime = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".ico": "image/x-icon", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain", ".xml": "application/xml",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
};
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
 * Scripts a page may run: our own files, inline scripts carrying this response's nonce, and the
 * inline event handlers written in the shell (the font stylesheet's onload). The nonce goes on the shell's scripts
 * before any rendered content is added, so nothing that comes from data can carry it.
 * Only the admin page may send files to App Storage (sample pictures go there straight from the browser).
 */
function pagePolicy(shell, admin) {
  const nonce = randomBytes(16).toString("base64");
  const handlers = [...new Set([...shell.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => sha256(decodeAttribute(m[1]))))];
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${handlers.length ? ` 'unsafe-hashes' ${handlers.join(" ")}` : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self'${admin ? " https://storage.googleapis.com" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  return { shell: shell.replace(/<script\b/g, `<script nonce="${nonce}"`), csp };
}

/**
 * The live demos of the templates on sale (public/demo/<slug>/). They run sandboxed in an origin of their own, so
 * a demo can never act with the visitor's sign-in on this site, and they load their pictures, videos and fonts from
 * wherever the template does. Never in search results.
 */
const DEMO_CSP = [
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  // 3D model loaders read their embedded textures through blob: and data: URLs.
  "connect-src 'self' https: data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");
/**
 * In development the workspace URL is private: Replit answers only requests that carry the signed-in user's cookie.
 * Browsers leave that cookie off requests made by a sandboxed page (its origin is opaque), so a demo's own styles,
 * scripts and pictures would come back as Replit's login page. Opened through that URL, a demo therefore keeps this
 * site's origin. Development only: local checks on localhost and the published site (public) keep the full sandbox.
 */
const privateDevHosts = new Set(
  development
    ? [process.env.REPLIT_DEV_DOMAIN, ...(process.env.REPLIT_DOMAINS ?? "").split(",")]
        .map((host) => host?.trim().toLowerCase())
        .filter(Boolean)
    : [],
);
const DEMO_CSP_PRIVATE_DEV = DEMO_CSP.replace("sandbox allow-scripts", "sandbox allow-scripts allow-same-origin");
const requestHost = (req) => String(req.headers.host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
async function serveDemo(req, res, url, pathname, relative) {
  const demoRoot = resolve(publicDir, "demo");
  let file = resolve(publicDir, relative);
  if (file !== demoRoot && !file.startsWith(demoRoot + sep)) return false;
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    // Relative asset paths inside a demo need the trailing slash.
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { ...commonHeaders, Location: `${pathname}/${url.search}` }); res.end(); return true;
    }
    file = resolve(file, "index.html");
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) return false;
  const type = mime[extname(file)];
  const headers = {
    ...commonHeaders,
    "Content-Type": type ?? "application/octet-stream",
    "Cache-Control": "public, max-age=300",
    "X-Robots-Tag": "noindex, nofollow",
    // The sandboxed page has an origin of its own, so its files must be loadable from another origin.
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (extname(file) === ".html") {
    headers["Content-Security-Policy"] = privateDevHosts.has(requestHost(req)) ? DEMO_CSP_PRIVATE_DEV : DEMO_CSP;
  } else {
    // Module scripts and crossorigin stylesheets are CORS requests; from the sandbox their origin is "null".
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Accept-Ranges"] = "bytes";
  }
  // Videos that the visitor scrubs through need byte ranges (Safari will not play a video without them).
  const range = extname(file) === ".html" ? null : /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const size = info.size;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { ...commonHeaders, "Content-Range": `bytes */${size}` }); res.end(); return true;
    }
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") { res.end(); return true; }
    createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
    return true;
  }
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : await readFile(file));
  return true;
}

/** Old addresses: the thank-you page of the Whop checkout and the old admin address. */
const MOVED = { "cam-on": "tai-khoan", admin: "quan-tri" };

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
    const moved = MOVED[relative.replace(/\/$/, "")];
    if (moved) {
      res.writeHead(301, { ...commonHeaders, Location: `${base}${moved}${url.search}` }); res.end(); return;
    }
    if ((relative === "demo" || relative.startsWith("demo/")) && await serveDemo(req, res, url, pathname, relative)) return;
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
    const policy = development ? null : pagePolicy(shell, pathname.replace(/\/$/, "") === `${base}quan-tri`);
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
