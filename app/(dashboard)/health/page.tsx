'use client';
import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

type Service = { name: string; status: string; latencyMs?: number };
const labels: Record<string, string> = { process: 'Backend', redis: 'Redis', postgresql: 'PostgreSQL', googleSheets: 'Google API', telegram: 'Telegram' };
export default function HealthPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const r = await fetch('/api/proxy/system/health', { cache: 'no-store' }); const d = await r.json().catch(() => ({})); setServices(d.services || []); setLoading(false); };
  useEffect(() => { void load(); }, []);
  return <div className="space-y-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Мониторинг</p><h1 className="text-2xl font-black text-primary">Состояние системы</h1><p className="text-sm text-secondary">Доступность ключевых интеграций в реальном времени.</p></div><button onClick={() => void load()} className="rounded-xl border border-border bg-surface p-2.5 text-secondary hover:text-accent"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{loading ? <div className="col-span-full rounded-2xl border border-border bg-surface p-10 text-center text-secondary">Проверяем сервисы...</div> : services.map(service => { const healthy = service.status === 'ok' || service.status === 'configured'; return <div key={service.name} className="rounded-2xl border border-border bg-surface p-5 shadow-xs"><div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-primary"><Activity className="h-4 w-4 text-accent" />{labels[service.name] || service.name}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${healthy ? 'bg-emerald-500/15 text-emerald-500' : service.status === 'disabled' ? 'bg-surface-2 text-secondary' : 'bg-rose-500/15 text-rose-500'}`}>{healthy ? 'В норме' : service.status === 'disabled' ? 'Отключено' : 'Ошибка'}</span></div><p className="mt-4 text-2xl font-black text-primary">{service.latencyMs ?? 0}<span className="ml-1 text-xs font-medium text-secondary">мс</span></p></div> })}</div></div>;
}
