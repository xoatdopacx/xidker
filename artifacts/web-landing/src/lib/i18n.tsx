import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "@workspace/api-client-react";

export const CONTACT_EMAIL = "hello@idkworkshop.com";

const vi = {
  meta: {
    title: "xidker — Landing page 3D như một tác phẩm nghệ thuật",
    description: "xidker thiết kế và dựng landing page có điêu khắc 3D cho founder, shop online và người bán khóa học. Chọn gói, thanh toán online, trang lên sóng sau 12 ngày.",
  },
  lang: { switchLabel: "Chọn ngôn ngữ", vi: "Tiếng Việt", en: "English" },
  nav: { home: "xidker, về trang chủ", method: "Cách làm", process: "Quy trình", pricing: "Bảng giá", faq: "Hỏi đáp", cta: "Chọn gói" },
  hero: {
    eyebrow: "Studio landing page 3D · Sài Gòn",
    l1: "Trang bán hàng",
    l2: "khách dừng lại",
    l3: "để ngắm.",
    sub: "xidker thiết kế và dựng landing page có điêu khắc 3D cho founder, shop online và người bán khóa học. Người ta đứng lại trước một tác phẩm. Rồi họ bấm mua.",
    cta: "Xem các gói dựng trang",
    secondary: "Trang này được làm thế nào?",
    plaque: "Tĩnh vật số 01 · WebGL, ánh sáng, xanh Klein",
    sceneAlt: "Tác phẩm điêu khắc 3D: quả cầu xanh Klein, vòng xoắn chrome và vòm đỏ son trên bệ trưng bày",
  },
  marqueeLabel: "Một vài thương hiệu đã làm cùng xidker",
  method: {
    eyebrow: "01 — Giải phẫu một trang bán được hàng",
    title: "Đẹp chỉ là lớp trên cùng.",
    sub: "Mỗi trang xidker dựng là bốn lớp kính chồng lên nhau, như một bản in lụa. Cuộn chậm lại, bạn sẽ thấy chúng tách ra.",
    layerWord: "lớp",
    layers: [
      { name: "Thông điệp", note: "Một câu nói trúng nỗi đau. Viết trước, thiết kế sau." },
      { name: "Bố cục", note: "Mắt khách đi theo đường ta vẽ sẵn tới nút mua." },
      { name: "Điêu khắc 3D", note: "Đủ để khiến người ta dừng cuộn. Không đủ để làm chậm máy." },
      { name: "Thanh toán", note: "Cổng thanh toán gắn sẵn. Khách mua ngay trên trang." },
    ],
    buy: "Mua ngay",
  },
  stats: {
    title: "Chúng tôi không bán hiệu ứng. Chúng tôi bán con số sau hiệu ứng.",
    items: [
      { v: "38", u: "trang", l: "đã lên sóng từ 2022" },
      { v: "2,7", u: "×", l: "tỷ lệ chuyển đổi trung bình so với trang cũ" },
      { v: "1,4", u: "giây", l: "tải trang đầu tiên trên 4G" },
      { v: "12", u: "ngày", l: "từ lúc thanh toán tới lúc ra mắt" },
    ],
  },
  features: {
    title: "Lý do bạn đã cuộn tới tận đây.",
    sub: "Bạn đang đọc chính sản phẩm của xidker. Mọi thứ bạn thấy ở đây đều có trong gói dựng trang của bạn.",
    items: [
      { t: "3D như một tác phẩm", d: "Mỗi vật thể được tạo hình, chiếu sáng và bố cục như trong phòng tranh, rồi dẫn mắt về sản phẩm của bạn." },
      { t: "Nhanh như trang tĩnh", d: "Chữ và nút mua hiện trước, điêu khắc 3D tải sau. Máy yếu tự nhận bản minh họa nhẹ." },
      { t: "Điện thoại là ưu tiên", d: "Phần lớn khách đến từ Facebook và TikTok. Chúng tôi thiết kế cho ngón cái trước." },
      { t: "Mua trong hai lần chạm", d: "Cổng thanh toán quốc tế gắn sẵn. Khách không phải nhắn tin hỏi giá." },
    ],
  },
  process: {
    eyebrow: "02 — Quy trình",
    title: "Mười hai ngày. Bốn bước. Không họp thừa.",
    steps: [
      { t: "Chọn gói & thanh toán", d: "Thanh toán an toàn qua Whop. Trong 24 giờ chúng tôi gửi bảng câu hỏi ngắn.", day: "Ngày 0" },
      { t: "Viết lời & phác thảo", d: "Một buổi gọi 45 phút. Chúng tôi viết lời bán hàng và phác khung trang.", day: "Ngày 1–4" },
      { t: "Điêu khắc 3D & lập trình", d: "Bạn nhận link xem trước mỗi hai ngày và góp ý trực tiếp lên trang.", day: "Ngày 5–10" },
      { t: "Ra mắt", d: "Gắn tên miền, cổng thanh toán, đo lường. Bàn giao toàn bộ mã nguồn.", day: "Ngày 11–12" },
    ],
  },
  pricing: {
    eyebrow: "03 — Bảng giá",
    title: "Chọn khung cho tác phẩm của bạn.",
    sub: "Giá trọn gói, không phát sinh. Thanh toán qua Whop, xidker bắt tay vào việc ngay trong ngày.",
    recommended: "Được chọn nhiều nhất",
    choose: "Chọn gói này",
    opening: "Đang mở trang thanh toán…",
    oneTime: "trả một lần",
    monthly: "mỗi tháng",
    yearly: "mỗi năm",
    everyNDays: (n: number) => `mỗi ${n} ngày`,
    recurring: "định kỳ",
    loading: "Đang tải bảng giá",
    errorTitle: "Bảng giá đang tạm vắng mặt",
    errorBody: "Chúng tôi chưa kết nối được tới hệ thống thanh toán. Thường chỉ mất vài giây để quay lại.",
    retry: "Thử tải lại",
    empty: "Các gói đang được cập nhật. Quay lại sau ít phút nhé.",
    footnote: "Thanh toán bảo mật qua Whop · Thẻ quốc tế · Hóa đơn gửi qua email",
    toastTitle: "Chưa mở được trang thanh toán",
    toastBody: "Kết nối tới cổng thanh toán bị gián đoạn. Bạn thử lại sau vài giây nhé.",
  },
  faq: {
    eyebrow: "04 — Hỏi đáp",
    title: "Những điều bạn đang thắc mắc.",
    toggle: "Mở hoặc đóng câu trả lời",
    items: [
      { q: "3D có làm trang tải chậm không?", a: "Không. Nội dung chữ và nút mua luôn hiện trước, điêu khắc 3D tải sau. Máy yếu hoặc trình duyệt cũ sẽ nhận bản minh họa nhẹ, vẫn đẹp và vẫn bán được." },
      { q: "Tôi chưa có nội dung, các bạn có viết giúp không?", a: "Có. Mọi gói đều bao gồm viết lời bán hàng. Bạn chỉ cần kể cho chúng tôi về sản phẩm trong buổi gọi đầu tiên." },
      { q: "Sau khi thanh toán thì chuyện gì xảy ra?", a: "Bạn được đưa về trang xác nhận. Trong vòng 24 giờ làm việc, xidker gửi email kèm bảng câu hỏi và lịch hẹn buổi gọi khởi động." },
      { q: "Tôi có sở hữu mã nguồn không?", a: "Có, toàn bộ. Chúng tôi bàn giao mã nguồn, hướng dẫn chỉnh sửa và hỗ trợ gắn tên miền riêng của bạn." },
      { q: "Nếu tôi không hài lòng với bản thiết kế?", a: "Mỗi gói có số vòng chỉnh sửa rõ ràng. Nếu sau buổi phác thảo đầu tiên bạn thấy không hợp, chúng tôi hoàn tiền phần chưa làm." },
    ],
  },
  cta: {
    title: "Sản phẩm của bạn xứng đáng được treo lên tường.",
    sub: "Mỗi tháng xidker chỉ nhận 4 dự án để giữ chất lượng. Chọn gói hôm nay, trang của bạn lên sóng sau 12 ngày.",
    button: "Giữ chỗ tháng này",
  },
  footer: {
    about: "Landing page 3D cho người bán hàng online. Dựng tại Sài Gòn, chạy khắp nơi.",
    contact: "Liên hệ",
    rights: "Trang này cũng do xidker dựng.",
  },
  thanks: {
    back: "Về trang chủ",
    noRefTitle: "Thiếu mã đơn hàng.",
    noRefBody: "Đường dẫn này không kèm mã tham chiếu nên chúng tôi chưa thể kiểm tra thanh toán. Hãy mở lại liên kết sau khi thanh toán, hoặc chọn một gói mới.",
    loading: "Đang tra cứu đơn hàng…",
    nfTitle: "Không tìm thấy đơn này.",
    nfBody1: "Mã",
    nfBody2: "không khớp với giao dịch nào. Nếu bạn vừa bị trừ tiền, hãy gửi email cho chúng tôi kèm mã này.",
    support: "Liên hệ hỗ trợ",
    supportSubject: "Đơn hàng",
    errTitle: "Chưa kiểm tra được thanh toán.",
    errBody: "Kết nối tới hệ thống thanh toán đang chập chờn. Đơn của bạn vẫn an toàn, hãy thử lại.",
    retry: "Kiểm tra lại",
    paidEyebrow: "Đã xác nhận thanh toán",
    paidTitle: "Tác phẩm của bạn bắt đầu từ hôm nay.",
    paidBody: "Cảm ơn bạn. Trong vòng 24 giờ làm việc, xidker sẽ gửi email kèm bảng câu hỏi và lịch hẹn buổi gọi khởi động.",
    receipt: "Biên nhận",
    pkg: "Gói",
    amount: "Số tiền",
    time: "Thời gian",
    ref: "Mã tham chiếu",
    pendingEyebrow: "Đang chờ xác nhận",
    pendingTitle: "Chúng tôi đang xác minh khoản thanh toán.",
    pendingBody1: "Gói",
    pendingBody2: "Trang này tự kiểm tra lại mỗi 3 giây, bạn không cần tải lại. Thường chỉ mất chưa đầy một phút.",
    code: "Mã",
  },
  nf: {
    title: "Phòng này chưa treo tranh.",
    body: "Trang bạn tìm không tồn tại hoặc đã được dời đi nơi khác.",
    back: "Về trang chủ",
    metaTitle: "Không tìm thấy trang — xidker",
  },
};

