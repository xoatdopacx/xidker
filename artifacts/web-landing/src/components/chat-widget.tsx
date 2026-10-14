import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LogOut, X } from "lucide-react";
import {
  getSupportSession, getGetSupportSessionQueryKey, useGetSupportThread, getGetSupportThreadQueryKey,
  useActivateSupport, useSignInSupport, useSignOutSupport, useSendSupportMessage,
  type ChatMessage, type ChatThread, type SupportSession,
} from "@workspace/api-client-react";
import { useI18n, tpl, CONTACT_EMAIL } from "@/lib/i18n";
import { statusOf, serverError } from "@/lib/http";
import { supportChat, useSupportChat, type SupportMode } from "@/lib/support-chat";

/** Set once this browser has activated or signed in, so the chat button keeps showing for this customer. */
const KNOWN_KEY = "xidker-support";
/** Per order: id of the newest reply seen; replies above it count as unread. */
const SEEN_KEY = "xidker-support-seen";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 2000;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const SESSION_KEY = getGetSupportSessionQueryKey();
const THREAD_KEY = getGetSupportThreadQueryKey();

type SignedOutReason = "signed_out" | "replaced";
/** Signed-out is an ordinary answer here, not an error. */
type SessionState = { account: SupportSession | null; reason: SignedOutReason | null };

function reasonOf(err: unknown): SignedOutReason {
  const reason = (err as { data?: { reason?: unknown } | null } | null)?.data?.reason;
  return reason === "replaced" ? "replaced" : "signed_out";
}

const store = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string | null) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage blocked */ }
  },
};

/* ---------------- pixel icons (drawn with rects so they stay crisp) ---------------- */

function BubbleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 11 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="9" height="3" fill="#fff" />
      <path d="M1 0h9v1H1zM0 1h1v3H0zM10 1h1v3h-1zM1 4h9v1H1zM2 5h2v1H2zM2 6h1v1H2z" fill="currentColor" />
      <path d="M2 2h1v1H2zM5 2h1v1H5zM8 2h1v1H8z" fill="hsl(var(--pin))" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path d="M0 0h1v7H0zM1 1h2v5H1zM3 2h2v3H3zM5 3h2v1H5z" fill="currentColor" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path d="M1 0h1v4H1zM1 5h1v2H1z" fill="currentColor" />
    </svg>
  );
}

/* ---------------- widget ---------------- */

/**
 * Support chat for customers. Hidden for ordinary visitors: the button appears
 * after a paid order (thank-you page), when opened from the footer link, or on
 * a browser that has signed in before.
 */
