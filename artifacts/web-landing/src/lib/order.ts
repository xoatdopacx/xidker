import { useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  createOrder, getGetMyOrderQueryKey, getListMyOrdersQueryKey, type AccountSession, type Language, type Order,
} from "@workspace/api-client-react";
import type { Dict } from "./i18n";
import { useI18n } from "./i18n";
import { reasonOf, statusOf } from "./http";
import { ACCOUNT_KEY, knownAccount } from "./account";
import { clearIntent, readIntent, saveIntent, type OrderIntent } from "./order-intent";
import { ROUTES, orderPath, safeNext } from "./routes";

/** What to tell the buyer when an order could not be placed. */
export function orderErrorText(err: unknown, t: Dict): string {
  const reason = reasonOf(err);
  if (reason === "sample_gone") return t.samples.unavailableBody;
  if (reason in t.order.errors) return t.order.errors[reason as keyof Dict["order"]["errors"]];
  return statusOf(err) === 0 ? t.pricing.toastBody : t.auth.errors.generic;
}

function place(intent: OrderIntent, lang: Language): Promise<Order> {
  return createOrder({ packageId: intent.packageId, ...(intent.sampleId ? { sampleId: intent.sampleId } : {}), lang });
}

/* A message for the account page when the order waiting for sign-in could not be placed. */
type Flash = { name: string; text: string };
let flash: Flash | null = null;
const flashListeners = new Set<() => void>();
function setFlash(next: Flash | null) {
  flash = next;
  flashListeners.forEach((l) => l());
}
export function useOrderFlash(): [Flash | null, () => void] {
  const value = useSyncExternalStore(
    (l) => { flashListeners.add(l); return () => { flashListeners.delete(l); }; },
    () => flash,
    () => null,
  );
  return [value, () => setFlash(null)];
}

/**
 * Places an order and opens its page. A signed-out buyer is sent to create an account (or to sign in, on a
 * browser that has signed in before) and the order is placed right after.
 */
export function useStartOrder() {
  const [, navigate] = useLocation();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const running = useRef(false);

  const start = (intent: OrderIntent, onError: (err: unknown) => void) => {
    if (running.current) return;
    running.current = true;
    setPendingId(intent.packageId);
    place(intent, lang).then(
      (order) => {
        clearIntent();
        qc.setQueryData(getGetMyOrderQueryKey(order.code), order);
        void qc.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
        // The first order opens the support chat.
        void qc.invalidateQueries({ queryKey: ACCOUNT_KEY });
        navigate(orderPath(order.code));
      },
      (err) => {
        running.current = false;
        setPendingId(null);
        if (statusOf(err) === 401) {
          saveIntent(intent);
          navigate(knownAccount() ? ROUTES.signIn : ROUTES.register);
          return;
        }
        onError(err);
      },
    );
  };

  return { start, pendingId, busy: pendingId !== null };
}

/**
 * Where to go once signed in: the admin to the dashboard; a buyer with a package waiting to the new order;
 * everyone else back to the page that asked for the sign-in, or to their account.
 */
export function useAfterSignIn() {
  const [, navigate] = useLocation();
  const { lang, t } = useI18n();
  const qc = useQueryClient();
  return async (session: AccountSession, next: string | null) => {
    if (session.admin) {
      clearIntent();
      navigate(ROUTES.admin, { replace: true });
      return;
    }
    const intent = readIntent();
    if (intent) {
      clearIntent();
      try {
        const order = await place(intent, lang);
        qc.setQueryData(getGetMyOrderQueryKey(order.code), order);
        void qc.invalidateQueries({ queryKey: ACCOUNT_KEY });
        navigate(orderPath(order.code), { replace: true });
      } catch (err) {
        setFlash({ name: intent.name, text: orderErrorText(err, t) });
        navigate(ROUTES.account, { replace: true });
      }
      return;
    }
    const target = safeNext(next);
    // Only the admin account can open the dashboard; anyone else would bounce straight back to sign-in.
    navigate(target && target !== ROUTES.admin ? target : ROUTES.account, { replace: true });
  };
}
