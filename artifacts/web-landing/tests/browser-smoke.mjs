/** Run with the landing/API workflows running. No real checkout is created. */
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "seo-browser-"));
const chrome = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let text = "";
    const timer = setTimeout(() => reject(new Error("Chromium did not start")), 20_000);
    chrome.stderr.on("data", (chunk) => {
      text += chunk;
      const match = text.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  ws = new WebSocket(endpoint);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let seq = 0, session;
  const pending = new Map(), errors = [];
  const call = (method, params = {}, sessionId = session) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  let checkoutBody;
  ws.addEventListener("message", async ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p?.reject(new Error(msg.error.message)); else p?.resolve(msg.result);
    }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text + " " + JSON.stringify(msg.params.exceptionDetails.exception));
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(JSON.stringify(msg.params.args));
    if (msg.method === "Fetch.requestPaused") {
      checkoutBody = JSON.parse(msg.params.request.postData);
      await call("Fetch.fulfillRequest", { requestId: msg.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify({ ref: "smoke-only", purchaseUrl: "about:blank#checkout-smoke" })).toString("base64") });
    }
  });
  const { targetId } = await call("Target.createTarget", { url: "about:blank" });
  ({ sessionId: session } = await call("Target.attachToTarget", { targetId, flatten: true }));
  await call("Page.enable"); await call("Runtime.enable");
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression, ms = 20_000) => {
    const end = Date.now() + ms;
    do {
      if (await evaluate(expression)) return;
      await new Promise((r) => setTimeout(r, 150));
    } while (Date.now() < end);
    throw new Error(`Timed out: ${expression}`);
  };
  for (const code of ["en", "vi", "ar"]) {
    await call("Page.navigate", { url: `http://localhost:80/${code}/` });
    await until(`document.documentElement?.lang === "${code}" && !!document.querySelector('[data-testid^="button-buy-"]') && !!document.querySelector('[data-testid="faq-item-1"]')`);
    // Allow hydration and reveal effects to finish.
    await new Promise((r) => setTimeout(r, 1000));
    assert.equal(await evaluate("document.documentElement.dir"), code === "ar" ? "rtl" : "ltr");
    await evaluate(`document.querySelector('[data-testid="faq-item-1"]').click()`);
    await until(`document.querySelector('[data-testid="faq-item-1"]').getAttribute('aria-expanded') === 'true'`);
    assert.equal(await evaluate(`document.querySelector('#faq-a-1').getAttribute('aria-hidden')`), "false");
    await evaluate(`document.querySelector('[data-testid="button-currency-usd"]')?.click()`);
    await until(`document.querySelector('[data-testid="button-currency-usd"]')?.getAttribute('aria-checked') === 'true' || !document.querySelector('[data-testid="button-currency-usd"]')`);
    console.info(`Hydration + FAQ + currency: ${code}`);
  }
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/checkout", requestStage: "Request" }] });
  await evaluate(`document.querySelector('[data-testid^="button-buy-"]').click()`);
  await until(`location.href === 'about:blank#checkout-smoke'`);
  assert.ok(checkoutBody?.packageId?.startsWith("plan_"));
  console.info("Checkout button submits real plan ID and follows hosted checkout URL (intercepted; no payment session created)");
  await call("Fetch.disable");
  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await call("Page.navigate", { url: "http://localhost:80/vi/" });
  await new Promise((r) => setTimeout(r, 1500));
  // Runtime evaluation works with script execution disabled, but no page JavaScript runs.
  await until(`!!document.querySelector('h1') && !!document.querySelector('[data-testid^="button-buy-"]') && !!document.querySelector('#faq-a-4')`);
  console.info("No-JavaScript page contains H1, catalog and FAQ");
  assert.deepEqual(errors, [], "Browser errors or hydration mismatches");
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
  await new Promise((r) => chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch((error) => console.warn(`Browser profile cleanup: ${error.message}`));
}
