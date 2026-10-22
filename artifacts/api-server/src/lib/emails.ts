import { EMAIL_TEXT, type EmailText } from "./emailText";

// Every email the site sends. Customer emails go out in the customer's site language; the
// admin's are Vietnamese. Codes are never put in a subject line, where lock screens show them.

export type Email = { subject: string; text: string; html: string };
type Block =
  | { kind: "p"; text: string }
  | { kind: "code"; text: string }
  | { kind: "button"; text: string; href: string }
  | { kind: "muted"; text: string };

const RTL = new Set(["ar", "fa", "he", "ur"]);
const CONTACT = "hello@idkworkshop.com";
export const CODE_MINUTES = 15;

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function textFor(lang: string): EmailText {
  return EMAIL_TEXT[lang] ?? EMAIL_TEXT[lang.split("-")[0]] ?? EMAIL_TEXT.en;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function formatVnd(amount: number, lang = "vi"): string {
  try {
    return new Intl.NumberFormat(lang, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
}

function render(lang: string, subject: string, blocks: Block[]): Email {
  const dir = RTL.has(lang.split("-")[0]) ? "rtl" : "ltr";
  const html = blocks
    .map((block) => {
      switch (block.kind) {
        case "p":
          return `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${esc(block.text)}</p>`;
        case "code":
          return `<p dir="ltr" style="margin:0 0 16px;font-size:34px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace">${esc(block.text)}</p>`;
        case "button":
          return `<p style="margin:4px 0 18px"><a href="${esc(block.href)}" style="display:inline-block;background:#1b2a1c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 18px">${esc(block.text)}</a></p>`;
        case "muted":
          return `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#5b6157">${esc(block.text)}</p>`;
      }
    })
    .join("\n");
  const text = blocks
    .map((block) => (block.kind === "button" ? `${block.text}: ${block.href}` : block.text))
    .concat([`-- \nxidker · ${CONTACT}`])
    .join("\n\n");
  return {
    subject,
    text,
    html: `<!doctype html><html lang="${esc(lang)}" dir="${dir}"><body style="margin:0;padding:24px;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#10241a">
<div style="max-width:460px;margin:0 auto;background:#ffffff;border:4px solid #1b2a1c;padding:24px">
<p style="margin:0 0 18px;font-size:13px;font-weight:bold;letter-spacing:2px;color:#1b2a1c">XIDKER</p>
${html}
<p style="margin:18px 0 0;font-size:12px;color:#8a8f84">xidker · ${CONTACT}</p>
</div></body></html>`,
  };
}

/* ---------------- customers ---------------- */

export function codeEmail(lang: string, purpose: "register" | "verify" | "reset", code: string): Email {
  const t = textFor(lang);
  const intro = purpose === "register" ? t.codeRegister : purpose === "verify" ? t.codeVerify : t.codeReset;
  return render(lang, t.codeSubject, [
    { kind: "p", text: intro },
    { kind: "code", text: code },
    { kind: "p", text: fill(t.codeExpiry, { minutes: CODE_MINUTES }) },
    { kind: "muted", text: t.codeIgnore },
  ]);
}

export function accountExistsEmail(lang: string, signInUrl: string): Email {
  const t = textFor(lang);
  return render(lang, t.existsSubject, [
    { kind: "p", text: t.existsBody },
    { kind: "p", text: t.existsAction },
    { kind: "button", text: t.signInButton, href: signInUrl },
    { kind: "muted", text: t.existsIgnore },
  ]);
}

export function orderCreatedEmail(
  lang: string,
  order: { code: string; packageName: string; amount: number; url: string },
): Email {
  const t = textFor(lang);
  const values = { code: order.code, package: order.packageName, amount: formatVnd(order.amount, lang) };
  return render(lang, fill(t.orderSubject, values), [
    { kind: "p", text: fill(t.orderIntro, values) },
    { kind: "p", text: fill(t.orderTransfer, values) },
    { kind: "button", text: t.orderButton, href: order.url },
    { kind: "muted", text: t.orderAfter },
  ]);
}

export function orderPaidEmail(
  lang: string,
  order: { code: string; packageName: string; url: string; hasFile: boolean },
): Email {
  const t = textFor(lang);
  const values = { code: order.code, package: order.packageName };
  return render(lang, fill(t.paidSubject, values), [
    { kind: "p", text: fill(t.paidIntro, values) },
    { kind: "p", text: order.hasFile ? t.paidDownload : t.paidNoFile },
    { kind: "button", text: t.paidButton, href: order.url },
  ]);
}

/* ---------------- admin (Vietnamese) ---------------- */

export function adminCodeEmail(code: string): Email {
  return render("vi", "Mã đăng nhập quản trị xidker", [
    { kind: "p", text: "Mã để vào trang quản trị xidker:" },
    { kind: "code", text: code },
    { kind: "p", text: `Mã dùng được trong ${CODE_MINUTES} phút và chỉ dùng được một lần.` },
    {
      kind: "muted",
      text: "Nếu không phải bạn vừa đăng nhập, mật khẩu tài khoản quản trị đã bị người khác biết. Hãy đổi mật khẩu ngay bằng “Quên mật khẩu” ở trang đăng nhập.",
    },
  ]);
}

type AdminOrderInfo = { code: string; email: string; packageName: string; sampleName: string | null; amount: number; url: string };

const orderLine = (order: AdminOrderInfo) =>
  `${order.packageName}${order.sampleName ? ` (mẫu ${order.sampleName})` : ""} · ${formatVnd(order.amount)}`;

export function adminNewOrderEmail(order: AdminOrderInfo): Email {
  return render("vi", `Đơn mới ${order.code} · ${formatVnd(order.amount)}`, [
    { kind: "p", text: `Khách ${order.email} vừa đặt đơn ${order.code}: ${orderLine(order)}.` },
    { kind: "p", text: `Nội dung chuyển khoản sẽ là ${order.code}. Khi thấy tiền vào tài khoản, mở trang quản trị và bấm “Đã nhận tiền”.` },
    { kind: "button", text: "Mở trang quản trị", href: order.url },
  ]);
}

export function adminTransferReportedEmail(order: AdminOrderInfo): Email {
  return render("vi", `Khách báo đã chuyển khoản · ${order.code}`, [
    { kind: "p", text: `Khách ${order.email} báo đã chuyển ${formatVnd(order.amount)} cho đơn ${order.code} (${orderLine(order)}).` },
    { kind: "p", text: `Hãy kiểm tra tài khoản ngân hàng: thấy khoản tiền có nội dung ${order.code} thì bấm “Đã nhận tiền” trong trang quản trị.` },
    { kind: "button", text: "Mở trang quản trị", href: order.url },
  ]);
}
