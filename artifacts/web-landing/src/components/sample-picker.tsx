import { useEffect, useId, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getListSamplesQueryKey, useListSamples, type Package, type Sample, type SampleImage } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, Check, CloudOff, FolderOpen, ImageOff, Images, Maximize2, Minimize2, RefreshCw, TriangleAlert, X, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tpl, useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/motion";
import { statusOf } from "@/lib/http";
import type { useStartCheckout } from "@/lib/checkout";

type PickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package;
  checkout: ReturnType<typeof useStartCheckout>;
  returnFocusRef: RefObject<HTMLElement | null>;
};

/** URLs are supplied by storage: never rewrite them or add image-service/query parameters. */
function Thumbnail({ image, name, index }: { image: SampleImage; name: string; index: number }) {
  const { t, numLocale } = useI18n();
  const [failed, setFailed] = useState(false);
  const alt = tpl(t.samples.imageAlt, { name, n: new Intl.NumberFormat(numLocale).format(index + 1) });
  if (failed) {
    return (
      <span className="samples-thumbnail-error" role="img" aria-label={`${alt}. ${t.samples.imageError}`}>
        <ImageOff aria-hidden="true" size={24} />
      </span>
    );
  }
  return <img src={image.thumbUrl} alt={alt} width={640} height={800} loading="lazy" decoding="async" className="samples-thumbnail" onError={() => setFailed(true)} />;
}

function BusyBlocks() {
  return <span className="samples-busy-blocks" aria-hidden="true"><i /><i /><i /></span>;
}

/** This component remounts for each image, so loading/error state cannot leak between screenshots. */
function FullScreenshot({ image, alt }: { image: SampleImage; alt: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <>
      {state === "loading" && (
        <div className="samples-image-loading" role="status" data-testid="status-screenshot-loading">
          <span>{t.samples.imageLoading}</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
        </div>
      )}
      <img
        key={attempt}
        src={image.url}
        alt={alt}
        width={image.width}
        height={image.height}
        decoding="async"
        className="samples-full-image"
        data-loading={state === "loading"}
        data-failed={state === "error"}
        data-testid="img-full-screenshot"
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
      />
      {state === "error" && (
        <div className="samples-state" role="alert" data-testid="status-screenshot-error">
          <span className="samples-state-art"><ImageOff aria-hidden="true" /></span>
          <h3>{t.samples.imageError}</h3>
          <p>{t.samples.imageErrorBody}</p>
          <button type="button" className="pbtn samples-retry" data-testid="button-retry-screenshot" onClick={() => { setState("loading"); setAttempt((n) => n + 1); }}>
            <RefreshCw size={18} aria-hidden="true" />{t.samples.retry}
          </button>
        </div>
      )}
    </>
  );
}

