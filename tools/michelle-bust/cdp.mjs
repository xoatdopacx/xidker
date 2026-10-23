// Small CDP helper: launch headless chromium (with software WebGL), drive one page.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333, webgl = true, extra = [] } = {}) {
  const dir = `/tmp/cdp/profile-${port}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const args = [
    "--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--autoplay-policy=no-user-gesture-required",
  ];
  if (webgl) args.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist");
  else args.push("--disable-gpu", "--disable-webgl", "--disable-3d-apis");
  args.push(...extra, "about:blank");
  const proc = spawn("/repl/tools/bin/chromium", args, { stdio: ["ignore", "ignore", "ignore"] });
  let ok = false;
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { ok = true; break; } } catch {}
    await sleep(100);
  }
  if (!ok) throw new Error("chromium did not start");
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === "page");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(`${msg.error.message}`)) : res(msg.result);
    } else for (const f of listeners) f(msg);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const logs = [];
  listeners.add((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ");
      logs.push(`[console.${msg.params.type}] ${text}`);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      logs.push(`[exception] ${d.exception?.description || d.text} @${d.url || ""}:${d.lineNumber}`);
    } else if (msg.method === "Log.entryAdded") {
      const e = msg.params.entry;
      if (e.level === "error" || e.level === "warning") logs.push(`[log.${e.level}] ${e.text} ${e.url || ""}`);
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  const page = {
    send, logs, proc, listeners,
    async viewport(width, height, { mobile = false, dpr = 1 } = {}) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
    },
    async media(features) { await send("Emulation.setEmulatedMedia", { features }); },
    async goto(url, waitMs = 0) {
      const loaded = new Promise((r) => { const f = (m) => { if (m.method === "Page.loadEventFired") { listeners.delete(f); r(); } }; listeners.add(f); });
      await send("Page.navigate", { url });
      await Promise.race([loaded, sleep(15000)]);
      if (waitMs) await sleep(waitMs);
    },
    async eval(expr, awaitPromise = true) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(file, clip) {
      for (let k = 0; k < 3; k++) {
        try {
          const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: clip.scale || 1 } } : {}) });
          writeFileSync(file, Buffer.from(r.data, "base64"));
          return file;
        } catch (e) { if (k === 2) throw e; await sleep(400); }
      }
    },
    async mouse(type, x, y, extra = {}) {
      await send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mouseReleased" ? 0 : type === "mousePressed" ? 1 : (extra.buttons ?? 0), clickCount: type === "mouseMoved" ? 0 : 1, ...extra });
    },
    async wheel(x, y, deltaY) { await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY }); },
    async key(key, code = key, keyCode = 0, mods = 0) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, modifiers: mods });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, modifiers: mods });
    },
    async close() { try { await send("Browser.close"); } catch {} try { proc.kill("SIGKILL"); } catch {} },
  };
  return page;
}

// Static file server for a folder.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2" };
export function serve(rootDir, port, headers = {}) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = normalize(join(rootDir, p));
      if (!file.startsWith(normalize(rootDir))) { res.writeHead(403); return res.end(); }
      let st = await stat(file).catch(() => null);
      if (st?.isDirectory()) { if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" }); return res.end(); } file = join(file, "index.html"); st = await stat(file).catch(() => null); }
      if (!st) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store", ...headers });
      res.end(await readFile(file));
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () => r(server)));
}