export type Dict = typeof vi;

const en: Dict = {
  meta: {
    title: "xidker — 3D landing pages that feel like art",
    description: "xidker designs and builds landing pages with sculpted 3D for founders, online shops and course creators. Pick a package, pay online, launch in 12 days.",
  },
  lang: { switchLabel: "Choose language", vi: "Tiếng Việt", en: "English" },
  nav: { home: "xidker, back to home", method: "Method", process: "Process", pricing: "Pricing", faq: "FAQ", cta: "Pick a package" },
  hero: {
    eyebrow: "3D landing page studio · Saigon",
    l1: "Sales pages",
    l2: "people stop",
    l3: "to stare at.",
    sub: "xidker designs and builds landing pages with sculpted 3D for founders, online shops and course creators. People pause in front of art. Then they buy.",
    cta: "See the packages",
    secondary: "How was this page made?",
    plaque: "Still Life No. 01 · WebGL, light, Klein blue",
    sceneAlt: "3D sculpture: a Klein blue sphere, a chrome knot and a vermilion arch on a gallery plinth",
  },
  marqueeLabel: "A few brands xidker has worked with",
  method: {
    eyebrow: "01 — Anatomy of a page that sells",
    title: "Beauty is just the top layer.",
    sub: "Every xidker page is four panes of glass stacked like a silkscreen print. Scroll slowly and watch them come apart.",
    layerWord: "layer",
    layers: [
      { name: "Message", note: "One sentence that hits the real problem. Words first, pixels second." },
      { name: "Layout", note: "A path for the eye, drawn in advance, ending at the buy button." },
      { name: "3D sculpture", note: "Enough to stop the scroll. Never enough to slow the phone." },
      { name: "Checkout", note: "Payments built in. Visitors buy without leaving the page." },
    ],
    buy: "Buy now",
  },
  stats: {
    title: "We don't sell effects. We sell the numbers behind them.",
    items: [
      { v: "38", u: "pages", l: "launched since 2022" },
      { v: "2.7", u: "×", l: "average conversion lift over the old page" },
      { v: "1.4", u: "sec", l: "first load on a 4G phone" },
      { v: "12", u: "days", l: "from payment to launch" },
    ],
  },
  features: {
    title: "Why you've scrolled this far.",
    sub: "You're reading xidker's own product. Everything you see here comes with your build.",
    items: [
      { t: "3D that reads as art", d: "Every object is shaped, lit and composed like a gallery piece, then pointed straight at your product." },
      { t: "Fast as a static page", d: "Words and the buy button load first, sculpture second. Older phones get a lighter illustrated version." },
      { t: "Built for the thumb", d: "Most of your traffic arrives from Facebook and TikTok. We design for phones before desktops." },
      { t: "Two taps to buy", d: "International checkout is wired in. No one has to message you to ask the price." },
    ],
  },
  process: {
    eyebrow: "02 — Process",
    title: "Twelve days. Four steps. No pointless meetings.",
    steps: [
      { t: "Pick & pay", d: "Secure checkout through Whop. Within 24 hours you get a short questionnaire.", day: "Day 0" },
      { t: "Copy & sketches", d: "One 45-minute call. We write the sales copy and sketch the page.", day: "Days 1–4" },
      { t: "Sculpt & code", d: "A fresh preview link every two days. Leave feedback right on the page.", day: "Days 5–10" },
      { t: "Launch", d: "Domain, checkout and analytics connected. Full source code handed over.", day: "Days 11–12" },
    ],
  },
  pricing: {
    eyebrow: "03 — Pricing",
    title: "Choose the frame for your work.",
    sub: "Fixed prices, no surprises. Pay through Whop and xidker starts the same day.",
    recommended: "Most popular",
    choose: "Choose this package",
    opening: "Opening checkout…",
    oneTime: "one-time",
    monthly: "per month",
    yearly: "per year",
    everyNDays: (n: number) => `every ${n} days`,
    recurring: "recurring",
    loading: "Loading pricing",
    errorTitle: "Pricing is taking a short break",
    errorBody: "We couldn't reach the payment system just now. It usually comes back within seconds.",
    retry: "Try again",
    empty: "Packages are being updated. Check back in a few minutes.",
    footnote: "Secure checkout by Whop · International cards · Receipt by email",
    toastTitle: "Couldn't open checkout",
    toastBody: "The connection to the payment page dropped. Give it a few seconds and try again.",
  },
  faq: {
    eyebrow: "04 — FAQ",
    title: "The questions you're probably asking.",
    toggle: "Show or hide the answer",
    items: [
      { q: "Won't 3D make the page slow?", a: "No. Text and the buy button always load first; the sculpture loads after. Older phones and browsers get a lighter illustrated version that still looks good and still sells." },
      { q: "I don't have copy yet. Can you write it?", a: "Yes. Every package includes sales copywriting. Just tell us about your product on the kickoff call." },
      { q: "What happens after I pay?", a: "You land on a confirmation page. Within one business day, xidker emails you a questionnaire and a link to book the kickoff call." },
      { q: "Do I own the code?", a: "All of it. We hand over the source, a short editing guide, and help connecting your own domain." },
      { q: "What if I don't like the design?", a: "Each package includes a clear number of revision rounds. If the first sketch session isn't a fit, we refund the work we haven't done." },
    ],
  },
  cta: {
    title: "Your product deserves wall space.",
    sub: "xidker takes on just four projects a month to keep the bar high. Choose a package today and go live in 12 days.",
    button: "Claim a spot this month",
  },
  footer: {
    about: "3D landing pages for people who sell online. Made in Saigon, live everywhere.",
    contact: "Contact",
    rights: "This page was built by xidker, too.",
  },
  thanks: {
    back: "Back to home",
    noRefTitle: "Your order reference is missing.",
    noRefBody: "This link doesn't include a reference, so we can't check your payment yet. Reopen the link you got after paying, or pick a new package.",
    loading: "Looking up your order…",
    nfTitle: "We couldn't find this order.",
    nfBody1: "Reference",
    nfBody2: "doesn't match any transaction. If you were charged, email us with this reference and we'll sort it out.",
    support: "Contact support",
    supportSubject: "Order",
    errTitle: "We couldn't check your payment yet.",
    errBody: "The payment system is being flaky. Your order is safe — try again in a moment.",
    retry: "Check again",
    paidEyebrow: "Payment confirmed",
    paidTitle: "Your piece starts today.",
    paidBody: "Thank you. Within one business day, xidker will email you a questionnaire and a link to book your kickoff call.",
    receipt: "Receipt",
    pkg: "Package",
    amount: "Amount",
    time: "Paid at",
    ref: "Reference",
    pendingEyebrow: "Awaiting confirmation",
    pendingTitle: "We're verifying your payment.",
    pendingBody1: "Package",
    pendingBody2: "This page checks again every 3 seconds — no need to refresh. It usually takes under a minute.",
    code: "Ref",
  },
  nf: {
    title: "Nothing hangs in this room.",
    body: "The page you're looking for doesn't exist or has moved.",
    back: "Back to home",
    metaTitle: "Page not found — xidker",
  },
};

