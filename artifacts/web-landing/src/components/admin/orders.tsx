import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import {
  useListAdminOrders, getListAdminOrdersQueryKey, useUpdateAdminOrder, listAdminOrders,
  getGetAdminOverviewQueryKey, type AdminOrder, type AdminOrderUpdate,
} from "@workspace/api-client-react";
import { serverError, statusOf } from "@/lib/http";
import { FileField } from "./file-field";
import { fileKey, pickedFrom, type PickedFile } from "./zip-upload";
import {
  adminErrorText, fileSize, fullWhen, languageName, shortWhen, StageBadge, useDebounced, useSignOutOn401, vnd,
} from "./shared";

export type OrderFilter = "all" | "waiting" | "reported" | "paid" | "cancelled";
/** A jump here from another screen: the filter and search to show, and maybe one order to open. */
export type OrderFocus = { status: OrderFilter; q: string; open?: AdminOrder; nonce: number };

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "reported", label: "Khách báo đã chuyển" },
  { value: "waiting", label: "Chờ chuyển tiền" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "cancelled", label: "Đã hủy" },
];
const LIST_LIMIT = 300;
const NOTE_MAX = 2000;
const ORDERS_ROOT = getListAdminOrdersQueryKey()[0];
const CHANGED_MEANWHILE = "The order changed meanwhile, reload the list";

type SignedOut = (notice: string | null) => void;

