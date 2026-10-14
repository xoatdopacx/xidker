import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { LANGUAGES } from '@/lib/languages';
import { PixelTransitionProvider } from '@/components/pixel-transition';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import ThankYou from '@/pages/thank-you';
import { ChatWidget } from '@/components/chat-widget';
import { getListPackagesQueryKey } from '@workspace/api-client-react';
import type { InitialPage } from '@/lib/initial-page';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Visitors never download the admin screens.
const Admin = lazy(() => import('@/pages/admin'));
const homeRoute = new RegExp(`^/(?:${LANGUAGES.map((l) => l.code).join('|')})?/?$`);

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path={homeRoute} component={Home} />
        <Route path="/cam-on" component={ThankYou} />
        <Route path="/admin">
          <Suspense fallback={null}>
            <Admin />
          </Suspense>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

/** Live chat for visitors on every public page; the admin inbox has its own reply box. */
function VisitorChat() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return !mounted || location.startsWith('/admin') ? null : <ChatWidget />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** Also protect utility pages reached by client-side navigation. HTTP headers remain authoritative. */
function PageIndexing() {
  const [location] = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    const home = homeRoute.test(location);
    const title = home ? t.meta.title : location === '/cam-on' ? t.thanks.loading : location === '/admin' ? 'Admin — xidker' : t.nf.metaTitle;
    document.title = title;
    document.querySelector('meta[name="robots"]')?.setAttribute('content', home ? 'index, follow' : 'noindex, follow');
    const description = home ? t.meta.description : location === '/cam-on' ? t.thanks.loading : location === '/admin' ? 'Admin' : t.nf.body;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.querySelector(selector)?.setAttribute('content', description);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(selector)?.setAttribute('content', title);
    }
  }, [location, t]);
  return null;
}

function App({ initial, ssrPath, requestClient }: { initial?: InitialPage; ssrPath?: string; requestClient?: QueryClient }) {
  // A request-local cache prevents cross-language or cross-visitor SSR state.
  const [queryClient] = useState(() => {
    const client = requestClient ?? new QueryClient();
    if (initial?.packages) client.setQueryData(getListPackagesQueryKey({ lang: initial.lang }), initial.packages);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initial={initial}>
      <TooltipProvider>
        <PixelTransitionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')} ssrPath={ssrPath}>
            <PageIndexing />
            <Router />
            <VisitorChat />
          </WouterRouter>
        </PixelTransitionProvider>
        <Toaster />
      </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
