'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  CopyCheck,
  RotateCcw,
  MessageSquare,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Database,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';
import { showToast } from './ui/Toast';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';

export function openAIChat(initialPrompt?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('open-ai-chat', { detail: { prompt: initialPrompt } })
    );
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'В чём главная проблема воронки за текущий период?',
  'Как снизить 94 отказа операторов?',
  'Почему 21 пользователь не завершил регистрацию?',
  'Дай 3 конкретных совета для операторов поддержки',
  'Оцени качество номеров телефонов и потери',
];

export const AIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cachedMetrics, setCachedMetrics] = useState<DashboardMetrics | null>(null);

  const { selectedRegion, startDate, endDate } = useAnalyticsFilter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch or listen for metrics context
  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch(`/api/proxy/data?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) {
          const json: DashboardMetrics = await res.json();
          setCachedMetrics(json);
        }
      } catch {
        // ignore
      }
    }
    loadMetrics();
  }, [startDate, endDate]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content:
            'Здравствуйте! Я ваш старший ИИ-аналитик HURMO UZ.\n\nЯ подключен ко всем базам данных (main_base, numbers, eskiz, not_completed) и вижу полные цифры за выбранный период.\n\nЗадайте любой вопрос по воронке, конверсиям, аномалиям отказов или попросите составить конкретный план действий для операторов!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [messages.length]);

  // Listen to open-ai-chat event
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setInputValue(customEvent.detail.prompt);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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
      // Map messages for Gemini API
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          metrics: cachedMetrics,
          selectedRegion,
          period: { startDate, endDate },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Ответ не сформирован',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Ошибка при обращении к ИИ';
      showToast(errMsg, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Не удалось получить ответ: ${errMsg}. Попробуйте ещё раз.`,
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
      showToast('Ответ скопирован в буфер', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Диалог перезапущен. Контекст данных сохранён. Какой вопрос вы хотите разобрать?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Render text with basic markdown formatting
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim();
          if (!line) return <div key={idx} className="h-1" />;

          // Check if bullet point
          if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
            const clean = line.replace(/^[-•*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                <span>{renderInlineFormatting(clean)}</span>
              </div>
            );
          }

          // Check if header
          if (line.startsWith('## ') || line.startsWith('### ')) {
            const clean = line.replace(/^#+\s+/, '');
            return (
              <h5 key={idx} className="font-bold text-primary text-xs mt-2.5 mb-1 flex items-center gap-1.5">
                <span className="w-1 h-3 rounded-full bg-accent inline-block" />
                <span>{clean}</span>
              </h5>
            );
          }

          // Numbered list
          if (/^\d+\.\s+/.test(line)) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="font-semibold text-accent">{line.match(/^\d+\./)?.[0]}</span>
                <span>{renderInlineFormatting(line.replace(/^\d+\.\s+/, ''))}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineFormatting(line)}</p>;
        })}
      </div>
    );
  };

  // Helper for bold and metrics highlighting
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-accent via-indigo-600 to-accent hover:opacity-95 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group hover:scale-[1.03] active:scale-[0.98]"
          title="Открыть диалог с ИИ-аналитиком"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-surface animate-ping" />
          </div>
          <span className="text-xs font-semibold tracking-wide">Чат с ИИ-аналитиком</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono font-bold">
            PRO
          </span>
        </button>
      )}

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Chat Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 bg-surface border-l border-border shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isExpanded ? 'w-full md:w-[720px]' : 'w-full md:w-[460px]'}`}
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-border bg-surface-2/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-tr from-accent to-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-primary">ИИ-Консультант HURMO</h3>
                <span className="px-1.5 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Онлайн</span>
                </span>
              </div>
              <p className="text-[10px] text-secondary">
                Полный доступ к данным звонков, SMS, main_base и аномалий
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              className="p-1.5 rounded-[6px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Очистить и перезапустить диалог"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:inline-flex p-1.5 rounded-[6px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title={isExpanded ? 'Сузить панель' : 'Расширить панель'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-[6px] hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Закрыть чат"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Context Indicator Bar */}
        <div className="px-3.5 py-1.5 bg-surface-2/40 border-b border-border/60 text-[11px] text-secondary flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Database className="w-3 h-3 text-accent" />
            <span className="font-medium text-primary">Контекст:</span>
            <span>
              {startDate} — {endDate}
            </span>
            {selectedRegion && (
              <span className="text-accent font-medium">({selectedRegion})</span>
            )}
          </div>
          {cachedMetrics && (
            <div className="text-[10px] tabular-nums text-secondary shrink-0">
              Звонков: {String(cachedMetrics.callsCount?.value || 0)} · Отказов: {String(cachedMetrics.declinedCount?.value || 0)}
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-[10px] px-3.5 py-2.5 shadow-2xs group ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none'
                      : 'bg-surface-2/80 text-primary border border-border/80 rounded-tl-none'
                  }`}
                >
                  {renderMessageContent(msg.content)}

                  <div
                    className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t text-[10px] ${
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-surface rounded text-secondary hover:text-primary cursor-pointer"
                        title="Скопировать ответ"
                      >
                        {copiedId === msg.id ? (
                          <CopyCheck className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-[6px] bg-surface-2 text-primary border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing / Thinking Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-secondary pl-1">
              <div className="w-6 h-6 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-[8px] bg-surface-2 border border-border flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-300" />
                <span className="text-[11px] ml-1">Анализирую данные и формирую рекомендации...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 py-2 border-t border-border/60 bg-surface-2/30 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-secondary font-medium">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span>Быстрые вопросы:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-border hover:border-accent/50 hover:bg-surface-2 text-secondary hover:text-primary transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
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
                placeholder="Задайте вопрос по данным воронки или попросите совет..."
                rows={2}
                disabled={isLoading}
                className="w-full p-2.5 bg-surface-2 border border-border focus:border-accent rounded-[8px] text-xs text-primary placeholder-secondary focus:outline-none resize-none transition-colors leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-[42px] px-3.5 rounded-[8px] bg-accent text-white hover:opacity-90 disabled:opacity-40 font-medium text-xs transition-all flex items-center justify-center cursor-pointer shadow-xs shrink-0"
              title="Отправить (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[10px] text-secondary/70 mt-1.5 text-center">
            Нажмите <kbd className="px-1 py-0.2 bg-surface-2 rounded border border-border">Enter</kbd> для отправки, <kbd className="px-1 py-0.2 bg-surface-2 rounded border border-border">Shift+Enter</kbd> для переноса строки
          </p>
        </div>
      </div>
    </>
  );
};
