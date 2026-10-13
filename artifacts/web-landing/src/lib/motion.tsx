import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

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
 * Cards are built from 3D pixel tiles when they enter the viewport. State lives in DOM data
 * attributes (data-rv / data-built), so re-renders (e.g. language switch) never replay it.
 * Overlays are absolutely positioned inside the card: no layout height change, ever.
 * A shared rAF scroll check (not IntersectionObserver) means cards scrolled past during a fast
 * jump are finished instantly instead of staying hidden, and anything on screen at load builds
 * immediately on mount. */
const pending = new Map<HTMLElement, number>();
let installed = false, raf = 0;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function finalize(el: HTMLElement) {
  el.querySelectorAll(":scope > .rv-ov").forEach((n) => n.remove());
  el.dataset.rv = "built";
  el.dataset.built = "true";
}

function build(el: HTMLElement, animated: boolean) {
  const base = pending.get(el) ?? 0;
  pending.delete(el);
  if (!animated || reducedMotion()) return finalize(el);
  const er = el.getBoundingClientRect();
  const marker = el.closest("section")?.querySelector("[data-road]");
  const mx = marker ? marker.getBoundingClientRect().left : 0;
  const fromLeft = mx < er.left + er.width / 2;
  const cols = er.width < 420 ? 6 : 8;
  const rows = Math.max(2, Math.min(10, Math.round(er.height / (er.width / cols))));
  const ov = document.createElement("div");
  ov.className = "rv-ov";
  ov.setAttribute("aria-hidden", "true");
  ov.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  ov.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = document.createElement("i");
    const col = fromLeft ? c : cols - 1 - c;
    const d = Math.round((col + r * 0.35 + ((r * 7 + c * 13) % 5) * 0.12) * 22);
    i.style.setProperty("--td", `${d}ms`);
    if ((r * 5 + c * 3) % 11 === 0) i.className = "g";
    frag.appendChild(i);
  }
  ov.appendChild(frag);
  el.style.setProperty("--dir", fromLeft ? "1" : "-1");
  el.style.setProperty("--rvd", `${base}ms`);
  el.dataset.rv = "build";
  el.appendChild(ov);
  const done = () => { window.clearTimeout(timer); if (el.dataset.rv === "build") finalize(el); };
  const timer = window.setTimeout(done, 1300 + base);
  ov.addEventListener("animationend", (e) => { if (e.target === ov) done(); });
}

function check() {
  raf = 0;
  const vh = window.innerHeight;
  pending.forEach((_, el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0) build(el, false);
    else if (r.top < vh) build(el, true);
  });
}
function schedule() { if (!raf) raf = requestAnimationFrame(check); }

/** Finish every pending card currently in (or above) the viewport without animation. */
export function settleRevealsInView() {
  const vh = window.innerHeight;
  pending.forEach((_, el) => { if (el.getBoundingClientRect().top < vh) build(el, false); });
}

export function Reveal({ children, delay = 0, className = "", as: Tag = "div", hero = false }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li"; hero?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.built) return;
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

