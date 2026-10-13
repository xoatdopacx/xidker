import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo, Wordmark, ArtObject } from "@/lib/motion";
import { useI18n, LangSwitch } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  useEffect(() => {
    const id = requestAnimationFrame(() => { document.title = t.nf.metaTitle; });
    return () => { cancelAnimationFrame(id); document.title = t.meta.title; };
  }, [t]);
  return (
    <main className="min-h-[100dvh] grid-paper flex flex-col">
      <header className="mx-auto w-full max-w-5xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home"><Logo className="h-7 w-7" /><Wordmark className="text-xl" /></Link>
        <LangSwitch />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 text-center persp">
        <div className="relative flex items-end justify-center gap-2 md:gap-4">
          <span className="font-display font-extrabold text-[30vw] md:text-[14rem] leading-[.8] text-primary">4</span>
          <ArtObject size={200} spin className="-mb-2" />
          <span className="font-display font-extrabold text-[30vw] md:text-[14rem] leading-[.8] text-[hsl(var(--flare))]">4</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-8">{t.nf.title}</h1>
        <p className="mt-4 text-muted-foreground text-lg max-w-md">{t.nf.body}</p>
        <Link href="/" className="btn-3d mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground border-2 border-[hsl(var(--ink))] px-6 py-3 font-semibold" data-testid="link-back-home">
          <ArrowLeft className="h-4 w-4" /> {t.nf.back}
        </Link>
      </div>
    </main>
  );
}
