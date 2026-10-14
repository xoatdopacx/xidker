import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Language } from "@workspace/api-client-react";
import { useI18n, loadDict, whenFontReady, shortCode, type Dict } from "@/lib/i18n";
import { settleRevealsInView } from "@/lib/motion";
import { snapshot, warmSnapshot } from "@/lib/pixel-snapshot";
import { Scene, type SceneName } from "@/components/scenes";
import { Sprite, HERO_A, HERO_B, HERO_PAL } from "@/components/sprites";

/* Pixel "loading" transition between scenes (anchor jumps, language changes, the thank-you check).
 * Cover: the screen is snapshotted onto a canvas and coarsened 8 → 16 → 32 → 64 px while a dithered
 * wave of ink spreads from where the visitor clicked. A loading card waits on the ink while the
 * change happens underneath, then the new screen is snapshotted and uncovered the other way
 * (ink retreats from the centre over 32 px blocks, then 16 → 8 → 4 px → live).
 * All drawing happens on canvases a quarter of the screen size (8 px ink cells), shown with
 * `image-rendering: pixelated`, so a frame costs well under a millisecond.
 * The card's bar and walker run as compositor animations, so they keep moving while the page
 * underneath is busy re-rendering (a language change can block the main thread for a while). */

export type Point = { x: number; y: number };
export type CardSpec = {
  scene: SceneName;
  /** Small line above the title. */
  label: (t: Dict) => ReactNode;
  title: (t: Dict) => string;
  sub?: (t: Dict) => string;
};
type HoldOpts = { minHold?: number; failSafe?: number };
type PixelApi = {
  /** Changes the language behind the loading card, keeping the reading position. */
  switchLang: (code: Language, origin?: Point) => void;
  /** Shows the loading card straight away (no cover animation) until the returned release is called. */
  hold: (card: CardSpec, opts?: HoldOpts) => () => void;
};

const Ctx = createContext<PixelApi | null>(null);
/** The transition API, or null outside the provider. */
export const usePixelTransition = () => useContext(Ctx);

const HEADER = 64;
const FRAME = 42;
const SEGS = 12;
const LEVELS = [4, 8, 16, 32, 64] as const;
type Level = (typeof LEVELS)[number];
/* little-endian RGBA as one 32-bit word: #1b2a1c and #1f3121 */
const INK = [0xff1c2a1b, 0xff21311f];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/* [mosaic block, ink amount] per frame */
const OUT: [Level | 0, number][] = [[8, 0], [16, 0], [32, 0.14], [64, 0.32], [64, 0.52], [64, 0.72], [64, 0.9], [0, 1]];
const IN: [Level | 0, number][] = [[32, 0.12], [32, 0.3], [32, 0.5], [16, 0.7], [16, 0.9], [8, 1], [4, 1]];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const frames2 = () => frame().then(frame);
async function until(test: () => boolean, cap: number) {
  const end = performance.now() + cap;
  while (!test() && performance.now() < end) await sleep(40);
}

/* ---------- canvases ---------- */

class Mosaic {
  W = 0; H = 0; cw = 0; ch = 0;
  snap = document.createElement("canvas");
  lv = new Map<Level, HTMLCanvasElement>();
  ink = document.createElement("canvas");
  img: ImageData | null = null;
  px = new Uint32Array(0);
  col = new Uint32Array(0);
  T = new Float32Array(0);
  has = false;
  constructor(public disp: HTMLCanvasElement) {}

