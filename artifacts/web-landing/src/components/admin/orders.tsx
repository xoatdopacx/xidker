import { RefreshCw } from "lucide-react";
import { useListAdminOrders, getListAdminOrdersQueryKey, type AdminOrder } from "@workspace/api-client-react";
import { adminErrorText, fullWhen, useSignOutOn401 } from "./shared";

type SignedOut = (notice: string | null) => void;

const LIST_KEY = getListAdminOrdersQueryKey();

/** 299.000 ₫, $12, $12.50; an unknown currency code is shown as it came. */
function money(amount: number, currency: string) {
  const code = currency.toUpperCase();
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(code === "VND" ? "vi-VN" : "en-US", {
      style: "currency", currency: code, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

const NONE = <span className="text-[#5b6a5b]">—</span>;

function Email({ email }: { email: string | null }) {
  if (!email) return <span className="text-[#5b6a5b]">Whop không gửi email</span>;
  return <a href={`mailto:${email}`} className="underline font-semibold break-all" dir="ltr">{email}</a>;
}

export function AdminOrders({ onSignedOut }: { onSignedOut: SignedOut }) {
  const orders = useListAdminOrders({ query: { queryKey: LIST_KEY, retry: false, staleTime: 30_000 } });
  useSignOutOn401(orders.error, onSignedOut);
  const rows = orders.data ?? [];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="font-extrabold text-lg">Đơn hàng gần đây</h2>
            <p className="text-sm text-[#3d4a3d]">50 đơn đã thanh toán mới nhất trên Whop, kèm mẫu source khách đã chọn.</p>
          </div>
          <button type="button" onClick={() => orders.refetch()} disabled={orders.isFetching} className="adm-btn h-10 px-4 ms-auto" data-testid="button-orders-refresh">
            <RefreshCw className={`h-4 w-4 ${orders.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} strokeWidth={2.5} aria-hidden="true" />
            {orders.isFetching ? "Đang tải…" : "Tải lại"}
          </button>
        </div>

        <div className="mt-5" aria-live="polite" aria-busy={orders.isFetching || undefined}>
          {orders.isPending ? (
            <p className="text-sm text-[#3d4a3d]">Đang tải đơn hàng từ Whop…</p>
          ) : orders.isError && !orders.data ? (
            <p role="alert" className="adm-notice error" data-testid="text-orders-error">{adminErrorText(orders.error)}</p>
          ) : rows.length === 0 ? (
            <p className="adm-card p-6 text-sm" data-testid="text-orders-empty">Chưa có đơn nào đã thanh toán.</p>
          ) : (
            <>
              {orders.isError && <p role="alert" className="adm-notice error mb-4">{adminErrorText(orders.error)}</p>}
              <OrderTable rows={rows} />
              <ul className="md:hidden space-y-3">
                {rows.map((o) => <OrderCard key={o.id} order={o} />)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderTable({ rows }: { rows: AdminOrder[] }) {
  return (
    <div className="hidden md:block adm-card overflow-x-auto">
      <table className="w-full text-sm text-start" data-testid="table-orders">
        <caption className="sr-only">Đơn hàng đã thanh toán, mới nhất trước</caption>
        <thead className="bg-[#1b2a1c] text-[#eaf7d6] text-xs uppercase tracking-wider">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-start font-bold">Thời gian</th>
            <th scope="col" className="px-3 py-2.5 text-start font-bold">Gói</th>
            <th scope="col" className="px-3 py-2.5 text-start font-bold">Mẫu đã chọn</th>
            <th scope="col" className="px-3 py-2.5 text-start font-bold">Email khách</th>
            <th scope="col" className="px-3 py-2.5 text-end font-bold">Số tiền</th>
            <th scope="col" className="px-3 py-2.5 text-start font-bold">Mã đơn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t-2 border-[#cfcbbf] align-top" data-testid={`row-order-${o.id}`}>
              <td className="px-3 py-2.5 whitespace-nowrap">{o.paidAt ? fullWhen(o.paidAt) : NONE}</td>
              <td className="px-3 py-2.5 font-semibold">{o.packageName ?? NONE}</td>
              <td className="px-3 py-2.5" dir="auto">{o.sampleName ? <span className="font-bold">{o.sampleName}</span> : NONE}</td>
              <td className="px-3 py-2.5"><Email email={o.email} /></td>
              <td className="px-3 py-2.5 text-end font-num whitespace-nowrap">{o.amount != null ? money(o.amount, o.currency) : NONE}</td>
              <td className="px-3 py-2.5 font-mono text-xs break-all" dir="ltr">{o.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderCard({ order: o }: { order: AdminOrder }) {
  return (
    <li className="adm-card p-4 text-sm" data-testid={`card-order-${o.id}`}>
      <div className="flex items-baseline gap-3">
        <span className="font-bold min-w-0">{o.packageName ?? "Gói không rõ tên"}</span>
        <span className="ms-auto font-num whitespace-nowrap">{o.amount != null ? money(o.amount, o.currency) : ""}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-[#3d4a3d]">Mẫu</dt>
        <dd dir="auto">{o.sampleName ? <span className="font-bold">{o.sampleName}</span> : NONE}</dd>
        <dt className="text-[#3d4a3d]">Email</dt>
        <dd className="min-w-0"><Email email={o.email} /></dd>
        <dt className="text-[#3d4a3d]">Lúc</dt>
        <dd>{o.paidAt ? fullWhen(o.paidAt) : NONE}</dd>
        <dt className="text-[#3d4a3d]">Mã đơn</dt>
        <dd className="font-mono text-xs break-all" dir="ltr">{o.id}</dd>
      </dl>
    </li>
  );
}
