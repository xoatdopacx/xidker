// Tiny Chrome DevTools Protocol helper for headless renders (logo PNG, video frames, site footage).
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

export const CHROMIUM = "/repl/tools/bin/chromium";

export async function launch({ port = 9333, args = [] } = {}) {
  const proc = spawn(
    CHROMIUM,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-color-profile=srgb",
      "--autoplay-policy=no-user-gesture-required",
      `--remote-debugging-port=${port}`,
      ...args,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );

  let wsUrl;
  for (let i = 0; i < 150 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(100);
    }
  }
  if (!wsUrl) {
    proc.kill("SIGKILL");
    throw new Error("chromium did not start");
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
      else resolve(msg.result);
    } else {
      for (const l of listeners) l(msg);
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  async function newPage({ width, height, dpr = 1, mobile = false } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    await s("Page.enable");
    await s("Runtime.enable");
    if (width) {
      await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
    }
    const page = {
      sessionId,
      send: s,
      on(method, fn) {
        const l = (m) => {
          if (m.sessionId === sessionId && m.method === method) fn(m.params);
        };
        listeners.add(l);
        return () => listeners.delete(l);
      },
      async goto(url) {
        const loaded = new Promise((resolve) => {
          const off = page.on("Page.loadEventFired", () => {
            off();
            resolve();
          });
        });
        await s("Page.navigate", { url });
        await loaded;
      },
      async eval(expression) {
        const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) {
          throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        }
        return r.result.value;
      },
      async shot(opts = {}) {
        const r = await s("Page.captureScreenshot", { format: "png", ...opts });
        return Buffer.from(r.data, "base64");
      },
    };
    return page;
  }

  async function close() {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
    proc.kill("SIGKILL");
  }

  return { send, newPage, close };
}
