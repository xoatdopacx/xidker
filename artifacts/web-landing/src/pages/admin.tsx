import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useGetAdminSession, getGetAdminSessionQueryKey, useSignOutAccount } from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { setSignedOut } from "@/lib/account";
import { ROUTES } from "@/lib/routes";
import { localePath } from "@/lib/locale-url";
import { AdminShell } from "@/components/admin/shell";
import { adminErrorText } from "@/components/admin/shared";

const SESSION_KEY = getGetAdminSessionQueryKey();
/** The admin signs in like every customer (password, then a code by email) and comes back here. */
const SIGN_IN = `${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.admin)}`;

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

/** Drops everything the admin screens loaded. */
function forgetAdminData(qc: ReturnType<typeof useQueryClient>) {
  qc.removeQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/admin/") });
}

export default function AdminPage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const signOut = useSignOutAccount();
  useAdminDocument();

  const session = useGetAdminSession({
    query: { queryKey: SESSION_KEY, retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
  });
  const signedOut = statusOf(session.error) === 401;

  // No admin session in this browser (never signed in, expired after 12 hours, or not the admin): sign in first.
  useEffect(() => {
    if (signedOut) navigate(SIGN_IN, { replace: true });
  }, [signedOut, navigate]);

  // A request answered 401 midway: the session ended (expired, or the admin signed in on another browser).
  const onExpired = useCallback(() => {
    forgetAdminData(qc);
    navigate(SIGN_IN, { replace: true });
  }, [qc, navigate]);

  const leave = useCallback(() => {
    signOut.mutate(undefined, {
      onSettled: () => {
        navigate(localePath("vi"), { replace: true });
        forgetAdminData(qc);
        setSignedOut(qc, null);
      },
    });
  }, [signOut, navigate, qc]);

  let body;
  if (session.data) {
    body = <AdminShell session={session.data} onSignedOut={onExpired} onSignOut={leave} signingOut={signOut.isPending} />;
  } else if (session.isError && !signedOut) {
    body = (
      <div className="min-h-[100dvh] grid place-items-center p-4">
        <div className="adm-card max-w-sm p-6 text-center text-sm">
          <p>{adminErrorText(session.error)}</p>
          <button type="button" onClick={() => session.refetch()} className="adm-btn h-10 px-4 mt-4">Thử lại</button>
        </div>
      </div>
    );
  } else {
    body = <p className="min-h-[100dvh] grid place-items-center text-sm text-[#3d4a3d]">Đang tải…</p>;
  }

  return (
    <div lang="vi" dir="ltr" className="adm" data-testid="page-admin">
      {body}
    </div>
  );
}
