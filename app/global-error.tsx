'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[Global UI error]', error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#0d1117] text-white">
        <main className="flex min-h-screen items-center justify-center p-6 text-center">
          <section className="max-w-lg">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-rose-400">Ошибка 500</p>
            <h1 className="mb-3 text-3xl font-bold">Сайт временно недоступен</h1>
            <p className="mb-6 text-sm text-slate-300">
              Произошла критическая ошибка приложения. Вернитесь на главную и попробуйте снова.
            </p>
            <Link href="/overview" className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-500">
              На главную
            </Link>
          </section>
        </main>
      </body>
    </html>
  );
}
