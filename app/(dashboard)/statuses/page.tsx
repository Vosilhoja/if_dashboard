'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Sparkles,
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

  const selected = categories.find((category) => category.id === selectedId);
  const customPhraseCount = useMemo(
    () => categories.reduce((total, category) => total + category.editablePhrases.length, 0),
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
      const nextCategories = data.categories || [];
      setCategories(nextCategories);
      setSelectedId((current) => current || nextCategories[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка загрузки статусов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role && !['admin', 'super_admin'].includes(role)) return;
    void loadCategories();
  }, [role]);

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
    <div className="max-w-[1180px] mx-auto pb-12 space-y-6">
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
        <button
          type="button"
          onClick={() => void loadCategories()}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-primary hover:border-accent/60 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
          Обновить список
        </button>
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
                  <span className="text-xs text-secondary">{selected.editablePhrases.length} пользовательских</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.phrases.map((phrase) => {
                    const editable = selected.editablePhrases.includes(phrase);
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
                        ) : (
                          <span title="Системный вариант" className="text-[10px] text-secondary/60">система</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mx-5 mb-5 sm:mx-6 sm:mb-6 flex items-start gap-3 rounded-xl border border-border/70 bg-surface-2/60 p-4">
                <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <p className="text-xs leading-5 text-secondary">
                  Системные варианты нельзя удалить — они являются частью базовой логики классификатора.
                  Пользовательские фразы отмечены цветной точкой и сохраняются на сервере.
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
