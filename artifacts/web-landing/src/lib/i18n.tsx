import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "@workspace/api-client-react";

export const CONTACT_EMAIL = "hello@idkworkshop.com";

const vi = {
  meta: {
    title: "xidker — Source code web portfolio làm sẵn",
    description: "Mua source code một website portfolio cá nhân đã làm xong. Thay tên, dự án và ảnh của bạn vào rồi đưa lên mạng. Thanh toán qua Whop.",
  },
  lang: { switchLabel: "Chọn ngôn ngữ", vi: "Tiếng Việt", en: "English" },
  nav: { home: "xidker, về trang chủ", what: "Bạn nhận gì", how: "Cách dùng", pricing: "Bảng giá", faq: "Hỏi đáp", cta: "Xem giá" },
  hero: {
    eyebrow: "Source code web portfolio",
    title: "Web portfolio làm sẵn. Mua source về, thay thông tin của bạn là dùng được.",
    sub: "Không cần thiết kế từ đầu. Bạn nhận toàn bộ source của một trang portfolio có chuyển động, chỉ việc điền tên, dự án và ảnh của mình rồi đưa lên mạng.",
    start: "Bắt đầu đi",
    cta: "Xem giá luôn",
    hint: "Cuộn xuống để đi hết con đường",
    mapAlt: "Bản đồ kho báu",
    heroAlt: "Nhân vật pixel đứng ở vạch xuất phát",
  },
  stage: "Chặng",
  reached: "Đã tới",
  stops: {
    what: {
      title: "Bạn mua gì?",
      body: "Toàn bộ source code của một website portfolio cá nhân, đã thiết kế và lập trình xong. Bạn sở hữu bản source đó và sửa thoải mái theo ý mình.",
      points: ["Thiết kế đã hoàn chỉnh, không phải bản nháp", "Nội dung tách riêng, dễ tìm để thay", "Dùng được ngay sau khi thay thông tin"],
    },
    pages: {
      title: "Trong web có những trang nào?",
      body: "Đủ những gì một nhà tuyển dụng hay khách hàng muốn xem khi mở link của bạn.",
      items: ["Trang chủ giới thiệu bạn là ai", "Danh sách dự án nổi bật", "Trang chi tiết cho từng dự án", "Phần giới thiệu và liên hệ"],
    },
    motion: {
      title: "Có chuyển động, không chỉ là trang tĩnh",
      body: "Giống trang bạn đang xem: hiệu ứng khi cuộn, chi tiết nhỏ có chuyển động, người xem muốn kéo tới cuối. Ai tắt hiệu ứng trong máy thì trang tự đứng yên.",
      points: ["Đẹp trên điện thoại lẫn máy tính", "Không cần cài thêm gì để xem", "Ảnh và chữ hiện ra trước, hiệu ứng theo sau"],
    },
    how: {
      title: "Mua xong thì làm gì?",
      steps: ["Chọn gói và thanh toán qua Whop.", "Whop gửi email có link tới phần bạn đã mua. Source nằm trong tài khoản Whop của bạn.", "Tải source về, thay tên, dự án và ảnh của bạn.", "Đưa lên hosting bạn chọn, rồi gửi link cho nhà tuyển dụng hoặc khách hàng."],
    },
    who: {
      title: "Hợp với ai?",
      body: "Ai cần một đường link để gửi kèm CV hoặc báo giá.",
      tags: ["Designer", "Developer", "Nhiếp ảnh", "Làm 3D, motion", "Sinh viên sắp ra trường", "Freelancer"],
    },
  },
  pricing: {
    title: "Chọn gói source",
    sub: "Nội dung và giá từng gói được cập nhật trực tiếp từ Whop. Thanh toán an toàn qua Whop.",
    recommended: "Nên chọn",
    choose: "Chọn gói này",
    opening: "Đang mở trang thanh toán…",
    oneTime: "trả một lần",
    monthly: "mỗi tháng",
    yearly: "mỗi năm",
    everyNDays: (n: number) => `mỗi ${n} ngày`,
    recurring: "định kỳ",
    loading: "Đang tải bảng giá",
    errorTitle: "Chưa tải được bảng giá",
    errorBody: "Hệ thống thanh toán đang không phản hồi. Thường chỉ vài giây là có lại.",
    retry: "Tải lại",
    empty: "Các gói đang được cập nhật. Bạn quay lại sau ít phút nhé.",
    footnote: "Thanh toán qua Whop · Nhận link source qua email",
    toastTitle: "Chưa mở được trang thanh toán",
    toastBody: "Kết nối bị gián đoạn. Bạn thử lại sau vài giây nhé.",
  },
  faq: {
    title: "Câu hỏi hay gặp",
    items: [
      { q: "Mua xong tôi lấy source ở đâu?", a: "Sau khi thanh toán, bạn có quyền truy cập source trong tài khoản Whop của mình. Whop cũng gửi email kèm link tới phần bạn đã mua. Không thấy email thì kiểm tra mục spam, hoặc viết cho chúng tôi." },
      { q: "Tôi không rành code thì có dùng được không?", a: "Tên, phần giới thiệu, dự án và ảnh được để riêng cho dễ thay. Nếu bạn muốn được cài đặt giúp, hãy chọn gói có kèm cài đặt trong bảng giá." },
      { q: "Tôi có được dùng cho khách hàng không?", a: "Tùy gói. Phạm vi sử dụng của từng gói được ghi trong bảng giá. Còn phân vân thì gửi email hỏi chúng tôi trước khi mua." },
      { q: "Tôi đưa web lên mạng bằng cách nào?", a: "Bạn chọn dịch vụ hosting mình thích rồi tải source lên. Chúng tôi không khóa bạn vào nền tảng nào." },
      { q: "Gặp lỗi hoặc thiếu file thì sao?", a: "Gửi email kèm mô tả lỗi và email bạn dùng để mua. Chúng tôi sẽ kiểm tra và trả lời bạn." },
    ],
  },
  goal: {
    reached: "Về đích!",
    title: "Bạn đã đi hết con đường. Giờ tới lượt portfolio của bạn.",
    sub: "Chọn một gói, nhận source qua Whop và có trang portfolio của riêng mình.",
    button: "Chọn gói source",
    trophyAlt: "Cúp vàng ở cuối đường",
  },
  footer: {
    about: "xidker bán source code web portfolio làm sẵn cho người làm sáng tạo.",
    contact: "Liên hệ",
    rights: "Trang này cũng do xidker làm.",
  },
  thanks: {
    back: "Về trang chủ",
    noRefTitle: "Thiếu mã đơn hàng.",
    noRefBody: "Đường link này không có mã đơn nên chúng tôi chưa kiểm tra được thanh toán. Nếu bạn đã mua, source vẫn nằm trong tài khoản Whop của bạn và trong email Whop gửi.",
    loading: "Đang kiểm tra đơn hàng…",
    nfTitle: "Không tìm thấy đơn này.",
    nfBody1: "Mã",
    nfBody2: "không khớp với giao dịch nào. Nếu bạn đã bị trừ tiền, gửi email cho chúng tôi kèm mã này.",
    support: "Gửi email hỗ trợ",
    supportSubject: "Đơn hàng",
    errTitle: "Chưa kiểm tra được thanh toán.",
    errBody: "Hệ thống thanh toán đang chập chờn. Đơn của bạn không bị mất, bạn thử lại nhé.",
    retry: "Kiểm tra lại",
    paidEyebrow: "Thanh toán thành công",
    paidTitle: "Về đích! Source đã là của bạn.",
    paidBody: "Bạn có thể vào Whop để lấy source ngay. Whop cũng đã gửi email kèm link tới phần bạn mua. Nếu thiếu gì, viết cho chúng tôi qua email bên dưới.",
    receipt: "Biên nhận",
    pkg: "Gói",
    amount: "Số tiền",
    time: "Thời gian",
    ref: "Mã đơn",
    pendingEyebrow: "Đang chờ xác nhận",
    pendingTitle: "Chúng tôi đang xác nhận thanh toán của bạn.",
    pendingBody1: "Gói",
    pendingBody2: "Trang này tự kiểm tra lại mỗi 3 giây, bạn không cần tải lại. Thường chưa tới một phút.",
    code: "Mã",
  },
  scene: { loading: "Đang tải", start: "Điểm xuất phát" },
  nf: {
    title: "Lạc đường rồi.",
    body: "Trang bạn tìm không có trên bản đồ. Quay lại vạch xuất phát nhé.",
    back: "Về trang chủ",
    metaTitle: "Không tìm thấy trang — xidker",
  },
};

