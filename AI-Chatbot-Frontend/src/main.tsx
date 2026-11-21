import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { initTheme } from '@/lib/theme';
import { LanguageProvider } from '@/lib/i18n';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { API_BASE_URL } from '@/lib/api';
import './index.css';
import './styles/polish.css';
import './styles/practice.css';
import './styles/docs.css';
import './styles/tutor.css';

function addResourceHint(rel: 'preconnect' | 'dns-prefetch', href: string, crossOrigin = false) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// Warm up the API connection early, which saves a DNS/TLS round-trip on slow
// mobile networks where every handshake is expensive.
try {
  const apiOrigin = new URL(API_BASE_URL).origin;
  addResourceHint('preconnect', apiOrigin, true);
  addResourceHint('dns-prefetch', apiOrigin);
} catch {
  // ignore malformed API URLs
}

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </LanguageProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
