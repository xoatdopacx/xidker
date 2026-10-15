import { useRef, useState } from "react";
import {
  useListAdminConversations, getListAdminConversationsQueryKey, useSignOutAdmin, type AdminSession,
} from "@workspace/api-client-react";
import { Wordmark } from "@/components/sprites";
import { AdminInbox } from "./inbox";
import { AdminPackages } from "./packages";
import { AdminSamples } from "./samples";
import { AdminOrders } from "./orders";
import { clock, useDocTitle, useSignOutOn401 } from "./shared";

type Tab = "inbox" | "packages" | "samples" | "orders";
// Short labels below 1024px keep the four tabs on one line, down to 360px phones (tabs size to their text).
const TABS: { value: Tab; label: string; short: string; title: string }[] = [
  { value: "inbox", label: "Tin nhắn", short: "Tin nhắn", title: "Hộp thư" },
  { value: "packages", label: "Sản phẩm & giá", short: "Gói", title: "Sản phẩm & giá" },
  { value: "samples", label: "Mẫu source", short: "Mẫu", title: "Mẫu source" },
  { value: "orders", label: "Đơn hàng", short: "Đơn", title: "Đơn hàng" },
];
const TAB_STORE = "xid-admin-tab";
const LIST_KEY = getListAdminConversationsQueryKey();

function savedTab(): Tab {
  try {
    const stored = sessionStorage.getItem(TAB_STORE);
    return TABS.find((t) => t.value === stored)?.value ?? "inbox";
  } catch {
    return "inbox";
  }
}

type SignedOut = (notice: string | null) => void;

export function AdminShell({ session, onSignedOut }: { session: AdminSession; onSignedOut: SignedOut }) {
  const [tab, setTabState] = useState<Tab>(savedTab);
  // Editors stay mounted once opened, so unsaved edits and running uploads survive a look at another tab.
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set([tab]));
  // Unsent replies survive switching tabs (the inbox itself unmounts so it never marks messages read unseen).
  const drafts = useRef(new Map<string, string>());
  const signOut = useSignOutAdmin();

  // Keeps polling on either tab and in a background tab, so the unread count stays current.
  const list = useListAdminConversations({
    query: { queryKey: LIST_KEY, refetchInterval: 5000, refetchIntervalInBackground: true, retry: false },
  });
  useSignOutOn401(list.error, onSignedOut);
  const unread = (list.data ?? []).reduce((n, c) => n + c.unread, 0);
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  useDocTitle(`${unread > 0 ? `(${unread}) ` : ""}${current.title} — xidker`);

  const setTab = (next: Tab) => {
    setTabState(next);
    setOpened((s) => (s.has(next) ? s : new Set([...s, next])));
    try { sessionStorage.setItem(TAB_STORE, next); } catch { /* private mode: the tab just isn't remembered */ }
  };

  const leave = () => {
    signOut.mutate(undefined, { onSettled: () => onSignedOut(null) });
  };

  return (
    <div className="h-[100dvh] flex flex-col">
      <header className="adm-bar flex flex-wrap items-center gap-x-3 px-4 py-2 sm:py-0 sm:h-14 shrink-0">
        <Wordmark size="text-xl" />
        <nav aria-label="Khu quản trị" className="order-last w-full sm:order-none sm:w-auto flex gap-1.5 pt-2 sm:pt-0">
          {TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => setTab(t.value)} aria-current={tab === t.value ? "page" : undefined}
              aria-label={t.short !== t.label ? t.label : undefined}
              className="adm-nav flex-auto sm:flex-none justify-center whitespace-nowrap" data-testid={`tab-admin-${t.value}`}>
              <span className="lg:hidden">{t.short}</span>
              <span className="hidden lg:inline">{t.label}</span>
              {t.value === "inbox" && unread > 0 && (
                <span className="adm-badge font-num" aria-label={`${unread} tin chưa đọc`}>{unread > 99 ? "99+" : unread}</span>
              )}
            </button>
          ))}
        </nav>
        <span className="ms-auto hidden md:inline text-xs text-[#b9c9b0]">Phiên hết hạn lúc {clock(session.expiresAt)}</span>
        <button type="button" onClick={leave} disabled={signOut.isPending} className="adm-btn dark h-9 px-3 text-sm ms-auto md:ms-0" data-testid="button-admin-sign-out">
          {signOut.isPending ? "Đang thoát…" : "Đăng xuất"}
        </button>
      </header>

      {tab === "inbox" && <AdminInbox drafts={drafts.current} onSignedOut={onSignedOut} />}
      {opened.has("packages") && (
        <div className={tab === "packages" ? "flex-1 min-h-0 flex" : "hidden"}>
          <AdminPackages onSignedOut={onSignedOut} />
        </div>
      )}
      {opened.has("samples") && (
        <div className={tab === "samples" ? "flex-1 min-h-0 flex" : "hidden"}>
          <AdminSamples onSignedOut={onSignedOut} />
        </div>
      )}
      {tab === "orders" && <AdminOrders onSignedOut={onSignedOut} />}
    </div>
  );
}
