import { getDocsContent, getDocsMeta, getDocsStats } from './docs';

/**
 * Warms the lazy /docs route without making it part of the initial bundle.
 * Vite resolves this to the same dynamic import used by App.tsx, so calling it
 * on link hover/idle makes the later navigation feel instant.
 */
let docsModulePromise: Promise<unknown> | null = null;

export function prefetchDocsPage(): Promise<unknown> {
  if (!docsModulePromise) {
    docsModulePromise = import('@/pages/DocsPage').catch(() => {
      // A failed prefetch must never affect the current page; the route loader
      // still has its own retry and reload fallback.
      docsModulePromise = null;
    });
  }
  return docsModulePromise;
}

/**
 * Warms the page module and the public metadata/content/stats responses.
 * The API helpers share short-lived caches with DocsPage, so navigating after
 * a hover or idle prefetch renders from memory instead of showing a long
 * skeleton.
 */
export function prefetchDocsData(): void {
  void prefetchDocsPage();
  void getDocsMeta()
    .then((meta) => {
      if (!meta.accessible) return;
      void Promise.allSettled([getDocsContent(), getDocsStats()]);
    })
    .catch(() => {
      // Prefetch is best-effort; the real page keeps its retry states.
    });
}