export function ChatWidget() {
  const { t, lang, locale } = useI18n();
  const qc = useQueryClient();
  const panelId = useId();
  const { revealed, open, request } = useSupportChat();

  const [known, setKnown] = useState(() => store.get(KNOWN_KEY) === "1");
  const [seenTick, setSeenTick] = useState(0);
  const [tab, setTab] = useState<SupportMode>("login");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fab = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const atBottom = useRef(true);

  const visible = known || revealed || open;

  const session = useQuery<SessionState>({
    queryKey: SESSION_KEY,
    enabled: visible,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      try {
        return { account: await getSupportSession({ signal }), reason: null };
      } catch (err) {
        if (statusOf(err) === 401) return { account: null, reason: reasonOf(err) };
        throw err;
      }
    },
  });
  const account = session.data?.account ?? null;

  // Poll quickly while the panel is open and slowly otherwise (only for the unread badge).
  // React Query stops polling while the tab is hidden.
  const thread = useGetSupportThread({
    query: {
      queryKey: THREAD_KEY,
      enabled: !!account,
      refetchInterval: open ? 3000 : 15000,
      retry: (n, err) => statusOf(err) !== 401 && n < 2,
    },
  });
  const activateMut = useActivateSupport();
  const signInMut = useSignInSupport();
  const signOutMut = useSignOutSupport();
  const sendMut = useSendSupportMessage();

  const signedOut = (reason: SignedOutReason | null) => {
    qc.setQueryData<SessionState>(SESSION_KEY, { account: null, reason });
    qc.removeQueries({ queryKey: THREAD_KEY });
  };

  const signedIn = (acc: SupportSession) => {
    store.set(KNOWN_KEY, "1");
    setKnown(true);
    setReplaced(false);
    setPassword("");
    setShowPassword(false);
    setError(null);
    qc.removeQueries({ queryKey: THREAD_KEY });
    qc.setQueryData<SessionState>(SESSION_KEY, { account: acc, reason: null });
    atBottom.current = true;
  };

  // Another browser signed in to this account, which signed this one out. Keep saying so until the next sign-in.
  useEffect(() => {
    if (session.data?.reason === "replaced") setReplaced(true);
  }, [session.data]);

  useEffect(() => {
    if (statusOf(thread.error) === 401) signedOut(reasonOf(thread.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.error]);

  // Opened from the thank-you page or the footer: switch to the asked tab, keep what was typed.
  useEffect(() => {
    if (!request.nonce) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTab(request.mode);
    if (request.orderId) setOrderId(request.orderId);
    setError(null);
  }, [request.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KNOWN_KEY) setKnown(e.newValue === "1");
      if (e.key?.startsWith(SEEN_KEY)) setSeenTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const data = account ? thread.data : undefined;
  const messages = data?.messages ?? [];
  const seenKey = account ? `${SEEN_KEY}:${account.orderId}` : null;
  // Read straight from storage; seenTick re-renders when it changes.
  void seenTick;
  const seen = seenKey ? Number(store.get(seenKey)) || 0 : 0;
  const lastReplyId = messages.reduce((m, x) => (x.sender === "admin" && x.id > m ? x.id : m), 0);
  const unread = messages.filter((m) => m.sender === "admin" && m.id > seen).length;

  useEffect(() => {
    if (open && seenKey && lastReplyId > seen) {
      store.set(seenKey, String(lastReplyId));
      setSeenTick((n) => n + 1);
    }
  }, [open, seenKey, lastReplyId, seen]);

  // Focus the first field on open (only with a mouse, so phones don't pop the keyboard up uninvited).
  const view = !account ? (session.isPending ? "loading" : session.isError ? "error" : "auth") : "thread";
  useEffect(() => {
    if (!open) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const target = fine ? panel.current?.querySelector<HTMLElement>("[data-autofocus]") : null;
    (target ?? panel.current)?.focus({ preventScroll: true });
  }, [open, view, tab]);

  // Follow new messages unless the customer scrolled up to read older ones.
  useLayoutEffect(() => {
    const el = log.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, open, view]);

  const onLogScroll = () => {
    const el = log.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const resizeComposer = () => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border, and the box is sized border-box.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, 132)}px`;
  };

  const toggle = () => {
    setError(null);
    opener.current = null;
    supportChat.setOpen(!open);
    atBottom.current = true;
  };

  const close = () => {
    supportChat.setOpen(false);
    // Without a saved sign-in or a fresh order the button goes away again; give focus back to whatever opened the panel.
    const target = known || revealed || !opener.current?.isConnected ? fab.current : opener.current;
    target?.focus({ preventScroll: true });
  };

  const onRootKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.stopPropagation(); close(); }
  };

  const switchTab = (next: SupportMode) => {
    setTab(next);
    setError(null);
  };

  const checkEmail = (): string | null => {
    const mail = email.trim();
    if (EMAIL_RE.test(mail)) return mail;
    setError(t.chat.errorEmail);
    emailInput.current?.focus();
    return null;
  };

  const submitLogin = (e: FormEvent) => {
    e.preventDefault();
    if (signInMut.isPending || !password) return;
    const mail = checkEmail();
    if (!mail) return;
    setError(null);
    signInMut.mutate(
      { data: { email: mail, password } },
      {
        onSuccess: signedIn,
        onError: (err) => {
          const s = statusOf(err);
          setError(s === 401 ? t.chat.errorLogin : s === 429 ? t.chat.errorTooMany : t.chat.errorSend);
          if (s === 401) passwordInput.current?.select();
        },
      },
    );
  };

  const submitActivate = (e: FormEvent) => {
    e.preventDefault();
    if (activateMut.isPending || !orderId.trim()) return;
    const mail = checkEmail();
    if (!mail) return;
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setError(t.chat.errorPassword);
      passwordInput.current?.focus();
      return;
    }
    setError(null);
    activateMut.mutate(
      { data: { email: mail, orderId: orderId.trim(), password, lang } },
      {
        onSuccess: signedIn,
        onError: (err) => {
          const s = statusOf(err);
          const why = serverError(err);
          if (s === 409) {
            // Already switched on: the customer only needs to sign in.
            setTab("login");
            setPassword("");
            setError(t.chat.errorActivated);
            return;
          }
          setError(
            s === 404 ? t.chat.errorNoOrder
              : s === 429 ? t.chat.errorTooMany
              : s === 503 ? t.chat.errorCheck
              : s === 400 && /password/i.test(why) ? t.chat.errorPassword
              : s === 400 && /email/i.test(why) ? t.chat.errorEmail
              : t.chat.errorSend,
          );
        },
      },
    );
  };

  const signOut = () => {
    if (signOutMut.isPending) return;
    setError(null);
    signOutMut.mutate(undefined, {
      onSuccess: () => {
        setEmail(account?.email ?? "");
        setTab("login");
        setDraft("");
        signedOut(null);
      },
      onError: () => setError(t.chat.errorSend),
    });
  };

  const submitReply = () => {
    if (sendMut.isPending) return;
    const message = draft.trim();
    if (!message) return;
    setError(null);
    sendMut.mutate(
      { data: { message, lang } },
      {
        onSuccess: async (m: ChatMessage) => {
          // Drop any poll that started before this send, so it cannot hide the new message.
          await qc.cancelQueries({ queryKey: THREAD_KEY });
          qc.setQueryData<ChatThread>(THREAD_KEY, (old) => ({
            status: "open",
            messages: !old ? [m] : old.messages.some((x) => x.id === m.id) ? old.messages : [...old.messages, m],
          }));
          atBottom.current = true;
          setDraft("");
          requestAnimationFrame(resizeComposer);
        },
        onError: (err) => {
          const s = statusOf(err);
          if (s === 401) { signedOut(reasonOf(err)); return; }
          setError(s === 429 ? t.chat.errorRate : t.chat.errorSend);
        },
      },
    );
  };

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line. Never send while an input method is still composing (Vietnamese, CJK…).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submitReply();
    }
  };

  const timeFmt = useMemo(() => ({
    today: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    other: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  }), [locale]);
  const when = (iso: string) => {
    const d = new Date(iso);
    return (d.toDateString() === new Date().toDateString() ? timeFmt.today : timeFmt.other).format(d);
  };

  if (!visible) return null;

  const closed = data?.status === "closed";
  // The customer wrote last and nobody has answered yet.
  const waiting = messages[messages.length - 1]?.sender === "visitor" && !closed;
  const fabLabel = open ? t.chat.close : unread > 0 ? `${t.chat.title}. ${tpl(t.chat.newMessages, { n: unread })}` : t.chat.title;
  const busy = activateMut.isPending || signInMut.isPending;

  return (
    <div className="cw-root" onKeyDown={onRootKey} data-testid="chat-widget">
      {open && (
        <section ref={panel} id={panelId} role="dialog" aria-label={t.chat.title} tabIndex={-1} className="cw-panel tile" data-testid="panel-chat">
          <header className="cw-head">
            <BubbleIcon className="h-4 w-6 shrink-0 text-[#1b2a1c]" />
            <div className="flex-1 min-w-0">
              <h2 className="truncate font-bold text-sm">{t.chat.title}</h2>
              {account && (
                <p className="truncate text-[11px] leading-tight text-[#3d4a3d]" data-testid="text-chat-account">
                  <span className="sr-only">{t.chat.signedInAs} </span><span dir="ltr">{account.email}</span>
                </p>
              )}
            </div>
            {account && (
              <button type="button" onClick={signOut} disabled={signOutMut.isPending} aria-label={t.chat.signOut} title={t.chat.signOut}
                className="cw-close grid place-items-center h-8 w-8 shrink-0" data-testid="button-chat-signout">
                <LogOut className="h-4 w-4 rtl:-scale-x-100" strokeWidth={3} />
              </button>
            )}
            <button type="button" onClick={close} aria-label={t.chat.close} className="cw-close grid place-items-center h-8 w-8 shrink-0" data-testid="button-chat-close">
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </header>

          {view === "loading" && (
            <div className="cw-body grid place-items-center"><p className="cw-loading" aria-hidden="true"><i /><i /><i /></p></div>
          )}

          {view === "error" && (
            <div className="cw-body grid place-items-center p-4 text-center text-sm">
              <div>
                <p>{t.chat.errorLoad}</p>
                <button type="button" onClick={() => session.refetch()} className="pbtn paper mt-3 px-3 py-1.5 text-sm font-bold" data-testid="button-chat-retry-session">{t.chat.retry}</button>
              </div>
            </div>
          )}

          {view === "auth" && (
            <div className="cw-body overflow-y-auto overscroll-contain p-4 flex flex-col gap-3">
              {replaced && <p className="cw-note" role="status" data-testid="text-chat-replaced">{t.chat.replaced}</p>}
              <div className="cw-tabs" role="group" aria-label={t.chat.title}>
                <button type="button" aria-pressed={tab === "login"} onClick={() => switchTab("login")} className="cw-tab" data-testid="tab-chat-login">{t.chat.tabLogin}</button>
                <button type="button" aria-pressed={tab === "activate"} onClick={() => switchTab("activate")} className="cw-tab" data-testid="tab-chat-activate">{t.chat.tabActivate}</button>
              </div>

              <form onSubmit={tab === "login" ? submitLogin : submitActivate} className="flex flex-col gap-3" noValidate>
                <p className="text-sm text-[#2c3a2c]">{tab === "login" ? t.chat.loginIntro : t.chat.activateIntro}</p>
                <label className="flex flex-col gap-1">
                  <span className="cw-label">{tab === "login" ? t.chat.email : t.chat.purchaseEmail}</span>
                  <input ref={emailInput} data-autofocus type="email" name="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
                    maxLength={200} autoComplete="username" autoCapitalize="none" spellCheck={false} className="cw-field" data-testid="input-chat-email" />
                </label>
                {tab === "activate" && (
                  <label className="flex flex-col gap-1">
                    <span className="cw-label">{t.chat.orderId}</span>
                    <input name="order" dir="ltr" value={orderId} onChange={(e) => setOrderId(e.target.value)} maxLength={100} placeholder="pay_…"
                      autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby={`${panelId}-order-hint`}
                      className="cw-field font-mono" data-testid="input-chat-order" />
                    <span id={`${panelId}-order-hint`} className="text-xs text-[#5b6a5b]">{t.chat.orderHint}</span>
                  </label>
                )}
                <div className="flex flex-col gap-1">
                  <label htmlFor={`${panelId}-password`} className="cw-label">{tab === "login" ? t.chat.password : t.chat.newPassword}</label>
                  <div className="relative">
                    <input ref={passwordInput} id={`${panelId}-password`} name="password" type={showPassword ? "text" : "password"} dir="ltr"
                      value={password} onChange={(e) => setPassword(e.target.value)} maxLength={PASSWORD_MAX}
                      autoComplete={tab === "login" ? "current-password" : "new-password"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      aria-describedby={tab === "activate" ? `${panelId}-password-hint` : undefined}
                      className="cw-field cw-has-eye" data-testid="input-chat-password" />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={t.chat.showPassword} aria-pressed={showPassword}
                      className="cw-eye" data-testid="button-chat-show-password">
                      {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2.5} /> : <Eye className="h-4 w-4" strokeWidth={2.5} />}
                    </button>
                  </div>
                  {tab === "activate" && <span id={`${panelId}-password-hint`} className="text-xs text-[#5b6a5b]">{t.chat.passwordHint}</span>}
                </div>
                {error && <ErrorLine text={error} />}
                <button type="submit" disabled={busy || !email.trim() || !password || (tab === "activate" && !orderId.trim())}
                  className="pbtn red justify-center px-4 py-2.5 font-bold" data-testid={tab === "login" ? "button-chat-login" : "button-chat-activate"}>
                  {busy ? t.chat.checking : tab === "login" ? t.chat.login : t.chat.activate}
                </button>
              </form>

              <p className="text-xs text-[#5b6a5b]">{t.chat.oneBrowser}</p>
              <p className="text-xs text-[#5b6a5b]">
                {t.chat.forgot}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-2 break-all" dir="ltr" data-testid="link-chat-email">{CONTACT_EMAIL}</a>
              </p>
            </div>
          )}

          {view === "thread" && (
            <>
              <div ref={log} onScroll={onLogScroll} role="log" aria-live="polite" aria-label={t.chat.title} className="cw-log" data-testid="chat-log">
                {thread.isPending && <p className="cw-loading m-auto" aria-hidden="true"><i /><i /><i /></p>}
                {thread.isError && statusOf(thread.error) !== 401 && !data && (
                  <div className="m-auto text-center text-sm">
                    <p>{t.chat.errorLoad}</p>
                    <button type="button" onClick={() => thread.refetch()} className="pbtn paper mt-3 px-3 py-1.5 text-sm font-bold" data-testid="button-chat-retry">{t.chat.retry}</button>
                  </div>
                )}
                {data && messages.length === 0 && <p className="cw-note my-auto" data-testid="text-chat-intro">{t.chat.intro}</p>}
                {messages.map((m) => {
                  const mine = m.sender === "visitor";
                  return (
                    <div key={m.id} className={`cw-row ${mine ? "me" : "them"}`} data-testid={`chat-message-${m.id}`}>
                      {/* Labels stay outside the dir="auto" bubble so they never decide the text direction. */}
                      {mine ? <span className="sr-only">{t.chat.you}:</span> : <span className="cw-from font-pixel font-bold">xidker</span>}
                      <p className="cw-msg" dir="auto">{m.body}</p>
                      <span className="cw-time">
                        <time dateTime={m.createdAt}>{when(m.createdAt)}</time>
                        {/* Replies are written in Vietnamese and reach the customer machine-translated. */}
                        {m.translated && <> · <span data-testid={`text-chat-translated-${m.id}`}>{t.chat.autoTranslated}</span></>}
                      </span>
                    </div>
                  );
                })}
                {waiting && <p className="cw-note">{t.chat.waiting}</p>}
              </div>
              <div className="cw-compose">
                {closed && <p className="cw-note mb-2">{t.chat.closed}</p>}
                {error && <div className="mb-2"><ErrorLine text={error} /></div>}
                <div className="flex items-end gap-2">
                  <label className="flex-1 min-w-0">
                    <span className="sr-only">{t.chat.message}</span>
                    <textarea ref={composer} data-autofocus value={draft} rows={1} maxLength={MAX_MESSAGE} enterKeyHint="send"
                      onChange={(e) => { setDraft(e.target.value); resizeComposer(); }} onKeyDown={onComposerKey}
                      placeholder={t.chat.placeholder} className="cw-field resize-none block" data-testid="input-chat-message" />
                  </label>
                  <button type="button" onClick={submitReply} disabled={sendMut.isPending || !draft.trim()} aria-label={sendMut.isPending ? t.chat.sending : t.chat.send}
                    className="pbtn red cw-send justify-center shrink-0" data-testid="button-chat-send">
                    <SendIcon className="h-4 w-4 rtl:-scale-x-100" />
                  </button>
                </div>
                {draft.length > MAX_MESSAGE - 200 && (
                  <p className="mt-1 text-end text-[11px] font-num text-[#5b6a5b]" dir="ltr">{draft.length}/{MAX_MESSAGE}</p>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <button ref={fab} type="button" onClick={toggle} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label={fabLabel}
        className="cw-fab" data-testid="button-chat">
        {open ? <X className="h-6 w-6" strokeWidth={3.5} /> : <BubbleIcon className="h-6 w-9" />}
        {!open && unread > 0 && <span key={unread} className="cw-badge font-num" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-[hsl(var(--pin-text))]" data-testid="text-chat-error">
      <AlertIcon className="h-4 w-2 mt-0.5 shrink-0" /> <span>{text}</span>
    </p>
  );
}
