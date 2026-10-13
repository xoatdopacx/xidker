import { useSearch, Link } from "wouter";
import { useGetCheckoutStatus, getGetCheckoutStatusQueryKey, useListPackages } from "@workspace/api-client-react";
import { ArrowLeft, Check, Clock, SearchX, Receipt, RefreshCw, Mail } from "lucide-react";
import { formatPrice, Logo, Wordmark, ArtObject, usePrefersReducedMotion } from "@/lib/motion";
import { useI18n, LangSwitch, CONTACT_EMAIL } from "@/lib/i18n";

function Shell({ children, tone }: { children: React.ReactNode; tone: "klein" | "sun" | "flare" | "paper" }) {
  const { t } = useI18n();
  const bg = { klein: "bg-primary text-primary-foreground", sun: "bg-[hsl(var(--sun))] text-[hsl(var(--ink))]", flare: "bg-[hsl(var(--flare))] text-[hsl(var(--paper))]", paper: "bg-background text-foreground grid-paper" }[tone];
  return (
    <main className={`min-h-[100dvh] flex flex-col ${bg} transition-colors duration-700`}>
      <header className="mx-auto w-full max-w-5xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home"><Logo className="h-7 w-7" /><Wordmark className="text-xl" /></Link>
        <LangSwitch tone={tone === "klein" || tone === "flare" ? "dark" : "light"} />
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-12">{children}</div>
    </main>
  );
}

function Cube({ spin }: { color?: string; spin: boolean }) {
  const reduced = usePrefersReducedMotion();
  return <div className="mx-auto mb-8 w-fit"><ArtObject size={180} spin={spin && !reduced} /></div>;
}

function BackHome({ dark }: { dark?: boolean }) {
  const { t } = useI18n();
  return (
    <Link href="/" className={`btn-3d inline-flex items-center gap-2 rounded-full border-2 border-[hsl(var(--ink))] px-6 py-3 font-semibold ${dark ? "bg-[hsl(var(--ink))] text-[hsl(var(--paper))]" : "bg-[hsl(var(--paper))] text-[hsl(var(--ink))]"}`} data-testid="link-back-home">
      <ArrowLeft className="h-4 w-4" /> {t.thanks.back}
    </Link>
  );
}

