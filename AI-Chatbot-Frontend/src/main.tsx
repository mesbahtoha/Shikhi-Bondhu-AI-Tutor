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
// Route-specific styles (practice, docs, tutor) are imported by their lazy
// pages so they are not part of the initial CSS payload.

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

/**
 * This app ships no service worker. A service worker registered by an older
 * deployment would keep serving stale HTML/JS from CacheStorage, which on a
 * flaky mobile connection looks exactly like a permanent hang. Remove any
 * legacy registration in the background so it can never block a reload.
 */
async function cleanupLegacyServiceWorkers() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return;
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Non-fatal: the app works without a service worker.
  }
}

if (document.readyState === 'complete') {
  void cleanupLegacyServiceWorkers();
} else {
  window.addEventListener('load', () => void cleanupLegacyServiceWorkers(), { once: true });
}

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
