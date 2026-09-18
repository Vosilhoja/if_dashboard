'use client';
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type Point = { day: string; hour: number; calls?: number; registrations?: number; errors?: number };
export default function HeatmapPage() {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/proxy/data/heatmap', { cache: 'no-store' }).then(r => r.json()).then(d => setPoints(d.points || [])).finally(() => setLoading(false)); }, []);
  const days = useMemo(() => [...new Set(points.map(p => p.day))].slice(-14), [points]);
  const value = (day: string, hour: number) => { const p = points.find(item => item.day === day && item.hour === hour); return p ? (p.calls || 0) + (p.registrations || 0) + (p.errors || 0) : 0; };
  const max = Math.max(1, ...points.map(p => (p.calls || 0) + (p.registrations || 0) + (p.errors || 0)));
  const columns = { gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` };
  return <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Аналитика</p><h1 className="text-2xl font-black text-primary">Тепловая карта нагрузки</h1><p className="text-sm text-secondary">Количество обращений по дням и часам.</p></div><div className="rounded-2xl border border-border bg-surface p-4 shadow-xs overflow-x-auto">{loading ? <div className="p-10 text-center text-secondary"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Загрузка...</div> : days.length === 0 ? <p className="p-10 text-center text-secondary">Недостаточно данных для визуализации.</p> : <div className="min-w-[760px]"><div className="mb-2 ml-14 grid gap-1 text-[10px] text-secondary" style={columns}>{days.map(day => <span key={day} className="text-center">{new Date(`${day}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>)}</div>{Array.from({ length: 24 }, (_, hour) => <div key={hour} className="mb-1 flex items-center gap-2"><span className="w-12 text-right text-[10px] text-secondary">{String(hour).padStart(2, '0')}:00</span><div className="grid flex-1 gap-1" style={columns}>{days.map(day => { const n = value(day, hour); const opacity = n ? 0.2 + (n / max) * 0.8 : 0.05; return <div key={day} title={`${day} ${hour}:00 — ${n} обращений`} className="h-5 rounded-sm bg-accent" style={{ opacity }} />; })}</div></div>)}</div>}</div></div>;
}