export default function ThankYou() {
  const { t, lang, locale } = useI18n();
  const search = useSearch();
  const ref = new URLSearchParams(search).get("ref") ?? "";
  const { data, isLoading, isError, error, refetch, isFetching } = useGetCheckoutStatus(ref, {
    query: {
      enabled: !!ref,
      queryKey: getGetCheckoutStatusQueryKey(ref),
      refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
    },
  });

  const { data: pkgs } = useListPackages({ lang });
  const pkgName = (id: string, fallback: string) => pkgs?.find((p) => p.id === id)?.name ?? fallback;

  if (!ref) {
    return (
      <Shell tone="paper">
        <div className="max-w-lg text-center" data-testid="status-no-ref">
          <SearchX className="h-14 w-14 mx-auto text-[hsl(var(--flare))]" />
          <h1 className="font-display font-extrabold text-4xl md:text-5xl mt-6 leading-tight">{t.thanks.noRefTitle}</h1>
          <p className="mt-4 text-muted-foreground text-lg">{t.thanks.noRefBody}</p>
          <div className="mt-8"><BackHome dark /></div>
        </div>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell tone="paper">
        <div className="text-center" data-testid="status-loading">
          <Cube color="hsl(var(--muted))" spin />
          <p className="font-mono text-sm uppercase tracking-[.2em] text-muted-foreground">{t.thanks.loading}</p>
        </div>
      </Shell>
    );
  }

  const httpStatus = (error as { status?: number } | null)?.status;
  if (isError && httpStatus === 404) {
    return (
      <Shell tone="paper">
        <div className="max-w-lg text-center" data-testid="status-not-found">
          <Cube color="hsl(var(--flare))" spin={false} />
          <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight">{t.thanks.nfTitle}</h1>
          <p className="mt-4 text-muted-foreground text-lg">{t.thanks.nfBody1} <span className="font-mono text-foreground">{ref}</span> {t.thanks.nfBody2}</p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <BackHome dark />
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${t.thanks.supportSubject} ${ref}`)}`} className="inline-flex items-center gap-2 font-semibold underline underline-offset-4 decoration-2 decoration-[hsl(var(--flare))]" data-testid="link-support"><Mail className="h-4 w-4" /> {t.thanks.support}</a>
          </div>
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell tone="paper">
        <div className="max-w-lg text-center" data-testid="status-error">
          <h1 className="font-display font-extrabold text-4xl leading-tight">{t.thanks.errTitle}</h1>
          <p className="mt-4 text-muted-foreground text-lg">{t.thanks.errBody}</p>
          <button onClick={() => refetch()} disabled={isFetching} className="btn-3d mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground border-2 border-[hsl(var(--ink))] px-6 py-3 font-semibold" data-testid="button-retry-status">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t.thanks.retry}
          </button>
        </div>
      </Shell>
    );
  }

  if (data.status === "paid") {
    const paidAt = data.paidAt ? new Date(data.paidAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }) : null;
    return (
      <Shell tone="klein">
        <div className="max-w-2xl w-full text-center" data-testid="status-paid">
          <div className="relative h-24 w-24 mx-auto mb-8">
            <span className="absolute inset-0 rounded-full bg-[hsl(var(--sun))] ring-pulse" />
            <span className="relative h-24 w-24 rounded-full bg-[hsl(var(--sun))] text-[hsl(var(--ink))] border-2 border-[hsl(var(--ink))] flex items-center justify-center"><Check className="h-12 w-12" strokeWidth={3} /></span>
          </div>
          <p className="font-mono text-xs uppercase tracking-[.25em] text-[hsl(var(--sun))]">{t.thanks.paidEyebrow}</p>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-[.92] tracking-tight mt-4">{t.thanks.paidTitle}</h1>
          <p className="mt-6 text-lg opacity-85 max-w-lg mx-auto">{t.thanks.paidBody}</p>
          <div className="mt-10 mx-auto max-w-md rounded-3xl bg-[hsl(var(--paper))] text-[hsl(var(--ink))] border-2 border-[hsl(var(--ink))] p-6 text-left shadow-[10px_10px_0_hsl(var(--flare))] rotate-[-1deg]">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"><Receipt className="h-4 w-4" /> {t.thanks.receipt}</div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t.thanks.pkg}</dt><dd className="font-semibold text-right" data-testid="text-package-name">{pkgName(data.packageId, data.packageName)}</dd></div>
              {data.amount != null && data.currency && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t.thanks.amount}</dt><dd className="font-display font-extrabold text-xl" data-testid="text-amount">{formatPrice(data.amount, data.currency, locale)}</dd></div>}
              {paidAt && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t.thanks.time}</dt><dd data-testid="text-paid-at">{paidAt}</dd></div>}
              <div className="flex justify-between gap-4 border-t border-dashed border-[hsl(var(--ink)/.3)] pt-3"><dt className="text-muted-foreground">{t.thanks.ref}</dt><dd className="font-mono text-xs break-all text-right" data-testid="text-ref">{data.ref}</dd></div>
            </dl>
          </div>
          <div className="mt-10"><BackHome /></div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell tone="sun">
      <div className="max-w-xl text-center" data-testid="status-pending">
        <Cube color="hsl(var(--klein))" spin />
        <p className="font-mono text-xs uppercase tracking-[.25em] flex items-center justify-center gap-2"><Clock className="h-4 w-4" /> {t.thanks.pendingEyebrow}</p>
        <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-[.95] tracking-tight mt-4">{t.thanks.pendingTitle}</h1>
        <p className="mt-5 text-lg opacity-80">{t.thanks.pendingBody1} <strong>{pkgName(data.packageId, data.packageName)}</strong>. {t.thanks.pendingBody2}</p>
        <p className="mt-6 font-mono text-xs opacity-60 break-all">{t.thanks.code}: {data.ref}</p>
      </div>
    </Shell>
  );
}
