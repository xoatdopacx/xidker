import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AdminDay, AdminOverview as OverviewData } from "@workspace/api-client-react";
import { adminErrorText, clock, vnd } from "./shared";
import { OrderRow, type OrderFocus } from "./orders";
import type { Tab } from "./shell";

type Overview = UseQueryResult<OverviewData, unknown>;

/** The first screen: what needs doing now, then how the shop is doing. */
export function AdminOverview({ overview, onOpen, onOpenOrders }: {
  overview: Overview;
  onOpen: (tab: Tab) => void;
  onOpenOrders: (focus: Omit<OrderFocus, "nonce">) => void;
}) {
  const o = overview.data;

  if (!o) {
    return (
      <div className="flex-1 grid place-items-center p-4">
        {overview.isError ? (
          <div className="adm-card max-w-sm p-6 text-center text-sm">
            <p>{adminErrorText(overview.error)}</p>
            <button type="button" onClick={() => overview.refetch()} className="adm-btn h-10 px-4 mt-4">Thử lại</button>
          </div>
        ) : (
          <p className="text-sm text-[#3d4a3d]">Đang tải số liệu…</p>
        )}
      </div>
    );
  }

  const todo: ReactNode[] = [];
  if (!o.bankReady) {
    todo.push(
      <Todo key="bank" tone="error" action="Thêm tài khoản" onAction={() => onOpen("settings")} testId="todo-bank">
        Chưa có tài khoản ngân hàng nhận tiền, nên khách chưa đặt hàng được.
      </Todo>,
    );
  }
  if (!o.mailReady) {
    todo.push(
      <Todo key="mail" tone="error" testId="todo-mail">
        Web chưa gửi được email (hộp thư Gmail của web đang mất kết nối). Khách sẽ không nhận được mã xác nhận và email báo đơn hàng.
      </Todo>,
    );
  }
  if (o.reportedOrders > 0) {
    todo.push(
      <Todo key="reported" tone="gold" action="Kiểm tra đơn" onAction={() => onOpenOrders({ status: "reported", q: "" })} testId="todo-reported">
        {o.reportedOrders} đơn khách báo đã chuyển tiền. Xem tiền đã vào tài khoản chưa rồi bấm xác nhận để khách tải source.
      </Todo>,
    );
  }
  if (o.unreadMessages > 0) {
    todo.push(
      <Todo key="unread" tone="gold" action="Mở tin nhắn" onAction={() => onOpen("inbox")} testId="todo-unread">
        {o.unreadMessages} tin nhắn của khách chưa đọc.
      </Todo>,
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-testid="admin-overview">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl font-extrabold">Tổng quan</h1>
          <span className="text-xs text-[#3d4a3d]">Cập nhật lúc {clock(new Date(overview.dataUpdatedAt).toISOString())}, tự làm mới mỗi 30 giây</span>
          <button type="button" onClick={() => overview.refetch()} disabled={overview.isFetching}
            className="adm-btn h-9 px-3 text-sm ms-auto" data-testid="button-overview-refresh">
            <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} strokeWidth={2.5} aria-hidden="true" />
            Làm mới
          </button>
        </div>

        <section aria-labelledby="todo-title" className="space-y-2">
          <h2 id="todo-title" className="sr-only">Việc cần làm</h2>
          {todo.length > 0 ? todo : (
            <p className="border-[3px] border-[#1b2a1c] bg-white/70 p-3 text-sm font-semibold" data-testid="todo-none">
              Không có việc gì cần làm ngay: không có đơn chờ xác nhận, không có tin nhắn chưa đọc.
            </p>
          )}
        </section>

        <section aria-label="Số liệu chính" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Doanh thu hôm nay" value={vnd(o.revenueToday)} testId="stat-revenue-today" />
          <Stat label="Doanh thu tháng này" value={vnd(o.revenueMonth)} note={`${o.paidMonth} đơn đã thanh toán`} testId="stat-revenue-month" />
          <Stat label="Tổng doanh thu" value={vnd(o.revenueTotal)} note="Từ trước tới nay" testId="stat-revenue-total" />
          <Stat label="Đơn chờ chuyển tiền" value={String(o.waitingOrders + o.reportedOrders)}
            note={o.reportedOrders > 0 ? `${o.reportedOrders} đơn khách báo đã chuyển` : "Chưa có khách báo đã chuyển"}
            onClick={() => onOpenOrders({ status: o.reportedOrders > 0 ? "reported" : "waiting", q: "" })} testId="stat-waiting" />
          <Stat label="Khách hàng" value={String(o.customers)} note={`${o.newCustomersWeek} tài khoản mới trong 7 ngày`}
            onClick={() => onOpen("customers")} testId="stat-customers" />
          <Stat label="Tin nhắn chưa đọc" value={String(o.unreadMessages)} onClick={() => onOpen("inbox")} testId="stat-unread" />
        </section>

        <section aria-labelledby="chart-title" className="adm-card p-4 md:p-5">
          <h2 id="chart-title" className="font-extrabold">Doanh thu 14 ngày qua</h2>
          <RevenueChart days={o.days} />
        </section>

        <section aria-labelledby="recent-title" className="adm-card">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b-[3px] border-[#1b2a1c]">
            <h2 id="recent-title" className="font-extrabold">Đơn mới nhất</h2>
            <button type="button" onClick={() => onOpenOrders({ status: "all", q: "" })} className="adm-btn h-9 px-3 text-sm ms-auto" data-testid="button-overview-all-orders">
              Xem tất cả đơn
            </button>
          </div>
          {o.recentOrders.length === 0 ? (
            <p className="p-4 text-sm text-[#3d4a3d]">Chưa có đơn nào.</p>
          ) : (
            <ul>
              {o.recentOrders.map((order) => (
                <li key={order.code}>
                  <OrderRow order={order} onOpen={() => onOpenOrders({ status: "all", q: order.code, open: order })} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Todo({ tone, action, onAction, testId, children }: {
  tone: "error" | "gold"; action?: string; onAction?: () => void; testId: string; children: ReactNode;
}) {
  return (
    <div role={tone === "error" ? "alert" : undefined}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-[3px] p-3 text-sm font-semibold ${tone === "error"
        ? "border-[hsl(var(--pin))] bg-[#fff2f0] text-[hsl(var(--pin-text))]"
        : "border-[#c99a1e] bg-[#fff6d8] text-[#1b2a1c]"}`} data-testid={testId}>
      <p className="min-w-0 flex-1 basis-60">{children}</p>
      {action && onAction && (
        <button type="button" onClick={onAction} className={`adm-btn h-9 px-3 text-sm ${tone === "error" ? "red" : "gold"}`} data-testid={`${testId}-action`}>
          {action}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, note, onClick, testId }: { label: string; value: string; note?: string; onClick?: () => void; testId: string }) {
  const body = (
    <>
      <span className="block text-xs font-bold uppercase tracking-wide text-[#3d4a3d]">{label}</span>
      <span className="mt-1 block text-xl sm:text-2xl font-extrabold break-words" data-testid={`${testId}-value`}>{value}</span>
      {note && <span className="mt-0.5 block text-xs text-[#5b6a5b]">{note}</span>}
    </>
  );
  const box = "adm-card block w-full text-start p-3 sm:p-4";
  return onClick
    ? <button type="button" onClick={onClick} className={`${box} hover:!bg-white focus-visible:outline-3 focus-visible:outline-[hsl(var(--pin))] focus-visible:outline-offset-2`} data-testid={testId}>{body}</button>
    : <div className={box} data-testid={testId}>{body}</div>;
}

const dayLabel = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** Paid revenue per day (Vietnam time), as pixel bars, with the same numbers in a table for screen readers. */
function RevenueChart({ days }: { days: AdminDay[] }) {
  const max = Math.max(0, ...days.map((d) => d.revenue));
  const total = days.reduce((n, d) => n + d.revenue, 0);
  const orders = days.reduce((n, d) => n + d.orders, 0);
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div className="mt-1">
      <p className="text-sm text-[#3d4a3d]">
        {first && last ? `Từ ${dayLabel(first.date)} đến ${dayLabel(last.date)}: ` : ""}
        <b className="text-[#1b2a1c]">{vnd(total)}</b> từ {orders} đơn đã thanh toán.
      </p>
      <div aria-hidden="true" className="mt-4">
        <div className="flex h-40 items-end gap-1 sm:gap-1.5 border-b-[3px] border-[#1b2a1c]">
          {days.map((d, i) => {
            const share = max > 0 ? d.revenue / max : 0;
            const today = i === days.length - 1;
            return (
              <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${dayLabel(d.date)}: ${vnd(d.revenue)} · ${d.orders} đơn`}>
                {d.revenue > 0 && (
                  <div className={`border-[2px] border-b-0 border-[#1b2a1c] ${today ? "bg-[hsl(var(--grass))]" : "bg-[hsl(var(--gold))]"}`}
                    style={{ height: `${Math.max(4, share * 100)}%` }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1 sm:gap-1.5">
          {days.map((d, i) => (
            <span key={d.date} className={`flex-1 text-center text-[10px] sm:text-xs ${i === days.length - 1 ? "font-extrabold" : "text-[#5b6a5b]"}`}>
              {/* Every other date on phones, so the labels never collide. */}
              <span className={i % 2 === (days.length - 1) % 2 ? "" : "hidden sm:inline"}>{dayLabel(d.date)}</span>
            </span>
          ))}
        </div>
        {max === 0 && <p className="mt-2 text-sm text-[#3d4a3d]">Chưa có đơn nào được thanh toán trong 14 ngày qua.</p>}
      </div>
      <table className="sr-only">
        <caption>Doanh thu từng ngày</caption>
        <thead><tr><th scope="col">Ngày</th><th scope="col">Doanh thu</th><th scope="col">Số đơn</th></tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}><th scope="row">{dayLabel(d.date)}</th><td>{vnd(d.revenue)}</td><td>{d.orders}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
