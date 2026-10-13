import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useI18n, LangSwitch } from "@/lib/i18n";
import { Logo, Wordmark } from "@/components/sprites";
import { MiniRoad } from "@/components/mini-road";

export default function NotFound() {
  const { t } = useI18n();
  useEffect(() => {
    const id = requestAnimationFrame(() => { document.title = t.nf.metaTitle; });
    return () => { cancelAnimationFrame(id); document.title = t.meta.title; };
  }, [t]);
  return (
    <main className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      <header className="bg-[hsl(var(--paper))] border-b-4 border-[#1b2a1c]">
        <div className="mx-auto w-full max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home"><Logo /><Wordmark /></Link>
          <LangSwitch />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="tile w-full max-w-xl p-6 md:p-10 text-center">
          <p className="font-num text-7xl md:text-8xl leading-none text-[hsl(var(--pin))]" style={{ textShadow: "5px 5px 0 #1b2a1c" }}>404</p>
          <MiniRoad mode="lost" />
          <h1 className="font-display text-3xl md:text-4xl mt-2">{t.nf.title}</h1>
          <p className="mt-3 text-[#2c3a2c]">{t.nf.body}</p>
          <Link href="/" className="pbtn red mt-7 px-5 py-2.5 font-bold" data-testid="link-back-home">
            <ArrowLeft className="h-4 w-4" /> {t.nf.back}
          </Link>
        </div>
      </div>
      <div className="bricks h-8 border-t-4 border-[#4a170d]" />
    </main>
  );
}
