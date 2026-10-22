import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Loader2, MessageSquare, RefreshCw, Send } from "lucide-react";
import {
  useGetMyOrder, getGetMyOrderQueryKey, getListMyOrdersQueryKey, useReportOrderTransfer, useCancelMyOrder,
  type Order, type PaymentDetails,
} from "@workspace/api-client-react";
import { useI18n, tpl } from "@/lib/i18n";
import { formatPrice } from "@/lib/motion";
import { reasonOf, statusOf } from "@/lib/http";
import { localePath } from "@/lib/locale-url";
import { setSignedOut, signedOutReason } from "@/lib/account";
import { orderErrorText } from "@/lib/order";
import { ORDER_CODE_RE, ROUTES, orderPath } from "@/lib/routes";
import { supportChat } from "@/lib/support-chat";
import { Blocks, ErrorLine, PageShell } from "@/components/page-shell";
import { StatusBadge, downloadUrl } from "@/components/order-status";
import { MiniRoad } from "@/components/mini-road";
import { FatCat } from "@/components/fat-cat";
import { BrokeCat } from "@/components/broke-cat";

/** Copies with the clipboard API, or the old way inside frames that do not allow it. */
async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyButton({ value, label, testId }: { value: string; label: string; testId: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 2000);
    return () => window.clearTimeout(id);
  }, [done]);
  return (
    <button type="button" onClick={() => void copyText(value).then(setDone)} aria-label={tpl(t.order.copyLabel, { label })}
      className="pbtn paper shrink-0 px-2.5 py-1 text-xs font-bold" data-testid={`button-copy-${testId}`}>
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />}
      <span aria-live="polite">{done ? t.order.copied : t.order.copy}</span>
    </button>
  );
}

function fileSize(bytes: number, locale: string): string {
  const mb = bytes >= 1e6;
  return new Intl.NumberFormat(locale, { style: "unit", unit: mb ? "megabyte" : "kilobyte", maximumFractionDigits: 1 })
    .format(bytes / (mb ? 1e6 : 1e3));
}

function Row({ label, children, copy, testId }: { label: string; children: ReactNode; copy?: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b-2 border-dashed border-[#1b2a1c]/20 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-[#3d4a3d]">{label}</dt>
        <dd className="font-bold break-all" data-testid={`text-${testId}`}>{children}</dd>
      </div>
      {copy !== undefined && <CopyButton value={copy} label={label} testId={testId} />}
    </div>
  );
}

function PaymentBlock({ order, payment }: { order: Order; payment: PaymentDetails }) {
  const { t, numLocale } = useI18n();
  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
      <figure className="mx-auto w-full max-w-[260px]">
        <img src={payment.qr} alt={tpl(t.order.qrAlt, { code: order.code })} width={260} height={260}
          className="block w-full h-auto bg-white border-[3px] border-[#1b2a1c] p-2" data-testid="img-payment-qr" />
      </figure>
      <div className="min-w-0">
        <p className="text-sm font-bold">{t.order.manual}</p>
        <dl className="mt-1">
          <Row label={t.order.bank} testId="bank"><bdi>{payment.bankName}</bdi>{payment.bankFullName && payment.bankFullName !== payment.bankName && <span className="block text-xs font-normal text-[#3d4a3d]"><bdi>{payment.bankFullName}</bdi></span>}</Row>
          <Row label={t.order.accountNumber} copy={payment.accountNumber} testId="account-number"><span className="font-mono" dir="ltr">{payment.accountNumber}</span></Row>
          <Row label={t.order.accountName} testId="account-name"><bdi>{payment.accountName}</bdi></Row>
          <Row label={t.order.amount} copy={String(payment.amount)} testId="amount">{formatPrice(payment.amount, "VND", numLocale)}</Row>
          <Row label={t.order.memo} copy={payment.memo} testId="memo"><span className="font-mono text-[hsl(var(--pin-text))]" dir="ltr">{payment.memo}</span></Row>
        </dl>
      </div>
    </div>
  );
}

