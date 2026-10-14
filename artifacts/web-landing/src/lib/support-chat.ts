import { useSyncExternalStore } from "react";

/**
 * Shared state for the customer support chat, so the thank-you page and the
 * footer can show or open the chat widget without passing props around.
 */
export type SupportMode = "login" | "activate";

type State = {
  /** The chat button shows on this page even before this browser has signed in (right after a paid order). */
  revealed: boolean;
  open: boolean;
  /** Last open request; the widget applies mode and order id when the nonce changes. */
  request: { mode: SupportMode; orderId: string; nonce: number };
};

let state: State = { revealed: false, open: false, request: { mode: "login", orderId: "", nonce: 0 } };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const supportChat = {
  reveal() {
    if (!state.revealed) set({ revealed: true });
  },
  /** Opens the panel on the given tab; the activation tab can arrive with the order id filled in. */
  open(mode: SupportMode = "login", orderId = "") {
    set({ revealed: true, open: true, request: { mode, orderId, nonce: state.request.nonce + 1 } });
  },
  setOpen(open: boolean) {
    if (state.open !== open) set({ open });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSupportChat(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
