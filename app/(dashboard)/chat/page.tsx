'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  Copy,
  CopyCheck,
  RotateCcw,
  Lightbulb,
  Database,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const INITIAL_WELCOME = `Я — ваш **старший дата-аналитик и стратегический консультант платформы HURMO UZ**.

Я глубоко интегрирован в архитектуру нашего дашборда и имею прямой доступ к данным из ключевых таблиц проекта (**main_base**, **numbers**, **eskiz**, **not_completed**).

Вот с какими задачами я помогаю руководителю проекта, маркетологам и старшим операторам:

---

### 1. 🔍 Сквозная диагностика воронки и конверсий
* **Где теряются пользователи:** Я рассчитываю конверсию на каждом шаге (Звонок ➡️ SMS ➡️ Регистрация) и сразу подсвечиваю «узкие места».
* **Оценка эффективности:** Разбираю, сколько регистраций принесли операторы вручную, а сколько — авто-цепочка или повторные обращения.

### 2. 🚨 Мониторинг аномалий и сбоев
* **Фиксация отклонений:** Сравниваю текущие метрики со средними значениями за последние 4 недели (например, как текущий рост отказов на **+56.7%**).
* **Технические сбои:** Мгновенно выявляю проблемы с интеграциями (как задержки отправки SMS через Eskiz) или отток клиентов на полпути.

### 3. 🧹 Валидация базы и чистка «мусорного» трафика
* **Анализ качества контактов:** Оцениваю объём зарубежных номеров (сейчас их **681**), усечённых (**40**) и повреждённых (**3**).
* **Исключение дублей:** Помогаю настроить пре-фильтрацию, чтобы операторы не звонили тем, кто уже есть в \`main_base\` (**33 127** пользователей).

### 4. 📞 Оптимизация работы колл-центра и скриптов
* **Анализ причин отказов:** Анализирую, почему происходят отказы (сейчас **94** случая / 26.2%), и даю рекомендации по изменению первых секунд разговорных скриптов.
* **Работа с незавершёнными:** Формирую рекомендации по дожиму клиентов, бросивших регистрацию (таблица \`not_completed\` — **4 289** пользователей за всё время).

### 5. 💡 Разработка пошаговых антикризисных планов
* Не просто показываю графики, а даю **конкретные прикладные инструкции**: что сделать маркетологу, что проверить IT-отделу и как перенастроить работу старшего оператора.

---

### ❓ Что вы можете спросить у меня прямо сейчас:
* *«Почему результат неправильно показывает и где найти первоисточник?»*
* *«Как переписать скрипт оператора, чтобы снизить отказы?»*
* *«Сколько времени мы потеряли из-за звонков на 681 зарубежный номер?»*
* *«Составь пошаговую инструкцию по дожиму незавершённых регистраций через SMS.»*
* *«Куда перейти на сайте, чтобы посмотреть сырые строки обзвонов?»*

Задавайте любой вопрос — я сразу рассчитаю цифры и дам готовое решение!`;