  /** Sizes everything to the viewport rounded up to 64 px, so every level halves exactly. */
  size() {
    const W = Math.ceil(window.innerWidth / 64) * 64, H = Math.ceil(window.innerHeight / 64) * 64;
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    for (const k of LEVELS) {
      const c = this.lv.get(k) ?? document.createElement("canvas");
      c.width = W / k; c.height = H / k;
      this.lv.set(k, c);
    }
    this.disp.width = W / 4; this.disp.height = H / 4;
    this.disp.style.width = `${W}px`; this.disp.style.height = `${H}px`;
    const cw = (this.cw = W / 8), ch = (this.ch = H / 8);
    this.ink.width = cw; this.ink.height = ch;
    this.img = this.ink.getContext("2d")!.createImageData(cw, ch);
    this.px = new Uint32Array(this.img.data.buffer);
    this.col = new Uint32Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) this.col[y * cw + x] = INK[(x + y) & 1];
    this.T = new Float32Array(cw * ch);
  }

  /** Allocates the canvases ahead of time; a first allocation can cost more than a whole frame. */
  warm() {
    this.size();
    this.snap.width = this.W / 2; this.snap.height = this.H / 2;
    for (const c of [this.snap, this.ink, this.disp, ...this.lv.values()]) {
      const x = c.getContext("2d");
      x?.fillRect(0, 0, 1, 1);
      x?.clearRect(0, 0, 1, 1);
    }
  }

  /** Snapshots the screen (minus the overlay) and builds the 4–64 px mosaics from it. */
  capture(skip: Element) {
    this.has = false;
    try {
      snapshot({ region: { x: 0, y: 0, w: this.W, h: this.H }, scale: 0.5, skip, into: this.snap });
      let prev: HTMLCanvasElement = this.snap;
      for (const k of LEVELS) {
        const cv = this.lv.get(k)!, c = cv.getContext("2d")!;
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "low"; // an exact half-size bilinear draw averages each 2x2 block
        c.clearRect(0, 0, cv.width, cv.height);
        c.drawImage(prev, 0, 0, cv.width, cv.height);
        prev = cv;
      }
      this.has = true;
    } catch { /* uncover straight onto the live page */ }
  }

  /** Ink order: distance from `o` mixed with a 4x4 Bayer matrix, so the edge is a dithered wave. */
  sweep(o: Point) {
    const { cw, ch, T } = this;
    const vx = window.innerWidth / 8, vy = window.innerHeight / 8;
    const cx = o.x / 8, cy = o.y / 8;
    const max = Math.hypot(Math.max(cx, vx - cx), Math.max(cy, vy - cy)) || 1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / max);
      T[y * cw + x] = (0.62 * d + 0.38 * (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) * 0.999;
    }
  }

  /** grow: cells below `q` are ink. shrink: cells at or above `q` are ink. */
  paint(level: Level | 0, q: number, mode: "grow" | "shrink") {
    const d = this.disp.getContext("2d");
    if (!d) return;
    d.imageSmoothingEnabled = false;
    if (level && this.has) d.drawImage(this.lv.get(level)!, 0, 0, this.disp.width, this.disp.height);
    else d.clearRect(0, 0, this.disp.width, this.disp.height);
    if (mode === "grow" ? q <= 0 : q >= 1) return;
    const { px, col, T, img } = this;
    const n = T.length;
    if (mode === "grow") for (let i = 0; i < n; i++) px[i] = T[i] < q ? col[i] : 0;
    else for (let i = 0; i < n; i++) px[i] = T[i] >= q ? col[i] : 0;
    this.ink.getContext("2d")!.putImageData(img!, 0, 0);
    d.drawImage(this.ink, 0, 0, this.disp.width, this.disp.height);
  }

  clear() { this.disp.getContext("2d")?.clearRect(0, 0, this.disp.width, this.disp.height); }
}

/* ---------- cards ---------- */

const stageLabel = (num: string) => (t: Dict) => <>{t.stage} <span className="font-num text-base">{num}</span></>;

function stageCard(id: string): CardSpec {
  switch (id) {
    case "ban-nhan-gi": return { scene: "bike", label: stageLabel("01"), title: (t) => t.stops.what.title };
    case "cach-dung": return { scene: "bus", label: stageLabel("04"), title: (t) => t.stops.how.title };
    case "bang-gia": return { scene: "air", label: stageLabel("06"), title: (t) => t.pricing.title };
    case "hoi-dap": return { scene: "launch", label: stageLabel("07"), title: (t) => t.faq.title };
    default: return { scene: "home", label: stageLabel("00"), title: (t) => t.scene.start };
  }
}

function langCard(from: Language, to: Language): CardSpec {
  return {
    scene: "signpost",
    label: () => (
      <span className="inline-flex items-center gap-1.5 font-num text-sm" dir="ltr">
        {shortCode(from)} <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> {shortCode(to)}
      </span>
    ),
    title: (t) => t.scene.lang,
  };
}

/* ---------- reading position across a language change ---------- */