export type Dict = typeof vi;

const en: Dict = {
  meta: {
    title: "xidker — Ready-made portfolio website source code",
    description: "Buy the source code of a finished personal portfolio website. Add your name, projects and photos, then put it online. Checkout by Whop.",
  },
  lang: { switchLabel: "Choose language", vi: "Tiếng Việt", en: "English" },
  nav: { home: "xidker, back to home", what: "What you get", how: "How it works", pricing: "Pricing", faq: "FAQ", cta: "See pricing" },
  hero: {
    eyebrow: "Portfolio website source code",
    title: "A ready-made portfolio website. Buy the source, add your work, go live.",
    sub: "Skip designing from scratch. You get the full source of an animated portfolio site — drop in your name, projects and photos, and publish it.",
    start: "Let's go",
    cta: "Jump to pricing",
    hint: "Scroll to walk the road",
    mapAlt: "Treasure map",
    heroAlt: "Pixel character standing at the start line",
  },
  stage: "Stage",
  reached: "Reached",
  stops: {
    what: {
      title: "What are you buying?",
      body: "The complete source code of a personal portfolio website, already designed and built. It's yours to keep and change however you like.",
      points: ["A finished design, not a template sketch", "Content kept separate, so it's easy to find and replace", "Ready to use as soon as your details are in"],
    },
    pages: {
      title: "What pages are included?",
      body: "Everything a recruiter or client looks for when they open your link.",
      items: ["A home page that says who you are", "A grid of your best projects", "A detail page for every project", "About and contact sections"],
    },
    motion: {
      title: "It moves. It's not a static page.",
      body: "Just like the page you're on: scroll effects and small moving details that make people want to reach the end. If a visitor has reduced motion turned on, the site holds still.",
      points: ["Looks right on phones and desktops", "Nothing to install to view it", "Text and images first, effects after"],
    },
    how: {
      title: "What happens after you buy?",
      steps: ["Pick a package and pay through Whop.", "Whop emails you a link to your purchase. The source lives in your Whop account.", "Download it and swap in your name, projects and photos.", "Publish it on any host you like, then send the link to recruiters or clients."],
    },
    who: {
      title: "Who is it for?",
      body: "Anyone who needs one link to send with a CV or a quote.",
      tags: ["Designers", "Developers", "Photographers", "3D & motion artists", "Graduating students", "Freelancers"],
    },
  },
  pricing: {
    title: "Pick your source package",
    sub: "Package details and prices come straight from Whop. Checkout is handled securely by Whop.",
    recommended: "Recommended",
    choose: "Choose this package",
    opening: "Opening checkout…",
    oneTime: "one-time",
    monthly: "per month",
    yearly: "per year",
    everyNDays: (n: number) => `every ${n} days`,
    recurring: "recurring",
    loading: "Loading pricing",
    errorTitle: "Pricing didn't load",
    errorBody: "The payment system isn't responding right now. It's usually back within seconds.",
    retry: "Try again",
    empty: "Packages are being updated. Check back in a few minutes.",
    footnote: "Checkout by Whop · Source link sent by email",
    toastTitle: "Couldn't open checkout",
    toastBody: "The connection dropped. Give it a few seconds and try again.",
  },
  faq: {
    title: "Common questions",
    items: [
      { q: "Where do I get the source after paying?", a: "Once you've paid, the source is available in your Whop account, and Whop emails you a link to your purchase. Can't find the email? Check spam, or write to us." },
      { q: "I'm not a coder. Can I still use it?", a: "Your name, bio, projects and photos are kept in their own place so they're easy to swap. If you'd rather have it set up for you, pick a package that includes setup." },
      { q: "Can I use it for client work?", a: "It depends on the package. Each one lists what you're allowed to do with it in the pricing section. Not sure? Email us before you buy." },
      { q: "How do I put it online?", a: "Choose any web host you like and upload the source. We don't lock you into a platform." },
      { q: "What if something's broken or missing?", a: "Email us with what went wrong and the email you bought with. We'll look into it and get back to you." },
    ],
  },
  goal: {
    reached: "You made it!",
    title: "You walked the whole road. Now it's your portfolio's turn.",
    sub: "Pick a package, get the source through Whop, and have a portfolio that's all yours.",
    button: "Pick a package",
    trophyAlt: "Gold trophy at the end of the road",
  },
  footer: {
    about: "xidker sells ready-made portfolio website source code for creative people.",
    contact: "Contact",
    rights: "This page was made by xidker, too.",
  },
  thanks: {
    back: "Back to home",
    noRefTitle: "Your order reference is missing.",
    noRefBody: "This link has no order reference, so we can't check the payment. If you did buy, the source is still in your Whop account and in the email Whop sent you.",
    loading: "Checking your order…",
    nfTitle: "We couldn't find this order.",
    nfBody1: "Reference",
    nfBody2: "doesn't match any transaction. If you were charged, email us with this reference.",
    support: "Email support",
    supportSubject: "Order",
    errTitle: "We couldn't check your payment yet.",
    errBody: "The payment system is being flaky. Your order isn't lost — try again in a moment.",
    retry: "Check again",
    paidEyebrow: "Payment confirmed",
    paidTitle: "You made it! The source is yours.",
    paidBody: "Head to Whop to grab your source now. Whop has also emailed you a link to your purchase. If anything's missing, email us below.",
    receipt: "Receipt",
    pkg: "Package",
    amount: "Amount",
    time: "Paid at",
    ref: "Reference",
    pendingEyebrow: "Awaiting confirmation",
    pendingTitle: "We're confirming your payment.",
    pendingBody1: "Package",
    pendingBody2: "This page checks again every 3 seconds — no need to refresh. It usually takes under a minute.",
    code: "Ref",
  },
  scene: { loading: "Loading", start: "Start line" },
  nf: {
    title: "You wandered off the map.",
    body: "This page isn't anywhere on the road. Head back to the start.",
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
  const base = tone === "dark" ? "border-[hsl(var(--paper))] text-[hsl(var(--paper))]" : "border-[hsl(var(--ink))] bg-[hsl(var(--paper))] text-[hsl(var(--ink))]";
  return (
    <div role="group" aria-label={t.lang.switchLabel} className={`inline-flex border-[3px] ${base} p-0.5 text-sm font-pixel ${className}`}>
      {(["vi", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} aria-label={t.lang[l]}
          className={`px-2.5 py-0.5 uppercase transition-colors ${lang === l ? "bg-[hsl(var(--pin))] text-white" : "opacity-70 hover:opacity-100"}`}
          data-testid={`button-lang-${l}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
