'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Неверный пароль доступа');
      }

      // Redirect to main dashboard
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-[12px] shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-accent/15 border border-accent/30 text-accent mx-auto">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">
              HURMO UZ Analytics
            </h1>
            <p className="text-xs text-secondary mt-1">
              Внутренний аналитический инструмент. Введите пароль команды для доступа.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="password-input"
              className="block text-xs font-medium text-secondary"
            >
              Пароль команды
            </label>
            <div className="relative">
              <input
                id="password-input"
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль..."
                className="w-full px-3.5 py-2.5 bg-surface-2 border border-border focus:border-accent rounded-[8px] text-sm text-primary placeholder-secondary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 px-4 rounded-[8px] bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Проверка...</span>
              </>
            ) : (
              <>
                <span>Войти в дашборд</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="pt-2 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-secondary">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Доступ защищён сквозным сессионным шифрованием (30 дней)</span>
        </div>
      </div>
    </div>
  );
}
