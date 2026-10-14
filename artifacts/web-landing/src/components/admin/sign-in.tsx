import { useContext, useRef, useState, type FormEvent } from "react";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
import {
  useRequestAdminCode, useVerifyAdminCode,
  type AdminCodeChallenge, type AdminSession,
} from "@workspace/api-client-react";
import { Wordmark } from "@/components/sprites";
import { adminErrorText, useDocTitle, useNow } from "./shared";

function CodeSlot({ index }: { index: number }) {
  const { slots } = useContext(OTPInputContext);
  const slot = slots[index];
  return (
    <div className={`adm-slot ${slot.isActive ? "on" : ""}`}>
      {slot.char}
      {slot.hasFakeCaret && <i className="adm-caret" aria-hidden="true" />}
    </div>
  );
}

function Notice({ tone, text }: { tone: "error" | "info"; text: string }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`adm-notice ${tone}`} data-testid={`text-admin-${tone}`}>
      {text}
    </p>
  );
}

/**
 * Two steps: the admin key (kept only in memory so the code can be re-sent),
 * then the 6-digit code emailed to the admin address.
 */
export function AdminSignIn({ notice, onSignedIn }: { notice: string | null; onSignedIn: (s: AdminSession) => void }) {
  const [step, setStep] = useState<"token" | "code">("token");
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState<AdminCodeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice);
  const requestCode = useRequestAdminCode();
  const verify = useVerifyAdminCode();
  const tokenInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const now = useNow(1000, step === "code");

  useDocTitle("Đăng nhập quản trị — xidker");

  const askForCode = (e?: FormEvent) => {
    e?.preventDefault();
    const value = token.trim();
    if (!value || requestCode.isPending) return;
    setError(null);
    requestCode.mutate(
      { data: { token: value } },
      {
        onSuccess: (c) => {
          setChallenge(c);
          setCode("");
          setInfo(null);
          setStep("code");
          requestAnimationFrame(() => codeInput.current?.focus());
        },
        onError: (err) => {
          setError(adminErrorText(err));
          if (step === "token") tokenInput.current?.focus();
        },
      },
    );
  };

  const submitCode = (value: string) => {
    if (verify.isPending || !/^[0-9]{6}$/.test(value)) return;
    setError(null);
    verify.mutate(
      { data: { code: value } },
      {
        onSuccess: (session) => {
          setToken("");
          onSignedIn(session);
        },
        onError: (err) => {
          setError(adminErrorText(err));
          setCode("");
          requestAnimationFrame(() => codeInput.current?.focus());
        },
      },
    );
  };

  const backToToken = () => {
    setStep("token");
    setCode("");
    setError(null);
    requestAnimationFrame(() => tokenInput.current?.focus());
  };

  const left = challenge ? Math.max(0, Date.parse(challenge.expiresAt) - now) : 0;
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <main className="min-h-[100dvh] grid place-items-center p-4">
      <div className="adm-card w-full max-w-sm p-6" data-testid="card-admin-sign-in">
        <div className="flex items-center justify-between gap-3">
          <Wordmark size="text-2xl" />
          <span className="adm-chip">Quản trị</span>
        </div>

        {step === "token" ? (
          <form onSubmit={askForCode} className="mt-6 flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-extrabold">Đăng nhập trang quản trị</h1>
              <p className="mt-1 text-sm text-[#3d4a3d]">Nhập khóa quản trị. Sau đó một mã 6 số sẽ được gửi tới email quản trị.</p>
            </div>
            {info && <Notice tone="info" text={info} />}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold">Khóa quản trị</span>
              <input ref={tokenInput} type="password" name="admin-token" value={token} onChange={(e) => setToken(e.target.value)}
                autoComplete="current-password" autoFocus spellCheck={false} maxLength={256} required
                className="adm-field" data-testid="input-admin-token" />
            </label>
            {error && <Notice tone="error" text={error} />}
            <button type="submit" disabled={!token.trim() || requestCode.isPending} className="adm-btn gold h-11" data-testid="button-admin-request-code">
              {requestCode.isPending ? "Đang gửi mã…" : "Gửi mã qua email"}
            </button>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-extrabold">Nhập mã 6 số</h1>
              <p className="mt-1 text-sm text-[#3d4a3d]">
                Mã đã được gửi tới <span className="font-bold break-all" dir="ltr">{challenge?.sentTo}</span>. Không thấy thì xem thêm mục Spam.
              </p>
            </div>
            <OTPInput ref={codeInput} maxLength={6} value={code} onChange={setCode} onComplete={submitCode}
              pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code" disabled={verify.isPending}
              aria-label="Mã 6 số" containerClassName="flex justify-center gap-2" data-testid="input-admin-code">
              {Array.from({ length: 6 }, (_, i) => <CodeSlot key={i} index={i} />)}
            </OTPInput>
            <p className="text-center text-sm text-[#3d4a3d]" aria-live="off">
              {verify.isPending ? "Đang kiểm tra…" : left > 0
                ? <>Mã còn hiệu lực <span className="font-num" dir="ltr">{mm}:{ss}</span></>
                : "Mã đã hết hạn. Gửi mã mới nhé."}
            </p>
            {error && <Notice tone="error" text={error} />}
            <div className="flex gap-2">
              <button type="button" onClick={backToToken} className="adm-btn h-10 flex-1 text-sm" data-testid="button-admin-back">Đổi khóa</button>
              <button type="button" onClick={() => askForCode()} disabled={requestCode.isPending} className="adm-btn h-10 flex-1 text-sm" data-testid="button-admin-resend">
                {requestCode.isPending ? "Đang gửi…" : "Gửi mã mới"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
