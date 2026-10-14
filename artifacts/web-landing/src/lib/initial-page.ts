import type { Language, Package } from "@workspace/api-client-react";
import type { Dict } from "./i18n";

/** Public data only. Never include order references, sessions or credentials here. */
export type InitialPage = { lang: Language; dict: Dict; packages: Package[] };

export function readInitialPage(): InitialPage | undefined {
  const node = document.getElementById("initial-page");
  return node ? JSON.parse(node.textContent ?? "null") : undefined;
}
