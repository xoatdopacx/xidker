import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Language } from "@workspace/api-client-react";
import vi from "@/locales/vi.json";
import en from "@/locales/en.json";
import { LANGUAGES, type LangInfo, type Script } from "./languages";
import { isHomePath, languageHref, localePath, pathLanguage } from "./locale-url";
export { LANGUAGES, type LangInfo } from "./languages";

export const CONTACT_EMAIL = "hello@idkworkshop.com";

/** Vietnamese is the source text; every other language has the same shape (missing keys fall back to English). */
export type Dict = typeof vi;

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));
export const langInfo = (code: Language): LangInfo => BY_CODE.get(code) ?? LANGUAGES[1];
/** Short Latin code for small labels: VI, EN, ZH, ZH-TW… */
export const shortCode = (c: string) => c.split("-")[0].toUpperCase() + (c === "zh-TW" ? "-TW" : "");

/* ---------------- dictionaries ---------------- */

const LOADERS = import.meta.glob<Partial<Dict>>(["../locales/*.json", "!../locales/vi.json", "!../locales/en.json"], { import: "default" });
const DICTS = new Map<Language, Dict>([["vi", vi], ["en", en]]);

/** Deep-merges a translation over English so a missing or empty string never renders blank. */
function withFallback<T>(base: T, over: unknown): T {
  if (typeof base === "string") return (typeof over === "string" && over.trim() ? over : base) as T;
  if (Array.isArray(base)) {
    const arr = Array.isArray(over) ? over : [];
    return base.map((item, i) => withFallback(item, arr[i])) as T;
  }
  if (base && typeof base === "object") {
    const src = over && typeof over === "object" ? (over as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, withFallback(v, src[k])])) as T;
  }
  return base;
}

export async function loadDict(code: Language): Promise<Dict> {
  const ready = DICTS.get(code);
  if (ready) return ready;
  const loader = LOADERS[`../locales/${code}.json`];
  if (!loader) return en;
  const dict = withFallback(en as Dict, await loader());
  DICTS.set(code, dict);
  return dict;
}