function ScreenshotViewer({ sample, selected, onChoose, onClose, returnFocusRef }: {
  sample: Sample;
  selected: boolean;
  onChoose: () => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t, numLocale } = useI18n();
  const [index, setIndex] = useState(0);
  const [actualSize, setActualSize] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const image = sample.images[index];
  const number = new Intl.NumberFormat(numLocale);

  useEffect(() => {
    // Reset both axes when switching screenshots; a tall image must start at its top.
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    activeThumbRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }, [index, actualSize]);

  const showImage = (next: number) => {
    if (next < 0 || next >= sample.images.length) return;
    setIndex(next);
    setActualSize(false);
  };

  return (
    <Dialog.Root open onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="samples-overlay samples-viewer-overlay" />
        <Dialog.Content
          className="tile samples-dialog samples-viewer"
          aria-describedby={descriptionId}
          data-testid="dialog-screenshot-viewer"
          onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true }); }}
        >
          <header className="samples-header">
            <p className="samples-eyebrow"><ZoomIn aria-hidden="true" />{t.samples.previewEyebrow}</p>
            <Dialog.Title ref={titleRef} tabIndex={-1} className="samples-title" data-testid="text-preview-sample-name"><bdi>{sample.name}</bdi></Dialog.Title>
            <Dialog.Description id={descriptionId} className="samples-description">{t.samples.scrollHint}</Dialog.Description>
            <Dialog.Close asChild>
              <button type="button" className="pbtn paper samples-close" aria-label={t.samples.closePreview} data-testid="button-close-screenshot">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          <div className="samples-toolbar">
            <div className="samples-image-nav">
              <button type="button" className="samples-tool" disabled={index === 0} onClick={() => showImage(index - 1)} aria-label={t.samples.previousImage} data-testid="button-previous-screenshot">
                <ArrowLeft className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
              <span aria-live="polite" aria-atomic="true" data-testid="text-screenshot-position">
                {tpl(t.samples.imagePosition, { n: number.format(index + 1), total: number.format(sample.images.length) })}
              </span>
              <button type="button" className="samples-tool" disabled={index === sample.images.length - 1} onClick={() => showImage(index + 1)} aria-label={t.samples.nextImage} data-testid="button-next-screenshot">
                <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
            <button type="button" className="samples-tool" aria-pressed={actualSize} onClick={() => setActualSize((value) => !value)} data-testid="button-toggle-screenshot-size">
              {actualSize ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
              {actualSize ? t.samples.fitWidth : t.samples.actualSize}
            </button>
          </div>

          <div ref={scrollRef} className="samples-image-scroll" tabIndex={0} role="region" aria-label={t.samples.imageRegion} aria-describedby={descriptionId} data-testid="region-full-screenshot">
            <div className="samples-image-canvas" style={{ inlineSize: actualSize ? image.width : "100%", maxInlineSize: actualSize ? "none" : image.width }}>
              <FullScreenshot key={image.url} image={image} alt={tpl(t.samples.imageAlt, { name: sample.name, n: number.format(index + 1) })} />
            </div>
          </div>

          {sample.images.length > 1 && (
            <div className="samples-filmstrip" role="group" aria-label={t.samples.preview}>
              {sample.images.map((shot, n) => (
                <button
                  key={`${sample.id}-${n}`}
                  ref={n === index ? activeThumbRef : undefined}
                  type="button"
                  className="samples-filmstrip-button"
                  aria-pressed={index === n}
                  aria-label={tpl(t.samples.imageAlt, { name: sample.name, n: number.format(n + 1) })}
                  onClick={() => showImage(n)}
                  data-testid={`button-screenshot-${sample.id}-${n + 1}`}
                >
                  <Thumbnail image={shot} name={sample.name} index={n} />
                  <span aria-hidden="true">{number.format(n + 1)}</span>
                </button>
              ))}
            </div>
          )}
          <footer className="samples-footer">
            <p className="samples-choice-summary">{t.samples.previewChoiceHint}</p>
            <button type="button" className="pbtn samples-confirm" onClick={onChoose} data-testid="button-choose-preview">
              <Check aria-hidden="true" />{selected ? t.samples.keepChoice : t.samples.choose}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Lazy-mounted by Pricing after a real buy click. A closed picker creates no portal/HTML. */
export default function SamplePicker({ open, onOpenChange, pkg, checkout, returnFocusRef }: PickerProps) {
  const { t, numLocale } = useI18n();
  const { toast } = useToast();
  const { data, isPending, isFetching, isError, refetch } = useListSamples({
    query: {
      queryKey: getListSamplesQueryKey(),
      enabled: open,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      retry: false,
    },
    request: { credentials: "include" },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // Shown inside the dialog: a toast would sit under the dialog's backdrop.
  const [checkoutFailed, setCheckoutFailed] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const radioName = useId();
  const selected = data?.find((sample) => sample.id === selectedId);
  const viewing = data?.find((sample) => sample.id === viewingId);
  const empty = !isError && !isPending && data?.length === 0;
  const locked = checkout.busy || isFetching;
  const canContinue = !locked && !isError && !isPending && (empty || !!selected);
  const number = new Intl.NumberFormat(numLocale);

  useEffect(() => {
    if (open && unavailable) {
      listRef.current?.scrollTo({ top: 0, behavior: "instant" });
      noticeRef.current?.focus({ preventScroll: true });
    }
  }, [open, unavailable]);

  const choose = (id: string) => {
    if (locked) return;
    setSelectedId(id);
    setUnavailable(false);
    setCheckoutFailed(false);
  };

  const confirm = () => {
    if (!canContinue) return;
    const sampleId = selected?.id;
    setCheckoutFailed(false);
    checkout.start(sampleId ? { packageId: pkg.id, sampleId } : { packageId: pkg.id }, (err) => {
      if (sampleId && statusOf(err) === 404) {
        setSelectedId(null);
        setViewingId(null);
        setUnavailable(true);
        // Do not start a new list request while closed. Reopening always refetches.
        if (openRef.current) void refetch();
        else toast({ variant: "destructive", title: t.samples.unavailableTitle, description: t.samples.unavailableBody });
        return;
      }
      if (openRef.current) setCheckoutFailed(true);
      else toast({ variant: "destructive", title: t.pricing.toastTitle, description: t.pricing.toastBody });
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) setViewingId(null); onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="samples-overlay" />
        <Dialog.Content
          className="tile samples-dialog"
          data-testid="dialog-sample-picker"
          onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true }); }}
        >
          <header className="samples-header">
            <p className="samples-eyebrow"><FolderOpen aria-hidden="true" />{t.samples.eyebrow}</p>
            <Dialog.Title ref={titleRef} tabIndex={-1} className="samples-title">{t.samples.title}</Dialog.Title>
            <Dialog.Description className="samples-description">{t.samples.description}</Dialog.Description>
            <div className="samples-package" data-testid="text-sample-package">
              <span>{tpl(t.samples.packageLabel, { name: pkg.name })}</span>
              <b>{formatPrice(pkg.price, pkg.currency, numLocale)}</b>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="pbtn paper samples-close" aria-label={t.samples.close} data-testid="button-close-sample-picker">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          <div className="samples-body" ref={listRef}>
            {unavailable && (
              <div className="samples-notice" role="alert" tabIndex={-1} ref={noticeRef} data-testid="status-sample-unavailable">
                <TriangleAlert aria-hidden="true" />
                <div><strong>{t.samples.unavailableTitle}</strong><p>{t.samples.unavailableBody}</p></div>
              </div>
            )}
            <div className="samples-list-meta" role="status" aria-live="polite" data-testid="status-sample-list">
              <span>{isPending ? t.samples.loading : data && !isError ? tpl(t.samples.available, { n: number.format(data.length) }) : t.samples.errorTitle}</span>
              {isFetching && !isPending && <span>{t.samples.refreshing}</span>}
            </div>

            {isPending && (
              <div className="samples-grid" aria-busy="true" aria-label={t.samples.loading} data-testid="status-samples-loading">
                {[0, 1].map((n) => <div className="samples-skeleton" key={n} aria-hidden="true"><div className="samples-skeleton-picture" /><div className="samples-skeleton-line" /><div className="samples-skeleton-line" /></div>)}
              </div>
            )}
            {isError && (
              <div className="samples-state" role="alert" data-testid="status-samples-error">
                <span className="samples-state-art"><CloudOff aria-hidden="true" /></span>
                <h3>{t.samples.errorTitle}</h3>
                <p>{t.samples.errorBody}</p>
                <button type="button" className="pbtn samples-retry" disabled={isFetching} onClick={() => void refetch()} data-testid="button-retry-samples">
                  {isFetching ? <BusyBlocks /> : <RefreshCw size={18} aria-hidden="true" />}{isFetching ? t.samples.loading : t.samples.retry}
                </button>
              </div>
            )}
            {empty && (
              <div className="samples-state" data-testid="status-samples-empty">
                <span className="samples-state-art"><FolderOpen aria-hidden="true" /></span>
                <h3>{t.samples.emptyTitle}</h3>
                <p>{t.samples.emptyBody}</p>
              </div>
            )}
            {!isError && !!data?.length && (
              <fieldset className="samples-grid" disabled={locked} aria-busy={isFetching} data-testid="group-sample-choices">
                <legend className="samples-sr-only">{t.samples.selectionLabel}</legend>
                {data.map((sample) => {
                  const checked = sample.id === selected?.id;
                  const inputId = `${radioName}-${sample.id}`;
                  return (
                    <div key={sample.id} className="samples-option" data-selected={checked} data-testid={`card-sample-${sample.id}`}>
                      <button
                        type="button"
                        className="samples-preview"
                        aria-label={tpl(t.samples.previewSample, { name: sample.name })}
                        aria-haspopup="dialog"
                        onClick={(event) => { previewTriggerRef.current = event.currentTarget; setViewingId(sample.id); }}
                        data-testid={`button-preview-sample-${sample.id}`}
                      >
                        <Thumbnail image={sample.images[0]} name={sample.name} index={0} />
                        <span className="samples-image-count" aria-hidden="true"><Images />{tpl(t.samples.imageCount, { n: number.format(sample.images.length) })}</span>
                        <span className="samples-preview-label" aria-hidden="true"><ZoomIn />{t.samples.preview}</span>
                      </button>
                      <div className="samples-option-info">
                        <h3 className="samples-name" id={`${inputId}-name`} data-testid={`text-sample-name-${sample.id}`}><bdi>{sample.name}</bdi></h3>
                        <div className="samples-choice-control">
                          <input
                            type="radio"
                            id={inputId}
                            name={radioName}
                            value={sample.id}
                            className="samples-radio"
                            checked={checked}
                            onChange={() => choose(sample.id)}
                            aria-labelledby={`${inputId}-name ${inputId}-label`}
                            data-testid={`radio-sample-${sample.id}`}
                          />
                          <label htmlFor={inputId} className="samples-choice-label" data-testid={`label-choose-sample-${sample.id}`}>
                            <span className="samples-radio-mark" aria-hidden="true">{checked && <Check size={14} strokeWidth={3} />}</span>
                            <span id={`${inputId}-label`}>{checked ? t.samples.selected : t.samples.choose}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </fieldset>
            )}
          </div>

          <footer className="samples-footer">
            {checkoutFailed && (
              <p className="samples-checkout-error" role="alert" data-testid="status-checkout-error">
                <TriangleAlert aria-hidden="true" />
                <span><strong>{t.pricing.toastTitle}</strong> {t.pricing.toastBody}</span>
              </p>
            )}
            <div className="samples-choice-summary" role="status" aria-live="polite" aria-atomic="true" data-testid="text-selected-sample">
              {selected ? <>{t.samples.choice}<strong><bdi>{selected.name}</bdi></strong></> : empty ? t.samples.emptyChoice : t.samples.chooseHint}
            </div>
            <button type="button" className="pbtn red samples-confirm" disabled={!canContinue} aria-busy={checkout.busy} onClick={confirm} data-testid="button-confirm-sample">
              {checkout.busy ? <><BusyBlocks /><span role="status">{t.samples.opening}</span></> : <>{empty ? t.samples.continueWithout : t.samples.continue}<ArrowRight className="rtl:-scale-x-100" aria-hidden="true" /></>}
            </button>
          </footer>

          {viewing && (
            <ScreenshotViewer
              key={viewing.id}
              sample={viewing}
              selected={viewing.id === selected?.id}
              returnFocusRef={previewTriggerRef}
              onClose={() => setViewingId(null)}
              onChoose={() => { choose(viewing.id); setViewingId(null); }}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
