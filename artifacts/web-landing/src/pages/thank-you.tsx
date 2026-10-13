import { useState, type ReactNode } from "react";
import { ThanksCover } from "@/components/thanks-cover";
import { useSearch, Link } from "wouter";
import { useGetCheckoutStatus, getGetCheckoutStatusQueryKey, useListPackages } from "@workspace/api-client-react";
import { ArrowLeft, Check, Clock, Receipt, RefreshCw, Mail } from "lucide-react";
import { formatPrice } from "@/lib/motion";
import { useI18n, LangSwitch, CONTACT_EMAIL } from "@/lib/i18n";
import { Logo, Wordmark } from "@/components/sprites";
import { MiniRoad } from "@/components/mini-road";

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      <header className="bg-[hsl(var(--paper))] border-b-4 border-[#1b2a1c]">
        <div className="mx-auto w-full max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home"><Logo /><Wordmark /></Link>
          <LangSwitch />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">{children}</div>
      <div className="bricks h-8 border-t-4 border-[#4a170d]" />
    </main>
  );
}

function Card({ children, testId }: { children: ReactNode; testId: string }) {
  return <div className="tile w-full max-w-xl p-6 md:p-10 text-center" data-testid={testId}>{children}</div>;
}

function BackHome({ red }: { red?: boolean }) {
  const { t } = useI18n();
  return (
    <Link href="/" className={`pbtn ${red ? "red" : ""} px-5 py-2.5 font-bold`} data-testid="link-back-home">
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.thanks.back}
    </Link>
  );
}

