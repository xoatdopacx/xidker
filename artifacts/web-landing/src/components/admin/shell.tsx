import { useEffect, useRef, useState } from "react";
import {
  useListAdminConversations, getListAdminConversationsQueryKey,
  useGetAdminOverview, getGetAdminOverviewQueryKey, type AdminSession,
} from "@workspace/api-client-react";
import { Wordmark } from "@/components/sprites";
import { AdminOverview } from "./overview";
import { AdminOrders, type OrderFocus } from "./orders";
import { AdminCustomers } from "./customers";
import { AdminPackages } from "./packages";
import { AdminSamples } from "./samples";
import { AdminInbox } from "./inbox";
import { AdminSettings } from "./settings";
import { clock, useDocTitle, useSignOutOn401 } from "./shared";

export type Tab = "overview" | "orders" | "customers" | "packages" | "samples" | "inbox" | "settings";
// Short labels below 1024px; on phones the row scrolls sideways.
const TABS: { value: Tab; label: string; short: string }[] = [
  { value: "overview", label: "Tổng quan", short: "Tổng quan" },
  { value: "orders", label: "Đơn hàng", short: "Đơn" },
  { value: "customers", label: "Khách hàng", short: "Khách" },
  { value: "packages", label: "Sản phẩm & giá", short: "Gói" },
  { value: "samples", label: "Mẫu source", short: "Mẫu" },
  { value: "inbox", label: "Tin nhắn", short: "Tin nhắn" },
  { value: "settings", label: "Cài đặt", short: "Cài đặt" },
];
/** Screens that stay mounted once opened, so filters, unsaved edits and running uploads survive a look at another tab. */
const KEEP: ReadonlySet<Tab> = new Set(["orders", "customers", "packages", "samples", "settings"]);
const TAB_STORE = "xid-admin-tab";
const CONVERSATIONS_KEY = getListAdminConversationsQueryKey();
const OVERVIEW_KEY = getGetAdminOverviewQueryKey();

function savedTab(): Tab {
  try {
    const stored = sessionStorage.getItem(TAB_STORE);
    return TABS.find((t) => t.value === stored)?.value ?? "overview";
  } catch {
    return "overview";
  }
}

type SignedOut = (notice: string | null) => void;

export function AdminShell({ session, onSignedOut, onSignOut, signingOut }: {
  session: AdminSession;
  /** A request found the admin session over. */
  onSignedOut: SignedOut;
  /** The admin pressed "Đăng xuất". */
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const [tab, setTabState] = useState<Tab>(savedTab);
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set([tab]));
  const [orderFocus, setOrderFocus] = useState<OrderFocus | null>(null);
  // Unsent replies survive switching tabs (the inbox itself unmounts so it never marks messages read unseen).
  const drafts = useRef(new Map<string, string>());
  const nav = useRef<HTMLElement>(null);

  // Both keep polling in a background tab, so the counts on the tabs and in the title stay current.
  const conversations = useListAdminConversations({
    query: { queryKey: CONVERSATIONS_KEY, refetchInterval: 5000, refetchIntervalInBackground: true, retry: false },
  });
  const overview = useGetAdminOverview({
    query: { queryKey: OVERVIEW_KEY, refetchInterval: 30_000, refetchIntervalInBackground: true, retry: false },
  });
  useSignOutOn401(conversations.error, onSignedOut);
  useSignOutOn401(overview.error, onSignedOut);
  const unread = (conversations.data ?? []).reduce((n, c) => n + c.unread, 0);
  const reported = overview.data?.reportedOrders ?? 0;
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  const attention = unread + reported;
  useDocTitle(`${attention > 0 ? `(${attention}) ` : ""}${current.label} — Quản trị xidker`);

  const setTab = (next: Tab) => {
    setTabState(next);
    setOpened((s) => (s.has(next) ? s : new Set([...s, next])));
    try { sessionStorage.setItem(TAB_STORE, next); } catch { /* private mode: the tab just isn't remembered */ }
  };

  // On phones the tab row scrolls: keep the open tab in view.
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  const openOrders = (focus: Omit<OrderFocus, "nonce">) => {
    setOrderFocus({ ...focus, nonce: Date.now() });
    setTab("orders");
  };

  const badge = (t: Tab) => {
    const n = t === "inbox" ? unread : t === "orders" ? reported : 0;
    if (n <= 0) return null;
    const text = t === "inbox" ? `${n} tin chưa đọc` : `${n} đơn khách báo đã chuyển tiền`;
    return <span className="adm-badge font-num" aria-label={text} title={text}>{n > 99 ? "99+" : n}</span>;
  };

  const kept = (t: Tab) => opened.has(t) && KEEP.has(t);
  const pane = (t: Tab) => (tab === t ? "flex-1 min-h-0 flex flex-col" : "!hidden");

  return (
    <div className="h-[100dvh] flex flex-col">
      <header className="adm-bar flex flex-wrap items-center gap-x-3 px-4 py-2 xl:py-0 xl:h-14 shrink-0">
        <Wordmark size="text-xl" />
        <nav ref={nav} aria-label="Khu quản trị"
          className="order-last w-full xl:order-none xl:w-auto flex gap-1.5 pt-2 pb-0.5 xl:p-0 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
          {TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => setTab(t.value)} aria-current={tab === t.value ? "page" : undefined}
              aria-label={t.short !== t.label ? t.label : undefined}
              className="adm-nav shrink-0 justify-center whitespace-nowrap" data-testid={`tab-admin-${t.value}`}>
              <span className="lg:hidden">{t.short}</span>
              <span className="hidden lg:inline">{t.label}</span>
              {badge(t.value)}
            </button>
          ))}
        </nav>
        <span className="ms-auto hidden 2xl:inline text-xs text-[#b9c9b0]">Phiên hết hạn lúc {clock(session.expiresAt)}</span>
        <button type="button" onClick={onSignOut} disabled={signingOut} title={`${session.email} · phiên hết hạn lúc ${clock(session.expiresAt)}`}
          className="adm-btn dark h-9 px-3 text-sm ms-auto 2xl:ms-0" data-testid="button-admin-sign-out">
          {signingOut ? "Đang thoát…" : "Đăng xuất"}
        </button>
      </header>

      {tab === "overview" && (
        <AdminOverview overview={overview} onOpen={setTab} onOpenOrders={openOrders} />
      )}
      {kept("orders") && (
        <div className={pane("orders")}><AdminOrders focus={orderFocus} onSignedOut={onSignedOut} /></div>
      )}
      {kept("customers") && (
        <div className={pane("customers")}><AdminCustomers onOpenOrders={openOrders} onSignedOut={onSignedOut} /></div>
      )}
      {kept("packages") && (
        <div className={pane("packages")}><AdminPackages onSignedOut={onSignedOut} /></div>
      )}
      {kept("samples") && (
        <div className={pane("samples")}><AdminSamples onSignedOut={onSignedOut} /></div>
      )}
      {tab === "inbox" && <AdminInbox drafts={drafts.current} onSignedOut={onSignedOut} />}
      {kept("settings") && (
        <div className={pane("settings")}><AdminSettings onSignedOut={onSignedOut} /></div>
      )}
    </div>
  );
}
