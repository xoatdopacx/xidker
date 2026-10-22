import { useSyncExternalStore } from "react";

/** Shared state for the support chat, so the footer and the account pages can open it without passing props around. */
type State = {
  /** The chat button shows on this page even before this browser has signed in. */
  revealed: boolean;
  open: boolean;
  /** Counts open requests; the widget remembers what opened it each time this changes. */
  nonce: number;
};

let state: State = { revealed: false, open: false, nonce: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const supportChat = {
  open() {
    set({ revealed: true, open: true, nonce: state.nonce + 1 });
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
