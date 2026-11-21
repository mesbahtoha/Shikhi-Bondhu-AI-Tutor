import { lazy, type ComponentType } from 'react';

const RETRY_KEY_PREFIX = 'route-chunk:';

/**
 * React.lazy with retries for flaky mobile connections. A single failed chunk
 * download used to leave the Suspense fallback spinning forever; now the chunk
 * is retried and, as a last resort, the page reloads once to fetch fresh HTML
 * and asset hashes.
 */
export function lazyRoute<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string
) {
  return lazy(async (): Promise<{ default: T }> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const module = await factory();
        try {
          sessionStorage.removeItem(`${RETRY_KEY_PREFIX}${key}`);
        } catch {
          // sessionStorage can be unavailable in private mode
        }
        return module;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    }

    try {
      if (!sessionStorage.getItem(`${RETRY_KEY_PREFIX}${key}`)) {
        sessionStorage.setItem(`${RETRY_KEY_PREFIX}${key}`, '1');
        window.location.reload();
        // Keep the Suspense fallback visible while the browser reloads. Throwing
        // here would flash the error boundary for a fraction of a second.
        return new Promise<{ default: T }>(() => {});
      }
    } catch {
      // sessionStorage can be unavailable in private mode; fall through.
    }

    throw lastError;
  });
}