export function AdminOrders({ focus, onSignedOut }: { focus: OrderFocus | null; onSignedOut: SignedOut }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderFilter>(focus?.status ?? "all");
  const [text, setText] = useState(focus?.q ?? "");
  const [open, setOpen] = useState<AdminOrder | null>(focus?.open ?? null);
  const q = useDebounced(text.trim(), 300);

  // Opened from the overview or the customer list.
  const applied = useRef(focus?.nonce ?? 0);
  useEffect(() => {
    if (!focus || focus.nonce === applied.current) return;
    applied.current = focus.nonce;
    setStatus(focus.status);
    setText(focus.q);
    setOpen(focus.open ?? null);
  }, [focus]);

  const params = q ? { status, q } : { status };
  const list = useListAdminOrders(params, {
    query: { queryKey: getListAdminOrdersQueryKey(params), retry: false, refetchInterval: 30_000, placeholderData: keepPreviousData },
  });
  useSignOutOn401(list.error, onSignedOut);
  const rows = list.data ?? [];

  const onChanged = (saved: AdminOrder) => {
    qc.setQueriesData<AdminOrder[]>({ queryKey: [ORDERS_ROOT] }, (old) => old?.map((o) => (o.code === saved.code ? saved : o)));
    void qc.invalidateQueries({ queryKey: [ORDERS_ROOT] });
    void qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
  };

  const filterLabel = FILTERS.find((f) => f.value === status)?.label ?? "";

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-testid="admin-orders">
      <div className="p-3 md:px-6 md:py-4 border-b-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))] space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-lg font-extrabold me-auto">Đơn hàng</h1>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" strokeWidth={2.5} aria-hidden="true" />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mã đơn hoặc email khách"
              aria-label="Tìm đơn theo mã đơn hoặc email" autoComplete="off" spellCheck={false}
              className="adm-field !h-10 !ps-9" data-testid="input-orders-search" />
          </div>
        </div>
        <div role="group" aria-label="Lọc theo trạng thái" className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setStatus(f.value)} aria-pressed={status === f.value}
              className="adm-tab h-9 px-3 text-sm font-bold shrink-0 whitespace-nowrap" data-testid={`filter-orders-${f.value}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" aria-busy={list.isFetching || undefined}>
        {list.isPending ? (
          <p className="p-6 text-sm text-[#3d4a3d]">Đang tải đơn hàng…</p>
        ) : list.isError && !list.data ? (
          <div className="p-6 text-sm">
            <p>{adminErrorText(list.error)}</p>
            <button type="button" onClick={() => list.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#3d4a3d]" data-testid="text-orders-empty">
            {q ? `Không có đơn nào khớp "${q}"${status === "all" ? "" : ` trong mục "${filterLabel}"`}.`
              : status === "all" ? "Chưa có đơn nào." : `Không có đơn nào trong mục "${filterLabel}".`}
          </p>
        ) : (
          <>
            <ul className="bg-[hsl(var(--paper))]">
              {rows.map((o) => (
                <li key={o.code}><OrderRow order={o} active={open?.code === o.code} onOpen={() => setOpen(o)} /></li>
              ))}
            </ul>
            <p className="p-4 text-xs text-[#3d4a3d]">
              {rows.length >= LIST_LIMIT
                ? `Đang hiện ${LIST_LIMIT} đơn mới nhất. Tìm theo mã đơn hoặc email để thấy đơn cũ hơn.`
                : `${rows.length} đơn. Danh sách tự làm mới mỗi 30 giây.`}
            </p>
          </>
        )}
      </div>

      {open && (
        <OrderDialog key={open.code} order={open} latest={rows.find((o) => o.code === open.code)}
          onClose={() => setOpen(null)} onChanged={onChanged} onSignedOut={onSignedOut}
          onFindCustomer={(email) => { setOpen(null); setStatus("all"); setText(email); }} />
      )}
    </div>
  );
}

/** One order in a list: code, stage and amount, then who bought what and when. */
export function OrderRow({ order, active, onOpen }: { order: AdminOrder; active?: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-current={active ? "true" : undefined} className="adm-item" data-testid={`row-order-${order.code}`}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono font-bold" dir="ltr">{order.code}</span>
        <StageBadge order={order} />
        <span className="ms-auto font-bold">{vnd(order.amount)}</span>
      </span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#3d4a3d]">
        <span className="break-all" dir="ltr">{order.email}</span>
        <span>Gói {order.packageName}{order.sampleName ? <> · Mẫu <span dir="auto">{order.sampleName}</span></> : null}</span>
        <span className="ms-auto whitespace-nowrap">
          {order.status === "pending" && order.transferReportedAt ? `Báo chuyển ${shortWhen(order.transferReportedAt)} · ` : ""}
          Đặt {shortWhen(order.createdAt)}
        </span>
      </span>
    </button>
  );
}

/* ---------------- one order ---------------- */

type Move = "paid" | "cancelled" | "pending";
type Delivery = { file: PickedFile | null; deliveryNote: string; adminNote: string };

const deliveryOf = (o: AdminOrder): Delivery => ({ file: pickedFrom(o.deliveryFile), deliveryNote: o.deliveryNote ?? "", adminNote: o.adminNote ?? "" });
const tidy = (s: string) => s.replace(/\r\n/g, "\n").trim();

function OrderDialog({ order: first, latest, onClose, onChanged, onSignedOut, onFindCustomer }: {
  order: AdminOrder;
  /** The same order from the list, which refreshes every 30 seconds. */
  latest: AdminOrder | undefined;
  onClose: () => void;
  onChanged: (order: AdminOrder) => void;
  onSignedOut: SignedOut;
  onFindCustomer: (email: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [order, setOrder] = useState(first);
  const [confirm, setConfirm] = useState<Move | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [base, setBase] = useState(() => deliveryOf(first));
  const [form, setForm] = useState(base);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const move = useUpdateAdminOrder();
  const save = useUpdateAdminOrder();
  const busy = move.isPending || save.isPending;

  const fileChanged = fileKey(form.file) !== fileKey(base.file);
  const deliveryChanged = tidy(form.deliveryNote) !== tidy(base.deliveryNote);
  const adminChanged = tidy(form.adminNote) !== tidy(base.adminNote);
  const dirty = fileChanged || deliveryChanged || adminChanged;

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // The buyer reported the transfer or cancelled while this was open: show it, without touching unsaved edits.
  useEffect(() => {
    if (!latest || busy) return;
    setOrder(latest);
    if (!dirty) {
      const next = deliveryOf(latest);
      setBase(next);
      setForm(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uploading]);

  const close = () => {
    if ((dirty || uploading) && !window.confirm("Bỏ các thay đổi chưa lưu của đơn này?")) return;
    onClose();
  };

  const fresh = (saved: AdminOrder) => {
    setOrder(saved);
    onChanged(saved);
  };

  /** Someone else changed the order (another tab, the buyer cancelling): show it as it is now. */
  const reload = async () => {
    try {
      const found = (await listAdminOrders({ q: order.code })).find((o) => o.code === order.code);
      if (found) fresh(found);
    } catch {
      // The list refresh shows it a little later.
    }
  };

  const fail = (err: unknown, show: (text: string) => void) => {
    if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
    show(adminErrorText(err));
    if (serverError(err) === CHANGED_MEANWHILE) void reload();
  };

  const doMove = (to: Move) => {
    if (busy) return;
    setFailure(null);
    setNotice(null);
    const from = order.status;
    move.mutate({ code: order.code, data: { status: to } }, {
      onSuccess: (saved) => {
        fresh(saved);
        setConfirm(null);
        setNotice(to === "paid"
          ? saved.file
            ? "Đã xác nhận thanh toán. Web đã gửi email báo khách, và khách tải được source ngay."
            : "Đã xác nhận thanh toán và gửi email báo khách. Đơn này chưa có file để tải: gắn file ở phần bên dưới nhé."
          : to === "cancelled"
            ? "Đã hủy đơn."
            : from === "paid"
              ? "Đã chuyển đơn về chưa thanh toán. Khách không tải được file nữa cho tới khi bạn xác nhận lại."
              : "Đã mở lại đơn. Đơn đang chờ khách chuyển tiền.");
      },
      onError: (err) => { setConfirm(null); fail(err, setFailure); },
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !dirty) return;
    if (uploading) { setSaveError("Đợi file tải lên xong rồi lưu nhé."); return; }
    const deliveryNote = tidy(form.deliveryNote);
    const adminNote = tidy(form.adminNote);
    if (deliveryNote.length > NOTE_MAX || adminNote.length > NOTE_MAX) {
      setSaveError(`Mỗi ô tối đa ${NOTE_MAX} ký tự.`);
      return;
    }
    const data: AdminOrderUpdate = {};
    if (fileChanged) data.deliveryFile = form.file?.input ?? null;
    if (deliveryChanged) data.deliveryNote = deliveryNote || null;
    if (adminChanged) data.adminNote = adminNote || null;
    setSaveError(null);
    setSaved(false);
    save.mutate({ code: order.code, data }, {
      onSuccess: (result) => {
        fresh(result);
        const next = deliveryOf(result);
        setBase(next);
        setForm(next);
        setSaved(true);
      },
      onError: (err) => fail(err, setSaveError),
    });
  };

  const edit = (patch: Partial<Delivery>) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); setSaveError(null); };
  const pending = order.status === "pending";

  return (
    <dialog ref={dialog} aria-labelledby="order-title" onCancel={(e) => { e.preventDefault(); close(); }}
      className="adm-card m-auto w-[min(calc(100%-1.5rem),46rem)] max-w-none p-0 text-[#1b2a1c] backdrop:bg-[#1b2a1c]/60" data-testid="dialog-order">
      <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
        <div className="flex items-center gap-3 border-b-[3px] border-[#1b2a1c] px-4 py-3">
          <h2 id="order-title" className="font-extrabold">Đơn <span className="font-mono" dir="ltr">{order.code}</span></h2>
          <StageBadge order={order} />
          <button type="button" onClick={close} aria-label="Đóng" className="adm-btn ms-auto h-9 w-9 shrink-0" data-testid="button-order-close">
            <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
          {notice && <p role="status" className="adm-notice info" data-testid="text-order-notice">{notice}</p>}
          {failure && <p role="alert" className="adm-notice error" data-testid="text-order-error">{failure}</p>}

          {pending && (
            <div className="border-[3px] border-[#1b2a1c] bg-white p-3 text-sm">
              <p className="font-bold">{order.transferReportedAt ? `Khách báo đã chuyển tiền lúc ${fullWhen(order.transferReportedAt)}.` : "Khách chưa báo đã chuyển tiền."}</p>
              <p className="mt-1">
                Mở app ngân hàng, tìm khoản tiền vào <b>{vnd(order.amount)}</b> có nội dung <b className="font-mono" dir="ltr">{order.code}</b>.
                Thấy đúng thì bấm "Xác nhận đã nhận tiền".
              </p>
            </div>
          )}

          <Actions order={order} confirm={confirm} busy={move.isPending} onAsk={(m) => { setConfirm(m); setFailure(null); setNotice(null); }}
            onCancel={() => setConfirm(null)} onMove={doMove} />

          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            <Info label="Khách">
              <a href={`mailto:${order.email}`} className="font-semibold underline break-all" dir="ltr">{order.email}</a>
              <button type="button" onClick={() => { if (!dirty || window.confirm("Bỏ các thay đổi chưa lưu của đơn này?")) onFindCustomer(order.email); }}
                className="ms-2 text-xs font-bold underline underline-offset-2 hover:text-[hsl(var(--pin-text))]" data-testid="button-order-customer-orders">
                Các đơn của khách này
              </button>
            </Info>
            <Info label="Gói">{order.packageName}</Info>
            {order.sampleName && <Info label="Mẫu đã chọn"><span dir="auto">{order.sampleName}</span></Info>}
            <Info label="Số tiền"><b>{vnd(order.amount)}</b></Info>
            <Info label="Ngôn ngữ">{languageName(order.lang)}</Info>
            <Info label="Đặt lúc">{fullWhen(order.createdAt)}</Info>
            {order.paidAt && <Info label="Thanh toán lúc">{fullWhen(order.paidAt)}</Info>}
            {order.cancelledAt && <Info label="Hủy lúc">{fullWhen(order.cancelledAt)}</Info>}
            <Info label="Lượt tải">{order.downloads}</Info>
          </dl>

          <form onSubmit={submit} noValidate className="adm-group space-y-4" data-testid="form-order-delivery">
            <div>
              <h3 className="font-extrabold">File khách tải về</h3>
              <p className="text-sm" data-testid="text-order-file">
                {order.file
                  ? <>Khách {order.status === "paid" ? "đang tải" : "sẽ tải"}: <b className="break-all">{order.file.name}</b> ({fileSize(order.file.size)})
                      {order.deliveryFile ? ", file riêng của đơn này." : order.sampleName ? `, file của mẫu ${order.sampleName}.` : "."}</>
                  : order.status === "paid"
                    ? <b className="text-[hsl(var(--pin-text))]">Đơn đã thanh toán nhưng chưa có file để tải. Gắn file bên dưới rồi bấm Lưu.</b>
                    : "Chưa có file. Gắn file bên dưới để khách tải sau khi thanh toán."}
              </p>
            </div>

            <FileField id="order-file" label="File riêng cho đơn này" disabled={busy}
              help="Không bắt buộc. Khi có, khách tải file này thay cho file của mẫu đã chọn."
              empty={order.file && !order.deliveryFile ? "Chưa có. Khách tải file của mẫu đã chọn." : "Chưa có file riêng."}
              value={form.file} onChange={(file) => edit({ file })} onBusy={setUploading} onSignedOut={onSignedOut} />

            <NoteField id="order-delivery-note" label="Lời nhắn cho khách" value={form.deliveryNote} disabled={busy}
              help="Khách thấy lời nhắn này trên trang đơn hàng sau khi đơn được thanh toán. Ví dụ: cách cài đặt, link tải thêm."
              onChange={(deliveryNote) => edit({ deliveryNote })} />
            <NoteField id="order-admin-note" label="Ghi chú riêng" value={form.adminNote} disabled={busy}
              help="Chỉ bạn thấy." onChange={(adminNote) => edit({ adminNote })} />

            {saveError && <p role="alert" className="adm-notice error" data-testid="text-order-save-error">{saveError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy || !dirty || uploading} className="adm-btn red h-11 px-5" data-testid="button-order-save">
                {save.isPending ? "Đang lưu…" : "Lưu"}
              </button>
              {dirty && (
                <button type="button" onClick={() => { setForm(base); setSaveError(null); }} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-order-reset">
                  Hoàn tác
                </button>
              )}
              {saved && !dirty && <span role="status" className="text-sm font-semibold" data-testid="text-order-saved">Đã lưu.</span>}
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}

function Actions({ order, confirm, busy, onAsk, onCancel, onMove }: {
  order: AdminOrder; confirm: Move | null; busy: boolean;
  onAsk: (m: Move) => void; onCancel: () => void; onMove: (m: Move) => void;
}) {
  if (confirm) {
    const question = confirm === "paid"
      ? `Xác nhận đã nhận ${vnd(order.amount)} cho đơn ${order.code}? Khách sẽ nhận email báo đã thanh toán và tải được source.`
      : confirm === "cancelled"
        ? `Hủy đơn ${order.code}? Khách sẽ thấy đơn đã bị hủy.`
        : `Chuyển đơn ${order.code} về chưa thanh toán? Khách sẽ không tải được file nữa cho tới khi bạn xác nhận lại.`;
    return (
      <div role="group" aria-label="Xác nhận" className="border-[3px] border-[#1b2a1c] bg-[#fff6d8] p-3 space-y-3">
        <p className="text-sm font-semibold" data-testid="text-order-confirm">{question}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onMove(confirm)} disabled={busy} className={`adm-btn h-11 px-4 ${confirm === "paid" ? "red" : "gold"}`} data-testid="button-order-confirm">
            {busy ? "Đang lưu…" : confirm === "paid" ? "Đúng, đã nhận tiền" : confirm === "cancelled" ? "Hủy đơn" : "Chuyển về chưa thanh toán"}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-order-confirm-cancel">Thôi</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {order.status === "pending" && (
        <>
          <button type="button" onClick={() => onAsk("paid")} disabled={busy} className="adm-btn red h-11 px-4" data-testid="button-order-mark-paid">
            Xác nhận đã nhận tiền
          </button>
          <button type="button" onClick={() => onAsk("cancelled")} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-order-cancel">
            Hủy đơn
          </button>
        </>
      )}
      {order.status === "paid" && (
        <button type="button" onClick={() => onAsk("pending")} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-order-unpay">
          Chuyển về chưa thanh toán
        </button>
      )}
      {order.status === "cancelled" && (
        <button type="button" onClick={() => onMove("pending")} disabled={busy} className="adm-btn gold h-11 px-4" data-testid="button-order-reopen">
          {busy ? "Đang mở lại…" : "Mở lại đơn"}
        </button>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[#3d4a3d]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function NoteField({ id, label, help, value, disabled, onChange }: {
  id: string; label: string; help: string; value: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const length = tidy(value).length;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <label htmlFor={id} className="text-sm font-bold">{label}</label>
        <span className={`ms-auto text-xs ${length > NOTE_MAX ? "font-bold text-[hsl(var(--pin-text))]" : "text-[#5b6a5b]"}`} aria-hidden="true">{length}/{NOTE_MAX}</span>
      </div>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} dir="auto"
        aria-describedby={`${id}-help`} className="adm-field adm-area block !min-h-[5.5rem]" data-testid={`input-${id}`} />
      <p id={`${id}-help`} className="mt-1 text-xs text-[#5b6a5b]">{help}</p>
    </div>
  );
}