const DICTS: Record<Language, Dict> = { vi, en };
const KEY = "xidker-lang";

function initialLang(): Language {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "vi" || s === "en") return s;
  } catch { /* ignore */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("vi") ? "vi" : "en";
}

type Ctx = { lang: Language; setLang: (l: Language) => void; t: Dict; locale: string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang);
  const setLang = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };
  const t = DICTS[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.meta.title;
    const set = (sel: string, v: string) => document.querySelector(sel)?.setAttribute("content", v);
    set('meta[name="description"]', t.meta.description);
    set('meta[property="og:title"]', t.meta.title);
    set('meta[property="og:description"]', t.meta.description);
    set('meta[name="twitter:title"]', t.meta.title);
    set('meta[name="twitter:description"]', t.meta.description);
  }, [lang, t]);
  return <I18nCtx.Provider value={{ lang, setLang, t, locale: lang === "vi" ? "vi-VN" : "en-US" }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}

export function LangSwitch({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const { lang, setLang, t } = useI18n();
  const base = tone === "dark" ? "border-[hsl(var(--paper))]" : "border-[hsl(var(--ink))]";
  return (
    <div role="group" aria-label={t.lang.switchLabel} className={`inline-flex rounded-full border-2 ${base} p-0.5 text-xs font-bold font-mono ${className}`}>
      {(["vi", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} aria-label={t.lang[l]}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${lang === l ? "bg-[hsl(var(--flare))] text-[hsl(var(--paper))]" : "opacity-70 hover:opacity-100"}`}
          data-testid={`button-lang-${l}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
