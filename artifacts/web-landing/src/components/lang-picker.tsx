import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import type { Language } from "@workspace/api-client-react";
import { useI18n, LANGUAGES, shortCode } from "@/lib/i18n";
import { usePixelTransition } from "@/components/pixel-transition";
import { languageHref } from "@/lib/locale-url";

/** 9x9 pixel globe drawn with rects so it stays crisp. */
function PixelGlobe({ className = "" }: { className?: string }) {
  const ring = "M3 0h3v1H3zM1 1h2v1H1zM6 1h2v1H6zM0 3h1v3H0zM8 3h1v3H8zM1 7h2v1H1zM6 7h2v1H6zM3 8h3v1H3zM1 2h1v1H1zM7 2h1v1H7zM1 6h1v1H1zM7 6h1v1H7z";
  const land = "M3 1h2v1H3zM2 2h2v1H2zM2 3h1v2H2zM5 3h2v1H5zM5 4h1v2H5zM4 6h2v1H4z";
  return (
    <svg viewBox="0 0 9 9" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" fill="#7cc4e8" />
      <rect x="0" y="2" width="9" height="5" fill="#7cc4e8" />
      <rect x="2" y="0" width="5" height="9" fill="#7cc4e8" />
      <path d={land} fill="#57c24a" />
      <path d={ring} fill="currentColor" />
    </svg>
  );
}


export function LangPicker({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const { lang, info, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const place = () => {
    const b = btn.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw - 16, 600);
    const rtl = document.documentElement.dir === "rtl";
    const left = Math.min(Math.max(8, rtl ? r.left : r.right - w), vw - w - 8);
    const below = vh - r.bottom - 16, above = r.top - 16;
    const up = below < 320 && above > below;
    setPos(up
      ? { left, width: w, bottom: vh - r.top + 8, maxHeight: above }
      : { left, width: w, top: r.bottom + 8, maxHeight: below });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const cur = panel.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? panel.current?.querySelector<HTMLElement>("button");
    cur?.focus({ preventScroll: true });
    cur?.scrollIntoView({ block: "nearest" });
    const close = (focus: boolean) => { setOpen(false); if (focus) btn.current?.focus(); };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!panel.current?.contains(n) && !btn.current?.contains(n)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(true); }
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, a[href]");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const onMove = () => place();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [open]);

  const px = usePixelTransition();
  const pick = (c: Language) => {
    setOpen(false);
    btn.current?.focus();
    if (c === lang) return;
    const r = btn.current?.getBoundingClientRect();
    if (px) px.switchLang(c, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
    else setLang(c);
  };
  const dark = tone === "dark";

  return (
    <div className={`relative ${className}`}>
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog" aria-expanded={open} aria-label={`${t.lang.switchLabel}: ${info.native}`}
        className={`lp-trigger ${dark ? "dark" : ""} inline-flex items-center gap-1.5 h-9 px-2 text-sm font-bold`} data-testid="button-language">
        <PixelGlobe className="h-5 w-5 shrink-0" />
        <span className="font-num text-xs lg:hidden" dir="ltr">{shortCode(lang)}</span>
        <span className="hidden lg:inline max-w-[9rem] truncate" lang={lang}>{info.native}</span>
        <svg viewBox="0 0 5 3" className={`h-1.5 w-2.5 shrink-0 ${open ? "rotate-180" : ""}`} shapeRendering="crispEdges" aria-hidden="true"><path d="M0 0h5v1H0zM1 1h3v1H1zM2 2h1v1H2z" fill="currentColor" /></svg>
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label={t.lang.switchLabel} className="lp-panel tile fixed! z-[90] flex flex-col" style={pos} data-testid="panel-language">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b-[3px] border-dashed border-[#8d8a80]">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin-text))]">
              <PixelGlobe className="h-4 w-4 text-[#1b2a1c]" /> {t.lang.switchLabel}
              <span className="font-num text-[#1b2a1c]" dir="ltr">{LANGUAGES.length}</span>
            </p>
            <button type="button" onClick={() => { setOpen(false); btn.current?.focus(); }} aria-label={t.lang.close}
              className="lp-close grid place-items-center h-8 w-8" data-testid="button-language-close"><X className="h-4 w-4" strokeWidth={3} /></button>
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-1.5 p-3 overflow-y-auto overscroll-contain min-h-0">
            {LANGUAGES.map((l) => {
              const cur = l.code === lang;
              return (
                <li key={l.code}>
                  <a href={languageHref(l.code, new URL(window.location.href), import.meta.env.BASE_URL)}
                    hrefLang={l.code} lang={l.code} dir={l.dir}
                    onClick={(e) => {
                      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      pick(l.code);
                    }} aria-current={cur ? "true" : undefined}
                    className={`lp-opt ${cur ? "on" : ""} w-full flex items-center gap-2 px-2.5 py-2 text-sm font-semibold text-start`} data-testid={`option-lang-${l.code}`}>
                    <span className="lp-dot shrink-0" aria-hidden="true" />
                    <span className="truncate flex-1">{l.native}</span>
                    <span className="font-num text-[10px] opacity-60 shrink-0" dir="ltr">{shortCode(l.code)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
