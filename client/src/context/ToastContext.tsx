import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Helper for dispatching toasts from outside React component trees
export const triggerToast = (type: ToastType, title: string, message?: string, duration = 4500) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { type, title, message, duration },
      })
    );
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
    [addToast]
  );

  // Listen to window custom event for external triggering
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.title) {
        addToast({
          type: detail.type || 'info',
          title: detail.title,
          message: detail.message,
          duration: detail.duration || 4500,
        });
      }
    };

    window.addEventListener('app:toast', handleCustomToast);
    return () => window.removeEventListener('app:toast', handleCustomToast);
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-500/50',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              glow: 'bg-emerald-500',
            },
            error: {
              border: 'border-rose-500/50',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
              icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              glow: 'bg-rose-500',
            },
            warning: {
              border: 'border-amber-500/50',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              glow: 'bg-amber-500',
            },
            info: {
              border: 'border-cyan-500/50',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
              icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
              glow: 'bg-cyan-500',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 animate-slide-in ${typeConfig.border} ${typeConfig.bg} ${typeConfig.shadow}`}
            >
              <div className="pt-0.5">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-sm font-semibold text-white tracking-wide leading-tight">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Subtle accent indicator */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${typeConfig.glow} opacity-70`}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
