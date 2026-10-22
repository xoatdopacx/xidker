import { createRoot, hydrateRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { prepareI18n, rememberAddressLanguage } from '@/lib/i18n';
import { readInitialPage } from '@/lib/initial-page';

import './index.css';

const initial = readInitialPage();
// SSR already contains the correct dictionary. Utility pages still load their preferred language.
if (initial) rememberAddressLanguage();
(initial ? Promise.resolve() : prepareI18n()).finally(() => {
  const root = document.getElementById('root')!;
  const options = {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error: unknown, errorInfo: { componentStack?: string | null }) => {
      console.error(error, errorInfo.componentStack);
    },
  };
  const app = (
    <ErrorBoundary>
      <App initial={initial} />
    </ErrorBoundary>
  );
  if (initial) hydrateRoot(root, app, options);
  else createRoot(root, options).render(app);
});
