'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Check,
  Edit3,
  Hash,
  Info,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Tags,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface StatusCategory {
  id: string;
  name: string;
  description: string;
  phrases: string[];
  editablePhrases: string[];
  customPhrases?: string[];
}

interface StatusSuggestion {
  id: number;
  phrase: string;
  occurrences: number;
  created_at?: string;
}

export function normalizePhraseKey(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[`'’‘ʻʽʼ′_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategories(categories: StatusCategory[]): StatusCategory[] {
  return categories.map((category) => {
    const unique = new Map<string, string>();
    for (const phrase of category.phrases || []) {
      const key = normalizePhraseKey(phrase);
      if (key && !unique.has(key)) unique.set(key, phrase.trim());
    }
    const phrases = [...unique.values()];
    const customPhrases = (category.customPhrases || [])
      .map((phrase) => String(phrase).trim())
      .filter((phrase) => phrase && unique.has(normalizePhraseKey(phrase)));
    return { ...category, phrases, editablePhrases: phrases, customPhrases };
  });
}

export default function StatusesPage() {
  const { role } = useAuth();
  const [categories, setCategories] = useState<StatusCategory[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingPhrase, setEditingPhrase] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [suggestions, setSuggestions] = useState<StatusSuggestion[]>([]);
  const [assigningSuggestion, setAssigningSuggestion] = useState<number | null>(null);
  const suggestionsRequestRef = useRef<Promise<void> | null>(null);

  const selected = categories.find((category) => category.id === selectedId);
  const customPhraseCount = useMemo(
    () => categories.reduce((total, category) => total + (category.customPhrases?.length || 0), 0),
    [categories],
  );
  const totalPhraseCount = useMemo(
    () => categories.reduce((total, category) => total + category.phrases.length, 0),
    [categories],
  );

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/proxy/admin/statuses', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить статусы');
      const nextCategories = normalizeCategories(data.categories || []);
      setCategories(nextCategories);
      setSelectedId((current) => current || nextCategories[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка загрузки статусов');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (forceRefresh = false) => {
    if (suggestionsRequestRef.current) return suggestionsRequestRef.current;
    const request = (async () => {
    try {
      const response = await fetch(
        `/api/proxy/admin/statuses/suggestions${forceRefresh ? '?fresh=true' : ''}`,
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить новые статусы');
      setSuggestions(data.suggestions || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка загрузки новых статусов');
    }
    })();
    suggestionsRequestRef.current = request;
    try {
      await request;
    } finally {
      if (suggestionsRequestRef.current === request) suggestionsRequestRef.current = null;
    }
  };

  useEffect(() => {
    if (role && !['admin', 'super_admin'].includes(role)) return;
    void loadCategories();
    void loadSuggestions(true);

    let pollTimeout: number | null = null;
    let cancelled = false;
    const refreshSuggestions = (event: Event) => {
      const jobId = (event as CustomEvent<{ classificationJobId?: string | null }>).detail?.classificationJobId;
      if (!jobId) {
        // The sync just replaced the backend snapshot. Bypass the cooldown so
        // the list reflects column D from that synchronization immediately.
        void loadSuggestions(true);
        return;
      }

      let attempts = 0;
      const pollJob = async () => {
        if (cancelled || attempts >= 20) return;
        attempts += 1;
        try {
          const response = await fetch(
            `/api/proxy/admin/statuses/classify-unmatched?jobId=${encodeURIComponent(jobId)}`,
            { cache: 'no-store' },
          );
          const data = await response.json().catch(() => ({}));
          if (response.ok && (data.state === 'completed' || data.state === 'failed')) {
            await loadSuggestions(true);
            return;
          }
        } catch (cause) {
          if (!cancelled) console.warn('[Statuses] classification status check failed:', cause);
        }
        if (!cancelled) pollTimeout = window.setTimeout(() => void pollJob(), 2000);
      };
      void pollJob();
    };
    window.addEventListener('hurmo:sync', refreshSuggestions);

    return () => {
      window.removeEventListener('hurmo:sync', refreshSuggestions);
      cancelled = true;
      if (pollTimeout !== null) window.clearTimeout(pollTimeout);
    };
  }, [role]);

  const assignSuggestion = async (suggestion: StatusSuggestion, categoryId: string) => {
    setAssigningSuggestion(suggestion.id);
    setError(null);
    try {
      const response = await fetch(`/api/proxy/admin/statuses/suggestions?id=${suggestion.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось назначить статус');
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      await loadCategories();
      setNotice(`Фраза «${suggestion.phrase}» добавлена в выбранную категорию.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка назначения статуса');
    } finally {
      setAssigningSuggestion(null);
    }
  };

  const savePhrase = async (phrase: string, action: 'add' | 'remove') => {
    if (!selected || !phrase.trim() || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/proxy/admin/statuses', {
        method: action === 'add' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selected.id, phrase }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить фразу');
      setCategories((current) => current.map((category) => (
        category.id === selected.id ? data.category : category
      )));
      if (action === 'add') setNewPhrase('');
      if (action === 'remove' && data.suggestion) {
        setSuggestions((current) => {
          const existing = current.find((item) => item.id === data.suggestion.id);
          if (existing) {
            return current.map((item) => item.id === data.suggestion.id ? data.suggestion : item);
          }
          return [data.suggestion, ...current];
        });
      }
      setNotice(action === 'add' ? 'Фраза добавлена и будет учитываться в классификации.' : 'Пользовательская фраза удалена.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const renamePhrase = async (oldPhrase: string) => {
    if (!selected || !editingValue.trim() || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/proxy/admin/statuses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selected.id, oldPhrase, newPhrase: editingValue }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось изменить фразу');
      setCategories((current) => current.map((category) => (
        category.id === selected.id ? data.category : category
      )));
      setEditingPhrase(null);
      setEditingValue('');
      setNotice('Фраза изменена и сохранена.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка изменения фразы');
    } finally {
      setSaving(false);
    }
  };

  if (role && !['admin', 'super_admin'].includes(role)) return null;

  return (
    <div className="app-content pb-12 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent mb-2">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Конфигурация классификатора</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Статусы звонков</h1>
          <p className="text-sm text-secondary mt-2 max-w-2xl">
            Управляйте вариантами фраз, по которым система распознаёт результат звонка.
            Системные правила защищены, а ваши фразы можно добавлять и удалять без изменения кода.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Новые нераспознанные статусы</p>
              <p className="text-xs text-secondary mt-1">
                Если в таблице появилась новая формулировка, выберите категорию — она сохранится на backend.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary break-words">«{suggestion.phrase}»</p>
                  <p className="text-xs text-secondary mt-1">Встречается: {suggestion.occurrences}</p>
                </div>
                <select
                  defaultValue=""
                  disabled={assigningSuggestion === suggestion.id}
                  onChange={(event) => {
                    if (event.target.value) void assignSuggestion(suggestion, event.target.value);
                  }}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-primary"
                >
                  <option value="" disabled>Выберите категорию</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Категорий', value: categories.length, icon: Tags, color: 'text-accent' },
          { label: 'Всего вариантов', value: totalPhraseCount, icon: Hash, color: 'text-violet-400' },
          { label: 'Добавлено вами', value: customPhraseCount, icon: Plus, color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-primary mt-2">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
        <aside className="rounded-2xl border border-border/80 bg-surface p-3 h-fit">
          <div className="px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-secondary font-semibold">Категории</p>
          </div>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => { setSelectedId(category.id); setNotice(null); }}
                className={`w-full text-left rounded-xl px-3 py-3 transition-all ${
                  selectedId === category.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/15'
                    : 'text-primary hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{category.name}</span>
                  <span className={`text-[10px] rounded-full px-2 py-0.5 ${
                    selectedId === category.id ? 'bg-white/20 text-white' : 'bg-surface-2 text-secondary'
                  }`}>{category.phrases.length}</span>
                </div>
                <p className={`text-[11px] mt-1 line-clamp-2 ${
                  selectedId === category.id ? 'text-white/75' : 'text-secondary'
                }`}>{category.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-border/80 bg-surface overflow-hidden">
          {selected ? (
            <>
              <div className="p-5 sm:p-6 border-b border-border/70 bg-gradient-to-br from-accent/10 via-transparent to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-accent font-semibold">Редактирование категории</p>
                    <h2 className="text-xl font-bold text-primary mt-1">{selected.name}</h2>
                    <p className="text-sm text-secondary mt-1">{selected.description}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-secondary">
                    <Hash className="w-3.5 h-3.5" /> {selected.phrases.length} вариантов
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <input
                    value={newPhrase}
                    onChange={(event) => setNewPhrase(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void savePhrase(newPhrase, 'add');
                      }
                    }}
                    maxLength={120}
                    placeholder="Введите новый вариант фразы..."
                    className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => void savePhrase(newPhrase, 'add')}
                    disabled={saving || !newPhrase.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Добавить фразу
                  </button>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">Варианты распознавания</h3>
                    <p className="text-xs text-secondary mt-1">Наведите порядок в словаре категории.</p>
                  </div>
                  <span className="text-xs text-secondary">{selected.phrases.length} доступно для изменения</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.phrases.map((phrase) => {
                    const editable = selected.phrases.includes(phrase);
                    return editingPhrase === phrase ? (
                      <div key={phrase} className="flex w-full sm:w-auto items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-2">
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void renamePhrase(phrase);
                            }
                            if (event.key === 'Escape') {
                              setEditingPhrase(null);
                              setEditingValue('');
                            }
                          }}
                          maxLength={120}
                          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-primary outline-none focus:border-accent"
                        />
                        <button type="button" onClick={() => void renamePhrase(phrase)} disabled={saving || !editingValue.trim()} className="text-emerald-400 disabled:opacity-50" title="Сохранить">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div key={phrase} className={`group inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                        editable ? 'border-accent/30 bg-accent/10 text-primary' : 'border-border bg-surface-2 text-secondary'
                      }`}>
                        {editable && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        <span>{phrase}</span>
                        {editable ? (
                          <>
                            <button type="button" onClick={() => { setEditingPhrase(phrase); setEditingValue(phrase); setNotice(null); }} disabled={saving} className="text-secondary hover:text-accent disabled:opacity-50" title="Изменить фразу">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => void savePhrase(phrase, 'remove')} disabled={saving} className="text-secondary hover:text-rose-500 disabled:opacity-50" title="Удалить фразу">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mx-5 mb-5 sm:mx-6 sm:mb-6 flex items-start gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-4">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <p className="text-xs leading-5 text-secondary">
                  Все варианты можно изменять и удалять. Для системных фраз сервер сохраняет переопределение,
                  поэтому изменения не пропадут после обновления и сразу участвуют в классификации.
                </p>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-secondary">Загрузка категорий статусов...</div>
          )}
        </section>
      </div>
    </div>
  );
}
