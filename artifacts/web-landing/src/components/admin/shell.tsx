import { useRef, useState } from "react";
import {
  useListAdminConversations, getListAdminConversationsQueryKey, useSignOutAdmin, type AdminSession,
} from "@workspace/api-client-react";
import { Wordmark } from "@/components/sprites";
import { AdminInbox } from "./inbox";
import { AdminPackages } from "./packages";
import { clock, useDocTitle, useSignOutOn401 } from "./shared";

type Tab = "inbox" | "packages";
const TABS: { value: Tab; label: string; title: string }[] = [
  { value: "inbox", label: "Tin nhắn", title: "Hộp thư" },
  { value: "packages", label: "Sản phẩm & giá", title: "Sản phẩm & giá" },
];
const TAB_STORE = "xid-admin-tab";
const LIST_KEY = getListAdminConversationsQueryKey();

function savedTab(): Tab {
  try {
    return sessionStorage.getItem(TAB_STORE) === "packages" ? "packages" : "inbox";
  } catch {
    return "inbox";
  }
}

type SignedOut = (notice: string | null) => void;

export function AdminShell({ session, onSignedOut }: { session: AdminSession; onSignedOut: SignedOut }) {
  const [tab, setTabState] = useState<Tab>(savedTab);
  const [packagesOpened, setPackagesOpened] = useState(tab === "packages");
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
    if (next === "packages") setPackagesOpened(true);
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
              className="adm-nav flex-1 sm:flex-none justify-center" data-testid={`tab-admin-${t.value}`}>
              {t.label}
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
      {/* Stays mounted once opened, so an unsaved price edit survives a look at the inbox. */}
      {packagesOpened && (
        <div className={tab === "packages" ? "flex-1 min-h-0 flex" : "hidden"}>
          <AdminPackages onSignedOut={onSignedOut} />
        </div>
      )}
    </div>
  );
}
