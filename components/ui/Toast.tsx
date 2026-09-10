'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  type?: 'success' | 'error' | 'info';
}

export function showToast(title: string, type: 'success' | 'error' | 'info' = 'success') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('hurmo_toast', {
      detail: { id: Math.random().toString(36).slice(2), title, type },
    });
    window.dispatchEvent(event);
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev, detail]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, 3500);
    };

    window.addEventListener('hurmo_toast', handleToast);
    return () => window.removeEventListener('hurmo_toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-2.5 p-3 rounded-[8px] border shadow-lg text-xs font-medium backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150 ${
            toast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200'
              : toast.type === 'info'
              ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-200'
              : 'bg-surface border-border text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-sky-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span>{toast.title}</span>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
