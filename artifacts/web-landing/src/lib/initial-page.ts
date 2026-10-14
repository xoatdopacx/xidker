import type { Language, Package } from "@workspace/api-client-react";
import type { Dict } from "./i18n";

/** Public data only. Never include order references, sessions or credentials here.
 * `packages` is null when the server had no fresh catalog; the browser then loads it itself. */
export type InitialPage = { lang: Language; dict: Dict; packages: Package[] | null };

export function readInitialPage(): InitialPage | undefined {
  const node = document.getElementById("initial-page");
  return node ? JSON.parse(node.textContent ?? "null") : undefined;
}
