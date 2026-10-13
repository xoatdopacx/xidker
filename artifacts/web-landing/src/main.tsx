import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { prepareI18n } from '@/lib/i18n';

import './index.css';

// The visitor's language file loads before the first render, so the page never flashes another language.
prepareI18n().finally(() => {
  createRoot(document.getElementById('root')!, {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
});
