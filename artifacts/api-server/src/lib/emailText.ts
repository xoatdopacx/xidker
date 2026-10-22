// Text of the emails customers get, per site language. Vietnamese and English are written by
// hand; the other languages, in emailTextTranslations.ts, are translated from the English text.
// {placeholders} are filled in by emails.ts and must stay as they are in every language.
import { TRANSLATED_EMAIL_TEXT } from "./emailTextTranslations";

export type EmailText = {
  codeSubject: string;
  codeRegister: string;
  codeVerify: string;
  codeReset: string;
  codeExpiry: string;
  codeIgnore: string;
  existsSubject: string;
  existsBody: string;
  existsAction: string;
  existsIgnore: string;
  orderSubject: string;
  orderIntro: string;
  orderTransfer: string;
  orderAfter: string;
  orderButton: string;
  paidSubject: string;
  paidIntro: string;
  paidDownload: string;
  paidNoFile: string;
  paidButton: string;
  signInButton: string;
};

export const EMAIL_TEXT: Record<string, EmailText> = {
  vi: {
    codeSubject: "Mã xác nhận xidker",
    codeRegister: "Mã để hoàn tất tạo tài khoản xidker của bạn:",
    codeVerify: "Mã để xác nhận địa chỉ email của bạn trên xidker:",
    codeReset: "Mã để đặt mật khẩu mới cho tài khoản xidker của bạn:",
    codeExpiry: "Mã dùng được trong {minutes} phút và chỉ dùng được một lần.",
    codeIgnore: "Nếu không phải bạn yêu cầu, hãy bỏ qua email này. Không ai dùng được địa chỉ của bạn khi không có mã này.",
    existsSubject: "Tài khoản xidker của bạn",
    existsBody: "Ai đó vừa thử tạo tài khoản xidker bằng địa chỉ này, nhưng địa chỉ này đã có tài khoản.",
    existsAction: "Nếu đó là bạn, hãy đăng nhập. Quên mật khẩu? Chọn “Quên mật khẩu” ở trang đăng nhập.",
    existsIgnore: "Nếu không phải bạn, hãy bỏ qua email này. Tài khoản của bạn không có gì thay đổi.",
    orderSubject: "Đơn hàng {code}: cách thanh toán",
    orderIntro: "Cảm ơn bạn đã đặt mua {package}.",
    orderTransfer: "Hãy chuyển khoản {amount} và ghi {code} ở nội dung chuyển khoản. Thông tin tài khoản và mã QR cho ứng dụng ngân hàng có ở trang đơn hàng của bạn.",
    orderAfter: "Chúng tôi xác nhận đơn khi nhận được tiền và báo cho bạn qua email.",
    orderButton: "Mở đơn hàng",
    paidSubject: "Đơn hàng {code} đã được thanh toán",
    paidIntro: "Chúng tôi đã nhận được tiền cho {package}. Cảm ơn bạn!",
    paidDownload: "Mã nguồn đã sẵn sàng để tải ở trang đơn hàng của bạn.",
    paidNoFile: "Mở trang đơn hàng để xem bước tiếp theo. Bạn có thể nhắn cho chúng tôi qua khung chat trên trang.",
    paidButton: "Mở đơn hàng",
    signInButton: "Đăng nhập",
  },
  en: {
    codeSubject: "Your xidker confirmation code",
    codeRegister: "Here is the code to finish creating your xidker account:",
    codeVerify: "Here is the code to confirm your email address on xidker:",
    codeReset: "Here is the code to set a new password for your xidker account:",
    codeExpiry: "The code works for {minutes} minutes and only once.",
    codeIgnore: "If you did not ask for it, ignore this email. Nobody can use your address without this code.",
    existsSubject: "Your xidker account",
    existsBody: "Someone just tried to create a xidker account with this address, but this address already has an account.",
    existsAction: "If that was you, sign in instead. Forgot your password? Choose “Forgot password” on the sign-in page.",
    existsIgnore: "If it was not you, ignore this email. Nothing has changed in your account.",
    orderSubject: "Order {code}: how to pay",
    orderIntro: "Thank you for ordering {package}.",
    orderTransfer: "Send {amount} by bank transfer and write {code} as the transfer message. The bank details and a QR code for your banking app are on your order page.",
    orderAfter: "We confirm the order once the money arrives and let you know by email.",
    orderButton: "Open my order",
    paidSubject: "Order {code} is paid",
    paidIntro: "We received your payment for {package}. Thank you!",
    paidDownload: "Your source code is ready to download on your order page.",
    paidNoFile: "Open your order page to see the next step. You can message us there through the chat.",
    paidButton: "Open my order",
    signInButton: "Sign in",
  },
  ...TRANSLATED_EMAIL_TEXT,
};
