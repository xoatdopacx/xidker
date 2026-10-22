import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Loader2, LogIn, MailCheck, UserRoundPlus } from "lucide-react";
import {
  registerAccount, signInAccount, requestPasswordReset, verifyAccountCode, resendAccountCode,
  type AccountChallenge, type AccountSession,
} from "@workspace/api-client-react";
import { useI18n, tpl, CONTACT_EMAIL, type Dict } from "@/lib/i18n";
import { reasonOf, statusOf } from "@/lib/http";
import { setSignedIn, useAccount } from "@/lib/account";
import { clearIntent, readIntent } from "@/lib/order-intent";
import { useAfterSignIn } from "@/lib/order";
import { ROUTES, safeNext } from "@/lib/routes";
import { Blocks, ErrorLine, PageShell } from "@/components/page-shell";

export type AuthMode = "signin" | "register" | "reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const RESEND_SECONDS = 60;

/** The email typed so far, kept when the visitor switches between sign-in, sign-up and reset. */
let typedEmail = "";

function errorText(err: unknown, t: Dict): string {
  if (statusOf(err) === 0) return t.auth.errors.network;
  const reason = reasonOf(err);
  if (reason === "locked") return tpl(t.auth.errors.locked, { email: CONTACT_EMAIL });
  const known = (t.auth.errors as Record<string, string>)[reason];
  return known ?? t.auth.errors.generic;
}

/** Fills {email} with a node, so the address can keep its own text direction inside right-to-left sentences. */
function withEmail(text: string, email: ReactNode): ReactNode {
  const [before, after = ""] = text.split("{email}");
  return <>{before}{email}{after}</>;
}

function PasswordField({ id, label, value, onChange, autoComplete, hint, inputRef, testId }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
  hint?: string; inputRef: RefObject<HTMLInputElement | null>; testId: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="cw-label">{label}</label>
      <div className="relative">
        <input ref={inputRef} id={id} name={autoComplete} type={show ? "text" : "password"} dir="ltr" value={value}
          onChange={(e) => onChange(e.target.value)} maxLength={PASSWORD_MAX} autoComplete={autoComplete}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby={hint ? `${id}-hint` : undefined}
          className="cw-field cw-has-eye" data-testid={`input-${testId}`} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
          className="cw-eye" data-testid={`button-toggle-${testId}`}>
          {show ? <EyeOff className="h-4 w-4" strokeWidth={2.5} /> : <Eye className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </div>
      {hint && <span id={`${id}-hint`} className="text-xs text-[#5b6a5b]">{hint}</span>}
    </div>
  );
}

