import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n';
import { PixelTransitionProvider } from '@/components/pixel-transition';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import ThankYou from '@/pages/thank-you';
import { ChatWidget } from '@/components/chat-widget';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

// Visitors never download the admin screens.
const Admin = lazy(() => import('@/pages/admin'));

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
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
  return location.startsWith('/admin') ? null : <ChatWidget />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <TooltipProvider>
        <PixelTransitionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
