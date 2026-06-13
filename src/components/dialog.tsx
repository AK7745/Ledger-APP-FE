'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Presentational modal shell — overlay + centered card. Reuse for bespoke modals. */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-sm',
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`w-full ${maxWidth} rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-200`}>
        {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
        <div className={title ? 'mt-3' : ''}>{children}</div>
      </div>
    </div>
  );
}

// ---- imperative confirm() / prompt() replacements ------------------------

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
type PromptOpts = {
  title?: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  type?: 'text' | 'number';
  multiline?: boolean;
  required?: boolean;
};

interface DialogApi {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  );
  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        setValue(opts.defaultValue ?? '');
        setState({ kind: 'prompt', opts, resolve });
      }),
    [],
  );

  useEffect(() => {
    if (state?.kind === 'prompt') setTimeout(() => inputRef.current?.focus(), 0);
  }, [state]);

  function cancel() {
    if (!state) return;
    state.kind === 'confirm' ? state.resolve(false) : state.resolve(null);
    setState(null);
  }
  function accept() {
    if (!state) return;
    if (state.kind === 'confirm') {
      state.resolve(true);
    } else {
      if (state.opts.required && !value.trim()) return;
      state.resolve(value);
    }
    setState(null);
  }

  const danger = state?.kind === 'confirm' && state.opts.danger;
  const okText =
    state?.kind === 'confirm'
      ? state.opts.confirmText ?? 'OK'
      : state?.opts.confirmText ?? 'OK';

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <Modal open={!!state} onClose={cancel} title={state?.opts.title}>
        {state?.kind === 'confirm' && (
          <p className="text-sm text-gray-600">{state.opts.message}</p>
        )}
        {state?.kind === 'prompt' && (
          <div>
            {state.opts.message && <p className="text-sm text-gray-600">{state.opts.message}</p>}
            {state.opts.label && (
              <label className="mt-2 block text-sm font-medium text-gray-700">{state.opts.label}</label>
            )}
            {state.opts.multiline ? (
              <textarea
                ref={(el) => { inputRef.current = el; }}
                rows={3}
                value={value}
                placeholder={state.opts.placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) accept(); }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            ) : (
              <input
                ref={(el) => { inputRef.current = el; }}
                type={state.opts.type ?? 'text'}
                value={value}
                placeholder={state.opts.placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') accept(); }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={cancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {state?.kind === 'confirm' ? state.opts.cancelText ?? 'Cancel' : 'Cancel'}
          </button>
          <button
            onClick={accept}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {okText}
          </button>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}