function SupportLink({ subject }: { subject?: string }) {
  const { t } = useI18n();
  const href = subject ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CONTACT_EMAIL}`;
  return (
    <a href={href} className="inline-flex items-center gap-2 font-bold underline underline-offset-4 decoration-[3px] decoration-[hsl(var(--pin))] break-all" data-testid="link-support">
      <Mail className="h-4 w-4 shrink-0" /> {subject ? t.thanks.support : CONTACT_EMAIL}
    </a>
  );
}

export default function ThankYou() {
  const { t, lang, locale, numLocale } = useI18n();
  const search = useSearch();
  const ref = new URLSearchParams(search).get("ref") ?? "";
  const { data, isLoading, isError, error, refetch, isFetching } = useGetCheckoutStatus(ref, {
    query: {
      enabled: !!ref,
      queryKey: getGetCheckoutStatusQueryKey(ref),
      refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
      // An unknown order reference is a final answer; retrying it only keeps the loading screen up longer.
      retry: (count, err) => (err as { status?: number } | null)?.status !== 404 && count < 3,
    },
  });
  const { data: pkgs } = useListPackages({ lang });
  const [cover, setCover] = useState(() => !!ref && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pkgName = (id: string, fallback: string) => pkgs?.find((p) => p.id === id)?.name ?? fallback;

  const body = (() => {
  if (!ref) {
    return (
      <Shell>
        <Card testId="status-no-ref">
          <MiniRoad mode="start" />
          <h1 className="font-display text-3xl md:text-4xl leading-tight mt-4">{t.thanks.noRefTitle}</h1>
          <p className="mt-3 text-[#2c3a2c]">{t.thanks.noRefBody}</p>
          <div className="mt-7 flex flex-wrap gap-4 justify-center items-center"><BackHome red /><SupportLink /></div>
        </Card>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <Card testId="status-loading">
          <MiniRoad mode="walking" />
          <p className="mt-4 font-semibold">{t.thanks.loading}</p>
        </Card>
      </Shell>
    );
  }

  const httpStatus = (error as { status?: number } | null)?.status;
  if (isError && httpStatus === 404) {
    return (
      <Shell>
        <Card testId="status-not-found">
          <MiniRoad mode="lost" />
          <h1 className="font-display text-3xl md:text-4xl leading-tight mt-4">{t.thanks.nfTitle}</h1>
          <p className="mt-3 text-[#2c3a2c]">{t.thanks.nfBody1} <span className="font-mono text-sm bg-white/70 px-1 break-all">{ref}</span> {t.thanks.nfBody2}</p>
          <div className="mt-7 flex flex-wrap gap-4 justify-center items-center">
            <BackHome red />
            <SupportLink subject={`${t.thanks.supportSubject} ${ref}`} />
          </div>
          <p className="mt-3 text-sm text-[#3d4a3d] break-all">{CONTACT_EMAIL}</p>
        </Card>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <Card testId="status-error">
          <MiniRoad mode="walking" />
          <h1 className="font-display text-3xl leading-tight mt-4">{t.thanks.errTitle}</h1>
          <p className="mt-3 text-[#2c3a2c]">{t.thanks.errBody}</p>
          <button onClick={() => refetch()} disabled={isFetching} className="pbtn mt-7 px-5 py-2.5 font-bold" data-testid="button-retry-status">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t.thanks.retry}
          </button>
        </Card>
      </Shell>
    );
  }

  if (data.status === "paid") {
    const paidAt = data.paidAt ? new Date(data.paidAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }) : null;
    return (
      <Shell>
        <Card testId="status-paid">
          <MiniRoad mode="goal" />
          <p className="mt-2 inline-flex items-center gap-1.5 bg-[hsl(var(--gold))] border-[3px] border-[#1b2a1c] px-3 py-1 text-xs font-bold uppercase"><Check className="h-3.5 w-3.5" strokeWidth={3} /> {t.thanks.paidEyebrow}</p>
          <h1 className="font-display text-3xl md:text-5xl leading-tight mt-4">{t.thanks.paidTitle}</h1>
          <p className="mt-4 text-[#2c3a2c]">{t.thanks.paidBody}</p>
          <div className="mt-7 text-start border-[3px] border-[#1b2a1c] bg-white/70 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3d4a3d]"><Receipt className="h-4 w-4" /> {t.thanks.receipt}</div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#3d4a3d]">{t.thanks.pkg}</dt><dd className="font-bold text-end" data-testid="text-package-name">{pkgName(data.packageId, data.packageName)}</dd></div>
              {data.amount != null && data.currency && <div className="flex justify-between gap-4"><dt className="text-[#3d4a3d]">{t.thanks.amount}</dt><dd className="font-display text-lg" data-testid="text-amount">{formatPrice(data.amount, data.currency, numLocale)}</dd></div>}
              {paidAt && <div className="flex justify-between gap-4"><dt className="text-[#3d4a3d]">{t.thanks.time}</dt><dd className="text-end" data-testid="text-paid-at">{paidAt}</dd></div>}
              <div className="flex justify-between gap-4 border-t-2 border-dashed border-[#8d8a80] pt-2.5"><dt className="text-[#3d4a3d]">{t.thanks.ref}</dt><dd className="font-mono text-xs break-all text-end" data-testid="text-ref">{data.ref}</dd></div>
            </dl>
          </div>
          <div className="mt-7 flex flex-wrap gap-4 justify-center items-center"><BackHome /><SupportLink /></div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card testId="status-pending">
        <MiniRoad mode="walking" />
        <p className="mt-2 inline-flex items-center gap-1.5 bg-white/70 border-[3px] border-[#1b2a1c] px-3 py-1 text-xs font-bold uppercase"><Clock className="h-3.5 w-3.5" /> {t.thanks.pendingEyebrow}</p>
        <h1 className="font-display text-3xl md:text-4xl leading-tight mt-4">{t.thanks.pendingTitle}</h1>
        <p className="mt-4 text-[#2c3a2c]">{t.thanks.pendingBody1} <strong>{pkgName(data.packageId, data.packageName)}</strong>. {t.thanks.pendingBody2}</p>
        <p className="mt-5 font-mono text-xs text-[#3d4a3d] break-all">{t.thanks.code}: {data.ref}</p>
        <div className="mt-5 flex justify-center"><SupportLink subject={`${t.thanks.supportSubject} ${data.ref}`} /></div>
      </Card>
    </Shell>
  );
  })();

  return <>{body}{cover && <ThanksCover loading={isLoading} onDone={() => setCover(false)} />}</>;
}
