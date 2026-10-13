import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useListPackages, useCreateCheckout, getListPackagesQueryKey } from "@workspace/api-client-react";
import type { Package } from "@workspace/api-client-react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, RefreshCw, Mail, CloudOff, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Reveal, formatPrice } from "@/lib/motion";
import { SceneTransition } from "@/components/scene-transition";
import { useI18n, LangSwitch, CONTACT_EMAIL, type Dict } from "@/lib/i18n";
import { Hero as HeroSprite, Pine, Sunflower, Log, Pin, Trophy, MapIcon, Cat, Raccoon, Chest, Logo, Wordmark, PixelTitle, Vehicle, VEHICLES } from "@/components/sprites";

/* ---------------- Road + walking character ---------------- */

type Geo = { w: number; h: number; d: string; mobile: boolean };

function Road({ worldRef }: { worldRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useI18n();
  const [geo, setGeo] = useState<Geo | null>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const poofRef = useRef<HTMLDivElement>(null);
  const stops = useRef<{ el: Element; y: number }[]>([]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const measure = () => {
      const wr = world.getBoundingClientRect();
      const pts = Array.from(world.querySelectorAll<HTMLElement>("[data-road]")).map((a) => {
        const r = a.getBoundingClientRect();
        return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2, ms: a.closest("[data-ms]") };
      }).sort((a, b) => a.y - b.y);
      if (pts.length < 2) return;
      stops.current = pts.filter((p) => p.ms).map((p) => ({ el: p.ms as Element, y: p.y }));
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dy = (b.y - a.y) / 2;
        d += ` C ${a.x.toFixed(1)} ${(a.y + dy).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - dy).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      setGeo((g) => (g && g.d === d && g.w === wr.width && g.h === wr.height ? g : { w: wr.width, h: wr.height, d, mobile: wr.width < 768 }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(world);
    measure();
    return () => ro.disconnect();
  }, [worldRef]);

  useEffect(() => {
    const path = pathRef.current, world = worldRef.current;
    if (!path || !world || !geo) return;
    const len = path.getTotalLength();
    let raf = 0, lastX = -1, facing = 1, leg = -1, frame = -1;
    const poof = poofRef.current;
    const update = () => {
      raf = 0;
      const wr = world.getBoundingClientRect();
      const target = window.innerHeight * 0.62 - wr.top;
      let lo = 0, hi = len;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).y < target) lo = mid; else hi = mid;
      }
      const pt = path.getPointAtLength(lo);
      if (lastX >= 0 && Math.abs(pt.x - lastX) > 0.4) facing = pt.x < lastX ? -1 : 1;
      lastX = pt.x;
      const ch = charRef.current;
      if (trailRef.current) trailRef.current.style.strokeDasharray = `${lo} ${len + 10}`;
      let reached = 0;
      for (const s of stops.current) { const r = pt.y >= s.y - 6; s.el.classList.toggle("reached", r); if (r) reached++; }
      if (!ch) return;
      ch.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) translate(-50%, -88%)`;
      const flip = ch.firstElementChild as HTMLElement | null;
      if (flip) flip.style.transform = `scaleX(${facing})`;
      const f = Math.floor(lo / 18) % 2;
      if (f !== frame) { frame = f; ch.dataset.f = String(f); }
      if (reached !== leg) {
        // vehicle swap: only touches a data attribute + restarts the poof animation
        if (leg !== -1 && poof) { poof.classList.remove("go"); void poof.offsetWidth; poof.classList.add("go"); }
        leg = reached; ch.dataset.v = String(Math.min(reached, 8));
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [geo, worldRef]);

  if (!geo) return null;
  const rw = geo.mobile ? 30 : 58;
  const px = geo.mobile ? 3 : 4;
  const vpx = geo.mobile ? 2 : 3;
  return (
    <>
      <svg className="absolute left-0 top-0 z-[1] pointer-events-none" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} shapeRendering="crispEdges" aria-hidden>
        <path d={geo.d} fill="none" stroke="#1f3d1c" strokeOpacity=".35" strokeWidth={rw + 14} strokeLinecap="square" transform="translate(5 6)" />
        <path d={geo.d} fill="none" stroke="#6b6f78" strokeWidth={rw + 8} strokeLinecap="square" />
        <path ref={pathRef} d={geo.d} fill="none" stroke="#33363d" strokeWidth={rw} strokeLinecap="square" />
        <path d={geo.d} fill="none" stroke="#e9e6d8" strokeWidth={geo.mobile ? 2 : 3} strokeDasharray={geo.mobile ? "8 10" : "14 16"} />
        <path ref={trailRef} d={geo.d} fill="none" stroke="hsl(44 95% 55%)" strokeWidth={geo.mobile ? 3 : 4} strokeDasharray="0 99999" />
      </svg>
      <div ref={charRef} data-v="0" data-f="0" className="rider absolute left-0 top-0 z-[15] pointer-events-none will-change-transform" role="img" aria-label={t.hero.heroAlt}>
        <div className="flex flex-col items-center">
          <div className="absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1 bg-black/25" />
          {[0, 8].map((v) => (
            <div key={v} className={`ride v${v}`}>
              <div className="fr0"><HeroSprite px={px} frame={0} /></div>
              <div className="fr1"><HeroSprite px={px} frame={1} /></div>
            </div>
          ))}
          {VEHICLES.map((_, k) => (
            <div key={k} className={`ride v${k + 1}`}>
              <div className="fr0"><Vehicle i={k} frame={0} px={vpx} /></div>
              <div className="fr1"><Vehicle i={k} frame={1} px={vpx} /></div>
              {k >= 1 && k <= 3 && <span className="puffs" aria-hidden><i /><i /><i /></span>}
            </div>
          ))}
        </div>
        <div ref={poofRef} className="poof" aria-hidden>{Array.from({ length: 8 }, (_, k) => <i key={k} style={{ "--a": `${k * 45}deg` } as React.CSSProperties} />)}</div>
      </div>
    </>
  );
}

/* ---------------- Nav ---------------- */

function Nav() {
  const { t } = useI18n();
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[hsl(var(--paper))] border-b-4 border-[#1b2a1c]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-14 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home">
          <Logo /> <Wordmark />
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
          <a href="#ban-nhan-gi" className="hover:text-primary" data-testid="link-nav-what">{t.nav.what}</a>
          <a href="#cach-dung" className="hover:text-primary" data-testid="link-nav-how">{t.nav.how}</a>
          <a href="#bang-gia" className="hover:text-primary" data-testid="link-nav-pricing">{t.nav.pricing}</a>
          <a href="#hoi-dap" className="hover:text-primary" data-testid="link-nav-faq">{t.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <a href="#bang-gia" className="pbtn red hidden sm:inline-flex px-4 py-1.5 text-sm font-bold" data-testid="button-nav-cta">{t.nav.cta}</a>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */

function HeroSection() {
  const { t } = useI18n();
  return (
    <section id="top" className="relative min-h-[100dvh] pt-24 pb-40 md:pb-48">
      <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
        <Reveal hero>
          <div className="flex items-end gap-4 flex-wrap">
            <MapIcon px={5} className="mb-3 -rotate-6 hidden sm:block" label={t.hero.mapAlt} />
            <PixelTitle />
          </div>
        </Reveal>
        <Reveal hero delay={100}>
          <p className="mt-6 inline-block bg-[#1b2a1c] text-[#eaf7d6] px-3 py-1 text-xs md:text-sm font-semibold uppercase tracking-wider">{t.hero.eyebrow}</p>
        </Reveal>
        <Reveal hero delay={180}>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,3.6rem)] leading-[1.08] tracking-tight max-w-3xl text-[#10230f]" data-testid="text-hero-title">{t.hero.title}</h1>
        </Reveal>
        <Reveal hero delay={260}>
          <p className="mt-5 max-w-xl text-base md:text-lg text-[#173016] font-medium leading-relaxed">{t.hero.sub}</p>
        </Reveal>
        <Reveal hero delay={340}>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#bang-gia" className="pbtn red px-6 py-3 font-bold" data-testid="button-hero-cta">{t.hero.cta} <ArrowRight className="h-5 w-5" /></a>
          </div>
        </Reveal>
      </div>

      {/* decor */}
      <Pine px={5} className="absolute right-[6%] top-[22%] hidden md:block" />
      <Pine px={4} className="absolute right-[13%] top-[30%] hidden md:block" />
      <Sunflower px={4} className="absolute right-[24%] top-[62%] sway hidden md:block" />
      <Log px={4} className="absolute right-[4%] top-[70%]" />

      {/* START: road begins here */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="relative mx-auto max-w-7xl h-24">
          <div data-road className="absolute left-[34px] md:left-[22%] top-1/2 h-1 w-1" />
          <a href="#ban-nhan-gi" className="pbtn absolute left-[64px] md:left-auto md:right-[80%] top-1/2 -translate-y-1/2 px-5 py-2 font-pixel text-2xl md:text-3xl" data-testid="button-start">
            START
          </a>
          <p className="absolute left-[64px] md:left-[25%] top-full md:top-1/2 mt-3 md:mt-0 md:-translate-y-1/2 md:ml-8 text-sm font-semibold text-[#10230f] flex items-center gap-1">
            {t.hero.hint} <ChevronDown className="h-4 w-4 bob" />
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Stops ---------------- */

function Stop({ id, n, side, title, children, wide = false, decor }: { id?: string; n: number; side: "left" | "right"; title: string; children: ReactNode; wide?: boolean; decor?: ReactNode }) {
  const { t } = useI18n();
  return (
    <section id={id} data-ms className="relative py-14 md:py-24 px-4 md:px-8 scroll-mt-16">
      <div className="relative mx-auto max-w-7xl">
        <div data-road className={`absolute top-8 md:top-1/2 h-1 w-1 ${side === "left" ? "left-[22px] md:left-[64%]" : "left-[40px] md:left-[36%]"}`}>
          <Pin px={4} className="pin-sprite absolute bottom-3 left-1/2 -translate-x-1/2" />
        </div>
        {decor}
        <div className={`relative z-20 ml-[60px] md:ml-0 ${wide ? "md:w-[56%]" : "md:w-[46%]"} ${side === "right" ? "md:ml-auto" : ""}`}>
          <Reveal>
            <div className="tile p-5 md:p-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin))]">{t.stage} <span className="font-num text-base">0{n}</span></span>
                <span className="check inline-flex items-center gap-1 bg-[hsl(var(--gold))] text-[#1b2a1c] text-xs font-bold px-2 py-0.5 border-2 border-[#1b2a1c]"><Check className="h-3 w-3" strokeWidth={3} /> {t.reached}</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl leading-tight">{title}</h2>
              <div className="mt-3 text-[15px] md:text-base text-[#2c3a2c] leading-relaxed">{children}</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="mt-1.5 h-3 w-3 shrink-0 bg-[hsl(var(--grass-d))] border-2 border-[#1b2a1c]" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function PagesMock({ items }: { items: string[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {items.map((s, i) => (
        <div key={i} className="border-[3px] border-[#1b2a1c] bg-white/70">
          <div className="h-4 bg-[#1b2a1c] flex items-center gap-1 px-1">
            <span className="h-1.5 w-1.5 bg-[#e3392b]" /><span className="h-1.5 w-1.5 bg-[#f6c945]" /><span className="h-1.5 w-1.5 bg-[#5cbf4a]" />
          </div>
          <div className="p-2">
            <div className={`h-8 mb-2 ${["bg-[#f2d36b]", "bg-[#7fb8a8]", "bg-[#e98a8a]", "bg-[#c9c08a]"][i % 4]}`} />
            <p className="text-xs font-semibold leading-snug">{s}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Pricing ---------------- */

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
      <div className={`tile h-full flex flex-col p-6 transition-transform duration-200 hover:-translate-y-1.5 ${rec ? "md:-translate-y-3 md:hover:-translate-y-5 !border-[hsl(var(--gold))]" : ""}`} data-testid={`card-package-${p.id}`}>
        {rec && <span className="absolute -top-4 left-5 bg-[hsl(var(--gold))] text-[#1b2a1c] border-[3px] border-[#1b2a1c] px-3 py-0.5 text-xs font-bold uppercase">{t.pricing.recommended}</span>}
        <div className="flex items-center gap-3">
          <Chest px={3} />
          <h3 className="font-display text-xl leading-tight" data-testid={`text-package-name-${p.id}`}>{p.name}</h3>
        </div>
        {p.tagline && <p className="mt-2 text-sm text-[#3d4a3d]">{p.tagline}</p>}
        <div className="mt-5 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-3xl md:text-4xl tracking-tight" data-testid={`text-package-price-${p.id}`}>{formatPrice(p.price, p.currency, locale)}</span>
          <span className="text-sm text-[#3d4a3d]">{billingLabel(p, t)}</span>
        </div>
        <ul className="mt-5 space-y-2.5 flex-1">
          {p.features.map((f, k) => (
            <li key={k} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-0.5 h-4 w-4 shrink-0 bg-[hsl(var(--grass-d))] text-white border-2 border-[#1b2a1c] flex items-center justify-center"><Check className="h-2.5 w-2.5" strokeWidth={4} /></span>
              {f}
            </li>
          ))}
        </ul>
        <button onClick={onBuy} disabled={disabled} className={`pbtn ${rec ? "red" : ""} mt-6 w-full justify-center py-3 font-bold`} data-testid={`button-buy-${p.id}`}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t.pricing.opening}</> : <>{t.pricing.choose} <ArrowRight className="h-5 w-5" /></>}
        </button>
      </div>
    </Reveal>
  );
}

function Pricing() {
  const { t, lang } = useI18n();
  // Keep the previous language's cards while the new language loads: no skeleton flash and no
  // remount (a remount would replay the pixel build on the package cards).
  const { data, isLoading, isError, refetch, isFetching } = useListPackages({ lang }, { query: { queryKey: getListPackagesQueryKey({ lang }), placeholderData: keepPreviousData } });
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
    <section id="bang-gia" data-ms className="relative py-16 md:py-24 px-4 md:px-8 scroll-mt-16">
      <div className="relative mx-auto max-w-7xl">
        <div data-road className="absolute top-6 left-[30px] md:left-1/2 h-1 w-1">
          <Pin px={5} className="pin-sprite absolute bottom-3 left-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-20 ml-[56px] md:ml-0 pt-4 md:pt-24">
          <Reveal>
            <div className="tile p-5 md:p-7 md:max-w-2xl md:mx-auto md:text-center mb-10 md:mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin))]">{t.stage} <span className="font-num text-base">06</span></span>
              <h2 className="font-display text-3xl md:text-4xl leading-tight mt-1">{t.pricing.title}</h2>
              <p className="mt-3 text-[#2c3a2c]">{t.pricing.sub}</p>
            </div>
          </Reveal>

          {isLoading && (
            <div className="grid md:grid-cols-3 gap-6" data-testid="status-packages-loading" aria-label={t.pricing.loading} aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="tile p-6 space-y-3">
                  {[50, 75, 60, 90, 80, 70].map((w, k) => <div key={k} className="h-4 bg-[#d6d2c6] blink" style={{ width: `${w}%`, animationDelay: `${k * 120}ms` }} />)}
                  <div className="h-12 bg-[#d6d2c6] mt-4" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="tile max-w-xl mx-auto text-center p-8" data-testid="status-packages-error">
              <CloudOff className="h-10 w-10 mx-auto text-[hsl(var(--pin))]" aria-hidden />
              <h3 className="font-display text-2xl mt-4">{t.pricing.errorTitle}</h3>
              <p className="text-[#3d4a3d] mt-2">{t.pricing.errorBody}</p>
              <button onClick={() => { qc.invalidateQueries({ queryKey: getListPackagesQueryKey({ lang }) }); refetch(); }} disabled={isFetching} className="pbtn mt-6 px-5 py-2.5 font-bold" data-testid="button-retry-packages">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t.pricing.retry}
              </button>
            </div>
          )}

          {data && data.length === 0 && <div className="tile p-6 text-center" data-testid="status-packages-empty">{t.pricing.empty}</div>}

          {data && data.length > 0 && (
            <div className={`grid gap-8 md:gap-6 items-stretch ${data.length === 1 ? "max-w-md mx-auto" : data.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" : "md:grid-cols-3"}`}>
              {data.map((p, i) => <PackageCard key={p.id} p={p} i={i} busy={pendingId === p.id} disabled={checkout.isPending} onBuy={() => buy(p.id)} />)}
            </div>
          )}

          <p className="mt-10 text-center text-sm font-semibold text-[#10230f]">{t.pricing.footnote}</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

function Faq() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const n = t.faq.items.length;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    btns.current[next]?.focus();
  };
  return (
    <Stop id="hoi-dap" n={7} side="right" wide title={t.faq.title}>
      {/* Fixed-height: selecting a question never changes the page height (the road is measured from it). */}
      <ul className="mt-2 space-y-2">
        {t.faq.items.map((f, i) => {
          const on = i === active;
          return (
            <li key={i}>
              <button ref={(el) => { btns.current[i] = el; }} type="button" onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
                aria-expanded={on} aria-controls={`faq-a-${i}`} id={`faq-q-${i}`} data-testid={`faq-item-${i}`}
                className={`w-full flex items-start gap-3 text-left border-[3px] border-[#1b2a1c] px-3 py-2.5 font-bold text-[15px] md:text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--pin))] ${on ? "bg-[#1b2a1c] text-[hsl(var(--gold))]" : "bg-white/70 text-[#10230f] hover:bg-white"}`}>
                <span aria-hidden className={`mt-1.5 h-3 w-3 shrink-0 ${on ? "bg-[hsl(var(--gold))] blink" : "bg-[#1b2a1c]"}`} />
                <span>{f.q}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="relative mt-5 border-4 border-[#1b2a1c] bg-[#fffbea] shadow-[inset_-4px_-4px_0_#e6dcb8,4px_4px_0_#1b2a1c] p-4 md:p-5">
        <span className="absolute -top-3.5 left-3 bg-[hsl(var(--pin))] text-white border-[3px] border-[#1b2a1c] px-2 font-pixel text-sm leading-5">xidker</span>
        <div className="grid">
          {t.faq.items.map((f, i) => (
            <p key={i} id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} aria-hidden={i !== active}
              className={`[grid-area:1/1] leading-relaxed text-[#1b2a1c] ${i === active ? "visible" : "invisible"}`}>
              {f.a}<span aria-hidden className="inline-block ml-1 h-3 w-2 bg-[#1b2a1c] blink align-middle" />
            </p>
          ))}
        </div>
      </div>
    </Stop>
  );
}

/* ---------------- Goal ---------------- */

const SPARKS = [[-60, -50], [50, -70], [-80, 10], [80, -10], [-30, -90], [30, -95], [-90, -40], [90, -55]];

function Goal() {
  const { t } = useI18n();
  return (
    <section data-ms className="relative pt-16 pb-28 md:pb-36 px-4 md:px-8">
      <div className="relative mx-auto max-w-7xl">
        <div data-road className="absolute top-40 left-[34px] md:left-1/2 h-1 w-1">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="trophy-glow absolute -inset-6 bg-[hsl(var(--gold))]/40" style={{ clipPath: "polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)" }} />
            <Trophy px={7} className="relative hidden md:block" label={t.goal.trophyAlt} />
            <Trophy px={4} className="relative md:hidden" label={t.goal.trophyAlt} />
            {SPARKS.map(([x, y], i) => (
              <span key={i} className="spark absolute left-1/2 top-1/2 h-2 w-2" style={{ background: i % 2 ? "#f6c945" : "#e3392b", "--sx": `${x}px`, "--sy": `${y}px`, animationDelay: `${i * 40}ms` } as React.CSSProperties} />
            ))}
          </div>
        </div>
        <div className="relative z-20 ml-[60px] md:ml-0 pt-56 md:pt-60 md:max-w-2xl md:mx-auto text-left md:text-center">
          <Reveal>
            <div className="tile p-6 md:p-10">
              <p className="font-pixel text-2xl md:text-3xl text-[hsl(var(--pin))]">GOAL</p>
              <p className="text-sm font-bold uppercase tracking-wider mt-1">{t.goal.reached}</p>
              <h2 className="font-display text-2xl md:text-4xl leading-tight mt-3">{t.goal.title}</h2>
              <p className="mt-4 text-[#2c3a2c]">{t.goal.sub}</p>
              <a href="#bang-gia" className="pbtn red mt-7 px-6 py-3 font-bold" data-testid="button-final-cta">{t.goal.button} <ArrowRight className="h-5 w-5" /></a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative overflow-hidden">
      <div className="relative h-16">
        <div className="walker"><Cat px={4} /></div>
        <div className="walker rev" style={{ animationDelay: "-12s" }}><Raccoon px={4} /></div>
      </div>
      <div className="bricks h-10 border-y-4 border-[#4a170d]" />
      <div className="bg-[#1b2a1c] text-[#eaf7d6] py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2"><Logo /><Wordmark /></div>
            <p className="mt-4 opacity-70 max-w-xs">{t.footer.about}</p>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest opacity-50 font-semibold">{t.footer.contact}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-base font-bold hover:text-[hsl(var(--gold))] break-all" data-testid="link-email"><Mail className="h-4 w-4 shrink-0" /> {CONTACT_EMAIL}</a>
            <LangSwitch tone="dark" />
          </div>
          <p className="md:text-right opacity-50 text-xs self-end">© {new Date().getFullYear()} xidker. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */

export default function Home() {
  const { t } = useI18n();
  const worldRef = useRef<HTMLDivElement>(null);
  const s = t.stops;
  return (
    <main className="overflow-x-hidden">
      <Nav />
      <SceneTransition />
      <div ref={worldRef} className="relative">
        <Road worldRef={worldRef} />
        <HeroSection />
        <Stop id="ban-nhan-gi" n={1} side="left" title={s.what.title}
          decor={<><Pine px={5} className="absolute right-[4%] top-0 hidden md:block" /><Sunflower px={4} className="absolute right-[18%] bottom-0 sway hidden md:block" /></>}>
          <p>{s.what.body}</p><Bullets items={s.what.points} />
        </Stop>
        <Stop n={2} side="right" title={s.pages.title}
          decor={<><Pine px={4} className="absolute left-[6%] top-4 hidden md:block" /><Pine px={5} className="absolute left-[12%] top-14 hidden md:block" /></>}>
          <p>{s.pages.body}</p><PagesMock items={s.pages.items} />
        </Stop>
        <Stop n={3} side="left" title={s.motion.title}
          decor={<Log px={4} className="absolute right-[10%] top-1/3 hidden md:block" />}>
          <p>{s.motion.body}</p><Bullets items={s.motion.points} />
        </Stop>
        <Stop id="cach-dung" n={4} side="right" title={s.how.title}
          decor={<><Sunflower px={4} className="absolute left-[8%] top-1/4 sway hidden md:block" /><Sunflower px={3} className="absolute left-[12%] top-[30%] sway hidden md:block" /></>}>
          <ol className="space-y-3">
            {s.how.steps.map((st, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-num text-base h-8 w-8 shrink-0 flex items-center justify-center bg-[#1b2a1c] text-[hsl(var(--gold))]">{i + 1}</span>
                <span className="pt-1">{st}</span>
              </li>
            ))}
          </ol>
        </Stop>
        <Stop n={5} side="left" title={s.who.title}
          decor={<><Pine px={5} className="absolute right-[6%] top-8 hidden md:block" /><Pine px={4} className="absolute right-[2%] top-20 hidden md:block" /></>}>
          <p>{s.who.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.who.tags.map((tag) => <span key={tag} className="border-[3px] border-[#1b2a1c] bg-white/70 px-2.5 py-1 text-sm font-semibold">{tag}</span>)}
          </div>
        </Stop>
        <Pricing />
        <Faq />
        <Goal />
      </div>
      <Footer />
    </main>
  );
}
