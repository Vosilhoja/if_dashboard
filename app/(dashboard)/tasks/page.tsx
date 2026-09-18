'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Circle, Clock3, Plus, RefreshCw } from 'lucide-react';

type Task = { id: number; title: string; notes?: string; status: string; due_at?: string; dueAt?: string };
const tabs = [['today', 'Сегодня'], ['yesterday', 'Вчера'], ['upcoming', 'Предстоящие'], ['all', 'Все']];

export default function TasksPage() {
  const [tab, setTab] = useState('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', notes: '', dueAt: '' });

  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/proxy/tasks?period=${tab}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    setTasks(data.tasks || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [tab]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    await fetch('/api/proxy/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ title: '', notes: '', dueAt: '' }); setOpen(false); void load();
  };
  const toggle = async (task: Task) => {
    await fetch(`/api/proxy/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: task.status === 'done' ? 'open' : 'done' }) });
    void load();
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold text-accent uppercase tracking-wider">Telegram / CRM</p><h1 className="text-2xl font-black text-primary">Задачи</h1><p className="text-sm text-secondary">Короткие напоминания для команды и Telegram-бота.</p></div>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Новая задача</button>
    </div>
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === key ? 'bg-accent text-white' : 'text-secondary hover:text-primary'}`}>{label}</button>)}</div>
    <div className="rounded-2xl border border-border bg-surface shadow-xs">
      {loading ? <div className="p-10 text-center text-secondary"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Загрузка задач...</div> : tasks.length === 0 ? <div className="p-10 text-center text-secondary">Задач нет — можно выдохнуть.</div> : <div className="divide-y divide-border/60">{tasks.map(task => <div key={task.id} className="flex items-start gap-3 p-4"><button onClick={() => toggle(task)} className={`mt-0.5 rounded-full ${task.status === 'done' ? 'text-emerald-500' : 'text-secondary hover:text-accent'}`} aria-label="Изменить статус">{task.status === 'done' ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</button><div className="min-w-0 flex-1"><p className={`font-semibold text-primary ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>{task.notes && <p className="mt-1 text-sm text-secondary">{task.notes}</p>}{(task.due_at || task.dueAt) && <p className="mt-2 flex items-center gap-1 text-xs text-secondary"><Clock3 className="h-3.5 w-3.5" />{new Date(task.due_at || task.dueAt || '').toLocaleString('ru-RU')}</p>}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${task.status === 'done' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-accent/15 text-accent'}`}>{task.status === 'done' ? 'Готово' : 'Открыта'}</span></div>)}</div>}
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}><form onSubmit={create} onClick={e => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6"><h2 className="text-lg font-bold text-primary">Новая задача</h2><input autoFocus required placeholder="Например: Перезвонить клиенту" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent" /><textarea placeholder="Текст для Telegram или заметка" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-20 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent" /><input type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm text-secondary">Отмена</button><button className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">Создать</button></div></form></div>}
  </div>;
}
