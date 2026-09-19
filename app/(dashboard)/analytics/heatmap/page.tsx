'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrendingUp, Clock, Activity, AlertCircle } from 'lucide-react';

type Point = { day: string; hour: number; calls?: number; registrations?: number; errors?: number };
type MetricKey = 'calls' | 'registrations' | 'all';

const METRIC_LABELS: Record<MetricKey, string> = {
  calls: 'Звонки',
  registrations: 'Регистрации',
  all: 'Все вместе',
};

const COLOR_STOPS = [
  { stop: 0, color: '#111827', label: '0' },
  { stop: 0.2, color: '#172554', label: '' },
  { stop: 0.4, color: '#1D4ED8', label: '' },
  { stop: 0.6, color: '#2563EB', label: '' },
  { stop: 0.8, color: '#60A5FA', label: '' },
  { stop: 1, color: '#BFDBFE', label: 'max' },
];

function interpolateColor(ratio: number): string {
  if (ratio <= 0) return COLOR_STOPS[0].color;
  if (ratio >= 1) return COLOR_STOPS[COLOR_STOPS.length - 1].color;
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const s1 = COLOR_STOPS[i];
    const s2 = COLOR_STOPS[i + 1];
    if (ratio >= s1.stop && ratio <= s2.stop) {
      const t = (ratio - s1.stop) / (s2.stop - s1.stop);
      const c1 = hexToRgb(s1.color);
      const c2 = hexToRgb(s2.color);
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return COLOR_STOPS[0].color;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 241, g: 245, b: 249 };
}