/** One order: transfer details while it waits, the download once paid. */
export default function OrderPage({ code }: { code: string }) {
  const { t, lang, locale, numLocale } = useI18n();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const valid = ORDER_CODE_RE.test(code);
  const query = useGetMyOrder(code, {
    query: {
      queryKey: getGetMyOrderQueryKey(code),
      enabled: valid,
      // Waiting orders refresh by themselves, so the page turns to the download as soon as the transfer is confirmed.
      refetchInterval: (q) => (q.state.data?.status === "pending" ? 5000 : false),
      retry: (n, err) => ![401, 404].includes(statusOf(err)) && n < 2,
    },
  });
  const report = useReportOrderTransfer();
  const cancel = useCancelMyOrder();
  const [asking, setAsking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const status = statusOf(query.error);

  useEffect(() => {
    if (status !== 401) return;
    navigate(`${ROUTES.signIn}?next=${encodeURIComponent(orderPath(code))}`, { replace: true });
    setSignedOut(qc, signedOutReason(query.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);

  const updated = (order: Order) => {
    qc.setQueryData(getGetMyOrderQueryKey(code), order);
    void qc.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
  };

  const onReport = () => {
    if (report.isPending) return;
    setActionError(null);
    report.mutate({ code }, {
      onSuccess: updated,
      onError: (err) => {
        if (statusOf(err) === 409) { void query.refetch(); return; }
        setActionError(statusOf(err) === 0 ? t.auth.errors.network : t.auth.errors.generic);
      },
    });
  };

  const onCancel = () => {
    if (cancel.isPending) return;
    setActionError(null);
    cancel.mutate({ code }, {
      onSuccess: (order) => { setAsking(false); updated(order); },
      onError: (err) => {
        setAsking(false);
        setActionError(reasonOf(err) === "not_cancellable" ? t.order.errors.not_cancellable : orderErrorText(err, t));
        void query.refetch();
      },
    });
  };

  const back = (
    <Link href={ROUTES.account} className="self-start inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4" data-testid="link-back-account">
      <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.order.back}
    </Link>
  );

  const chatButton = (
    <button type="button" onClick={() => supportChat.open()} className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4" data-testid="button-order-chat">
      <MessageSquare className="h-4 w-4" /> {t.order.chat}
    </button>
  );

  if (!valid || status === 404) {
    return (
      <PageShell accountLink>
        <div className="tile w-full max-w-xl p-6 md:p-10 text-center" data-testid="status-order-not-found">
          <MiniRoad mode="lost" />
          <h1 className="font-display text-2xl md:text-3xl leading-tight mt-4">{t.order.notFound}</h1>
          <Link href={ROUTES.account} className="pbtn red mt-6 px-5 py-2.5 font-bold" data-testid="link-back-account">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.order.back}
          </Link>
        </div>
      </PageShell>
    );
  }

  const order = query.data;
  if (!order) {
    return (
      <PageShell accountLink>
        <div className="tile w-full max-w-xl p-6 md:p-10 text-center">
          {query.isError && status !== 401 ? (
            <div data-testid="status-order-error">
              <MiniRoad mode="walking" />
              <h1 className="font-display text-2xl leading-tight mt-4">{t.order.loadError}</h1>
              <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="pbtn mt-6 px-5 py-2.5 font-bold" data-testid="button-retry-order">
                <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> {t.account.retry}
              </button>
            </div>
          ) : <Blocks label={t.scene.loading} />}
        </div>
      </PageShell>
    );
  }

  const reported = order.status === "pending" && !!order.transferReportedAt;
  const [titleBefore, titleAfter = ""] = t.order.title.split("{code}");

  return (
    <PageShell accountLink>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {back}

        <section className="tile p-6 md:p-8" aria-labelledby="order-title" data-testid={`card-order-${order.code}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="order-title" className="font-display text-2xl md:text-3xl leading-tight">
              {titleBefore}<span className="font-mono" dir="ltr" data-testid="text-order-code">{order.code}</span>{titleAfter}
            </h1>
            <StatusBadge order={order} />
          </div>
          <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-[#3d4a3d]">{t.order.package}</dt><dd className="font-bold" data-testid="text-order-package"><bdi>{order.packageName}</bdi></dd></div>
            {order.sampleName && <div><dt className="text-[#3d4a3d]">{t.order.sample}</dt><dd className="font-bold" data-testid="text-order-sample"><bdi>{order.sampleName}</bdi></dd></div>}
            <div><dt className="text-[#3d4a3d]">{t.order.amount}</dt><dd className="font-bold" data-testid="text-order-amount">{formatPrice(order.amount, "VND", numLocale)}</dd></div>
            <div><dt className="text-[#3d4a3d]">{t.order.placed}</dt><dd className="font-bold"><time dateTime={order.createdAt}>{dateFmt.format(new Date(order.createdAt))}</time></dd></div>
            {order.paidAt && <div><dt className="text-[#3d4a3d]">{t.order.paidAt}</dt><dd className="font-bold" data-testid="text-order-paid-at"><time dateTime={order.paidAt}>{dateFmt.format(new Date(order.paidAt))}</time></dd></div>}
          </dl>
        </section>

        {order.status === "pending" && (
          <>
            {reported && (
              <section className="tile p-6 md:p-8 text-center" role="status" data-testid="status-order-reported">
                <MiniRoad mode="walking" />
                <h2 className="font-display text-2xl leading-tight mt-2">{t.order.reportedTitle}</h2>
                <p className="mt-2 text-sm text-[#2c3a2c]">{t.order.reportedBody}</p>
              </section>
            )}
            <section className="tile p-6 md:p-8" aria-labelledby="pay-title" data-testid="section-payment">
              <h2 id="pay-title" className="font-display text-2xl leading-tight">{t.order.payTitle}</h2>
              {order.payment ? (
                <>
                  <p className="mt-2 mb-5 text-sm leading-relaxed text-[#2c3a2c]">{t.order.payBody}</p>
                  <PaymentBlock order={order} payment={order.payment} />
                  <p className="cw-note mt-5">{t.order.abroad}</p>
                </>
              ) : (
                <p className="cw-note mt-3" data-testid="text-no-payment">{t.order.noPayment}</p>
              )}
              {actionError && <div className="mt-4"><ErrorLine text={actionError} /></div>}
              <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-4">
                {!reported && order.payment && (
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={onReport} disabled={report.isPending} className="pbtn red px-5 py-2.5 font-bold" data-testid="button-report-transfer">
                      {report.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t.order.reporting}</> : <><Send className="h-4 w-4 rtl:-scale-x-100" /> {t.order.report}</>}
                    </button>
                    <span className="text-xs text-[#5b6a5b]">{t.order.reportHint}</span>
                  </div>
                )}
                {order.canCancel && !asking && (
                  <button type="button" onClick={() => { setAsking(true); setActionError(null); }} className="pbtn paper px-4 py-2.5 text-sm font-bold" data-testid="button-cancel-order">
                    {t.order.cancel}
                  </button>
                )}
              </div>
              {order.canCancel && asking && (
                <div className="mt-4 border-[3px] border-[#1b2a1c] bg-[#fffdf6] p-4" role="group" aria-labelledby="cancel-ask">
                  <p id="cancel-ask" className="text-sm font-semibold">{t.order.cancelAsk}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" onClick={onCancel} disabled={cancel.isPending} className="pbtn red px-4 py-2 text-sm font-bold" data-testid="button-confirm-cancel">
                      {cancel.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t.order.cancelling}</> : t.order.cancelYes}
                    </button>
                    <button type="button" onClick={() => setAsking(false)} disabled={cancel.isPending} className="pbtn paper px-4 py-2 text-sm font-bold" data-testid="button-keep-order">
                      {t.order.cancelNo}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {order.status === "paid" && (
          <section className="tile p-6 md:p-10 text-center" data-testid="status-order-paid">
            <FatCat />
            <p className="mt-2 inline-flex items-center gap-1.5 bg-[hsl(var(--gold))] border-[3px] border-[#1b2a1c] px-3 py-1 text-xs font-bold uppercase">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> {t.order.paidEyebrow}
            </p>
            <h2 className="font-display text-3xl md:text-4xl leading-tight mt-4">{t.order.paidTitle}</h2>
            {order.file ? (
              <>
                <p className="mt-3 text-[#2c3a2c]">{t.order.paidBody}</p>
                <a href={downloadUrl(order.code)} className="pbtn red mt-6 px-6 py-3 font-bold" data-testid="link-download-source">
                  <Download className="h-5 w-5" /> {t.order.download}
                </a>
                <p className="mt-2 text-xs text-[#3d4a3d]" dir="ltr" data-testid="text-file-info">{order.file.name} · {fileSize(order.file.size, numLocale)}</p>
              </>
            ) : (
              <p className="mt-3 text-[#2c3a2c]" data-testid="text-file-preparing">{t.order.preparing}</p>
            )}
            {order.deliveryNote && (
              <div className="mt-6 text-start border-[3px] border-[#1b2a1c] bg-[#fffdf6] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--pin-text))]">{t.order.note}</p>
                <p className="mt-1 whitespace-pre-line text-sm" dir="auto" data-testid="text-delivery-note">{order.deliveryNote}</p>
              </div>
            )}
          </section>
        )}

        {order.status === "cancelled" && (
          <section className="tile p-6 md:p-10 text-center" data-testid="status-order-cancelled">
            <BrokeCat />
            <h2 className="font-display text-2xl md:text-3xl leading-tight mt-4">{t.order.cancelledTitle}</h2>
            <p className="mt-2 text-[#2c3a2c]">{t.order.cancelledBody}</p>
            <a href={`${localePath(lang, import.meta.env.BASE_URL)}#bang-gia`} className="pbtn red mt-6 px-5 py-2.5 font-bold" data-testid="link-pricing">
              {t.nav.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </a>
          </section>
        )}

        <div className="flex justify-center">{chatButton}</div>
      </div>
    </PageShell>
  );
}
