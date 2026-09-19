'use client';

import { useEffect, useState } from 'react';
import { Bot, Copy, Link2, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type BotInfo = { id: number | string; name?: string; token: string; userId?: string; chatId?: string; allowedIds: string[]; source?: string; status?: string; enabledFeatures?: string[]; isActive?: boolean };
type Capability = { key: string; label: string; description: string };

export default function TelegramPage() {
  useAuth();
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [features, setFeatures] = useState<Capability[]>([]);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', token: '', chatId: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/settings/telegram').then((r) => r.json()),
      fetch('/api/proxy/settings/telegram/capabilities').then((r) => r.json()),
    ]).then(([botData, capabilityData]) => {
      setBots(botData.bots || []);
      setFeatures(capabilityData.features || []);
    }).finally(() => setLoading(false));
  }, []);

  const getCode = async () => {
    const response = await fetch('/api/proxy/auth/telegram-link-code', { method: 'POST' });
    const data = await response.json();
    if (response.ok) setCode(data.code);
    else setMessage(data.error || 'Не удалось получить код');
  };

  const testBot = async (id: number) => {
    setMessage('');
    const response = await fetch(`/api/proxy/settings/telegram/${id}/test`, { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok ? data.message || 'Test отправлен' : data.error || 'Ошибка отправки');
  };

  const addBot = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    const response = await fetch('/api/proxy/settings/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    if (response.ok) {
      setBots((current) => [...current, data.bot]);
      setForm({ name: '', token: '', chatId: '' });
      setMessage('Бот добавлен и запускается.');
    } else setMessage(data.error || 'Не удалось добавить бота');
    setAdding(false);
  };

  const toggleFeature = async (bot: BotInfo, key: string) => {
    if (bot.source !== 'database') return;
    const enabled = new Set(bot.enabledFeatures || features.map((item) => item.key));
    if (enabled.has(key)) enabled.delete(key);
    else enabled.add(key);
    const response = await fetch(`/api/proxy/settings/telegram/${bot.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabledFeatures: [...enabled] }) });
    if (response.ok) setBots((current) => current.map((item) => item.id === bot.id ? { ...item, enabledFeatures: [...enabled] } : item));
  };

  const removeBot = async (id: number | string) => {
    if (!window.confirm('Удалить этого Telegram-бота?')) return;
    const response = await fetch(`/api/proxy/settings/telegram/${id}`, { method: 'DELETE' });
    if (response.ok) setBots((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Интеграции</p>
        <h1 className="text-2xl font-black text-primary">Telegram боты</h1>
        <p className="text-sm text-secondary">Управление ботами, доступными функциями и привязкой аккаунта.</p>
      </div>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Привязка аккаунта</h2>
        </div>
        <p className="mt-2 text-xs text-secondary">Получите код и отправьте боту команду <code>/link КОД</code>. Код действует 5 минут.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={getCode} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">Получить код</button>
          {code && <code className="rounded bg-surface-2 px-3 py-2 text-sm font-bold tracking-widest text-accent">{code}</code>}
          {code && <button onClick={() => navigator.clipboard.writeText(code)} className="rounded-lg border border-border px-2 py-2 text-secondary" title="Скопировать код"><Copy className="h-4 w-4" /></button>}
        </div>
      </section>
      {message && <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-primary">{message}</div>}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-primary">Добавить бота</h2></div>
        <form onSubmit={addBot} className="grid gap-2 md:grid-cols-4">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название" className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-primary outline-none" />
          <input required type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="Токен из @BotFather" className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-primary outline-none md:col-span-2" />
          <input required value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} placeholder="Ваш Telegram ID" className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-primary outline-none" />
          <button disabled={adding} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white md:col-span-4">{adding ? 'Проверка...' : 'Добавить и запустить'}</button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2"><Bot className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-primary">Подключённые боты</h2></div>
        {loading ? <p className="text-xs text-secondary">Загрузка...</p> : bots.length === 0 ? <p className="text-xs text-secondary">Боты не настроены.</p> : (
          <div className="space-y-3">
            {bots.map((bot) => <div key={bot.id} className="space-y-3 rounded-lg border border-border/60 bg-surface-2/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{bot.name || `Бот #${bot.id}`} <span className="ml-2 text-[10px] text-secondary">{bot.source === 'env' ? 'ENV' : bot.status || 'database'}</span></p><p className="text-[11px] text-secondary">Получатель: {bot.chatId || bot.userId || 'не указан'} · Разрешённых пользователей: {bot.allowedIds?.length || 0}</p></div><div className="flex gap-2"><button onClick={() => testBot(Number(bot.id))} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Send className="h-3.5 w-3.5" /> Test</button>{bot.source === 'database' && <button onClick={() => removeBot(bot.id)} className="rounded-lg border border-red-500/30 px-2 py-2 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}</div></div>
              {bot.source === 'database' && <div className="grid gap-2 sm:grid-cols-2">{features.map((feature) => <label key={feature.key} className="flex items-center gap-2 text-[11px] text-secondary"><input type="checkbox" checked={(bot.enabledFeatures || features.map((item) => item.key)).includes(feature.key)} onChange={() => toggleFeature(bot, feature.key)} />{feature.label}</label>)}</div>}
            </div>)}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-primary">Доступные функции</h2></div>
        <div className="grid gap-2 md:grid-cols-2">{features.map((feature) => <div key={feature.key} className="rounded-lg border border-border/60 p-3"><p className="text-xs font-semibold text-primary">{feature.label}</p><p className="mt-1 text-[11px] text-secondary">{feature.description}</p><code className="mt-2 block text-[10px] text-accent">{feature.key}</code></div>)}</div>
      </section>
    </div>
  );
}