function CardHead({ icon, title, sub }: { icon: ReactNode; title: string; sub: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 shrink-0 bg-[hsl(var(--gold))] border-[3px] border-[#1b2a1c] text-[#1b2a1c]" aria-hidden="true">{icon}</span>
        <h1 className="font-display text-2xl md:text-3xl leading-tight" data-testid="text-auth-title">{title}</h1>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#2c3a2c]">{sub}</p>
    </>
  );
}

/**
 * Sign-in, sign-up and password reset. Each sends a 6-digit code by email when the server asks for one
 * (new accounts, unconfirmed older accounts, password resets and every admin sign-in).
 */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const search = useSearch();
  const next = safeNext(new URLSearchParams(search).get("next"));
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const session = useAccount();
  const afterSignIn = useAfterSignIn();

  const [intent, setIntent] = useState(readIntent);
  const [step, setStep] = useState<"form" | "code">("form");
  const [challenge, setChallenge] = useState<AccountChallenge | null>(null);
  const [email, setEmail] = useState(typedEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const done = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Already signed in: carry on (except a buyer sent here by the dashboard, which only the admin may open).
  const account = session.data?.account ?? null;
  useEffect(() => {
    if (!account || done.current || mode === "reset" || step !== "form" || busy) return;
    if (next === ROUTES.admin && !account.admin) return;
    done.current = true;
    setLeaving(true);
    void afterSignIn(account, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const finish = async (s: AccountSession) => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    setSignedIn(qc, s);
    await afterSignIn(s, next);
  };

  const openCode = (c: AccountChallenge) => {
    setChallenge(c);
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
    // The reset form asks for the new password next to the code.
    if (mode === "reset") setPassword("");
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setError(t.auth.errors.invalid_email);
      emailRef.current?.focus();
      return;
    }
    if (mode === "signin" && !password) {
      passwordRef.current?.focus();
      return;
    }
    if (mode === "register" && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) {
      setError(t.auth.errors.weak_password);
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const result = await signInAccount({ email: mail, password, lang });
        if (result.session) { await finish(result.session); return; }
        if (result.challenge) openCode(result.challenge);
      } else if (mode === "register") {
        openCode(await registerAccount({ email: mail, password, lang }));
      } else {
        openCode(await requestPasswordReset({ email: mail, lang }));
      }
    } catch (err) {
      setError(errorText(err, t));
      if (reasonOf(err) === "wrong_credentials") passwordRef.current?.select();
      else if (["invalid_email", "email_not_allowed"].includes(reasonOf(err))) emailRef.current?.focus();
      else if (reasonOf(err) === "weak_password") passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (busy || done.current) return;
    if (!/^\d{6}$/.test(value)) {
      setError(t.auth.errors.codeFormat);
      codeRef.current?.focus();
      return;
    }
    if (mode === "reset" && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) {
      setError(t.auth.errors.weak_password);
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await finish(await verifyAccountCode({ code: value, ...(mode === "reset" ? { password } : {}) }));
    } catch (err) {
      setError(errorText(err, t));
      const reason = reasonOf(err);
      if (reason === "weak_password") passwordRef.current?.focus();
      else { setCode(""); codeRef.current?.focus(); }
    } finally {
      setBusy(false);
    }
  };

  const onCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    // Sign-in and sign-up go on by themselves once all six digits are in; a reset still needs the new password.
    if (digits.length === 6 && mode !== "reset") void verify(digits);
  };

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setChallenge(await resendAccountCode());
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice(t.auth.resent);
      codeRef.current?.focus();
    } catch (err) {
      if (statusOf(err) === 410) {
        setStep("form");
        setError(t.auth.errors.restart);
      } else {
        setError(errorText(err, t));
      }
    } finally {
      setBusy(false);
    }
  };

  const backToForm = () => {
    setStep("form");
    setError(null);
    setNotice(null);
    setCode("");
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const dropIntent = () => {
    clearIntent();
    setIntent(null);
  };

  if (leaving) {
    return (
      <PageShell>
        <div className="tile w-full max-w-md p-6 md:p-8" data-testid="status-auth-leaving"><Blocks label={t.auth.working} /></div>
      </PageShell>
    );
  }

  const head = {
    signin: { icon: <LogIn className="h-5 w-5 rtl:-scale-x-100" strokeWidth={2.75} />, title: t.auth.signInTitle, sub: t.auth.signInSub, submit: t.auth.signIn },
    register: { icon: <UserRoundPlus className="h-5 w-5" strokeWidth={2.75} />, title: t.auth.registerTitle, sub: t.auth.registerSub, submit: t.auth.register },
    reset: { icon: <KeyRound className="h-5 w-5" strokeWidth={2.75} />, title: t.auth.resetTitle, sub: t.auth.resetSub, submit: t.auth.sendCode },
  }[mode];

  const spinner = <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {t.auth.working}</>;

  return (
    <PageShell>
      <div className="tile w-full max-w-md p-6 md:p-8" data-testid={`card-auth-${mode}`}>
        {step === "form" ? (
          <>
            <CardHead icon={head.icon} title={head.title} sub={head.sub} />
            {session.data?.reason === "replaced" && <p className="cw-note mt-4" role="status" data-testid="text-auth-replaced">{t.auth.replaced}</p>}
            {intent && mode !== "reset" && (
              <p className="cw-note mt-4" data-testid="text-auth-order-note">
                {tpl(t.auth.orderNote, { name: intent.name })}{" "}
                <button type="button" onClick={dropIntent} className="font-semibold underline underline-offset-2" data-testid="button-drop-order">{t.auth.orderSkip}</button>
              </p>
            )}
            <form onSubmit={submitForm} noValidate className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="cw-label">{t.auth.email}</span>
                <input ref={emailRef} type="email" name="email" dir="ltr" value={email}
                  onChange={(e) => { setEmail(e.target.value); typedEmail = e.target.value; }}
                  maxLength={200} autoComplete={mode === "register" ? "email" : "username"} autoCapitalize="none" spellCheck={false}
                  aria-describedby={mode === "register" ? "auth-email-hint" : undefined}
                  className="cw-field" data-testid="input-email" />
                {mode === "register" && <span id="auth-email-hint" className="text-xs text-[#5b6a5b]">{t.auth.emailHint}</span>}
              </label>
              {mode !== "reset" && (
                <PasswordField id="auth-password" label={t.auth.password} value={password} onChange={setPassword} inputRef={passwordRef}
                  autoComplete={mode === "register" ? "new-password" : "current-password"} hint={mode === "register" ? t.auth.passwordHint : undefined} testId="password" />
              )}
              {mode === "signin" && (
                <Link href={`${ROUTES.reset}${nextQuery}`} className="self-start text-sm font-semibold underline underline-offset-2" data-testid="link-forgot">{t.auth.forgot}</Link>
              )}
              {error && <ErrorLine text={error} />}
              <button type="submit" disabled={busy} className="pbtn red justify-center py-3 font-bold" data-testid="button-auth-submit">
                {busy ? spinner : head.submit}
              </button>
            </form>
            <div className="mt-6 pt-4 border-t-2 border-dashed border-[#1b2a1c]/30 text-sm">
              {mode === "signin" && (
                <p>{t.auth.noAccount} <Link href={`${ROUTES.register}${nextQuery}`} className="font-bold underline underline-offset-2" data-testid="link-register">{t.auth.register}</Link></p>
              )}
              {mode === "register" && (
                <p>{t.auth.haveAccount} <Link href={`${ROUTES.signIn}${nextQuery}`} className="font-bold underline underline-offset-2" data-testid="link-sign-in">{t.auth.signIn}</Link></p>
              )}
              {mode === "reset" && (
                <Link href={`${ROUTES.signIn}${nextQuery}`} className="font-bold underline underline-offset-2" data-testid="link-sign-in">{t.auth.backToSignIn}</Link>
              )}
              {mode === "signin" && <p className="mt-3 text-xs text-[#5b6a5b]">{t.auth.oneBrowser}</p>}
            </div>
          </>
        ) : (
          <>
            <CardHead icon={<MailCheck className="h-5 w-5" strokeWidth={2.75} />} title={t.auth.codeTitle}
              sub={withEmail(t.auth.codeSent, <bdi dir="ltr" className="font-semibold" data-testid="text-code-sent-to">{challenge?.sentTo}</bdi>)} />
            {challenge?.purpose === "verify" && <p className="cw-note mt-4">{t.auth.verifyNote}</p>}
            <form onSubmit={(e) => { e.preventDefault(); void verify(code); }} noValidate className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="cw-label">{t.auth.code}</span>
                <input ref={codeRef} name="code" value={code} onChange={(e) => onCode(e.target.value)} inputMode="numeric" pattern="[0-9]*"
                  autoComplete="one-time-code" maxLength={6} dir="ltr" spellCheck={false}
                  className="cw-field font-num text-center" style={{ fontSize: 24, letterSpacing: "0.45em", paddingInlineStart: "0.95rem" }}
                  data-testid="input-code" />
              </label>
              {mode === "reset" && (
                <PasswordField id="auth-new-password" label={t.auth.newPassword} value={password} onChange={setPassword} inputRef={passwordRef}
                  autoComplete="new-password" hint={t.auth.passwordHint} testId="new-password" />
              )}
              {notice && <p role="status" className="text-sm font-semibold text-[hsl(var(--grass-d))]" data-testid="text-auth-notice">{notice}</p>}
              {error && <ErrorLine text={error} />}
              <button type="submit" disabled={busy} className="pbtn red justify-center py-3 font-bold" data-testid="button-code-submit">
                {busy ? spinner : t.auth.confirm}
              </button>
            </form>
            <p className="mt-4 text-xs text-[#5b6a5b]">{t.auth.codeSpam}</p>
            {challenge?.purpose === "register" && <p className="mt-2 text-xs text-[#5b6a5b]">{t.auth.registerExisting}</p>}
            {challenge?.purpose === "reset" && <p className="mt-2 text-xs text-[#5b6a5b]">{t.auth.resetUnknown}</p>}
            <div className="mt-5 pt-4 border-t-2 border-dashed border-[#1b2a1c]/30 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button type="button" onClick={resend} disabled={busy || cooldown > 0}
                className="font-bold underline underline-offset-2 disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed" data-testid="button-resend-code">
                {cooldown > 0 ? tpl(t.auth.resendIn, { n: cooldown }) : t.auth.resend}
              </button>
              <button type="button" onClick={backToForm} className="font-bold underline underline-offset-2" data-testid="button-change-email">{t.auth.changeEmail}</button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
