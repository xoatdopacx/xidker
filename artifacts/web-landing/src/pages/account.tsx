import { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import {
  useListMyOrders, getListMyOrdersQueryKey, useSignOutAccount,
} from "@workspace/api-client-react";
import { useI18n, tpl } from "@/lib/i18n";
import { formatPrice } from "@/lib/motion";
import { statusOf } from "@/lib/http";
import { localePath } from "@/lib/locale-url";
import { setSignedOut, signedOutReason, useAccount } from "@/lib/account";
import { useOrderFlash } from "@/lib/order";
import { ROUTES, orderPath } from "@/lib/routes";
import { supportChat } from "@/lib/support-chat";
import { Blocks, ErrorLine, PageShell } from "@/components/page-shell";
import { StatusBadge, downloadUrl } from "@/components/order-status";

/** The buyer's account: their orders, downloads and the way into support chat. */
export default function AccountPage() {
  const { t, lang, locale, numLocale } = useI18n();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const session = useAccount();
  const account = session.data?.account ?? null;
  const [flash, clearFlash] = useOrderFlash();
  const orders = useListMyOrders({
    query: {
      queryKey: getListMyOrdersQueryKey(),
      enabled: !!account,
      retry: (n, err) => statusOf(err) !== 401 && n < 2,
      // Waiting orders change when the studio confirms the transfer.
      refetchInterval: (q) => (q.state.data?.some((o) => o.status === "pending") ? 15_000 : false),
    },
  });
  const signOut = useSignOutAccount();

  // Signed out (or signed in somewhere else): go to sign-in, which comes back here afterwards.
  useEffect(() => {
    if (session.data && !session.data.account) navigate(ROUTES.signIn, { replace: true });
  }, [session.data, navigate]);
  useEffect(() => {
    if (statusOf(orders.error) === 401) setSignedOut(qc, signedOutReason(orders.error));
  }, [orders.error, qc]);

  // The notice about an order that could not be placed after sign-in is shown once.
  useEffect(() => () => clearFlash(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }), [locale]);

  const leave = () => {
    if (signOut.isPending) return;
    signOut.mutate(undefined, {
      onSettled: () => {
        navigate(localePath(lang));
        setSignedOut(qc, null);
      },
    });
  };

  if (!account) {
    return (
      <PageShell>
        <div className="tile w-full max-w-md p-6 md:p-8">
          {session.isError ? (
            <div className="text-center py-6">
              <ErrorLine text={t.auth.errors.network} />
              <button type="button" onClick={() => session.refetch()} className="pbtn paper mt-4 px-4 py-2 text-sm font-bold" data-testid="button-retry-session">
                <RefreshCw className="h-4 w-4" /> {t.account.retry}
              </button>
            </div>
          ) : <Blocks label={t.scene.loading} />}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {flash && (
          <div className="tile !border-[hsl(var(--pin))] p-4 md:p-5" role="alert" data-testid="status-order-flash">
            <p className="font-bold">{tpl(t.account.orderFailed, { name: flash.name })}</p>
            <p className="mt-1 text-sm text-[#2c3a2c]">{flash.text}</p>
          </div>
        )}

        <section className="tile p-6 md:p-8" aria-labelledby="account-title">
          <h1 id="account-title" className="font-display text-3xl md:text-4xl leading-tight">{t.account.title}</h1>
          <p className="mt-2 text-sm text-[#3d4a3d]">
            {t.account.signedInAs} <bdi dir="ltr" className="font-bold text-[#10230f] break-all" data-testid="text-account-email">{account.email}</bdi>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {account.admin && (
              <Link href={ROUTES.admin} className="pbtn red px-4 py-2 text-sm font-bold" data-testid="link-admin">
                <LayoutDashboard className="h-4 w-4" /> {t.account.admin}
              </Link>
            )}
            <button type="button" onClick={leave} disabled={signOut.isPending} className="pbtn paper px-4 py-2 text-sm font-bold" data-testid="button-sign-out">
              {signOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 rtl:-scale-x-100" />} {t.account.signOut}
            </button>
          </div>
        </section>

        <section className="tile p-6 md:p-8" aria-labelledby="orders-title">
          <h2 id="orders-title" className="font-display text-2xl leading-tight">{t.account.orders}</h2>
          {orders.isPending && <Blocks label={t.scene.loading} />}
          {orders.isError && statusOf(orders.error) !== 401 && (
            <div className="mt-4">
              <ErrorLine text={t.account.loadError} />
              <button type="button" onClick={() => orders.refetch()} disabled={orders.isFetching} className="pbtn paper mt-3 px-4 py-2 text-sm font-bold" data-testid="button-retry-orders">
                <RefreshCw className={`h-4 w-4 ${orders.isFetching ? "animate-spin" : ""}`} /> {t.account.retry}
              </button>
            </div>
          )}
          {orders.data && orders.data.length === 0 && (
            <div className="mt-4" data-testid="status-no-orders">
              <p className="text-[#2c3a2c]">{t.account.noOrders}</p>
              <a href={`${localePath(lang, import.meta.env.BASE_URL)}#bang-gia`} className="pbtn red mt-4 px-4 py-2 text-sm font-bold" data-testid="link-pricing">
                {t.nav.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </a>
            </div>
          )}
          {orders.data && orders.data.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {orders.data.map((o) => (
                <li key={o.code} className="border-[3px] border-[#1b2a1c] bg-[#fffdf6] p-4 flex flex-wrap items-center gap-x-5 gap-y-3" data-testid={`row-order-${o.code}`}>
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold" dir="ltr">{o.code}</span>
                      <StatusBadge order={o} />
                    </div>
                    <p className="mt-1 font-semibold leading-snug"><bdi>{o.packageName}</bdi>{o.sampleName && <span className="font-normal text-[#3d4a3d]"> · <bdi>{o.sampleName}</bdi></span>}</p>
                    <p className="mt-0.5 text-sm text-[#3d4a3d]">
                      {formatPrice(o.amount, "VND", numLocale)} · <time dateTime={o.createdAt}>{dateFmt.format(new Date(o.createdAt))}</time>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.hasFile && (
                      <a href={downloadUrl(o.code)} className="pbtn px-3 py-1.5 text-sm font-bold" data-testid={`link-download-${o.code}`}>
                        <Download className="h-4 w-4" /> {t.account.download}
                      </a>
                    )}
                    <Link href={orderPath(o.code)} className="pbtn paper px-3 py-1.5 text-sm font-bold" data-testid={`link-order-${o.code}`}>
                      {t.account.view} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tile p-6 md:p-8" aria-labelledby="chat-title">
          <h2 id="chat-title" className="font-display text-2xl leading-tight">{t.account.chatTitle}</h2>
          {account.canChat ? (
            <>
              <p className="mt-2 text-sm text-[#2c3a2c]">{t.account.chatBody}</p>
              <button type="button" onClick={() => supportChat.open()} className="pbtn mt-4 px-4 py-2 text-sm font-bold" data-testid="button-open-chat">
                <MessageSquare className="h-4 w-4" /> {t.account.chatOpen}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-[#2c3a2c]" data-testid="text-chat-locked">{t.chat.noOrder}</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
