'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertTriangle, BrainCircuit } from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';

interface AIInsightsWidgetProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ metrics, loading }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !metrics) {
    return null;
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`);
      }

      if (data.analysis) {
        setAnalysis(data.analysis);
        setGeneratedAt(data.generatedAt || new Date().toISOString());
      } else {
        throw new Error('Пустой ответ от аналитического сервиса');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать аналитический отчёт');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormattedAnalysis = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (key: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} className="space-y-1.5 my-2 pl-4 text-xs text-primary list-disc">
            {currentList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) {
        flushList(idx);
        return;
      }

      if (line.startsWith('## ')) {
        flushList(idx);
        const headingText = line.replace(/^##\s+/, '');
        elements.push(
          <h4
            key={`h4-${idx}`}
            className="text-xs font-semibold text-primary mt-4 mb-1.5 flex items-center gap-1.5 first:mt-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block shrink-0" />
            <span>{headingText}</span>
          </h4>
        );
      } else if (line.startsWith('- ') || line.startsWith('• ')) {
        const itemText = line.replace(/^[-•]\s+/, '');
        currentList.push(itemText);
      } else {
        flushList(idx);
        elements.push(
          <p key={`p-${idx}`} className="text-xs text-secondary leading-relaxed my-1.5">
            {line}
          </p>
        );
      }
    });

    flushList(lines.length);
    return elements;
  };

  return (
    <div className="rounded-[8px] border border-border bg-surface p-3.5 transition-all space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-[4px] bg-accent/15 text-accent shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <span>ИИ-аналитик операционной воронки</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border font-medium">
                Gemini 2.0 Flash
              </span>
            </h3>
            <p className="text-[10px] text-secondary">
              Глубокий анализ причинно-следственных связей, конверсий и рисков на основе текущих цифр
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {generatedAt && !isGenerating && (
            <span className="text-[10px] text-secondary tabular-nums hidden md:inline">
              Обновлено: {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Анализирую...</span>
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Пересчитать</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Проанализировать</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Initial empty hint before analysis is generated */}
      {!analysis && !isGenerating && !error && (
        <div className="py-5 px-3 rounded-[6px] bg-surface-2/40 border border-dashed border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-4 h-4 text-secondary/70 shrink-0" />
            <span>
              Нажмите <strong>«Проанализировать»</strong>, чтобы ИИ-аналитик рассчитал сквозные конверсии, оценил аномалии и подготовил практические рекомендации.
            </span>
          </div>
          <span className="text-[11px] text-secondary/70 shrink-0 hidden sm:inline">
            Контекст: {metrics.period?.startDate} — {metrics.period?.endDate}
          </span>
        </div>
      )}

      {/* Loading placeholder skeleton */}
      {isGenerating && !analysis && (
        <div className="space-y-2.5 py-3 animate-pulse">
          <div className="h-3 bg-surface-2 rounded w-1/4"></div>
          <div className="h-2.5 bg-surface-2 rounded w-5/6"></div>
          <div className="h-2.5 bg-surface-2 rounded w-4/6"></div>
          <div className="h-3 bg-surface-2 rounded w-1/3 mt-3"></div>
          <div className="h-2.5 bg-surface-2 rounded w-full"></div>
          <div className="h-2.5 bg-surface-2 rounded w-3/4"></div>
        </div>
      )}

      {/* Analysis Output */}
      {analysis && (
        <div className="p-3.5 rounded-[6px] bg-surface-2/50 border border-border/70 space-y-1">
          {renderFormattedAnalysis(analysis)}
        </div>
      )}
    </div>
  );
};
