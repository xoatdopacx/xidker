import type { Language } from "@workspace/api-client-react";
import { LANGUAGES } from "./languages.ts";

export function normalizedBase(base = "/"): string {
  return `/${base.split("/").filter(Boolean).join("/")}${base === "/" ? "" : "/"}`;
}

export function localePath(code: Language, base = "/"): string {
  return code === "en" ? normalizedBase(base) : `${normalizedBase(base)}${code}/`;
}

export function pathLanguage(pathname: string, base = "/"): Language | null {
  const prefix = normalizedBase(base);
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).replace(/\/$/, "");
  return LANGUAGES.find((l) => l.code === segment)?.code ?? null;
}

export function isHomePath(pathname: string, base = "/"): boolean {
  return pathname === normalizedBase(base) || pathLanguage(pathname, base) !== null;
}

/** Other pages retain their route and all payment/query parameters. */
export function languageHref(code: Language, current: URL, base = "/"): string {
  const next = new URL(current);
  if (isHomePath(next.pathname, base)) {
    next.pathname = localePath(code, base);
    next.searchParams.delete("lang");
  } else {
    next.searchParams.set("lang", code);
  }
  return `${next.pathname}${next.search}${next.hash}`;
}
