import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAdminSession, getGetAdminSessionQueryKey, type AdminSession } from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { AdminSignIn } from "@/components/admin/sign-in";
import { AdminInbox } from "@/components/admin/inbox";
import { adminErrorText } from "@/components/admin/shared";

const SESSION_KEY = getGetAdminSessionQueryKey();

/**
 * Keeps the admin screens out of search results, and makes the whole page Vietnamese and
 * left-to-right even when the visitor site was last shown in Arabic or Hebrew.
 * Runs a frame late because the language provider writes these on first mount, after this page.
 */
function useAdminDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const meta = document.querySelector('meta[name="robots"]');
    const saved: { current: { lang: string; dir: string; script?: string; robots: string | null } | null } = { current: null };
    const id = requestAnimationFrame(() => {
      // Read here, after the provider has written its values, so leaving the page restores them exactly.
      saved.current = { lang: html.lang, dir: html.dir, script: html.dataset.script, robots: meta?.getAttribute("content") ?? null };
      html.lang = "vi";
      html.dir = "ltr";
      html.dataset.script = "latin";
      meta?.setAttribute("content", "noindex, nofollow");
    });
    return () => {
      cancelAnimationFrame(id);
      const before = saved.current;
      if (!before) return;
      html.lang = before.lang;
      html.dir = before.dir;
      if (before.script) html.dataset.script = before.script;
      if (meta && before.robots) meta.setAttribute("content", before.robots);
    };
  }, []);
}

export default function AdminPage() {
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  useAdminDocument();

  const session = useGetAdminSession({
    query: { queryKey: SESSION_KEY, retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  });

  const signedIn = useCallback((s: AdminSession) => {
    setNotice(null);
    qc.setQueryData(SESSION_KEY, s);
  }, [qc]);

  const signedOut = useCallback((message: string | null) => {
    qc.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/conversations") });
    setNotice(message);
    qc.setQueryData<AdminSession | null>(SESSION_KEY, null);
  }, [qc]);

  let body;
  if (session.data) {
    body = <AdminInbox session={session.data} onSignedOut={signedOut} />;
  } else if (session.isPending) {
    body = <p className="min-h-[100dvh] grid place-items-center text-sm text-[#3d4a3d]">Đang tải…</p>;
  } else if (session.isError && statusOf(session.error) !== 401) {
    body = (
      <div className="min-h-[100dvh] grid place-items-center p-4">
        <div className="adm-card max-w-sm p-6 text-center text-sm">
          <p>{adminErrorText(session.error)}</p>
          <button type="button" onClick={() => session.refetch()} className="adm-btn h-10 px-4 mt-4">Thử lại</button>
        </div>
      </div>
    );
  } else {
    body = <AdminSignIn notice={notice} onSignedIn={signedIn} />;
  }

  return (
    <div lang="vi" dir="ltr" className="adm" data-testid="page-admin">
      {body}
    </div>
  );
}
