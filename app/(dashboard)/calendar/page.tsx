'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';

type EventItem = { id: string; title: string; description: string; start: string | null; end: string | null; location: string; url: string };

export default function CalendarPage() {
  useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/proxy/calendar/events')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Не удалось загрузить календарь');
        setEvents(data.events || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Ошибка календаря'));
  }, []);
  return (
    <div className="space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Интеграции</p><h1 className="text-2xl font-black text-primary">Google Календарь</h1><p className="text-sm text-secondary">События из подключённого календаря.</p></div>
      {error && <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-600">{error}. Настройте GOOGLE_CALENDAR_ACCESS_TOKEN и GOOGLE_CALENDAR_ID на backend.</div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => <article key={event.id} className="rounded-2xl border border-border bg-surface p-4 shadow-xs"><div className="flex items-start justify-between gap-2"><h2 className="text-sm font-semibold text-primary">{event.title}</h2>{event.url && <a href={event.url} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-4 w-4" /></a>}</div><p className="mt-2 flex items-center gap-1 text-xs text-accent"><CalendarDays className="h-3.5 w-3.5" />{event.start ? format(parseISO(event.start), 'd MMMM, HH:mm', { locale: ru }) : 'Без даты'}</p>{event.location && <p className="mt-1 flex items-center gap-1 text-xs text-secondary"><MapPin className="h-3.5 w-3.5" />{event.location}</p>}<p className="mt-2 text-xs text-secondary">{event.description}</p></article>)}
      </div>
      {!error && events.length === 0 && <p className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-secondary">Событий нет.</p>}
    </div>
  );
}
