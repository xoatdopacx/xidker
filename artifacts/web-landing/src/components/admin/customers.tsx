import { useState } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  useListAdminCustomers, getListAdminCustomersQueryKey, useUpdateAdminCustomer, type AdminCustomer,
} from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { adminErrorText, fullWhen, languageName, useDebounced, useSignOutOn401, vnd } from "./shared";
import type { OrderFocus } from "./orders";

const LIST_LIMIT = 300;
const CUSTOMERS_ROOT = getListAdminCustomersQueryKey()[0];
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

type SignedOut = (notice: string | null) => void;

/** Every account, newest first: what they bought, and locking an account that misbehaves. */
export function AdminCustomers({ onOpenOrders, onSignedOut }: {
  onOpenOrders: (focus: Omit<OrderFocus, "nonce">) => void;
  onSignedOut: SignedOut;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 300);
  const params = q ? { q } : undefined;
  const list = useListAdminCustomers(params, {
    query: { queryKey: getListAdminCustomersQueryKey(params), retry: false, staleTime: 15_000, placeholderData: keepPreviousData },
  });
  useSignOutOn401(list.error, onSignedOut);
  const update = useUpdateAdminCustomer();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = list.data ?? [];

  const setLocked = (c: AdminCustomer, locked: boolean) => {
    if (update.isPending) return;
    setRowError(null);
    setNotice(null);
    update.mutate({ id: c.id, data: { locked } }, {
      onSuccess: (saved) => {
        qc.setQueriesData<AdminCustomer[]>({ queryKey: [CUSTOMERS_ROOT] }, (old) => old?.map((x) => (x.id === saved.id ? saved : x)));
        setConfirm(null);
        setNotice(locked ? `Đã khóa tài khoản ${saved.email}.` : `Đã mở khóa tài khoản ${saved.email}.`);
      },
      onError: (err) => {
        setConfirm(null);
        if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
        setRowError({ id: c.id, text: adminErrorText(err) });
      },
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-testid="admin-customers">
      <div className="p-3 md:px-6 md:py-4 border-b-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-lg font-extrabold me-auto">Khách hàng</h1>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" strokeWidth={2.5} aria-hidden="true" />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tìm theo email"
              aria-label="Tìm khách theo email" autoComplete="off" spellCheck={false}
              className="adm-field !h-10 !ps-9" data-testid="input-customers-search" />
          </div>
        </div>
        {notice && <p role="status" className="adm-notice info mt-3" data-testid="text-customers-notice">{notice}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" aria-busy={list.isFetching || undefined}>
        {list.isPending ? (
          <p className="p-6 text-sm text-[#3d4a3d]">Đang tải danh sách khách…</p>
        ) : list.isError && !list.data ? (
          <div className="p-6 text-sm">
            <p>{adminErrorText(list.error)}</p>
            <button type="button" onClick={() => list.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#3d4a3d]" data-testid="text-customers-empty">
            {q ? `Không có tài khoản nào có email chứa "${q}".` : "Chưa có ai tạo tài khoản."}
          </p>
        ) : (
          <>
            <ul className="bg-[hsl(var(--paper))]">
              {rows.map((c) => (
                <li key={c.id} className={`border-b-2 border-[#cfcbbf] px-4 py-3 ${c.locked ? "bg-[#ebe8de]" : ""}`} data-testid={`row-customer-${c.id}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <a href={`mailto:${c.email}`} className="font-bold break-all hover:underline" dir="ltr">{c.email}</a>
                    {c.isAdmin && <span className="adm-chip">Quản trị</span>}
                    {!c.verified && <span className="adm-chip !bg-[#5b6a5b] !text-white">Chưa xác minh email</span>}
                    {c.locked && <span className="adm-chip !bg-[hsl(var(--pin))] !text-white" data-testid={`chip-customer-locked-${c.id}`}>Đã khóa</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#3d4a3d]">
                    <span>Tạo ngày {dateFmt.format(new Date(c.createdAt))}</span>
                    <span>{c.lastSignInAt ? `Đăng nhập gần nhất ${fullWhen(c.lastSignInAt)}` : "Chưa đăng nhập lần nào"}</span>
                    {c.lang && <span>{languageName(c.lang)}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                    <span><b>{c.paidOrders}</b> đơn đã thanh toán{c.orders > c.paidOrders ? ` (trên ${c.orders} đơn)` : ""}</span>
                    <span>Đã chi <b>{vnd(c.spent)}</b></span>
                    {c.legacyOrderId && <span className="text-xs text-[#3d4a3d]">Khách mua từ trước, mã đơn cũ <span className="font-mono" dir="ltr">{c.legacyOrderId}</span></span>}
                  </div>

                  {confirm === c.id ? (
                    <div role="group" aria-label="Xác nhận khóa" className="mt-2 border-[3px] border-[#1b2a1c] bg-[#fff6d8] p-3 space-y-2">
                      <p className="text-sm font-semibold">
                        Khóa tài khoản {c.email}? Khách bị đăng xuất ngay và không đăng nhập, mua hàng hay tải file được nữa cho tới khi bạn mở khóa.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setLocked(c, true)} disabled={update.isPending} className="adm-btn red h-10 px-4" data-testid={`button-customer-confirm-lock-${c.id}`}>
                          {update.isPending ? "Đang khóa…" : "Khóa"}
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} disabled={update.isPending} className="adm-btn h-10 px-4">Thôi</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.orders > 0 && (
                        <button type="button" onClick={() => onOpenOrders({ status: "all", q: c.email })} className="adm-btn h-9 px-3 text-sm" data-testid={`button-customer-orders-${c.id}`}>
                          Xem {c.orders} đơn
                        </button>
                      )}
                      {!c.isAdmin && (c.locked ? (
                        <button type="button" onClick={() => setLocked(c, false)} disabled={update.isPending} className="adm-btn gold h-9 px-3 text-sm" data-testid={`button-customer-unlock-${c.id}`}>
                          Mở khóa
                        </button>
                      ) : (
                        <button type="button" onClick={() => { setConfirm(c.id); setRowError(null); setNotice(null); }} disabled={update.isPending}
                          className="adm-btn h-9 px-3 text-sm" data-testid={`button-customer-lock-${c.id}`}>
                          Khóa tài khoản
                        </button>
                      ))}
                    </div>
                  )}
                  {rowError?.id === c.id && <p role="alert" className="mt-2 text-sm font-semibold text-[hsl(var(--pin-text))]">{rowError.text}</p>}
                </li>
              ))}
            </ul>
            <p className="p-4 text-xs text-[#3d4a3d]">
              {rows.length >= LIST_LIMIT
                ? `Đang hiện ${LIST_LIMIT} tài khoản mới nhất. Tìm theo email để thấy tài khoản cũ hơn.`
                : `${rows.length} tài khoản. Tài khoản chưa xác minh email chưa mua được hàng.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
