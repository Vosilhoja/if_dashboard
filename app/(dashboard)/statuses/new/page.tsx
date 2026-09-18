'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Category {
  id: string;
  name: string;
}

interface Suggestion {
  id: number;
  phrase: string;
  occurrences: number;
}

export default function NewStatusesPage() {
  const { role } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResponse, suggestionResponse] = await Promise.all([
        fetch('/api/proxy/admin/statuses', { cache: 'no-store' }),
        fetch('/api/proxy/admin/statuses/suggestions?fresh=true', { cache: 'no-store' }),
      ]);
      const statusData = await statusResponse.json().catch(() => ({}));
      const suggestionData = await suggestionResponse.json().catch(() => ({}));
      if (!statusResponse.ok) throw new Error(statusData.error || 'Не удалось загрузить категории');
      if (!suggestionResponse.ok) throw new Error(suggestionData.error || 'Не удалось загрузить новые статусы');
      setCategories(statusData.categories || []);
      setSuggestions(suggestionData.suggestions || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка загрузки новых статусов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!role || ['admin', 'super_admin'].includes(role)) void load();
  }, [role]);

  const assign = async (suggestion: Suggestion, category: string) => {
    const response = await fetch(`/api/proxy/admin/statuses/suggestions?id=${suggestion.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Не удалось назначить статус');
      return;
    }
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
  };

  if (role && !['admin', 'super_admin'].includes(role)) return null;

  return (
    <div className="app-content pb-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/statuses" className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Все статусы
          </Link>
          <div className="mt-3 flex items-center gap-2 text-accent">
            <SlidersHorizontal className="h-5 w-5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Новые статусы</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-primary">Нераспознанные категории</h1>
          <p className="mt-2 text-sm text-secondary">Здесь появляются новые варианты из последней синхронизации.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-primary hover:bg-surface-2">
          <RefreshCw className="h-3.5 w-3.5" /> Обновить
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div>}
      <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Новые формулировки</p>
            <p className="mt-1 text-xs text-secondary">Всего: {loading ? '—' : suggestions.length}</p>
          </div>
        </div>
        <div className="space-y-2">
          {!loading && suggestions.length === 0 && <p className="rounded-xl bg-surface px-3 py-4 text-sm text-secondary">Новых статусов нет.</p>}
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="break-words text-sm font-medium text-primary">«{suggestion.phrase}»</p>
                <p className="mt-1 text-xs text-secondary">Встречается: {suggestion.occurrences}</p>
              </div>
              <select defaultValue="" onChange={(event) => { if (event.target.value) void assign(suggestion, event.target.value); }} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-primary">
                <option value="" disabled>Выберите категорию</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
