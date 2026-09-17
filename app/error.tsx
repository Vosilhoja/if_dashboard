'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[UI error]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-page text-primary flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-surface p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Ошибка 500</p>
        <h1 className="mb-3 text-2xl font-bold">Не удалось открыть страницу</h1>
        <p className="mb-6 text-sm text-secondary">
          Произошла внутренняя ошибка интерфейса. Попробуйте повторить действие или вернитесь на главную.
        </p>
        <p className="mb-6 break-words rounded-lg bg-surface-2 p-3 text-left text-xs text-secondary">
          {error.message || 'Неизвестная ошибка'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить
          </button>
          <Link
            href="/overview"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-primary hover:bg-surface-2"
          >
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}
