'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';

type EventItem = { id: string; title: string; description: string; start: string | null; end: string | null; location: string; allDay?: boolean; url?: string };
type View = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EventItem | null>(null);

  const load = async () => {
    const start = view === 'month' ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }) : startOfWeek(cursor, { weekStartsOn: 1 });
    const end = view === 'month' ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) : endOfWeek(cursor, { weekStartsOn: 1 });
    const response = await fetch(`/api/proxy/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`);
    const data = await response.json();
    setConnected(data.connected !== false);
    if (!response.ok) { setEvents([]); setError(data.error || 'Не удалось загрузить календарь'); return; }
    setError(''); setEvents(data.events || []);
  };
  useEffect(() => { load().catch((e) => setError(e.message)); }, [cursor, view]);

  const days = useMemo(() => {
    const first = view === 'day' ? cursor : view === 'week' ? startOfWeek(cursor, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const count = view === 'day' ? 1 : view === 'week' ? 7 : 42;
    return Array.from({ length: count }, (_, i) => addDays(first, i));
  }, [cursor, view]);
  const eventsOn = (day: Date) => events.filter((event) => event.start && isSameDay(new Date(event.start), day));

  async function connect() {
    const response = await fetch('/api/proxy/calendar/auth-url');
    const data = await response.json();
    if (data.url) window.location.href = data.url; else setError(data.error || 'OAuth недоступен');
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { title: form.get('title'), description: form.get('description'), location: form.get('location'), start: form.get('start'), end: form.get('end') };
    const response = await fetch(editing?.id ? `/api/proxy/calendar/events/${editing.id}` : '/api/proxy/calendar/events', { method: editing?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { setError((await response.json()).error || 'Не удалось сохранить событие'); return; }
    setEditing(null); await load();
  }
  async function remove(id: string) {
    if (!window.confirm('Удалить событие?')) return;
    await fetch(`/api/proxy/calendar/events/${id}`, { method: 'DELETE' }); await load();
  }
  const navigate = (delta: number) => setCursor(view === 'month' ? addMonths(cursor, delta) : addDays(cursor, delta * (view === 'week' ? 7 : 1)));

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Интеграции</p><h1 className="text-2xl font-black text-primary">Google Календарь</h1><p className="text-sm text-secondary">{format(cursor, view === 'day' ? 'd MMMM yyyy' : 'LLLL yyyy', { locale: ru })}</p></div><div className="flex gap-2"><button className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => navigate(-1)}>←</button><button className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setCursor(new Date())}>Сегодня</button><button className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => navigate(1)}>→</button></div></header>
    {!connected ? <section className="rounded-2xl border border-border bg-surface p-8 text-center"><h2 className="text-lg font-semibold text-primary">Календарь не подключён</h2><p className="my-2 text-sm text-secondary">Подключите Google Calendar, чтобы просматривать и изменять события.</p><button onClick={connect} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Подключить Google Calendar</button></section> : <>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2"><div className="flex rounded-lg border border-border p-1">{(['month', 'week', 'day'] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded px-3 py-1 text-sm ${view === item ? 'bg-accent text-white' : 'text-secondary'}`}>{item === 'month' ? 'Месяц' : item === 'week' ? 'Неделя' : 'День'}</button>)}</div><button onClick={() => setEditing({ id: '', title: '', description: '', location: '', start: format(cursor, "yyyy-MM-dd'T'09:00"), end: format(cursor, "yyyy-MM-dd'T'10:00") })} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">+ Событие</button></div>
      <div className={`grid gap-px overflow-hidden rounded-2xl border border-border bg-border ${view === 'day' ? 'grid-cols-1' : view === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>{days.map((day) => <div key={day.toISOString()} className={`min-h-28 bg-surface p-2 ${view === 'month' && day.getMonth() !== cursor.getMonth() ? 'opacity-50' : ''}`}><div className="mb-2 text-xs font-semibold text-secondary">{format(day, view === 'month' ? 'EEE d' : 'EEEE d MMM', { locale: ru })}</div>{eventsOn(day).map((item) => <div key={item.id} className="mb-1 rounded bg-accent/10 p-2 text-xs"><button className="font-semibold text-primary hover:underline" onClick={() => setEditing(item)}>{item.title}</button><button className="float-right text-red-500" onClick={() => remove(item.id)}>×</button><div className="text-secondary">{item.start && format(new Date(item.start), 'HH:mm')}</div></div>)}</div>)}</div>
    </>}
    {editing && <div className="rounded-2xl border border-border bg-surface p-5"><form onSubmit={save} className="grid gap-3 md:grid-cols-2"><input name="title" required defaultValue={editing.title} placeholder="Название" className="rounded border border-border bg-transparent p-2" /><input name="location" defaultValue={editing.location} placeholder="Место" className="rounded border border-border bg-transparent p-2" /><textarea name="description" defaultValue={editing.description} placeholder="Описание" className="rounded border border-border bg-transparent p-2 md:col-span-2" /><input name="start" type="datetime-local" required defaultValue={editing.start?.slice(0, 16)} className="rounded border border-border bg-transparent p-2" /><input name="end" type="datetime-local" required defaultValue={editing.end?.slice(0, 16)} className="rounded border border-border bg-transparent p-2" /><div className="flex gap-2 md:col-span-2"><button className="rounded bg-accent px-4 py-2 text-white">Сохранить</button><button type="button" onClick={() => setEditing(null)} className="rounded border border-border px-4 py-2">Отмена</button></div></form></div>}
  </div>;
}
