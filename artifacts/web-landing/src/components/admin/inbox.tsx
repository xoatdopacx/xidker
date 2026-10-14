import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  useListAdminConversations, getListAdminConversationsQueryKey,
  useListAdminMessages, getListAdminMessagesQueryKey,
  useSendAdminMessage, useUpdateAdminConversation,
  type AdminConversation, type ChatMessage,
} from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import {
  adminErrorText, fullWhen, guestName, languageName, messageWhen, shortWhen, useSignOutOn401,
} from "./shared";

type Filter = "open" | "closed" | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã đóng" },
  { value: "all", label: "Tất cả" },
];
const MAX_MESSAGE = 2000;
const LIST_KEY = getListAdminConversationsQueryKey();

type SignedOut = (notice: string | null) => void;

/** The conversation list and the open thread; the admin shell above owns the header and the polling. */
export function AdminInbox({ drafts, onSignedOut }: { drafts: Map<string, string>; onSignedOut: SignedOut }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Same query (and cache entry) as the shell's, which keeps it polling.
  const list = useListAdminConversations({
    query: { queryKey: LIST_KEY, refetchInterval: 5000, refetchIntervalInBackground: true, retry: false },
  });
  useSignOutOn401(list.error, onSignedOut);

  const all = list.data ?? [];
  const shown = filter === "all" ? all : all.filter((c) => c.status === filter);
  const count = (f: Filter) => (f === "all" ? all.length : all.filter((c) => c.status === f).length);
  const selected = all.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex-1 min-h-0 flex">
      <section aria-label="Danh sách cuộc trò chuyện"
        className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-[340px] lg:w-[380px] shrink-0 flex-col border-e-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]`}>
        <div className="flex gap-1.5 p-3 border-b-[3px] border-[#1b2a1c]" role="group" aria-label="Lọc">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
              className="adm-tab flex-1 h-9 text-sm font-bold" data-testid={`button-filter-${f.value}`}>
              {f.label} <span className="font-num text-[11px]">{count(f.value)}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {list.isPending ? (
            <p className="p-6 text-sm text-[#3d4a3d]">Đang tải…</p>
          ) : list.isError && !list.data ? (
            <div className="p-6 text-sm">
              <p>{adminErrorText(list.error)}</p>
              <button type="button" onClick={() => list.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
            </div>
          ) : shown.length === 0 ? (
            <p className="p-6 text-sm text-[#3d4a3d]">
              {filter === "closed" ? "Chưa có cuộc trò chuyện nào đã đóng." : filter === "open" ? "Không có cuộc trò chuyện nào đang mở." : "Chưa có ai nhắn tin."}
            </p>
          ) : (
            <ul>
              {shown.map((c) => (
                <li key={c.id}>
                  <ConversationRow conv={c} active={c.id === selectedId} onOpen={() => setSelectedId(c.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-label="Cuộc trò chuyện" className={`${selected ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {selected ? (
          <Thread key={selected.id} conv={selected} drafts={drafts} onBack={() => setSelectedId(null)} onSignedOut={onSignedOut} />
        ) : (
          <div className="m-auto p-6 text-center text-sm text-[#3d4a3d]">
            {all.length ? "Chọn một cuộc trò chuyện ở bên trái." : "Khi khách đã mua nhắn tin, cuộc trò chuyện sẽ hiện ở đây."}
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationRow({ conv, active, onOpen }: { conv: AdminConversation; active: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-current={active ? "true" : undefined}
      className={`adm-item ${conv.status === "closed" ? "is-closed" : ""}`} data-testid={`row-conversation-${conv.id}`}>
      <span className="flex items-baseline gap-2">
        <span className={`truncate ${conv.unread ? "font-extrabold" : "font-semibold"}`} dir="auto">{guestName(conv)}</span>
        <span className="adm-lang font-num shrink-0" title={languageName(conv.lang)}>{conv.lang.toUpperCase()}</span>
        <span className="ms-auto shrink-0 text-xs text-[#5b6a5b]">{shortWhen(conv.lastMessageAt)}</span>
      </span>
      <span className="mt-0.5 flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate text-sm text-[#3d4a3d]" dir="auto">
          {conv.lastSender === "admin" && <span className="font-semibold">Bạn: </span>}
          {conv.lastMessage ?? ""}
        </span>
        {conv.status === "closed" && <span className="text-[11px] font-bold text-[#5b6a5b] shrink-0">Đã đóng</span>}
        {conv.unread > 0 && <span className="adm-badge font-num shrink-0" aria-label={`${conv.unread} tin chưa đọc`}>{conv.unread > 99 ? "99+" : conv.unread}</span>}
      </span>
    </button>
  );
}

function Thread({ conv, drafts, onBack, onSignedOut }: {
  conv: AdminConversation; drafts: Map<string, string>; onBack: () => void; onSignedOut: SignedOut;
}) {
  const qc = useQueryClient();
  const key = useMemo(() => getListAdminMessagesQueryKey(conv.id), [conv.id]);
  const [draft, setDraftState] = useState(() => drafts.get(conv.id) ?? "");
  const [error, setError] = useState<string | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);

  // Loading the messages also marks them read on the server.
  const msgs = useListAdminMessages(conv.id, { query: { queryKey: key, refetchInterval: 3000, retry: false } });
  const send = useSendAdminMessage();
  const update = useUpdateAdminConversation();
  useSignOutOn401(msgs.error, onSignedOut);

  /** Updates this conversation's row in the cached list; writes nothing when the row is unchanged. */
  const patchListItem = useCallback((patch: (c: AdminConversation) => AdminConversation) => {
    qc.setQueryData<AdminConversation[]>(LIST_KEY, (old) => {
      if (!old) return undefined;
      let changed = false;
      const next = old.map((c) => {
        if (c.id !== conv.id) return c;
        const p = patch(c);
        if (p !== c) changed = true;
        return p;
      });
      return changed ? next : undefined;
    });
  }, [qc, conv.id]);

  // Clear the unread badge right away instead of waiting for the next list refresh.
  useEffect(() => {
    if (msgs.data) patchListItem((c) => (c.unread ? { ...c, unread: 0 } : c));
  }, [msgs.dataUpdatedAt, msgs.data, patchListItem]);

  const messages = msgs.data ?? [];

  useLayoutEffect(() => {
    const el = log.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) composer.current?.focus({ preventScroll: true });
  }, []);

  const setDraft = (v: string) => {
    setDraftState(v);
    if (v) drafts.set(conv.id, v); else drafts.delete(conv.id);
  };

  const resize = () => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const reply = () => {
    const message = draft.trim();
    if (!message || send.isPending) return;
    setError(null);
    send.mutate(
      { id: conv.id, data: { message } },
      {
        onSuccess: async (m: ChatMessage) => {
          await qc.cancelQueries({ queryKey: key });
          qc.setQueryData<ChatMessage[]>(key, (old) => (old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m]));
          patchListItem((c) => ({ ...c, status: "open", lastMessage: m.body, lastSender: "admin", lastMessageAt: m.createdAt }));
          atBottom.current = true;
          setDraft("");
          requestAnimationFrame(resize);
        },
        onError: (err) => {
          if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
          setError(adminErrorText(err));
        },
      },
    );
  };

  const setStatus = (status: "open" | "closed") => {
    setError(null);
    update.mutate(
      { id: conv.id, data: { status } },
      {
        onSuccess: (fresh) => patchListItem(() => fresh),
        onError: (err) => {
          if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
          setError(adminErrorText(err));
        },
      },
    );
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      reply();
    }
  };

  const closed = conv.status === "closed";
  const gone = statusOf(msgs.error) === 404;

  return (
    <>
      <div className="flex items-start gap-3 px-4 py-3 border-b-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="adm-btn adm-back h-9 w-9 shrink-0" data-testid="button-admin-back-to-list">
          <ArrowLeft className="h-4 w-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          {/* Customers have no name, only the email they bought with: then the email is the title. */}
          <h2 className="font-extrabold truncate" dir="auto">
            {!conv.name?.trim() && conv.email
              ? <a href={`mailto:${conv.email}`} className="hover:underline" dir="ltr" data-testid="link-visitor-email">{conv.email}</a>
              : guestName(conv)}
          </h2>
          <p className="text-xs text-[#3d4a3d] flex flex-wrap gap-x-3 gap-y-0.5">
            {conv.name?.trim() && (conv.email
              ? <a href={`mailto:${conv.email}`} className="underline font-semibold break-all" dir="ltr" data-testid="link-visitor-email">{conv.email}</a>
              : <span>Không có email</span>)}
            {conv.packageName && <span data-testid="text-admin-package">Gói {conv.packageName}</span>}
            {conv.orderId && <span className="font-mono break-all" dir="ltr" data-testid="text-admin-order">{conv.orderId}</span>}
            <span>{languageName(conv.lang)}</span>
            <span>Bắt đầu {fullWhen(conv.createdAt)}</span>
          </p>
        </div>
        <button type="button" onClick={() => setStatus(closed ? "open" : "closed")} disabled={update.isPending || gone}
          className={`adm-btn h-9 px-3 text-sm shrink-0 ${closed ? "gold" : ""}`} data-testid="button-admin-toggle-status">
          {closed ? "Mở lại" : "Đóng"}
        </button>
      </div>

      <div ref={log} role="log" aria-live="polite" aria-label={`Tin nhắn với ${guestName(conv)}`}
        onScroll={() => { const el = log.current; if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3" data-testid="admin-chat-log">
        {msgs.isPending && <p className="m-auto text-sm text-[#3d4a3d]">Đang tải…</p>}
        {msgs.isError && !msgs.data && (
          <div className="m-auto text-center text-sm">
            <p>{adminErrorText(msgs.error)}</p>
            {!gone && <button type="button" onClick={() => msgs.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender === "admin";
          return (
            <div key={m.id} className={`cw-row ${mine ? "me" : "them"}`} data-testid={`admin-message-${m.id}`}>
              {/* The label stays outside the dir="auto" bubble so it never decides the text direction. */}
              <span className="sr-only">{mine ? "Bạn" : guestName(conv)}:</span>
              <p className="cw-msg" dir="auto">{m.body}</p>
              <time className="cw-time" dateTime={m.createdAt}>{messageWhen(m.createdAt)}</time>
            </div>
          );
        })}
      </div>

      <div className="border-t-[3px] border-[#1b2a1c] bg-[#ebe8de] p-3">
        {closed && <p className="cw-note mb-2">Cuộc trò chuyện đã đóng. Trả lời sẽ mở lại.</p>}
        {error && <p role="alert" className="mb-2 text-sm font-semibold text-[hsl(var(--pin))]" data-testid="text-admin-thread-error">{error}</p>}
        <div className="flex items-end gap-2">
          <label className="flex-1 min-w-0">
            <span className="sr-only">Trả lời</span>
            <textarea ref={composer} value={draft} rows={2} maxLength={MAX_MESSAGE} disabled={gone}
              onChange={(e) => { setDraft(e.target.value); resize(); }} onKeyDown={onKey}
              placeholder="Viết câu trả lời…" className="cw-field resize-none block" data-testid="input-admin-reply" />
          </label>
          <button type="button" onClick={reply} disabled={!draft.trim() || send.isPending || gone}
            className="adm-btn red h-11 px-4 shrink-0" data-testid="button-admin-send">
            {send.isPending ? "Đang gửi…" : "Gửi"}
          </button>
        </div>
        <p className="mt-1.5 hidden sm:block text-[11px] text-[#5b6a5b]">Enter để gửi, Shift + Enter để xuống dòng.</p>
      </div>
    </>
  );
}