/** Fills "{name}" placeholders: tpl("Order {code}", { code: "XID4K7Q2M" }). */
export function tpl(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/* ---------------- fonts per writing system ---------------- */

// Be Vietnam Pro covers Latin + Vietnamese; other scripts get a matching Noto Sans (see index.css).
const SCRIPT_FONT: Partial<Record<Script, string>> = {
  cyrl: "Noto Sans", greek: "Noto Sans", sc: "Noto Sans SC", tc: "Noto Sans TC", jp: "Noto Sans JP", kr: "Noto Sans KR",
  thai: "Noto Sans Thai", lao: "Noto Sans Lao", khmer: "Noto Sans Khmer", deva: "Noto Sans Devanagari",
  beng: "Noto Sans Bengali", arab: "Noto Sans Arabic", hebr: "Noto Sans Hebrew",
};

/* Settles once a font stylesheet has loaded or failed (the font files themselves load on first use). */
const FONT_READY = new Map<string, Promise<void>>();

function ensureFont(script: Script) {
  const family = SCRIPT_FONT[script];
  if (!family || FONT_READY.has(family)) return;
  if (document.querySelector(`link[data-font="${family}"]`)) { FONT_READY.set(family, Promise.resolve()); return; }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.font = family;
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;500;600;700;800&display=swap`;
  FONT_READY.set(family, new Promise<void>((done) => { link.onload = () => done(); link.onerror = () => done(); }));
  document.head.appendChild(link);
}

/** Starts the font for a language and resolves when its stylesheet is in (immediately for Latin). */
export function whenFontReady(code: Language): Promise<void> {
  const { script } = langInfo(code);
  ensureFont(script);
  const family = SCRIPT_FONT[script];
  return (family && FONT_READY.get(family)) || Promise.resolve();
}

/* ---------------- initial language ---------------- */

const LANG_KEY = "xidker-lang";

function matchCode(raw: string | null | undefined): Language | null {
  if (!raw) return null;
  const tag = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!tag) return null;
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === tag);
  if (exact) return exact.code;
  if (tag.startsWith("zh")) return /hant|tw|hk|mo/.test(tag) ? "zh-TW" : "zh-CN";
  const base = tag.split("-")[0];
  const alias: Record<string, string> = { iw: "he", tl: "fil", in: "id" };
  return LANGUAGES.find((l) => l.code.toLowerCase() === (alias[base] ?? base))?.code ?? null;
}

/** A language in the address (/vi/, ?lang=vi) is the visitor's choice: it is kept for the pages without one (sign-in, orders). */
export function rememberAddressLanguage(): Language | null {
  const fromPath = pathLanguage(window.location.pathname, import.meta.env.BASE_URL);
  const explicit = fromPath ?? matchCode(new URLSearchParams(window.location.search).get("lang"));
  if (explicit) {
    try { localStorage.setItem(LANG_KEY, explicit); } catch { /* storage blocked */ }
  }
  return explicit;
}

/** Home URLs are deterministic for crawlers; other pages still use saved/browser preferences. */
export function initialLang(): Language {
  const explicit = rememberAddressLanguage();
  if (explicit) return explicit;
  if (isHomePath(window.location.pathname, import.meta.env.BASE_URL)) return "en";
  try {
    const saved = matchCode(localStorage.getItem(LANG_KEY));
    if (saved) return saved;
  } catch { /* storage blocked */ }
  const list = typeof navigator !== "undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for (const raw of list) {
    const hit = matchCode(raw);
    if (hit) return hit;
  }
  return "en";
}

/** Loads the first language (and starts its font) before the first render, so the page never flashes another language. */
export async function prepareI18n(): Promise<void> {
  const code = initialLang();
  if (isHomePath(window.location.pathname, import.meta.env.BASE_URL) && new URLSearchParams(window.location.search).has("lang")) {
    history.replaceState(history.state, "", languageHref(code, new URL(window.location.href), import.meta.env.BASE_URL));
  }
  ensureFont(langInfo(code).script);
  try { await loadDict(code); } catch { /* falls back to English in the provider */ }
}

/* ---------------- provider ---------------- */

type Ctx = {
  lang: Language;
  info: LangInfo;
  setLang: (l: Language) => void;
  t: Dict;
  /** Locale for dates. */
  locale: string;
  /** Locale for prices: always Latin digits (the number fonts only have those). */
  numLocale: string;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: { lang: Language; dict: Dict } }) {
  const [state, setState] = useState(() => {
    if (initial) return { lang: initial.lang, t: initial.dict };
    const code = initialLang();
    return { lang: code, t: DICTS.get(code) ?? (en as Dict) };
  });
  const request = useRef(0);

  const applyLanguage = useCallback((code: Language) => {
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
    ensureFont(langInfo(code).script);
    const id = ++request.current;
    const ready = DICTS.get(code);
    if (ready) { setState({ lang: code, t: ready }); return; }
    loadDict(code)
      .then((t) => { if (id === request.current) setState({ lang: code, t }); })
      .catch(() => { if (id === request.current) setState({ lang: code, t: en as Dict }); });
  }, []);

  const setLang = useCallback((code: Language) => {
    const href = languageHref(code, new URL(window.location.href), import.meta.env.BASE_URL);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (href !== current) history.pushState(null, "", href);
    applyLanguage(code);
  }, [applyLanguage]);

  useEffect(() => {
    const onHistory = () => applyLanguage(initialLang());
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, [applyLanguage]);

  const { lang, t } = state;
  const info = langInfo(lang);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = info.dir;
    html.dataset.script = info.script;
    ensureFont(info.script);
    const set = (sel: string, v: string) => document.querySelector(sel)?.setAttribute("content", v);
    if (isHomePath(window.location.pathname, import.meta.env.BASE_URL)) {
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) {
        const url = new URL(localePath(lang, import.meta.env.BASE_URL), new URL(canonical.href).origin).href;
        canonical.href = url;
        set('meta[property="og:url"]', url);
      }
      set('meta[property="og:locale"]', info.locale.replace(/-/g, "_"));
    }
  }, [lang, info, t]);

  const value = useMemo<Ctx>(() => ({
    lang, info, setLang, t,
    locale: info.locale,
    numLocale: `${info.locale}-u-nu-latn`,
  }), [lang, info, setLang, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}

/** Language picker (header, footer, account and 404 pages). */
export { LangPicker as LangSwitch } from "@/components/lang-picker";
