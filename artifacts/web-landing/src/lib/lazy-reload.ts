import { lazy, type ComponentType } from 'react';

const RELOADED_AT = 'xidker:code-reload';
const reloadable = new WeakSet<object>();

/** True for an error raised because a screen's code could not be downloaded; only a page reload fixes it. */
export function needsReload(error: unknown): boolean {
  return typeof error === 'object' && error !== null && reloadable.has(error);
}

/** One automatic reload per minute at most, so a site that is really down cannot make the page reload in a loop. */
function claimReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT));
    if (last && Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    return true;
  } catch {
    // Without storage a loop could not be stopped.
    return false;
  }
}

/**
 * Like React.lazy, for a screen whose code is downloaded on first use. If that download fails (the connection
 * dropped, the dev server restarted, or the site was published again while this page stayed open, so the old file
 * names are gone), React and the browser keep the failure for the rest of the visit and retrying in place never
 * helps. The page therefore reloads once; `beforeReload` can remember what the visitor was doing. A second failure
 * within a minute goes to the error screen, whose button then reloads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
export function lazyWithReload<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
  beforeReload?: () => void,
) {
  return lazy(() =>
    load().catch((error: unknown) => {
      const failure = error instanceof Error ? error : new Error(String(error));
      reloadable.add(failure);
      if (!claimReload()) throw failure;
      beforeReload?.();
      window.location.reload();
      // Keep the loading state until the reload replaces the page.
      return new Promise<never>(() => {});
    }),
  );
}