type Anchor = { el: Element; f: number } | null;
function captureAnchor(): Anchor {
  if (window.scrollY < 2) return null; // at the very top: stay at the very top
  const y = window.innerHeight * 0.3;
  let hit: Anchor = null;
  document.querySelectorAll("section, footer").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) hit = { el, f: (y - r.top) / (r.height || 1) }; // last match = innermost
  });
  return hit;
}
function restoreAnchor(a: Anchor) {
  if (!a || !a.el.isConnected) return;
  const r = a.el.getBoundingClientRect();
  const delta = r.top + a.f * r.height - window.innerHeight * 0.3;
  if (Math.abs(delta) > 1) window.scrollTo({ top: window.scrollY + delta, behavior: "instant" as ScrollBehavior });
}

/** The address bar keeps only the page and its language (/vi/): section jumps never add "#section". */
function clearHash() {
  if (location.hash) history.replaceState(history.state, "", `${location.pathname}${location.search}`);
}

function jumpTo(el: HTMLElement, id: string) {
  const top = id === "top" ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER);
  window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  settleRevealsInView();
}

/** An older shared link such as /vi/#hoi-dap still opens at its section, then the "#…" is dropped. */
function landFromAddress() {
  let id = "";
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  clearHash();
  requestAnimationFrame(() => jumpTo(el, id));
}

function land(el: HTMLElement, id: string) {
  jumpTo(el, id);
  clearHash();
  const h = el.querySelector<HTMLElement>("h1, h2") ?? el;
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: true });
}

/* ---------- provider ---------- */

