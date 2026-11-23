import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

/**
 * True once a request has been pending longer than `delayMs`. Pages use this
 * to offer a manual retry on slow cellular connections without failing the
 * request early on Wi-Fi.
 */
export function useSlowLoading(loading: boolean, delayMs = 8000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, delayMs]);

  return slow;
}

/** Small inline banner shown while a request is still in flight on a slow link. */
export function SlowLoadingNotice({
  show,
  onRetry,
  message = 'Still loading. Your mobile connection may be slow.',
}: {
  show: boolean;
  onRetry?: () => void;
  message?: string;
}) {
  if (!show) return null;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 10,
        margin: '14px auto',
        padding: '10px 14px',
        maxWidth: 520,
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        background: 'var(--surface-warn)',
        color: 'var(--text-secondary)',
        fontSize: 13.5,
      }}
    >
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry now
        </Button>
      )}
    </div>
  );
}

/**
 * Consistent recoverable error state. Failed initial fetches must never leave
 * the page on an infinite skeleton, so every call site renders this with a
 * retry action plus an optional reload escape hatch.
 */
export function RequestErrorState({
  icon = '📡',
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  showReload = true,
  secondaryAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showReload?: boolean;
  secondaryAction?: ReactNode;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {onRetry && <Button onClick={onRetry}>{retryLabel}</Button>}
          {showReload && (
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          )}
          {secondaryAction}
        </div>
      }
    />
  );
}
