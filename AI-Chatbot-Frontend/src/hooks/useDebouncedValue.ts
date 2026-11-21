import { useEffect, useState } from 'react';

/**
 * Delays fast-changing input (search boxes) so typing does not fire a network
 * request or a heavy render on every keystroke. This keeps interactions snappy
 * on low-end phones and slow mobile connections.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
