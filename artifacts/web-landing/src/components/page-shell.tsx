import type { ReactNode } from "react";
import { Link } from "wouter";
import { UserRound } from "lucide-react";
import { useI18n, LangSwitch } from "@/lib/i18n";
import { localePath } from "@/lib/locale-url";
import { ROUTES } from "@/lib/routes";
import { Logo, Wordmark } from "@/components/sprites";

/** Header, brick strip and centred column shared by the sign-in, account and order pages. */
export function PageShell({ children, accountLink = false }: { children: ReactNode; accountLink?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <main className="min-h-[100dvh] flex flex-col overflow-x-hidden">
      <header className="bg-[hsl(var(--paper))] border-b-4 border-[#1b2a1c]">
        <div className="mx-auto w-full max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
          <Link href={localePath(lang)} className="flex items-center gap-2" aria-label={t.nav.home} data-testid="link-home"><Logo /><Wordmark /></Link>
          <div className="flex items-center gap-3">
            <LangSwitch />
            {accountLink && (
              <Link href={ROUTES.account} className="flex items-center gap-1.5 text-sm font-bold hover:text-[hsl(var(--pin-text))]" data-testid="link-header-account">
                <UserRound className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                <span className="max-sm:sr-only">{t.nav.account}</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center px-4 py-10 md:py-14">{children}</div>
      <div className="bricks h-8 border-t-4 border-[#4a170d]" />
    </main>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 7" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path d="M1 0h1v4H1zM1 5h1v2H1z" fill="currentColor" />
    </svg>
  );
}

/** A form or action error, read out as soon as it appears. */
export function ErrorLine({ text, testId = "text-error" }: { text: string; testId?: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-[hsl(var(--pin-text))]" data-testid={testId}>
      <AlertIcon className="h-4 w-2 mt-0.5 shrink-0" /> <span>{text}</span>
    </p>
  );
}

/** Small pixel loader for whole-card waits. */
export function Blocks({ label }: { label: string }) {
  return (
    <p className="flex flex-col items-center gap-3 py-10 text-sm font-semibold text-[#3d4a3d]" role="status">
      <span className="cw-loading" aria-hidden="true"><i /><i /><i /></span>
      {label}
    </p>
  );
}
