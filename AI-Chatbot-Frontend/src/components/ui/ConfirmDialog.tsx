import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Non-blocking replacement for window.confirm. Native dialogs freeze the main
 * thread while they are open (which destroys INP), so every destructive action
 * in the app uses this promise-based modal instead.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    // If another confirmation was open, resolve it as cancelled.
    resolver.current?.(false);
    setRequest(normalized);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={!!request}
        onClose={() => close(false)}
        title={request?.title ?? 'Please confirm'}
        maxWidth={430}
        footer={
          <div className="flex justify-end gap-2" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="pg-btn-secondary" onClick={() => close(false)}>
              {request?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              className="pg-btn-candy"
              style={request?.danger ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : undefined}
              onClick={() => close(true)}
            >
              {request?.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{request?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return context;
}
