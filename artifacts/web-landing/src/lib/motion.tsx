import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { snapshot } from "@/lib/pixel-snapshot";

export function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** progress 0..1 of an element passing through the viewport */
export function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = (vh - r.top) / (r.height + vh);
      setP(Math.min(1, Math.max(0, v)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return [ref, p] as const;
}

/* ---------- Pixel "build" reveal ----------
 * When a card enters the viewport it is snapshotted onto a small canvas and drawn back in from
 * coarse to fine: 32 px blocks dither in from the road's side, then 16 -> 8 -> 4 px -> the real card.
 * State lives in DOM data attributes (data-rv / data-built), so re-renders (e.g. a language switch)
 * never replay it. The canvas is absolutely positioned inside the card: no layout change, ever.
 * A shared rAF scroll check (not IntersectionObserver) means cards scrolled past during a fast
 * jump are finished instantly instead of staying hidden, and anything on screen at load builds
 * immediately on mount. */
const pending = new Map<HTMLElement, number>();
let installed = false, raf = 0;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MARGIN = 32; // room around the card for its shadow and badges that stick out
const STEP = 40; // ms per frame
/* [block size, share of the 32 px blocks shown] per frame */
const BUILD: [number, number][] = [[32, 0.25], [32, 0.5], [32, 0.75], [32, 1], [16, 1], [8, 1], [4, 1]];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type Job = { el: HTMLElement; cv: HTMLCanvasElement; lv: Map<number, HTMLCanvasElement>; at: number; shown: number; order: Float32Array; bw: number; bh: number };
const jobs = new Map<HTMLElement, Job>();
/* canvases are recycled: allocating one costs more than drawing into it */
const pool: HTMLCanvasElement[] = [];
let jobRaf = 0;

function take(w: number, h: number) {
  const c = pool.pop() ?? document.createElement("canvas");
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  else c.getContext("2d")?.clearRect(0, 0, w, h);
  return c;
}

function finalize(el: HTMLElement) {
  const j = jobs.get(el);
  if (j) {
    jobs.delete(el);
    j.cv.remove();
    if (pool.length < 24) pool.push(j.cv, ...j.lv.values());
  }
  el.dataset.rv = "built";
  el.dataset.built = "true";
}

function paintJob(j: Job, [size, q]: [number, number]) {
  const c = j.cv.getContext("2d");
  const src = j.lv.get(size);
  if (!c || !src) return;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, j.cv.width, j.cv.height);
  const f = size / 4; // canvas px per block
  if (q >= 1) { c.drawImage(src, 0, 0, src.width * f, src.height * f); return; }
  for (let y = 0; y < j.bh; y++) for (let x = 0; x < j.bw; x++) {
    if (j.order[y * j.bw + x] < q) c.drawImage(src, x, y, 1, 1, x * f, y * f, f, f);
  }
}

function tick() {
  jobRaf = 0;
  const now = performance.now();
  jobs.forEach((j) => {
    if (!j.el.isConnected) return finalize(j.el);
    const k = Math.floor((now - j.at) / STEP);
    if (k < 0) return;
    if (k >= BUILD.length) return finalize(j.el);
    if (k >= j.shown) { j.shown = k + 1; paintJob(j, BUILD[k]); }
  });
  if (jobs.size) jobRaf = requestAnimationFrame(tick);
}

function build(el: HTMLElement, animated: boolean) {
  const base = pending.get(el) ?? 0;
  pending.delete(el);
  if (jobs.has(el)) return;
  if (!animated || reducedMotion()) return finalize(el);
  try {
    const er = el.getBoundingClientRect();
    const w4 = Math.ceil((er.width + 2 * MARGIN) / 4), h4 = Math.ceil((er.height + 2 * MARGIN) / 4);
    // the contents are shown only for the snapshot; "build" hides them again before anything paints
    el.dataset.rv = "snap";
    const lv4 = snapshot({ region: { x: er.left - MARGIN, y: er.top - MARGIN, w: w4 * 4, h: h4 * 4 }, scale: 0.25, root: el, into: take(w4, h4) });
    const lv = new Map<number, HTMLCanvasElement>([[4, lv4]]);
    let prev = lv4;
    for (const k of [8, 16, 32]) {
      const c = take(Math.ceil(prev.width / 2), Math.ceil(prev.height / 2));
      const x = c.getContext("2d");
      if (x) {
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "low"; // a half-size bilinear draw averages each 2x2 block
        x.drawImage(prev, 0, 0, prev.width / 2, prev.height / 2);
      }
      lv.set(k, c);
      prev = c;
    }
    // the 32 px blocks arrive from the road's side, dithered
    const marker = el.closest("section")?.querySelector("[data-road]");
    const mx = marker ? marker.getBoundingClientRect().left : 0;
    const fromLeft = mx < er.left + er.width / 2;
    const bw = prev.width, bh = prev.height;
    const order = new Float32Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const u = bw > 1 ? (fromLeft ? x : bw - 1 - x) / (bw - 1) : 0;
      order[y * bw + x] = 0.55 * u + 0.45 * ((BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16);
    }
    const cv = take(w4, h4);
    cv.className = "rv-px";
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = `left:${-MARGIN}px;top:${-MARGIN}px;width:${w4 * 4}px;height:${h4 * 4}px`;
    el.dataset.rv = "build";
    el.appendChild(cv);
    jobs.set(el, { el, cv, lv, at: performance.now() + base, shown: 0, order, bw, bh });
    if (!jobRaf) jobRaf = requestAnimationFrame(tick);
  } catch {
    finalize(el);
  }
}

function check() {
  raf = 0;
  const vh = window.innerHeight;
  pending.forEach((_, el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0) build(el, false);
    else if (r.top < vh * 0.92 || r.bottom <= vh) build(el, true);
  });
}
function schedule() { if (!raf) raf = requestAnimationFrame(check); }

/** Finish every card in (or above) the viewport now, including any mid-build. */
export function settleRevealsInView() {
  const vh = window.innerHeight;
  pending.forEach((_, el) => { if (el.getBoundingClientRect().top < vh) build(el, false); });
  jobs.forEach((j) => finalize(j.el));
}

export function Reveal({ children, delay = 0, className = "", as: Tag = "div", hero = false }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li"; hero?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.built || jobs.has(el)) return;
    if (hero || reducedMotion()) { el.dataset.built = "true"; return; }
    el.dataset.rv = "wait";
    pending.set(el, delay);
    if (!installed) {
      installed = true;
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    }
    check();
    return () => { pending.delete(el); };
  }, [hero, delay]);
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement & HTMLLIElement>} data-reveal className={`${hero ? "hero-in" : ""} ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

export function formatPrice(amount: number, currency: string, locale = "vi-VN") {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount);
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}

