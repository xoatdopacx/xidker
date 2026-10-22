import { useEffect, useState } from "react";
import { serverError, statusOf } from "@/lib/http";

/** The admin screens are Vietnamese only, whatever language the visitor site was last set to. */

export const EXPIRED_TEXT = "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.";

const SERVER_TEXT: Record<string, string> = {
  "Conversation not found": "Cuộc trò chuyện này không còn nữa.",
  "Message is empty": "Tin nhắn đang trống.",
  "Invalid input": "Nội dung gửi lên chưa hợp lệ.",
  "Not signed in": EXPIRED_TEXT,
  "Request did not come from this site": "Yêu cầu bị chặn vì không gửi từ trang này. Tải lại trang rồi thử lại.",
  "Too many requests, try again later": "Thao tác hơi nhanh. Đợi một lát rồi thử lại.",
  "Package not found": "Gói này không còn nữa. Tải lại danh sách nhé.",
  "This package has orders, hide it instead": "Gói đã có đơn hàng nên không xóa được. Bạn có thể bỏ đánh dấu \"Đang bán\" để ẩn gói.",
  "Sample not found": "Mẫu này không còn nữa. Tải lại danh sách nhé.",
  "An image was not uploaded completely, add it again": "Có ảnh chưa tải lên xong. Xóa ảnh đó rồi thêm lại nhé.",
  "Only WebP, JPEG and PNG images can be used": "Chỉ dùng được ảnh WebP, JPG hoặc PNG.",
  "Images must be 15 MB or smaller": "Mỗi ảnh tối đa 15 MB.",
  "Only WebP, JPEG or PNG images up to 15 MB, or .zip files up to 200 MB": "Chỉ dùng được ảnh WebP, JPG, PNG (tối đa 15 MB) hoặc file .zip (tối đa 200 MB).",
  "Failed to create the upload link": "Chưa tải file lên được. Thử lại sau ít phút.",
  "This template file is not available": "File source có sẵn này không còn trên máy chủ. Chọn file khác nhé.",
  "The zip was not uploaded": "File .zip chưa được tải lên. Chọn lại file nhé.",
  "The zip was not uploaded completely, upload it again": "File .zip chưa tải lên xong. Tải lại file nhé.",
  "Only .zip files can be used": "Chỉ dùng được file .zip.",
  "The zip must be 200 MB or smaller": "File .zip tối đa 200 MB.",
  "Order not found": "Không tìm thấy đơn này. Tải lại danh sách nhé.",
  "Move the order back to “not paid yet” first": "Chuyển đơn về \"Chưa thanh toán\" trước rồi mới đổi tiếp được.",
  "The order changed meanwhile, reload the list": "Đơn vừa được thay đổi ở nơi khác (khách hủy hoặc một tab khác). Đã tải lại, xem rồi làm lại nhé.",
  "Customer not found": "Không tìm thấy khách này. Tải lại danh sách nhé.",
  "The admin account cannot be locked": "Không khóa được tài khoản quản trị.",
  "Check the bank, account number and account name": "Kiểm tra lại ngân hàng, số tài khoản và tên chủ tài khoản.",
  "One of the lines is not an email domain (like gmail.com)": "Có dòng không phải tên miền email (ví dụ đúng: gmail.com).",
};

/** A short Vietnamese explanation for any failed admin request. */
export function adminErrorText(err: unknown): string {
  const known = SERVER_TEXT[serverError(err)];
  if (known) return known;
  const s = statusOf(err);
  if (s === 0) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if (s === 401) return EXPIRED_TEXT;
  if (s === 429) return "Thao tác hơi nhanh. Đợi một lát rồi thử lại.";
  if (s >= 500) return "Máy chủ đang gặp lỗi. Thử lại sau ít phút.";
  return "Có lỗi xảy ra. Thử lại nhé.";
}

const vndFmt = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
/** 299.000 ₫ */
export const vnd = (amount: number) => vndFmt.format(amount);

