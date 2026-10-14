import { useEffect, useState } from "react";
import { serverError, statusOf } from "@/lib/http";

/** The admin screens are Vietnamese only, whatever language the visitor site was last set to. */

export const EXPIRED_TEXT = "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.";

const SERVER_TEXT: Record<string, string> = {
  "Admin sign-in is not set up": "Máy chủ chưa có khóa quản trị nên chưa đăng nhập được.",
  "Too many wrong attempts, wait 15 minutes": "Nhập sai khóa quá nhiều lần. Đợi 15 phút rồi thử lại.",
  "Wrong token": "Khóa quản trị không đúng.",
  "Too many codes sent, wait 15 minutes": "Đã gửi quá nhiều mã. Đợi 15 phút rồi thử lại.",
  "Email sending is not set up": "Chưa kết nối Gmail nên chưa gửi được mã.",
  "Could not send the code email": "Gửi email chứa mã không thành công. Thử lại sau ít phút.",
  "No code was requested in this browser": "Trình duyệt này chưa yêu cầu mã, hoặc mã đã hết hạn. Gửi mã mới nhé.",
  "Too many wrong codes, wait 15 minutes": "Nhập sai mã quá nhiều lần. Đợi 15 phút rồi thử lại.",
  "This code expired or was used up, request a new one": "Mã đã hết hạn hoặc đã hết lượt nhập. Gửi mã mới nhé.",
  "Wrong code": "Mã không đúng. Kiểm tra lại email nhé.",
  "Conversation not found": "Cuộc trò chuyện này không còn nữa.",
  "Message is empty": "Tin nhắn đang trống.",
  "Invalid input": "Nội dung gửi lên chưa hợp lệ.",
  "Not signed in": EXPIRED_TEXT,
  "Request did not come from this site": "Yêu cầu bị chặn vì không gửi từ trang này. Tải lại trang rồi thử lại.",
  "Too many requests, try again later": "Thao tác hơi nhanh. Đợi một lát rồi thử lại.",
  "Package not found": "Gói này không còn trên Whop. Tải lại danh sách nhé.",
  "This package has buyers, hide it instead": "Gói đã có người mua nên không xóa được. Bạn có thể bỏ đánh dấu \"Đang bán\" để ẩn gói.",
  "Payment provider unavailable": "Chưa kết nối được Whop. Thử lại sau ít phút.",
  "Name is empty": "Tên gói đang trống.",
  "USD price can have at most 2 decimals": "Giá USD chỉ được có tối đa 2 chữ số sau dấu chấm.",
};

/** Whop's own reason for refusing a change comes back as "Whop: …" (in English). */
const WHOP_REASON = /^Whop: (.+)$/s;

/** A short Vietnamese explanation for any failed admin request. */
export function adminErrorText(err: unknown): string {
  const message = serverError(err);
  const known = SERVER_TEXT[message];
  if (known) return known;
  const whop = message.match(WHOP_REASON);
  if (whop) return `Whop không nhận thay đổi này. Lý do Whop đưa ra: ${whop[1]}`;
  const s = statusOf(err);
  if (s === 0) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if (s === 401) return EXPIRED_TEXT;
  if (s === 429) return "Thao tác hơi nhanh. Đợi một lát rồi thử lại.";
  if (s >= 500) return "Máy chủ đang gặp lỗi. Thử lại sau ít phút.";
  return "Có lỗi xảy ra. Thử lại nhé.";
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

/** Customers are known by the email they bought with; older rows fall back to a stable short label. */
export function guestName(c: { id: string; name: string | null; email?: string | null }) {
  return c.name?.trim() || c.email?.trim() || `Khách ${c.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
