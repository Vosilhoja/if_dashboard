'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2, User } from 'lucide-react';
import { login } from '@/lib/api-client';

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/overview';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при входе');
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-page flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}
    >
      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={
          shakeKey > 0
            ? {
                opacity: 1,
                scale: 1,
                x: [0, -8, 8, -6, 6, -3, 3, 0],
              }
            : { opacity: 1, scale: 1, x: 0 }
        }
        transition={
          shakeKey > 0
            ? { duration: 0.3, ease: 'easeInOut' }
            : { duration: 0.2, ease: 'easeOut' }
        }
        className="w-full max-w-md bg-surface border border-border rounded-[8px] p-4 sm:p-6 space-y-4 shadow-sm relative z-10"
      >
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-[6px] bg-accent/15 border border-accent/30 text-accent mx-auto">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-primary tracking-tight">
              HURMO UZ Analytics
            </h1>
            <p className="text-[11px] text-secondary mt-0.5">
              Внутренний аналитический инструмент. Введите учетные данные для доступа.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label
              htmlFor="username-input"
              className="block text-[11px] font-medium text-secondary"
            >
              Логин сотрудника
            </label>
            <div className="relative">
              <input
                id="username-input"
                type="text"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin, manager_dilshod..."
                className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-[6px] text-xs text-primary placeholder-secondary focus:outline-none transition-colors"
              />
              <User className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password-input"
              className="block text-[11px] font-medium text-secondary"
            >
              Пароль
            </label>
            <div className="relative">
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль доступа..."
                className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-[6px] text-xs text-primary placeholder-secondary focus:outline-none transition-colors"
              />
              <Lock className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-2 px-3 rounded-[6px] bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Проверка учетных данных...</span>
              </>
            ) : (
              <>
                <span>Войти в дашборд</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Security badge */}
        <div className="pt-2 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-secondary">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Защищено единым backend JWT и ролевым доступом RBAC</span>
        </div>
      </motion.div>
    </div>
  );
}

// Page wrapper — Suspense required for useSearchParams() in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

