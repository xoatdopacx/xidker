import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useListPackages, useCreateCheckout, getListPackagesQueryKey } from "@workspace/api-client-react";
import type { Package } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowDownRight, Check, Loader2, RefreshCw, Shapes, Gauge, Smartphone, MousePointerClick, Sparkles, PenTool, Box, Rocket, Plus, Mail, CloudOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Reveal, useSectionProgress, usePrefersReducedMotion, hasWebGL, formatPrice, Logo, Wordmark, ArtObject } from "@/lib/motion";
import { useI18n, LangSwitch, CONTACT_EMAIL, type Dict } from "@/lib/i18n";

const HeroScene = lazy(() => import("@/components/hero-scene"));

function Nav() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-[hsl(var(--paper)/.82)] backdrop-blur-md border-b border-[hsl(var(--ink)/.1)]" : ""}`}>
      <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home">
          <Logo className="h-8 w-8" />
          <Wordmark className="text-2xl" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#lap-rap" className="hover:text-primary transition-colors" data-testid="link-nav-method">{t.nav.method}</a>
          <a href="#quy-trinh" className="hover:text-primary transition-colors" data-testid="link-nav-process">{t.nav.process}</a>
          <a href="#bang-gia" className="hover:text-primary transition-colors" data-testid="link-nav-pricing">{t.nav.pricing}</a>
          <a href="#hoi-dap" className="hover:text-primary transition-colors" data-testid="link-nav-faq">{t.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <a href="#bang-gia" className="btn-3d hidden sm:inline-block rounded-full bg-[hsl(var(--flare))] text-[hsl(var(--paper))] px-5 py-2 text-sm font-semibold border-2 border-[hsl(var(--ink))]" data-testid="button-nav-cta">{t.nav.cta}</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useI18n();
  const reduced = usePrefersReducedMotion();
  const [gl, setGl] = useState<boolean | null>(null);
  const progress = useRef(0);
  useEffect(() => {
    setGl(hasWebGL());
    const on = () => { progress.current = Math.min(1, window.scrollY / window.innerHeight); };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const fallback = <div className="h-full w-full flex items-center justify-center"><ArtObject size={300} spin={!reduced} label={t.hero.sceneAlt} /></div>;
  return (
    <section id="top" className="relative min-h-[100dvh] pt-24 overflow-hidden grid-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-12 gap-6 items-center min-h-[calc(100dvh-6rem)]">
        <div className="md:col-span-6 relative z-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[.25em] text-primary mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-primary" /> {t.hero.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-display font-extrabold leading-[.92] tracking-[-.03em] text-[clamp(2.8rem,7.2vw,6.4rem)]" data-testid="text-hero-title">
              {t.hero.l1}<br />
              <span className="text-primary italic">{t.hero.l2}</span><br />
              {t.hero.l3}
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-7 max-w-md text-lg text-muted-foreground leading-relaxed">{t.hero.sub}</p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#bang-gia" className="btn-3d group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-4 font-semibold border-2 border-[hsl(var(--ink))]" data-testid="button-hero-cta">
                {t.hero.cta} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#lap-rap" className="inline-flex items-center gap-2 font-semibold underline decoration-2 underline-offset-4 decoration-[hsl(var(--flare))]" data-testid="link-hero-method">
                {t.hero.secondary} <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
        <div className="md:col-span-6 relative h-[46vh] md:h-[78vh]">
          <div className="absolute inset-[10%] rounded-full bg-[hsl(var(--sun)/.5)] blur-3xl" aria-hidden />
          <div className="relative h-full w-full" role="img" aria-label={t.hero.sceneAlt}>
            {gl === null ? null : gl ? <Suspense fallback={fallback}><HeroScene progress={progress} reduced={reduced} /></Suspense> : fallback}
          </div>
          <div className="absolute bottom-6 left-0 bg-[hsl(var(--paper))] border border-[hsl(var(--ink)/.25)] px-4 py-2.5 shadow-sm" data-testid="text-hero-plaque">
            <p className="font-display font-bold text-sm italic">xidker</p>
            <p className="font-mono text-[10px] text-muted-foreground">{t.hero.plaque}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const { t } = useI18n();
  const items = ["Cà phê Mộc Lan", "Học viện Nét Chữ", "Gốm Bát Tràng Xanh", "Lụa Hội An House", "Yoga cùng Thảo", "Trà Shan Tuyết Hà Giang", "Excel Thực Chiến", "Nến Thơm Đà Lạt"];
  const row = [...items, ...items];
  return (
    <div className="relative border-y-2 border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-[hsl(var(--paper))] py-5 overflow-hidden -rotate-1 scale-[1.02]" aria-label={t.marqueeLabel}>
      <div className="marquee flex w-max gap-12 whitespace-nowrap font-display text-2xl md:text-3xl font-bold" aria-hidden>
        {row.map((n, i) => (
          <span key={i} className="flex items-center gap-12">{n}<svg viewBox="0 0 20 20" className="h-5 w-5"><circle cx="10" cy="10" r="8" fill="hsl(var(--klein))" /><circle cx="13" cy="7" r="3" fill="hsl(var(--flare))" /></svg></span>
        ))}
      </div>
    </div>
  );
}

const PANES = [
  { tint: "hsl(42 60% 97% / .82)", ink: "hsl(var(--ink))" },
  { tint: "hsl(48 96% 58% / .62)", ink: "hsl(var(--ink))" },
  { tint: "hsl(234 76% 48% / .72)", ink: "hsl(var(--paper))" },
  { tint: "hsl(12 100% 55% / .78)", ink: "hsl(var(--paper))" },
];

function PaneArt({ i }: { i: number }) {
  if (i === 0) return <svg viewBox="0 0 100 100" className="w-3/5 self-center"><path d="M10 70 Q 40 10 90 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><circle cx="90" cy="40" r="5" fill="currentColor" /></svg>;
  if (i === 1) return <svg viewBox="0 0 100 100" className="w-3/5 self-center"><rect x="8" y="8" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="40" y="40" width="52" height="52" fill="currentColor" opacity=".35" /></svg>;
  if (i === 2) return <svg viewBox="0 0 100 100" className="w-3/5 self-center"><circle cx="45" cy="55" r="34" fill="currentColor" opacity=".9" /><path d="M20 30 A 40 40 0 0 1 90 30" fill="none" stroke="hsl(var(--sun))" strokeWidth="5" /></svg>;
  return <svg viewBox="0 0 100 100" className="w-3/5 self-center"><path d="M15 90 V50 a35 35 0 0 1 70 0 V90" fill="none" stroke="currentColor" strokeWidth="10" /></svg>;
}

function Exploded() {
  const { t } = useI18n();
  const [ref, p] = useSectionProgress<HTMLElement>();
  const spread = Math.sin(Math.min(1, Math.max(0, (p - 0.15) / 0.6)) * Math.PI);
  return (
    <section id="lap-rap" ref={ref} className="relative py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-5">
          <Reveal><p className="font-mono text-xs uppercase tracking-[.25em] text-[hsl(var(--flare))] mb-4">{t.method.eyebrow}</p></Reveal>
          <Reveal delay={80}><h2 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] tracking-tight">{t.method.title}</h2></Reveal>
          <Reveal delay={160}><p className="mt-6 text-lg text-muted-foreground leading-relaxed">{t.method.sub}</p></Reveal>
          <ol className="mt-10 space-y-5">
            {t.method.layers.map((l, i) => (
              <Reveal key={i} delay={200 + i * 70} as="li">
                <div className="flex gap-4 items-start group">
                  <span className="font-mono text-sm mt-1 w-8 shrink-0 text-primary">0{i + 1}</span>
                  <div className="border-b border-[hsl(var(--ink)/.15)] pb-4 flex-1">
                    <p className="font-display font-bold text-xl group-hover:translate-x-1 transition-transform">{l.name}</p>
                    <p className="text-muted-foreground mt-1">{l.note}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="md:col-span-7 persp h-[440px] md:h-[620px] flex items-center justify-center" aria-hidden>
          <div className="p3d relative w-[240px] h-[320px] md:w-[340px] md:h-[440px]" style={{ transform: `rotateX(${20 + spread * 8}deg) rotateY(${-38 + p * 30}deg)` }}>
            {t.method.layers.map((l, i) => (
              <div key={i} className="absolute inset-0 border border-[hsl(var(--ink)/.35)] p-5 flex flex-col justify-between backdrop-blur-[2px]"
                style={{ background: PANES[i].tint, color: PANES[i].ink, transform: `translateZ(${(i - 1.5) * (10 + spread * 90)}px) translateX(${(i - 1.5) * spread * 18}px)`, transition: "transform .15s linear", boxShadow: "0 30px 60px -30px hsl(var(--ink)/.4)" }}>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest"><span>{t.method.layerWord} 0{i + 1}</span><span>{l.name}</span></div>
                <PaneArt i={i} />
                {i === 3 ? <div className="self-start rounded-full bg-[hsl(var(--ink))] text-[hsl(var(--paper))] px-4 py-1.5 font-semibold text-xs flex items-center gap-2">{t.method.buy} <ArrowRight className="h-3 w-3" /></div> : <span className="font-display italic text-sm opacity-70">xidker, {2022 + i}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useI18n();
  return (
    <section className="bg-primary text-primary-foreground py-24 relative overflow-hidden">
      <svg className="absolute -right-24 -top-24 h-96 w-96 opacity-20" viewBox="0 0 200 200" aria-hidden><circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeDasharray="4 8" /><circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" /></svg>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal><h2 className="font-display font-extrabold text-3xl md:text-5xl max-w-3xl leading-tight">{t.stats.title}</h2></Reveal>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6">
          {t.stats.items.map((s, i) => (
            <Reveal key={i} delay={i * 90}>
              <div className="border-t-2 border-[hsl(var(--paper)/.4)] pt-5">
                <p className="font-display font-extrabold text-6xl md:text-7xl tracking-tight" data-testid={`text-stat-${i}`}>{s.v}<span className="text-2xl text-[hsl(var(--sun))] ml-1">{s.u}</span></p>
                <p className="mt-3 text-sm opacity-80 max-w-[18ch]">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURE_ICONS = [Shapes, Gauge, Smartphone, MousePointerClick];

function Features() {
  const { t } = useI18n();
  return (
    <section className="py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid md:grid-cols-12 gap-8 mb-16">
          <Reveal className="md:col-span-7"><h2 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] tracking-tight">{t.features.title}</h2></Reveal>
          <Reveal delay={100} className="md:col-span-5 md:pt-4"><p className="text-lg text-muted-foreground">{t.features.sub}</p></Reveal>
        </div>
        <div className="grid md:grid-cols-2 gap-5 persp">
          {t.features.items.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Reveal key={i} delay={i * 80}>
                <TiltCard className={i % 3 === 0 ? "bg-[hsl(var(--card))]" : "bg-[hsl(var(--muted))]"}>
                  <div className="h-14 w-14 rounded-full bg-[hsl(var(--ink))] text-[hsl(var(--sun))] flex items-center justify-center mb-8" style={{ transform: "translateZ(40px)" }}><Icon className="h-7 w-7" /></div>
                  <h3 className="font-display font-bold text-2xl" style={{ transform: "translateZ(25px)" }}>{f.t}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{f.d}</p>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`p3d rounded-3xl border-2 border-[hsl(var(--ink))] p-8 md:p-10 h-full transition-transform duration-200 ease-out ${className}`}>
      {children}
    </div>
  );
}

const STEP_ICONS = [Sparkles, PenTool, Box, Rocket];

function Process() {
  const { t } = useI18n();
  return (
    <section id="quy-trinh" className="py-28 md:py-36 bg-[hsl(var(--ink))] text-[hsl(var(--paper))] relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal><p className="font-mono text-xs uppercase tracking-[.25em] text-[hsl(var(--sun))] mb-4">{t.process.eyebrow}</p></Reveal>
        <Reveal delay={80}><h2 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] tracking-tight max-w-3xl">{t.process.title}</h2></Reveal>
        <div className="mt-16 grid md:grid-cols-4 gap-px bg-[hsl(var(--paper)/.15)] rounded-3xl overflow-hidden">
          {t.process.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Reveal key={i} delay={i * 110}>
                <div className="group bg-[hsl(var(--ink))] p-7 md:p-8 h-full hover:bg-primary transition-colors duration-300">
                  <div className="flex items-center justify-between mb-12">
                    <span className="font-display font-extrabold text-5xl text-[hsl(var(--paper)/.2)] group-hover:text-[hsl(var(--sun))] transition-colors">0{i + 1}</span>
                    <Icon className="h-6 w-6 text-[hsl(var(--flare))] group-hover:text-[hsl(var(--paper))] group-hover:-rotate-12 transition-all" />
                  </div>
                  <p className="font-mono text-xs text-[hsl(var(--sun))] mb-2">{s.day}</p>
                  <h3 className="font-display font-bold text-xl">{s.t}</h3>
                  <p className="mt-3 text-sm opacity-70 leading-relaxed">{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function billingLabel(p: Package, t: Dict) {
  if (p.billing === "one_time") return t.pricing.oneTime;
  if (p.billingPeriodDays === 30 || p.billingPeriodDays === 31) return t.pricing.monthly;
  if (p.billingPeriodDays === 365) return t.pricing.yearly;
  if (p.billingPeriodDays) return t.pricing.everyNDays(p.billingPeriodDays);
  return t.pricing.recurring;
}

function PackageCard({ p, i, busy, disabled, onBuy }: { p: Package; i: number; busy: boolean; disabled: boolean; onBuy: () => void }) {
  const { t, locale } = useI18n();
  const rec = p.recommended;
  return (
    <Reveal delay={i * 110} className="h-full">
      <div className={`relative h-full flex flex-col rounded-3xl border-2 border-[hsl(var(--ink))] p-7 md:p-8 transition-transform duration-300 hover:-translate-y-2 ${rec ? "bg-primary text-primary-foreground md:-translate-y-4 md:hover:-translate-y-6 shadow-[12px_12px_0_hsl(var(--flare))]" : "bg-card shadow-[8px_8px_0_hsl(var(--ink))]"}`} data-testid={`card-package-${p.id}`}>
        {rec && <span className="absolute -top-4 left-7 rounded-full bg-[hsl(var(--sun))] text-[hsl(var(--ink))] border-2 border-[hsl(var(--ink))] px-4 py-1 text-xs font-bold uppercase tracking-wider">{t.pricing.recommended}</span>}
        <h3 className="font-display font-extrabold text-2xl" data-testid={`text-package-name-${p.id}`}>{p.name}</h3>
        {p.tagline && <p className={`mt-2 text-sm ${rec ? "opacity-80" : "text-muted-foreground"}`}>{p.tagline}</p>}
        <div className="mt-7 flex items-baseline gap-2 flex-wrap">
          <span className="font-display font-extrabold text-4xl md:text-5xl tracking-tight" data-testid={`text-package-price-${p.id}`}>{formatPrice(p.price, p.currency, locale)}</span>
          <span className={`text-sm ${rec ? "opacity-80" : "text-muted-foreground"}`}>{billingLabel(p, t)}</span>
        </div>
        <ul className="mt-7 space-y-3 flex-1">
          {p.features.map((f, k) => (
            <li key={k} className="flex gap-3 text-sm leading-relaxed">
              <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${rec ? "bg-[hsl(var(--sun))] text-[hsl(var(--ink))]" : "bg-[hsl(var(--ink))] text-[hsl(var(--paper))]"}`}><Check className="h-3 w-3" strokeWidth={3} /></span>
              {f}
            </li>
          ))}
        </ul>
        <button onClick={onBuy} disabled={disabled} className={`btn-3d mt-8 w-full rounded-full border-2 border-[hsl(var(--ink))] py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${rec ? "bg-[hsl(var(--flare))] text-[hsl(var(--paper))]" : "bg-[hsl(var(--paper))] text-[hsl(var(--ink))]"}`} data-testid={`button-buy-${p.id}`}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t.pricing.opening}</> : <>{t.pricing.choose} <ArrowRight className="h-5 w-5" /></>}
        </button>
      </div>
    </Reveal>
  );
}

function Pricing() {
  const { t, lang } = useI18n();
  const { data, isLoading, isError, refetch, isFetching } = useListPackages({ lang });
  const qc = useQueryClient();
  const checkout = useCreateCheckout();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const buy = (id: string) => {
    if (checkout.isPending) return;
    const inFrame = window.self !== window.top;
    const tab = inFrame ? window.open("", "_blank") : null;
    setPendingId(id);
    checkout.mutate(
      { data: { packageId: id } },
      {
        onSuccess: (s) => {
          if (inFrame && tab) { tab.location.href = s.purchaseUrl; setPendingId(null); }
          else window.location.assign(s.purchaseUrl);
        },
        onError: () => {
          tab?.close();
          setPendingId(null);
          toast({ variant: "destructive", title: t.pricing.toastTitle, description: t.pricing.toastBody });
        },
      },
    );
  };

  return (
    <section id="bang-gia" className="py-28 md:py-40 grid-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Reveal><p className="font-mono text-xs uppercase tracking-[.25em] text-[hsl(var(--flare))] mb-4">{t.pricing.eyebrow}</p></Reveal>
          <Reveal delay={80}><h2 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] tracking-tight">{t.pricing.title}</h2></Reveal>
          <Reveal delay={160}><p className="mt-6 text-lg text-muted-foreground">{t.pricing.sub}</p></Reveal>
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-3 gap-6" data-testid="status-packages-loading" aria-label={t.pricing.loading} aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-3xl border-2 border-[hsl(var(--ink)/.15)] bg-card p-8 space-y-4 animate-pulse">
                <div className="h-6 w-1/2 rounded bg-muted" /><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-12 w-2/3 rounded bg-muted mt-6" />
                {[0, 1, 2, 3].map((k) => <div key={k} className="h-4 rounded bg-muted" />)}
                <div className="h-14 rounded-full bg-muted mt-6" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="max-w-xl mx-auto text-center rounded-3xl border-2 border-[hsl(var(--ink))] bg-card p-10 shadow-[8px_8px_0_hsl(var(--flare))]" data-testid="status-packages-error">
            <CloudOff className="h-12 w-12 mx-auto text-[hsl(var(--flare))]" aria-hidden />
            <h3 className="font-display font-bold text-2xl mt-5">{t.pricing.errorTitle}</h3>
            <p className="text-muted-foreground mt-3">{t.pricing.errorBody}</p>
            <button onClick={() => { qc.invalidateQueries({ queryKey: getListPackagesQueryKey({ lang }) }); refetch(); }} disabled={isFetching} className="btn-3d mt-7 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground border-2 border-[hsl(var(--ink))] px-6 py-3 font-semibold" data-testid="button-retry-packages">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t.pricing.retry}
            </button>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="text-center text-muted-foreground" data-testid="status-packages-empty">{t.pricing.empty}</div>
        )}

        {data && data.length > 0 && (
          <div className={`grid gap-8 md:gap-6 items-stretch ${data.length === 1 ? "max-w-md mx-auto" : data.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "md:grid-cols-3"}`}>
            {data.map((p, i) => (
              <PackageCard key={p.id} p={p} i={i} busy={pendingId === p.id} disabled={checkout.isPending} onBuy={() => buy(p.id)} />
            ))}
          </div>
        )}

        <p className="mt-14 text-center text-sm text-muted-foreground font-mono">{t.pricing.footnote}</p>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  return (
    <section id="hoi-dap" className="py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <Reveal><p className="font-mono text-xs uppercase tracking-[.25em] text-primary mb-4">{t.faq.eyebrow}</p></Reveal>
          <Reveal delay={80}><h2 className="font-display font-extrabold text-4xl md:text-5xl leading-[.95] tracking-tight">{t.faq.title}</h2></Reveal>
        </div>
        <div className="md:col-span-8 border-t-2 border-[hsl(var(--ink))]">
          {t.faq.items.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <details className="group border-b-2 border-[hsl(var(--ink))] py-6" data-testid={`faq-item-${i}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display font-bold text-xl md:text-2xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-label={t.faq.toggle} className="h-10 w-10 shrink-0 rounded-full border-2 border-[hsl(var(--ink))] flex items-center justify-center transition-all group-open:rotate-45 group-open:bg-[hsl(var(--flare))] group-open:text-[hsl(var(--paper))]"><Plus className="h-5 w-5" /></span>
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Giant extruded "xidker" built from stacked CSS layers, rotated by scroll. */
function ExtrudedName({ p }: { p: number }) {
  const depth = 14;
  return (
    <div className="p3d relative font-display font-extrabold text-[26vw] leading-none tracking-[-.06em] lowercase select-none"
      style={{ transform: `rotateX(${24 - p * 30}deg) rotateY(${-22 + p * 44}deg)` }} aria-hidden>
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className="absolute inset-0" style={{ transform: `translateZ(${-i * 4}px)`, color: i === 0 ? "hsl(var(--klein))" : `hsl(12 ${90 - i * 2}% ${42 - i * 1.6}%)` }}>xidker</span>
      ))}
      <span className="invisible">xidker</span>
    </div>
  );
}

function FinalCta() {
  const { t } = useI18n();
  const [ref, p] = useSectionProgress<HTMLElement>();
  return (
    <section ref={ref} className="relative bg-[hsl(var(--flare))] text-[hsl(var(--paper))] overflow-hidden py-28 md:py-40 persp">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <ExtrudedName p={p} />
      </div>
      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <Reveal><h2 className="font-display font-extrabold text-5xl md:text-7xl leading-[.92] tracking-tight">{t.cta.title}</h2></Reveal>
        <Reveal delay={120}><p className="mt-6 text-lg md:text-xl opacity-90 max-w-xl mx-auto">{t.cta.sub}</p></Reveal>
        <Reveal delay={220}>
          <a href="#bang-gia" className="btn-3d mt-10 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ink))] text-[hsl(var(--paper))] border-2 border-[hsl(var(--ink))] px-8 py-4 font-semibold text-lg" style={{ boxShadow: "0 6px 0 hsl(var(--sun))" }} data-testid="button-final-cta">
            {t.cta.button} <ArrowRight className="h-5 w-5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-[hsl(var(--ink))] text-[hsl(var(--paper))] py-14">
      <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-3 gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2"><Logo className="h-8 w-8" /><Wordmark className="text-2xl" /></div>
          <p className="mt-4 opacity-60 max-w-xs">{t.footer.about}</p>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">{t.footer.contact}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-lg font-display font-bold hover:text-[hsl(var(--sun))]" data-testid="link-email"><Mail className="h-4 w-4" /> {CONTACT_EMAIL}</a>
          <LangSwitch tone="dark" />
        </div>
        <p className="md:text-right opacity-50 font-mono text-xs self-end">© {new Date().getFullYear()} xidker. {t.footer.rights}</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <Nav />
      <Hero />
      <Marquee />
      <Exploded />
      <Stats />
      <Features />
      <Process />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