const usdFmt = (whole: boolean) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
});
/** $12, $12.50 */
export const usd = (amount: number) => usdFmt(Number.isInteger(amount)).format(amount);

/** 1,5 MB / 820 KB */
export function fileSize(bytes: number) {
  const mb = bytes >= 1e6;
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(bytes / (mb ? 1e6 : 1e3))} ${mb ? "MB" : "KB"}`;
}

/** The value after the visitor stops typing for `ms`. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/** Where every order stands, in the admin's words. "reported": not paid yet, but the buyer says they sent the money. */
export type OrderStage = "waiting" | "reported" | "paid" | "cancelled";
export function orderStage(o: { status: "pending" | "paid" | "cancelled"; transferReportedAt: string | null }): OrderStage {
  if (o.status === "pending") return o.transferReportedAt ? "reported" : "waiting";
  return o.status;
}
export const STAGE_LABEL: Record<OrderStage, string> = {
  waiting: "Chờ chuyển tiền",
  reported: "Khách báo đã chuyển",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};
const STAGE_STYLE: Record<OrderStage, string> = {
  waiting: "bg-white text-[#1b2a1c]",
  reported: "bg-[hsl(var(--gold))] text-[#1b2a1c]",
  paid: "bg-[hsl(var(--grass-d))] text-white",
  cancelled: "bg-[#d6d2c6] text-[#3d4a3d]",
};
export function StageBadge({ order }: { order: { status: "pending" | "paid" | "cancelled"; transferReportedAt: string | null } }) {
  const stage = orderStage(order);
  return (
    <span className={`inline-block border-2 border-[#1b2a1c] px-1.5 py-0.5 text-xs font-bold whitespace-nowrap ${STAGE_STYLE[stage]}`} data-testid="text-admin-order-stage">
      {STAGE_LABEL[stage]}
    </span>
  );
}

/** Signs the admin out (with a notice) as soon as a request comes back 401. */
export function useSignOutOn401(err: unknown, onSignedOut: (notice: string | null) => void) {
  const expired = statusOf(err) === 401;
  useEffect(() => {
    if (expired) onSignedOut(EXPIRED_TEXT);
  }, [expired, onSignedOut]);
}

/**
 * Sets the tab title. Runs a frame late because the language provider also writes the title
 * when the app first mounts, after this page's own effects.
 */
export function useDocTitle(title: string) {
  useEffect(() => {
    const id = requestAnimationFrame(() => { document.title = title; });
    return () => cancelAnimationFrame(id);
  }, [title]);
}

/** Current time, refreshed every `ms` while `active`. */
export function useNow(ms: number, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return now;
}

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
const fullFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "14:05" today, "12/10" before that. For list rows. */
export function shortWhen(iso: string) {
  const d = new Date(iso);
  return sameDay(d, new Date()) ? timeFmt.format(d) : dayFmt.format(d);
}

/** "14:05" today, "12/10 14:05" before that. For message times. */
export function messageWhen(iso: string) {
  const d = new Date(iso);
  return sameDay(d, new Date()) ? timeFmt.format(d) : `${dayFmt.format(d)} ${timeFmt.format(d)}`;
}

export function fullWhen(iso: string) {
  return fullFmt.format(new Date(iso));
}

export function clock(iso: string) {
  return timeFmt.format(new Date(iso));
}

let langNames: Intl.DisplayNames | null = null;
/** "Tiếng Anh" for "en"; falls back to the raw code. */
export function languageName(code: string) {
  try {
    langNames ??= new Intl.DisplayNames(["vi"], { type: "language" });
    const name = langNames.of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
  } catch {
    return code;
  }
}

/** Customers are known by their account email; older rows fall back to a stable short label. */
export function guestName(c: { id: string; name: string | null; email?: string | null }) {
  return c.name?.trim() || c.email?.trim() || `Khách ${c.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
