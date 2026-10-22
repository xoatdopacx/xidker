import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { X } from "lucide-react";
import {
  useGetSupportThread, getGetSupportThreadQueryKey, useSendSupportMessage,
  type ChatMessage, type ChatThread,
} from "@workspace/api-client-react";
import { useI18n, tpl } from "@/lib/i18n";
import { statusOf } from "@/lib/http";
import { localePath } from "@/lib/locale-url";
import { knownAccount, setSignedOut, signedOutReason, useAccount } from "@/lib/account";
import { ROUTES, safeNext } from "@/lib/routes";
import { supportChat, useSupportChat } from "@/lib/support-chat";

/** Per account: id of the newest reply seen; replies above it count as unread. */
const SEEN_KEY = "xidker-support-seen";
const MAX_MESSAGE = 2000;
const THREAD_KEY = getGetSupportThreadQueryKey();

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
 * Support chat for customers. Hidden for ordinary visitors: the button appears on a browser that has signed in
 * before, or when opened from the footer or the account page. It opens to the conversation once the account has
 * placed an order.
 */
export function ChatWidget() {
  const { t, lang, locale } = useI18n();
  const qc = useQueryClient();
  const panelId = useId();
  const [location] = useLocation();
  const { revealed, open, nonce } = useSupportChat();

  const [known, setKnown] = useState(knownAccount);
  const [seenTick, setSeenTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fab = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);

  const session = useAccount(known || revealed || open);
  const account = session.data?.account ?? null;
  const visible = known || revealed || open || !!account;

  // Poll quickly while the panel is open and slowly otherwise (only for the unread badge).
  // React Query stops polling while the tab is hidden.
  const thread = useGetSupportThread({
    query: {
      queryKey: THREAD_KEY,
      enabled: !!account?.canChat,
      refetchInterval: open ? 3000 : 15000,
      retry: (n, err) => ![401, 403].includes(statusOf(err)) && n < 2,
    },
  });
  const sendMut = useSendSupportMessage();
  const threadStatus = statusOf(thread.error);

  useEffect(() => {
    if (threadStatus === 401) setSignedOut(qc, signedOutReason(thread.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.error]);

  // Opened from the footer or the account page: remember what to give focus back to.
  useEffect(() => {
    if (!nonce) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError(null);
  }, [nonce]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "xidker-account") setKnown(e.newValue === "1");
      if (e.key?.startsWith(SEEN_KEY)) setSeenTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (account) setKnown(true);
  }, [account]);

  const canChat = !!account?.canChat && threadStatus !== 403;
  const data = canChat ? thread.data : undefined;
  const messages = data?.messages ?? [];
  const seenKey = account ? `${SEEN_KEY}:${account.email}` : null;
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
  const view = !account ? (session.isPending ? "loading" : session.isError ? "error" : "signedOut") : canChat ? "thread" : "noOrder";
  useEffect(() => {
    if (!open) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const target = fine ? panel.current?.querySelector<HTMLElement>("[data-autofocus]") : null;
    (target ?? panel.current)?.focus({ preventScroll: true });
  }, [open, view]);

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
    // Without a saved sign-in the button goes away again; give focus back to whatever opened the panel.
    const target = known || revealed || !opener.current?.isConnected ? fab.current : opener.current;
    target?.focus({ preventScroll: true });
  };

  const onRootKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.stopPropagation(); close(); }
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
          if (s === 401) { setSignedOut(qc, signedOutReason(err)); return; }
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
  // After signing in, come back to the account or order page the chat was opened on.
  const next = safeNext(location);
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

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

          {view === "signedOut" && (
            <div className="cw-body overflow-y-auto overscroll-contain p-4 flex flex-col gap-3">
              {session.data?.reason === "replaced" && <p className="cw-note" role="status" data-testid="text-chat-replaced">{t.auth.replaced}</p>}
              <p className="text-sm text-[#2c3a2c]">{t.chat.signInIntro}</p>
              <Link href={`${ROUTES.signIn}${nextQuery}`} onClick={() => supportChat.setOpen(false)} data-autofocus
                className="pbtn red justify-center px-4 py-2.5 font-bold" data-testid="link-chat-sign-in">{t.auth.signIn}</Link>
              <Link href={`${ROUTES.register}${nextQuery}`} onClick={() => supportChat.setOpen(false)}
                className="pbtn paper justify-center px-4 py-2.5 font-bold" data-testid="link-chat-register">{t.auth.register}</Link>
            </div>
          )}

          {view === "noOrder" && (
            <div className="cw-body overflow-y-auto overscroll-contain p-4 flex flex-col gap-3">
              <p className="cw-note" data-testid="text-chat-no-order">{t.chat.noOrder}</p>
              <a href={`${localePath(lang, import.meta.env.BASE_URL)}#bang-gia`} onClick={() => supportChat.setOpen(false)} data-autofocus
                className="pbtn red justify-center px-4 py-2.5 font-bold" data-testid="link-chat-pricing">{t.nav.cta}</a>
            </div>
          )}

          {view === "thread" && (
            <>
              <div ref={log} onScroll={onLogScroll} role="log" aria-live="polite" aria-label={t.chat.title} className="cw-log" data-testid="chat-log">
                {thread.isPending && <p className="cw-loading m-auto" aria-hidden="true"><i /><i /><i /></p>}
                {thread.isError && threadStatus !== 401 && !data && (
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
