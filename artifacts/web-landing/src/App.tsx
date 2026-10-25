import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider, useI18n, type Dict } from '@/lib/i18n';
import { LANGUAGES } from '@/lib/languages';
import { lazyWithReload } from '@/lib/lazy-reload';
import { PixelTransitionProvider } from '@/components/pixel-transition';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import { ChatWidget } from '@/components/chat-widget';
import { Blocks, PageShell } from '@/components/page-shell';
import { getListPackagesQueryKey } from '@workspace/api-client-react';
import type { InitialPage } from '@/lib/initial-page';
import { REDIRECTS, ROUTES, orderCodeOf } from '@/lib/routes';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Visitors on the home page never download the account and admin screens. The address already names the screen,
// so a reload after a failed download lands on it again.
const Admin = lazyWithReload(() => import('@/pages/admin'));
const AuthPage = lazyWithReload(() => import('@/pages/auth'));
const AccountPage = lazyWithReload(() => import('@/pages/account'));
const OrderPage = lazyWithReload(() => import('@/pages/order'));
const homeRoute = new RegExp(`^/(?:${LANGUAGES.map((l) => l.code).join('|')})?/?$`);

function PageLoading() {
  const { t } = useI18n();
  return (
    <PageShell>
      <div className="tile w-full max-w-md p-6 md:p-8"><Blocks label={t.scene.loading} /></div>
    </PageShell>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path={homeRoute} component={Home} />
        <Route path={ROUTES.signIn}><Lazy><AuthPage key="signin" mode="signin" /></Lazy></Route>
        <Route path={ROUTES.register}><Lazy><AuthPage key="register" mode="register" /></Lazy></Route>
        <Route path={ROUTES.reset}><Lazy><AuthPage key="reset" mode="reset" /></Lazy></Route>
        <Route path={ROUTES.account}><Lazy><AccountPage /></Lazy></Route>
        {/* No <Route<T>> type argument here: the dev source-mapping plugin cannot parse it. */}
        <Route path={`${ROUTES.order}/:code`}>{(params: { code: string }) => <Lazy><OrderPage key={params.code} code={params.code} /></Lazy>}</Route>
        <Route path={ROUTES.admin}>
          <Suspense fallback={null}>
            <Admin />
          </Suspense>
        </Route>
        {Object.entries(REDIRECTS).map(([from, to]) => (
          <Route key={from} path={from}><Redirect to={to} replace /></Route>
        ))}
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

/** Support chat on public pages; the dashboard has its own inbox and the sign-in pages already ask for an account. */
const NO_CHAT = new Set<string>([ROUTES.admin, ROUTES.signIn, ROUTES.register, ROUTES.reset, ...Object.keys(REDIRECTS)]);

function VisitorChat() {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return !mounted || NO_CHAT.has(location) ? null : <ChatWidget />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** Title and description of the pages outside the home page. */
export function pageMeta(path: string, t: Dict): { title: string; description: string } | null {
  if (path === ROUTES.signIn) return { title: t.auth.metaSignIn, description: t.auth.signInSub };
  if (path === ROUTES.register) return { title: t.auth.metaRegister, description: t.auth.registerSub };
  if (path === ROUTES.reset) return { title: t.auth.metaReset, description: t.auth.resetSub };
  if (path === ROUTES.account || path === '/cam-on') return { title: t.account.metaTitle, description: t.auth.signInSub };
  if (orderCodeOf(path)) return { title: t.order.metaTitle, description: t.auth.signInSub };
  if (path === ROUTES.admin || path === '/admin') return { title: 'Quản trị — xidker', description: 'Quản trị' };
  return null;
}

/** Also protect utility pages reached by client-side navigation. HTTP headers remain authoritative. */
function PageIndexing() {
  const [location] = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    const home = homeRoute.test(location);
    const page = home ? null : pageMeta(location, t);
    const title = home ? t.meta.title : page ? page.title : t.nf.metaTitle;
    const description = home ? t.meta.description : page ? page.description : t.nf.body;
    document.title = title;
    document.querySelector('meta[name="robots"]')?.setAttribute('content', home ? 'index, follow' : 'noindex, follow');
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
