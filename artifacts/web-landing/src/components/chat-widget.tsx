import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  useGetChatThread, getGetChatThreadQueryKey, useStartChatThread, useSendChatMessage,
  type ChatMessage, type ChatThread,
} from "@workspace/api-client-react";
import { useI18n, tpl } from "@/lib/i18n";
import { statusOf, serverError } from "@/lib/http";

/** Set once this browser has started a conversation, so first-time visitors never poll the server. */
const STARTED_KEY = "xidker-chat";
/** Id of the newest reply the visitor has seen; replies above it count as unread. */
const SEEN_KEY = "xidker-chat-seen";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 2000;
const THREAD_KEY = getGetChatThreadQueryKey();

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

export function ChatWidget() {
  const { t, lang, locale } = useI18n();
  const qc = useQueryClient();
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(() => store.get(STARTED_KEY) === "1");
  const [seen, setSeen] = useState(() => Number(store.get(SEEN_KEY)) || 0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fab = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const atBottom = useRef(true);

  // Poll quickly while the panel is open and slowly otherwise (only for the unread badge).
  // React Query stops polling while the tab is hidden.
  const thread = useGetChatThread({
    query: {
      queryKey: THREAD_KEY,
      enabled: started,
      refetchInterval: open ? 3000 : 15000,
      retry: (n, err) => statusOf(err) !== 404 && n < 2,
    },
  });
  const startMut = useStartChatThread();
  const sendMut = useSendChatMessage();

  const forget = () => {
    store.set(STARTED_KEY, null);
    setStarted(false);
    qc.removeQueries({ queryKey: THREAD_KEY });
  };

  // The conversation is gone (cookie expired or cleared): go back to the start form.
  useEffect(() => {
    if (statusOf(thread.error) === 404) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.error]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STARTED_KEY) setStarted(e.newValue === "1");
      if (e.key === SEEN_KEY) setSeen((s) => Math.max(s, Number(e.newValue) || 0));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const data = started ? thread.data : undefined;
  const messages = data?.messages ?? [];
  const lastReplyId = messages.reduce((m, x) => (x.sender === "admin" && x.id > m ? x.id : m), 0);
  const unread = messages.filter((m) => m.sender === "admin" && m.id > seen).length;

  useEffect(() => {
    if (open && lastReplyId > seen) {
      setSeen(lastReplyId);
      store.set(SEEN_KEY, String(lastReplyId));
    }
  }, [open, lastReplyId, seen]);

  // Focus the first field on open (only with a mouse, so phones don't pop the keyboard up uninvited).
  useEffect(() => {
    if (!open) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const target = fine ? panel.current?.querySelector<HTMLElement>("[data-autofocus]") : null;
    (target ?? panel.current)?.focus({ preventScroll: true });
  }, [open, started]);

  // Follow new messages unless the visitor scrolled up to read older ones.
  useLayoutEffect(() => {
    const el = log.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, open, started]);

  const onLogScroll = () => {
    const el = log.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const resizeComposer = () => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const toggle = () => {
    setError(null);
    setOpen((o) => !o);
    atBottom.current = true;
  };

  const close = () => {
    setOpen(false);
    fab.current?.focus();
  };

  const onRootKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.stopPropagation(); close(); }
  };

  const submitStart = (e: FormEvent) => {
    e.preventDefault();
    if (startMut.isPending) return;
    const message = draft.trim();
    const mail = email.trim();
    if (!message) return;
    if (mail && !EMAIL_RE.test(mail)) {
      setError(t.chat.errorEmail);
      emailInput.current?.focus();
      return;
    }
    setError(null);
    startMut.mutate(
      { data: { message, name: name.trim() || undefined, email: mail || undefined, lang, website: trap || undefined } },
      {
        onSuccess: (fresh: ChatThread) => {
          store.set(STARTED_KEY, "1");
          qc.setQueryData(THREAD_KEY, fresh);
          atBottom.current = true;
          setDraft("");
          setStarted(true);
        },
        onError: (err) => {
          const s = statusOf(err);
          setError(s === 429 ? t.chat.errorRate : s === 400 && /email/i.test(serverError(err)) ? t.chat.errorEmail : t.chat.errorSend);
        },
      },
    );
  };

  const submitReply = () => {
    if (sendMut.isPending) return;
    const message = draft.trim();
    if (!message) return;
    setError(null);
    sendMut.mutate(
      { data: { message } },
      {
        onSuccess: async (m: ChatMessage) => {
          // Drop any poll that started before this send, so it cannot hide the new message.
          await qc.cancelQueries({ queryKey: THREAD_KEY });
          qc.setQueryData<ChatThread>(THREAD_KEY, (old) => old && {
            ...old,
            status: "open",
            messages: old.messages.some((x) => x.id === m.id) ? old.messages : [...old.messages, m],
          });
          atBottom.current = true;
          setDraft("");
          requestAnimationFrame(resizeComposer);
        },
        onError: (err) => {
          const s = statusOf(err);
          if (s === 404) { forget(); return; }
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

  const closed = data?.status === "closed";
  // The visitor wrote last and nobody has answered yet.
  const waiting = messages[messages.length - 1]?.sender === "visitor" && !closed;
  const fabLabel = open ? t.chat.close : unread > 0 ? `${t.chat.title}. ${tpl(t.chat.newMessages, { n: unread })}` : t.chat.title;

  return (
    <div className="cw-root" onKeyDown={onRootKey} data-testid="chat-widget">
      {open && (
        <section ref={panel} id={panelId} role="dialog" aria-label={t.chat.title} tabIndex={-1} className="cw-panel tile" data-testid="panel-chat">
          <header className="cw-head">
            <BubbleIcon className="h-4 w-6 shrink-0 text-[#1b2a1c]" />
            <h2 className="flex-1 min-w-0 truncate font-bold text-sm">{t.chat.title}</h2>
            <button type="button" onClick={close} aria-label={t.chat.close} className="cw-close grid place-items-center h-8 w-8" data-testid="button-chat-close">
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </header>

          {!started ? (
            <form onSubmit={submitStart} className="cw-body overflow-y-auto overscroll-contain p-4 flex flex-col gap-3" noValidate>
              <p className="text-sm text-[#2c3a2c]">{t.chat.intro}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 min-w-0">
                  <span className="cw-label">{t.chat.name} <span className="cw-opt">({t.chat.optional})</span></span>
                  <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name"
                    className="cw-field" data-testid="input-chat-name" />
                </label>
                <label className="flex flex-col gap-1 min-w-0">
                  <span className="cw-label">{t.chat.email} <span className="cw-opt">({t.chat.optional})</span></span>
                  <input ref={emailInput} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email"
                    aria-describedby={`${panelId}-hint`} className="cw-field" data-testid="input-chat-email" />
                </label>
              </div>
              <p id={`${panelId}-hint`} className="-mt-1.5 text-xs text-[#5b6a5b]">{t.chat.emailHint}</p>
              <label className="flex flex-col gap-1">
                <span className="cw-label">{t.chat.message}</span>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_MESSAGE} rows={4} required
                  placeholder={t.chat.placeholder} className="cw-field resize-none" data-testid="input-chat-first-message" />
              </label>
              {/* Hidden from people; automated form fillers fill it in and the server drops the request. */}
              <div className="sr-only" aria-hidden="true">
                <input tabIndex={-1} name="xid-extra" autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </div>
              {error && <ErrorLine text={error} />}
              <button type="submit" disabled={startMut.isPending || !draft.trim()} className="pbtn red justify-center px-4 py-2.5 font-bold" data-testid="button-chat-start">
                <SendIcon className="h-3.5 w-3.5 rtl:-scale-x-100" /> {startMut.isPending ? t.chat.sending : t.chat.start}
              </button>
            </form>
          ) : (
            <>
              <div ref={log} onScroll={onLogScroll} role="log" aria-live="polite" aria-label={t.chat.title} className="cw-log" data-testid="chat-log">
                {thread.isPending && <p className="cw-loading m-auto" aria-hidden="true"><i /><i /><i /></p>}
                {thread.isError && statusOf(thread.error) !== 404 && !data && (
                  <div className="m-auto text-center text-sm">
                    <p>{t.chat.errorLoad}</p>
                    <button type="button" onClick={() => thread.refetch()} className="pbtn paper mt-3 px-3 py-1.5 text-sm font-bold" data-testid="button-chat-retry">{t.chat.retry}</button>
                  </div>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "visitor";
                  return (
                    <div key={m.id} className={`cw-row ${mine ? "me" : "them"}`} data-testid={`chat-message-${m.id}`}>
                      {/* Labels stay outside the dir="auto" bubble so they never decide the text direction. */}
                      {mine ? <span className="sr-only">{t.chat.you}:</span> : <span className="cw-from font-pixel font-bold">xidker</span>}
                      <p className="cw-msg" dir="auto">{m.body}</p>
                      <time className="cw-time" dateTime={m.createdAt}>{when(m.createdAt)}</time>
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
    <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-[hsl(var(--pin))]" data-testid="text-chat-error">
      <AlertIcon className="h-4 w-2 mt-0.5 shrink-0" /> <span>{text}</span>
    </p>
  );
}