export function PixelTransitionProvider({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const qc = useQueryClient();
  const [card, setCard] = useState<CardSpec | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const live = useRef({ lang, setLang, qc });
  live.current = { lang, setLang, qc };

  const engine = useMemo(() => {
    let mos: Mosaic | null = null;
    let busy = false, token = 0, timers: number[] = [], commit: (() => void) | null = null;
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    const getMos = () => (mos ??= cv.current ? new Mosaic(cv.current) : null);
    const center = (): Point => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    /* segment i lights at step i + 1; the percentage for step n is its own label stacked over the
     * previous ones (each label is at least as wide as the one before), so steps are opacity only */
    const parts = () => {
      const b = bar.current, c = pct.current;
      return b && c ? { segs: Array.from(b.querySelectorAll<HTMLElement>("b")), nums: Array.from(c.children) as HTMLElement[], walker: b.querySelector<HTMLElement>(".px-walk"), span: b.clientWidth - 20 } : null;
    };
    const show = (el: HTMLElement | undefined, on: boolean) => {
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.opacity = on ? "1" : "0";
    };
    /** Sets the bar to `n` lit segments now, dropping any steps still queued. */
    const setBar = (n: number) => {
      const p = parts();
      if (!p) return;
      p.segs.forEach((s, i) => show(s, i < n));
      p.nums.forEach((s, i) => show(s, i <= n));
      if (p.walker) {
        p.walker.getAnimations().forEach((a) => a.cancel());
        p.walker.style.transform = `translateX(${(n / SEGS) * p.span}px)`;
      }
    };
    /** Segments lit right now (queued steps included once their time has come). */
    const litNow = () => parts()?.segs.filter((s) => getComputedStyle(s).opacity === "1").length ?? 0;
    /** Steps the bar from `a` to `b` segments over `ms`, starting after `delay`. Every step is
     * queued up front as a compositor animation, so a busy main thread cannot stall it. */
    const creep = (tok: number, a: number, b: number, ms: number, delay = 0) => {
      const p = parts();
      if (b <= a) return;
      // the card renders a moment after the transition starts: queue the steps once it is there
      if (!p) { later(() => { if (tok === token) creep(tok, a, b, ms, Math.max(0, delay - 16)); }, 16); return; }
      const step = ms / (b - a);
      for (let n = a + 1; n <= b; n++) {
        const at = { duration: 1, delay: delay + (n - a) * step, fill: "forwards" as const };
        p.segs[n - 1]?.animate([{ opacity: 0 }, { opacity: 1 }], at);
        p.nums[n]?.animate([{ opacity: 0 }, { opacity: 1 }], at);
      }
      p.walker?.animate(
        [{ transform: `translateX(${(a / SEGS) * p.span}px)` }, { transform: `translateX(${(b / SEGS) * p.span}px)` }],
        { duration: ms, delay, easing: `steps(${b - a}, end)`, fill: "forwards" },
      );
    };

    const idle = () => {
      const r = root.current;
      if (r) { r.dataset.phase = "idle"; delete r.dataset.card; }
      mos?.clear();
    };
    /** Ends the current transition now; whatever it was changing still happens. */
    const abort = (tok: number) => {
      if (tok !== token) return;
      token++;
      timers.splice(0).forEach((x) => window.clearTimeout(x));
      const c = commit;
      commit = null;
      busy = false;
      idle();
      c?.();
    };
    const end = (tok: number) => {
      if (tok !== token) return;
      timers.splice(0).forEach((x) => window.clearTimeout(x));
      commit = null;
      busy = false;
      idle();
    };
    const begin = (spec: CardSpec, change: () => void, failSafe: number, renderNow = false) => {
      const tok = ++token;
      busy = true;
      let done = false;
      commit = () => { if (!done) { done = true; change(); } };
      // the card is only needed once the screen is covered: render it after the first frame
      if (renderNow) setCard(spec);
      else later(() => { if (tok === token) setCard(spec); }, 0);
      setBar(0); // a card from an earlier transition is still mounted (hidden): reset it now
      later(() => abort(tok), failSafe);
      return tok;
    };
    const play = (tok: number, seq: [Level | 0, number][], mode: "grow" | "shrink") => new Promise<boolean>((resolve) => {
      const m = getMos();
      if (!m) return resolve(false);
      const t0 = performance.now();
      let shown = 0;
      const tick = () => {
        if (tok !== token) return resolve(false);
        const el = performance.now() - t0;
        const k = Math.min(seq.length, Math.floor(el / FRAME) + 1);
        if (k > shown) { shown = k; m.paint(seq[k - 1][0], seq[k - 1][1], mode); }
        if (el >= seq.length * FRAME) return resolve(true);
        requestAnimationFrame(tick);
      };
      tick();
    });

    /** Pixelates the live screen away into ink, then shows the card. The first frame is drawn
     * synchronously, so the page never flashes between the click and the effect. */
    const cover = async (tok: number, origin: Point) => {
      const m = getMos(), r = root.current;
      if (!m || !r) return false;
      m.size();
      m.capture(r);
      m.sweep(origin);
      r.dataset.phase = "out";
      delete r.dataset.card;
      if (!(await play(tok, OUT, "grow"))) return false;
      r.dataset.phase = "hold";
      r.dataset.card = "in";
      return true;
    };
    /** Snapshots the new screen and uncovers it from the centre. */
    const reveal = async (tok: number) => {
      const m = getMos(), r = root.current;
      if (!m || !r) return;
      r.dataset.card = "out";
      await sleep(120);
      if (tok !== token) return;
      m.size();
      m.capture(r);
      m.sweep(center());
      r.dataset.phase = "in";
      await play(tok, IN, "shrink");
    };

    const go = async (el: HTMLElement, id: string, origin: Point) => {
      const tok = begin(stageCard(id), () => land(el, id), 3200);
      if (!(await cover(tok, origin))) { abort(tok); return; }
      creep(tok, 0, SEGS, 380, 110);
      await sleep(250); // the card finishes opening before the page jumps underneath it
      if (tok !== token) return;
      commit?.();
      await sleep(290);
      if (tok !== token) return;
      await frames2();
      if (tok !== token) return;
      await reveal(tok);
      end(tok);
    };

    const api: PixelApi = {
      switchLang(code, origin) {
        const { lang: from, setLang: set } = live.current;
        if (code === from) return;
        if (busy || reducedMotion() || !getMos()) { set(code); return; }
        const dict = loadDict(code).catch(() => null);
        busy = true; // claimed now; the cover starts next frame, once the picker has closed
        requestAnimationFrame(async () => {
          const anchor = captureAnchor();
          // the font stylesheet is added by setLang, under the card: adding it restyles the whole
          // page, which would stall the cover. The re-render runs in slices (a transition).
          const tok = begin(langCard(from, code), () => startTransition(() => live.current.setLang(code)), 9000);
          if (!(await cover(tok, origin ?? center()))) { abort(tok); return; }
          const shown = performance.now();
          creep(tok, 0, 8, 1100, 120);
          await Promise.all([Promise.race([dict, sleep(2500)]), sleep(250)]); // let the card open first
          if (tok !== token) return;
          commit?.();
          await until(() => document.documentElement.lang === code, 4000);
          await frames2();
          await Promise.race([whenFontReady(code), sleep(1500)]);
          void document.body.offsetHeight; // lay out once so the new fonts start loading
          await frame();
          await Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(1500)]);
          await until(() => live.current.qc.isFetching() === 0, 2500);
          if (tok !== token) return;
          restoreAnchor(anchor);
          settleRevealsInView();
          timers.splice(0).forEach((x) => window.clearTimeout(x));
          later(() => abort(tok), 3000);
          const lit = litNow();
          setBar(lit);
          creep(tok, lit, SEGS, 40 * (SEGS - lit));
          await sleep(Math.max(200, 650 - (performance.now() - shown)));
          await frames2();
          if (tok !== token) return;
          await reveal(tok);
          end(tok);
        });
      },
      hold(spec, { minHold = 900, failSafe = 8000 } = {}) {
        const m = getMos(), r = root.current;
        if (reducedMotion() || !m || !r) return () => {};
        if (busy) abort(token);
        const tok = begin(spec, () => {}, failSafe, true);
        m.size();
        m.has = false;
        m.paint(0, 1, "grow");
        r.dataset.phase = "hold";
        r.dataset.card = "in";
        const start = performance.now();
        creep(tok, 0, 4, 300, 120);
        creep(tok, 4, 8, 700, 500);
        creep(tok, 8, 10, 1600, 1400);
        let released = false;
        return () => {
          if (released || tok !== token) return;
          released = true;
          later(async () => {
            if (tok !== token) return;
            setBar(SEGS);
            await sleep(160);
            await frames2();
            if (tok !== token) return;
            await reveal(tok);
            end(tok);
          }, Math.max(0, minHold - (performance.now() - start)));
        };
      },
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const id = href.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      if (busy) return;
      if (reducedMotion() || !getMos()) { land(el, id); return; }
      const ar = a.getBoundingClientRect();
      const origin = e.detail === 0 ? { x: ar.left + ar.width / 2, y: ar.top + ar.height / 2 } : { x: e.clientX, y: e.clientY };
      void go(el, id, origin);
    };

    return { api, onClick, warm: () => getMos()?.warm(), stop: () => abort(token) };
  }, []);

  useEffect(() => {
    landFromAddress();
    document.addEventListener("click", engine.onClick);
    const r = root.current;
    // the cover must not let the page scroll underneath it
    const block = (e: Event) => { if (r && r.dataset.phase !== "idle") e.preventDefault(); };
    r?.addEventListener("wheel", block, { passive: false });
    r?.addEventListener("touchmove", block, { passive: false });
    const idleCb = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 600));
    const warmId = idleCb(() => { warmSnapshot(); engine.warm(); });
    return () => {
      document.removeEventListener("click", engine.onClick);
      r?.removeEventListener("wheel", block);
      r?.removeEventListener("touchmove", block);
      (window.cancelIdleCallback ?? window.clearTimeout)(warmId as number);
      engine.stop();
    };
  }, [engine]);

  return (
    <Ctx.Provider value={engine.api}>
      {/* before the pages, so its refs exist when a page's layout effect calls hold() */}
      <div ref={root} className="px-ov" data-phase="idle" data-testid="scene-transition" aria-hidden="true">
        <canvas ref={cv} className="px-cv" />
        {card && (
          <div className="px-card tile p-5 text-center">
            <div className="px-dio"><Scene name={card.scene} className="relative mx-auto" /></div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin))]">{card.label(t)}</p>
            <p className="font-display text-xl leading-tight mt-1 text-[#10230f]">{card.title(t)}</p>
            {card.sub && <p className="mt-1 text-sm font-semibold text-[#2c3a2c]">{card.sub(t)}</p>}
            <div ref={bar} className="px-bar mt-9" dir="ltr">
              <span className="px-walk"><Sprite art={HERO_A} palette={HERO_PAL} px={2} className="pw-a" /><Sprite art={HERO_B} palette={HERO_PAL} px={2} className="pw-b" /></span>
              {Array.from({ length: SEGS }, (_, i) => <i key={i}><b /></i>)}
            </div>
            <p className="mt-2 flex justify-between text-xs font-bold text-[#1b2a1c]">
              <span>{t.scene.loading}<span className="blink">_</span></span>
              <span ref={pct} className="px-pct font-num" dir="ltr">
                {Array.from({ length: SEGS + 1 }, (_, i) => <em key={i}>{Math.round((i / SEGS) * 100)}%</em>)}
              </span>
            </p>
          </div>
        )}
      </div>
      {children}
    </Ctx.Provider>
  );
}