const CHAT_PROMPTS = [
  'Почему результат неправильно показывает и цифры не сходятся?',
  'В чём главная проблема воронки за текущий период?',
  'Как переписать скрипт оператора, чтобы снизить отказы?',
  'Сколько времени мы потеряли из-за звонков на зарубежные номера?',
  'Составь пошаговую инструкцию по дожиму незавершённых регистраций',
  'Куда перейти на сайте, чтобы посмотреть сырые строки таблицы?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-page',
      role: 'assistant',
      content: INITIAL_WELCOME,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const { startDate, endDate, selectedRegion } = useAnalyticsFilter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load metrics context for the chat
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/metrics?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) {
          const json: DashboardMetrics = await res.json();
          setMetrics(json);
        }
      } catch {
        // ignore
      }
    }
    loadData();
  }, [startDate, endDate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          metrics,
          selectedRegion,
          period: { startDate, endDate },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервиса (${res.status})`);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Ответ не получен',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось получить ответ';
      showToast(msg, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Ошибка: ${msg}. Пожалуйста, попробуйте повторить запрос.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Текст ответа скопирован', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: INITIAL_WELCOME,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Диалог перезапущен', 'info');
  };

  // Helper to render markdown links, bold text, lists, and code blocks
  const renderFormattedMessage = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim();
          if (!line) return <div key={idx} className="h-1.5" />;

          // Horizontal rule
          if (line === '---' || line === '***') {
            return <hr key={idx} className="my-3 border-border/80" />;
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-primary text-sm mt-3 mb-1 flex items-center gap-1.5">
                <span>{renderInline(line.replace(/^###\s+/, ''))}</span>
              </h4>
            );
          }

          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-bold text-primary text-sm mt-3.5 mb-1.5 flex items-center gap-1.5 border-b border-border/60 pb-1">
                <span>{renderInline(line.replace(/^##\s+/, ''))}</span>
              </h3>
            );
          }

          // Bullet lists
          if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
            const clean = line.replace(/^[*•-]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                <span className="flex-1">{renderInline(clean)}</span>
              </div>
            );
          }

          // Numbered lists
          if (/^\d+\.\s+/.test(line)) {
            const num = line.match(/^\d+\./)?.[0];
            const clean = line.replace(/^\d+\.\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="font-semibold text-accent">{num}</span>
                <span className="flex-1">{renderInline(clean)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInline(line)}</p>;
        })}
      </div>
    );
  };

  // Helper for inline elements: [link](url), **bold**, `code`
  const renderInline = (text: string): React.ReactNode => {
    // Regex for markdown links [text](url)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) parts.push(renderBoldAndCode(before, `before-${lastIndex}`));

      const linkText = match[1];
      const linkUrl = match[2];

      const isInternal = linkUrl.startsWith('/');
      if (isInternal) {
        parts.push(
          <Link
            key={`link-${match.index}`}
            href={linkUrl}
            className="inline-flex items-center gap-0.5 font-semibold text-accent hover:underline hover:text-accent/80 transition-colors"
          >
            <span>{linkText}</span>
            <ArrowRight className="w-3 h-3 inline shrink-0 ml-0.5" />
          </Link>
        );
      } else {
        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-accent hover:underline hover:text-accent/80 transition-colors"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0 ml-0.5" />
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    const rest = text.slice(lastIndex);
    if (rest) parts.push(renderBoldAndCode(rest, `rest-${lastIndex}`));

    return parts;
  };

  const renderBoldAndCode = (text: string, keyPrefix: string): React.ReactNode => {
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-primary">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={`${keyPrefix}-c-${i}`}
            className="font-mono text-[11px] px-1 py-0.2 rounded bg-surface border border-border text-accent font-semibold"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Data Context Bar */}
      <div className="p-4 rounded-[10px] bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-tr from-accent via-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-primary">
                ИИ-Аналитик и стратегический консультант
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Онлайн</span>
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Сквозная диагностика воронки, аудит расхождений и прикладные инструкции для команды HURMO UZ
            </p>
          </div>
        </div>

        {/* Data Badges & Action */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="px-2.5 py-1 rounded-[6px] bg-surface-2 border border-border text-xs text-secondary flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span>Период: {startDate} — {endDate}</span>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary text-xs font-medium border border-border transition-colors cursor-pointer"
            title="Перезапустить диалог"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Очистить</span>
          </button>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="rounded-[10px] border border-border bg-surface flex flex-col h-[75vh] min-h-[550px] shadow-sm overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-[8px] bg-gradient-to-tr from-accent/20 to-indigo-500/20 text-accent flex items-center justify-center shrink-0 border border-accent/30 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-[12px] p-4 shadow-2xs group ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none'
                      : 'bg-surface-2/70 text-primary border border-border/80 rounded-tl-none'
                  }`}
                >
                  {renderFormattedMessage(msg.content)}

                  <div
                    className={`flex items-center justify-between gap-3 mt-3 pt-2 border-t text-[10px] ${
                      isUser
                        ? 'border-white/20 text-white/70'
                        : 'border-border/60 text-secondary'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface rounded text-secondary hover:text-primary cursor-pointer"
                        title="Скопировать ответ"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <CopyCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-500">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Скопировать</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-[8px] bg-surface-2 text-primary border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-secondary pl-1">
              <div className="w-8 h-8 rounded-[8px] bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-[10px] bg-surface-2 border border-border flex items-center gap-2.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce delay-150" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce delay-300" />
                <span className="text-xs font-medium ml-1">Анализирую данные и рассчитываю конверсии...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Chips Bar */}
        <div className="px-4 py-2.5 border-t border-border/80 bg-surface-2/40 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-secondary font-medium">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Рекомендуемые вопросы по текущей воронке:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CHAT_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border hover:border-accent/60 hover:bg-surface-2 text-secondary hover:text-primary transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-3"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Спросите о причинах расхождений, отказов или попросите составить конкретную инструкцию..."
                rows={2}
                disabled={isLoading}
                className="w-full p-3 bg-surface-2 border border-border focus:border-accent rounded-[10px] text-xs text-primary placeholder-secondary focus:outline-none resize-none transition-colors leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-[48px] px-5 rounded-[10px] bg-accent text-white hover:opacity-95 disabled:opacity-40 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
              title="Отправить (Enter)"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Думаю...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Спросить</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-secondary/70 mt-2 px-1">
            <span>
              Нажмите <kbd className="px-1.5 py-0.2 bg-surface-2 rounded border border-border font-mono">Enter</kbd> для отправки, <kbd className="px-1.5 py-0.2 bg-surface-2 rounded border border-border font-mono">Shift+Enter</kbd> для переноса строки
            </span>
            <span className="hidden sm:inline">
              Прямой доступ к main_base, numbers, eskiz и not_completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