function isLightColor(color: string): boolean {
  const rgb = color.startsWith('rgb')
    ? color.match(/\d+/g)!.map(Number)
    : Object.values(hexToRgb(color));
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

export default function HeatmapPage() {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricKey>('all');
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number } | null>(null);

  useEffect(() => {
    fetch('/api/proxy/data/heatmap', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPoints(d.points || []))
      .finally(() => setLoading(false));
  }, []);

  const days = useMemo(() => [...new Set(points.map((p) => p.day))].slice(-14), [points]);

  const getValue = (day: string, hour: number): number => {
    const p = points.find((item) => item.day === day && item.hour === hour);
    if (!p) return 0;
    switch (metric) {
      case 'calls':
        return p.calls || 0;
      case 'registrations':
        return p.registrations || 0;
      default:
        return (p.calls || 0) + (p.registrations || 0) + (p.errors || 0);
    }
  };

  const values = useMemo(
    () => days.flatMap((d) => Array.from({ length: 24 }, (_, h) => getValue(d, h))),
    [days, metric, points]
  );
  const max = Math.max(1, ...values);

  const rowTotals = useMemo(
    () => Array.from({ length: 24 }, (_, h) => days.reduce((sum, d) => sum + getValue(d, h), 0)),
    [days, metric, points]
  );

  const colTotals = useMemo(
    () => days.map((d) => Array.from({ length: 24 }, (_, h) => getValue(d, h)).reduce((a, b) => a + b, 0)),
    [days, metric, points]
  );

  const grandTotal = useMemo(() => colTotals.reduce((a, b) => a + b, 0), [colTotals]);

  const columns = {
    gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))`,
  };

  const formatDayLabel = (day: string) => {
    const date = new Date(`${day}T00:00:00`);
    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
    const dayMonth = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    return { weekday, dayMonth };
  };

  const renderSkeleton = () => {
    const skeletonDays = 14;
    const skeletonCols = { gridTemplateColumns: `repeat(${skeletonDays}, minmax(0, 1fr))` };
    return (
      <div className="min-w-[760px] space-y-3">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <div className="mb-2 ml-14 grid gap-1" style={skeletonCols}>
          {Array.from({ length: skeletonDays }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="mb-1 flex items-center gap-2">
            <Skeleton className="h-5 w-12" />
            <div className="grid flex-1 gap-1" style={skeletonCols}>
              {Array.from({ length: skeletonDays }).map((_, i) => (
                <Skeleton key={i} className="h-7" />
              ))}
            </div>
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-12" />
          <div className="grid flex-1 gap-1" style={skeletonCols}>
            {Array.from({ length: skeletonDays }).map((_, i) => (
              <Skeleton key={i} className="h-7" />
            ))}
          </div>
          <Skeleton className="h-7 w-14" />
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Аналитика</p>
          <h1 className="text-2xl font-black text-primary">Тепловая карта нагрузки</h1>
          <p className="text-sm text-secondary">Количество обращений по дням и часам.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs overflow-x-auto">
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Аналитика</p>
        <h1 className="text-2xl font-black text-primary">Тепловая карта нагрузки</h1>
        <p className="text-sm text-secondary">Количество обращений по дням и часам.</p>
      </div>

      {/* KPI Cards */}
      {days.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-secondary">Всего за период</span>
            </div>
            <p className="text-2xl font-black text-primary tabular-nums">{grandTotal.toLocaleString('ru-RU')}</p>
            <p className="text-[10px] text-secondary mt-1">{days.length} дней</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-secondary">Среднее в день</span>
            </div>
            <p className="text-2xl font-black text-primary tabular-nums">
              {Math.round(grandTotal / days.length).toLocaleString('ru-RU')}
            </p>
            <p className="text-[10px] text-secondary mt-1">за 24 часа</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-secondary">Пиковый час</span>
            </div>
            <p className="text-2xl font-black text-primary tabular-nums">
              {Math.max(...rowTotals).toLocaleString('ru-RU')}
            </p>
            <p className="text-[10px] text-secondary mt-1">
              {rowTotals.indexOf(Math.max(...rowTotals))}:00
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold text-secondary">Пиковый день</span>
            </div>
            <p className="text-lg font-black text-primary tabular-nums">
              {Math.max(...colTotals).toLocaleString('ru-RU')}
            </p>
            <p className="text-[10px] text-secondary mt-1">
              {days[colTotals.indexOf(Math.max(...colTotals))]}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs overflow-x-auto">
        {days.length === 0 ? (
          <p className="p-10 text-center text-secondary">Недостаточно данных для визуализации.</p>
        ) : (
          <div className="min-w-[900px] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
                <Button
                  key={key}
                  variant={metric === key ? 'primary' : 'secondary'}
                  onClick={() => setMetric(key)}
                >
                  {METRIC_LABELS[key]}
                </Button>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-2 ml-14 mr-16 grid gap-1 text-[10px] text-secondary font-medium" style={columns}>
                {days.map((day) => {
                  const { weekday, dayMonth } = formatDayLabel(day);
                  return (
                    <div key={day} className="flex flex-col items-center gap-0.5 p-1">
                      <span className="font-semibold text-primary">{weekday}</span>
                      <span className="opacity-75 text-secondary">{dayMonth}</span>
                    </div>
                  );
                })}
              </div>

              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="mb-1 flex items-center gap-2">
                  <span className="w-12 shrink-0 text-right text-[11px] font-bold text-primary tabular-nums bg-surface-2 rounded px-1.5 py-1">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                  <div className="grid flex-1 gap-1" style={columns}>
                    {days.map((day) => {
                      const n = getValue(day, hour);
                      const ratio = n / max;
                      const bgColor = n > 0 ? interpolateColor(ratio) : '#0F172A';
                      const isLight = isLightColor(bgColor);
                      const isHovered =
                        hoveredCell?.day === day && hoveredCell?.hour === hour;
                      const showTextAlways = n > 0 && isLight;
                      const showTextHover = n > 0 && (isHovered || !isLight);
                      return (
                        <div
                          key={day}
                          title={`${day} ${hour}:00 — ${n} ${metric === 'calls' ? 'звонков' : metric === 'registrations' ? 'регистраций' : 'обращений'}`}
                          className="group relative flex h-8 cursor-pointer items-center justify-center rounded-md border border-border/30 shadow-sm transition-all hover:scale-105 hover:shadow-md hover:border-accent/50"
                          style={{ backgroundColor: bgColor }}
                          onMouseEnter={() => setHoveredCell({ day, hour })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {showTextAlways && (
                            <span className="text-[10px] font-bold text-slate-800 tabular-nums">
                              {n}
                            </span>
                          )}
                          {showTextHover && !showTextAlways && (
                            <span
                              className={`text-[10px] font-bold tabular-nums ${
                                isHovered ? 'text-white' : 'text-indigo-100'
                              }`}
                            >
                              {isHovered ? n : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex h-8 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-[11px] font-bold text-primary tabular-nums shadow-sm">
                    {rowTotals[hour]}
                  </div>
                </div>
              ))}

              <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="w-12 shrink-0 text-right text-[11px] font-black text-accent tabular-nums bg-surface-2 rounded px-1.5 py-1">
                  ∑
                </span>
                <div className="grid flex-1 gap-1" style={columns}>
                  {days.map((day, idx) => (
                    <div
                      key={day}
                      className="flex h-8 items-center justify-center rounded-md border border-border bg-surface-2 text-[11px] font-bold text-primary tabular-nums shadow-sm"
                    >
                      {colTotals[idx]}
                    </div>
                  ))}
                </div>
                <div className="flex h-8 w-14 shrink-0 items-center justify-center rounded-md border-2 border-accent bg-accent text-white text-[11px] font-black tabular-nums shadow-md">
                  {grandTotal}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">
                Шкала интенсивности ({METRIC_LABELS[metric].toLowerCase()})
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-8 flex-1 overflow-hidden rounded-lg border border-border">
                  {COLOR_STOPS.slice(0, -1).map((stop, i) => {
                    const next = COLOR_STOPS[i + 1];
                    return (
                      <div
                        key={i}
                        className="flex-1"
                        style={{
                          background: `linear-gradient(to right, ${stop.color}, ${next.color})`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between px-1 text-[10px] font-medium text-secondary tabular-nums">
                <span>0</span>
                <span>{Math.round(max * 0.25)}</span>
                <span>{Math.round(max * 0.5)}</span>
                <span>{Math.round(max * 0.75)}</span>
                <span>{max}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
