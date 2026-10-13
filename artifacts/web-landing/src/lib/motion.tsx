import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

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

export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // .reveal starts 40px lower (translate3d), and IntersectionObserver measures the
    // transformed box. Extend the root by the same 40px so anything actually on screen
    // (e.g. the hero CTA at the fold) reveals on load instead of waiting for a scroll.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px 40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement & HTMLLIElement>} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
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

/** xidker mark: a Klein sphere resting inside a vermilion arch */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <radialGradient id="xk-s" cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#5a6bff" /><stop offset=".55" stopColor="hsl(234 76% 42%)" /><stop offset="1" stopColor="hsl(236 60% 18%)" /></radialGradient>
      </defs>
      <path d="M6 36 V20 a14 14 0 0 1 28 0 V36 h-6 V20 a8 8 0 0 0 -16 0 V36 Z" fill="hsl(var(--flare))" />
      <circle cx="20" cy="27" r="8" fill="url(#xk-s)" />
      <rect x="4" y="35" width="32" height="3" rx="1" fill="hsl(var(--ink))" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display font-extrabold tracking-[-.04em] lowercase ${className}`}>xidker<span className="text-[hsl(var(--flare))]">.</span></span>;
}

/** CSS-only gallery sculpture: sphere, arch, chrome ring on a plinth. Used as WebGL fallback and loader. */
export function ArtObject({ size = 280, spin = false, className = "", label }: { size?: number; spin?: boolean; className?: string; label?: string }) {
  return (
    <div role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={`persp relative ${className}`} style={{ width: size, height: size }}>
      <div className="art-plinth" />
      <div className="art-arch" />
      <div className={`art-ring ${spin ? "art-ring-spin" : ""}`} />
      <div className={`art-sphere ${spin ? "bob" : ""}`} />
      <div className="art-dot" />
    </div>
  );
}
