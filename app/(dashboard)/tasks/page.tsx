'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  CalendarClock,
  Clock3,
  User,
  Tag,
  MessageSquare,
  Phone,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  GripVertical,
  RefreshCw,
  Check,
  Link2,
  MoreHorizontal,
  Circle,
  Loader2,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'open' | 'in_progress' | 'done' | 'cancelled';

interface TaskComment {
  id: number;
  authorId: number;
  text: string;
  createdAt: string;
}

interface Task {
  id: number | string;
  title: string;
  notes: string;
  status: Status;
  priority: Priority;
  assigneeId: number | null;
  category: string | null;
  tags: string[];
  comments: TaskComment[];
  dueAt: string | null;
  linkedPhone: string | null;
  linkedUserId: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  source?: 'todoist' | 'local';
}

interface UserLite {
  id: number;
  username: string;
  full_name?: string;
  role?: string;
}

const COLUMNS: { id: Status; title: string; accent: string; count: string; dot: string }[] = [
  { id: 'open', title: 'Открыто', accent: 'border-slate-600/40 bg-slate-800/20', count: 'bg-slate-700/40 text-slate-300 border border-slate-600/40', dot: 'bg-slate-400' },
  { id: 'in_progress', title: 'В работе', accent: 'border-blue-600/30 bg-blue-950/20', count: 'bg-blue-950/40 text-blue-300 border border-blue-800/30', dot: 'bg-blue-400' },
  { id: 'done', title: 'Готово', accent: 'border-emerald-600/30 bg-emerald-950/15', count: 'bg-emerald-950/35 text-emerald-300 border border-emerald-800/30', dot: 'bg-emerald-400' },
  { id: 'cancelled', title: 'Отменено', accent: 'border-rose-600/30 bg-rose-950/15', count: 'bg-rose-950/35 text-rose-300 border border-rose-800/30', dot: 'bg-rose-400' },
];

const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  low: { label: 'Низкий', color: 'bg-slate-800/50 text-slate-400 border border-slate-700/40', dot: 'bg-slate-500' },
  medium: { label: 'Средний', color: 'bg-blue-950/40 text-blue-300 border border-blue-800/30', dot: 'bg-blue-400' },
  high: { label: 'Высокий', color: 'bg-amber-950/40 text-amber-300 border border-amber-800/30', dot: 'bg-amber-400' },
  urgent: { label: 'Срочный', color: 'bg-rose-950/40 text-rose-300 border border-rose-800/30', dot: 'bg-rose-500' },
};

const PERIOD_OPTIONS: { key: string; label: string }[] = [
  { key: '', label: 'Все периоды' },
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'overdue', label: 'Просроченные' },
];

function emptyForm() {
  return {
    title: '',
    notes: '',
    status: 'open' as Status,
    priority: 'medium' as Priority,
    assigneeId: '' as string,
    category: '',
    tags: '' as string,
    dueAt: '',
    linkedPhone: '',
    linkedUserId: '' as string,
  };
}

type FormState = ReturnType<typeof emptyForm>;

export default function TasksPage() {
  useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [detailOpen, setDetailOpen] = useState<Task | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<number | string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskSource, setTaskSource] = useState<'local' | 'todoist'>('local');

  const [filters, setFilters] = useState<{
    q: string;
    priority: '' | Priority;
    category: string;
    assignee: string;
    period: string;
    mineOnly: boolean;
  }>({ q: '', priority: '', category: '', assignee: '', period: '', mineOnly: false });
  const [showFilters, setShowFilters] = useState(false);

  const loadUsers = async () => {
    try {
      const r = await fetch('/api/proxy/users', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        setUsers(Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : []);
      }
    } catch { }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.category) params.set('category', filters.category);
    if (filters.assignee) params.set('assignee', filters.assignee);
    if (filters.period) params.set('period', filters.period);
    if (filters.mineOnly) params.set('mine', '1');
    params.set('sort', 'priority');
    params.set('sortDir', 'ASC');
    return params.toString();
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(taskSource === 'todoist' ? '/api/proxy/tasks/todoist' : `/api/proxy/tasks?${buildQuery()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json().catch(() => ({}));
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // Проверяем статус Todoist: если токен настроен, Todoist становится основным источником
    const detectSource = async () => {
      try {
        const r = await fetch('/api/proxy/system/health', { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json().catch(() => ({}));
          const todoistService = Array.isArray(data?.services)
            ? data.services.find((s: any) => s.name === 'todoist')
            : null;
          if (todoistService?.configured) {
            setTaskSource('todoist');
          }
        }
      } catch { }
    };
    void detectSource();
  }, []);
  useEffect(() => {
    void loadTasks();
  }, [filters.q, filters.priority, filters.category, filters.assignee, filters.period, filters.mineOnly, taskSource]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => t.category && s.add(t.category));
    return Array.from(s);
  }, [tasks]);

  const tasksByStatus = useMemo(() => {
    const g: Record<Status, Task[]> = { open: [], in_progress: [], done: [], cancelled: [] };
    tasks.forEach((t) => {
      if (g[t.status]) g[t.status].push(t);
      else g.open.push(t);
    });
    return g;
  }, [tasks]);

  const userById = useMemo(() => {
    const m = new Map<number, UserLite>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      notes: task.notes || '',
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ? String(task.assigneeId) : '',
      category: task.category || '',
      tags: (task.tags || []).join(', '),
      dueAt: task.dueAt ? task.dueAt.slice(0, 16) : '',
      linkedPhone: task.linkedPhone || '',
      linkedUserId: task.linkedUserId ? String(task.linkedUserId) : '',
    });
    setModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        notes: form.notes,
        status: form.status,
        priority: form.priority,
        category: form.category.trim() || null,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        dueAt: form.dueAt || null,
        linkedPhone: form.linkedPhone.trim() || null,
      };
      if (form.assigneeId) payload.assigneeId = Number(form.assigneeId);
      else payload.assigneeId = null;
      if (form.linkedUserId) payload.linkedUserId = Number(form.linkedUserId);

      if (editingTask) {
        const r = await fetch(`/api/proxy/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error('Ошибка обновления');
      } else {
        const r = await fetch('/api/proxy/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error('Ошибка создания');
      }
      setModalOpen(false);
      setEditingTask(null);
      void loadTasks();
    } catch (err: any) {
      setError(err?.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTask = async (id: number | string) => {
    if (!confirm('Удалить задачу?')) return;
    await fetch(`/api/proxy/tasks/${id}`, { method: 'DELETE' });
    if (detailOpen?.id === id) setDetailOpen(null);
    void loadTasks();
  };

  const updateStatus = async (id: number | string, status: Status) => {
    const r = await fetch(`/api/proxy/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const postComment = async (taskId: number | string) => {
    if (typeof taskId !== 'number') return;
    if (!commentDraft.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const r = await fetch(`/api/proxy/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentDraft.trim() }),
      });
      if (r.ok) {
        const updated = await r.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setDetailOpen(updated);
        setCommentDraft('');
      }
    } finally {
      setPostingComment(false);
    }
  };

  const dueLabel = (dueAt: string | null) => {
    if (!dueAt) return null;
    try {
      const d = parseISO(dueAt);
      const overdue = isPast(d) && format(d, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
      return { label: format(d, 'd MMM HH:mm', { locale: ru }), overdue };
    } catch {
      return null;
    }
  };

  const initials = (name?: string) => (name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* ============== HEADER ============== */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">Telegram / CRM</p>
          <h1 className="text-xl font-bold text-primary mt-1">Задачи</h1>
          <p className="text-xs text-secondary mt-1">Канбан-доска, приоритеты, исполнители, теги и комментарии.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-accent text-white' : 'text-secondary hover:text-primary'}`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Канбан
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-secondary hover:text-primary'}`}
              title="Список"
            >
              <List className="w-3.5 h-3.5" /> Список
            </button>
          </div>
          <button
            onClick={() => void loadTasks()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Обновить
          </button>
          <button
            onClick={() => setTaskSource((source) => source === 'local' ? 'todoist' : 'local')}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${taskSource === 'todoist' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-secondary hover:text-primary'}`}
          >
            {taskSource === 'todoist' ? 'Todoist' : 'CRM задачи'}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Новая задача
          </button>
        </div>
      </div>


      {/* ============== FILTERS ============== */}
      <div className="rounded-md border border-border bg-surface p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Поиск по названию, заметкам, телефону..."
            className="w-full rounded-md border border-border bg-surface-2 pl-8 pr-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filters.period}
            onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-2 text-xs font-semibold text-primary outline-none focus:border-accent/70 transition-colors"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Priority | '' }))}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-2 text-xs font-semibold text-primary outline-none focus:border-accent/70 transition-colors"
          >
            <option value="">Любой приоритет</option>
            <option value="urgent">Срочный</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors ${showFilters ? 'bg-accent text-white border-accent' : 'border-border bg-surface-2 text-secondary hover:text-primary'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Фильтры
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <label className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${filters.mineOnly ? 'bg-accent text-white border-accent' : 'border-border bg-surface-2 text-secondary hover:text-primary'}`}>
            <input
              type="checkbox"
              className="hidden"
              checked={filters.mineOnly}
              onChange={(e) => setFilters((f) => ({ ...f, mineOnly: e.target.checked }))}
            />
            <User className="w-3.5 h-3.5" /> Мои задачи
          </label>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-md border border-border bg-surface overflow-hidden transition-all">
          <div className="p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Исполнитель</label>
              <select
                value={filters.assignee}
                onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
              >
                <option value="">Все исполнители</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username} (@{u.username})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Категория</label>
              <input
                list="category-list"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                placeholder="Выберите или введите"
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
              />
              <datalist id="category-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setFilters({ q: '', priority: '', category: '', assignee: '', period: '', mineOnly: false })}
                className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== ERROR / LOADING ============== */}
      {error && (
        <div className="rounded-md border border-rose-800/40 bg-rose-950/20 text-rose-300 px-3 py-2.5 text-xs font-semibold flex items-center gap-2">
          <Circle className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> {error}
        </div>
      )}

      {loading && !tasks.length ? (
        <div className="rounded-md border border-border bg-surface p-12 text-center text-secondary flex flex-col items-center gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          Загрузка задач...
        </div>
      ) : viewMode === 'kanban' ? (
        /* ============== KANBAN VIEW ============== */
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-2.5">
          {COLUMNS.map((col) => {
            const items = tasksByStatus[col.id];
            const isOver = dragOverColumn === col.id;
            return (
              <div
                key={col.id}
                className={`rounded-md border ${col.accent} p-2.5 flex flex-col min-h-[180px] transition-colors ${isOver ? 'ring-1 ring-accent/50' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
                onDragLeave={() => setDragOverColumn((s) => (s === col.id ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData('text/plain'));
                  if (id && draggingTaskId === id) void updateStatus(id, col.id);
                  setDragOverColumn(null);
                  setDraggingTaskId(null);
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-sm ${col.dot}`} />
                    <h3 className="text-xs font-semibold text-primary">{col.title}</h3>
                    <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${col.count}`}>{items.length}</span>
                  </div>
                  <button
                    onClick={() => { setEditingTask(null); setForm({ ...emptyForm(), status: col.id }); setModalOpen(true); }}
                    className="p-0.5 rounded-sm hover:bg-surface-2/60 text-secondary hover:text-primary transition-colors"
                    title="Добавить в колонку"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 flex-1">
                  {!items.length ? (
                    <div className="rounded-sm border border-dashed border-border/50 p-4 text-center text-[10px] text-secondary/60">
                      Перетащите сюда задачи
                    </div>
                  ) : items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      priorityMeta={PRIORITY_META}
                      dueLabel={dueLabel}
                      userById={userById}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => { setDraggingTaskId(null); setDragOverColumn(null); }}
                      dragging={draggingTaskId === task.id}
                      onOpen={() => setDetailOpen(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => deleteTask(task.id)}
                      onToggleDone={() => updateStatus(task.id, task.status === 'done' ? 'open' : 'done')}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============== LIST VIEW ============== */
        <div className="rounded-md border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-2/50 text-[10px] uppercase text-secondary/70 font-semibold tracking-wider">
                <tr>
                  <th className="text-left p-2.5">Задача</th>
                  <th className="text-left p-2.5">Приоритет</th>
                  <th className="text-left p-2.5">Исполнитель</th>
                  <th className="text-left p-2.5">Категория</th>
                  <th className="text-left p-2.5">Дедлайн</th>
                  <th className="text-left p-2.5">Статус</th>
                  <th className="text-right p-2.5 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {!tasks.length ? (
                  <tr><td colSpan={7} className="p-8 text-center text-secondary">Задач нет — создайте первую.</td></tr>
                ) : tasks.map((task) => {
                  const dl = dueLabel(task.dueAt);
                  return (
                    <tr key={task.id} className="hover:bg-surface-2/30 transition-colors group">
                      <td className="p-2.5 align-top">
                        <button onClick={() => setDetailOpen(task)} className="text-left">
                          <p className="font-semibold text-primary leading-tight hover:text-accent transition-colors line-clamp-1">{task.title}</p>
                          {task.notes && <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">{task.notes}</p>}
                          {task.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {task.tags.slice(0, 4).map((t, i) => (
                                <span key={i} className="inline-flex items-center rounded-sm bg-surface-2 text-accent/90 border border-border px-1.5 py-0.5 text-[10px] font-semibold">#{t}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="p-2.5 align-top"><span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_META[task.priority].color}`}><span className={`w-1.5 h-1.5 rounded-sm ${PRIORITY_META[task.priority].dot}`}></span>{PRIORITY_META[task.priority].label}</span></td>
                      <td className="p-2.5 align-top">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-sm bg-accent/15 text-accent flex items-center justify-center text-[9px] font-semibold border border-accent/20">
                              {initials(userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username)}
                            </div>
                            <span className="text-[11px] text-primary font-medium">{userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username || `#${task.assigneeId}`}</span>
                          </div>
                        ) : <span className="text-[11px] text-secondary/60">—</span>}
                      </td>
                      <td className="p-2.5 align-top text-[11px] text-primary">{task.category || <span className="text-secondary/60">—</span>}</td>
                      <td className="p-2.5 align-top text-[11px]">
                        {dl ? (
                          <span className={`inline-flex items-center gap-1 ${dl.overdue && task.status !== 'done' ? 'text-rose-400 font-semibold' : 'text-secondary'}`}>
                            <Clock3 className="w-2.5 h-2.5" />{dl.label}
                          </span>
                        ) : <span className="text-secondary/60">—</span>}
                      </td>
                      <td className="p-2.5 align-top">
                        <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${COLUMNS.find(c => c.id === task.status)?.count || 'bg-surface-2 text-secondary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-sm ${COLUMNS.find(c => c.id === task.status)?.dot}`} />
                          {COLUMNS.find(c => c.id === task.status)?.title || task.status}
                        </span>
                      </td>
                      <td className="p-2.5 pr-3 align-top text-right">
                        <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(task)} className="p-1 rounded-sm hover:bg-surface-2 text-secondary hover:text-primary" title="Редактировать"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTask(task.id)} className="p-1 rounded-sm hover:bg-rose-950/30 text-secondary hover:text-rose-400" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== CREATE / EDIT MODAL ============== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-md border border-border bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-primary">{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h2>
                <p className="text-[11px] text-secondary mt-0.5">Заполните поля — всё сохраняется в CRM и Telegram.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-sm hover:bg-surface-2 text-secondary hover:text-primary transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={submitForm} className="px-4 py-3.5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Название *</label>
                <input
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Например: Перезвонить клиенту по поводу льгот"
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
                  >
                    {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
                  >
                    {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><User className="w-2.5 h-2.5" /> Исполнитель</label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
                  >
                    <option value="">— Не назначен —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username} (@{u.username})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><CalendarClock className="w-2.5 h-2.5" /> Дедлайн</label>
                  <input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Категория</label>
                  <input
                    list="form-cat-list"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Например: Звонки / Отчеты / Перезвон"
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                  />
                  <datalist id="form-cat-list">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Теги (через запятую)</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="например: анжума, регион, отказ"
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Связанный телефон</label>
                  <input
                    value={form.linkedPhone}
                    onChange={(e) => setForm({ ...form, linkedPhone: e.target.value })}
                    placeholder="+998..."
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> Связанный пользователь (ID)</label>
                  <input
                    value={form.linkedUserId}
                    onChange={(e) => setForm({ ...form, linkedUserId: e.target.value })}
                    placeholder="ID пользователя Talvera CRM"
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-secondary/70 mb-1 block">Заметки / Текст для Telegram</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                  placeholder="Текст заметки или шаблон сообщения. Поддерживается многострочность."
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 resize-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingTask ? 'Сохранить' : 'Создать задачу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============== DETAIL MODAL ============== */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetailOpen(null)}>
          <div
            className="w-full max-w-2xl rounded-md border border-border bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border/70 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${COLUMNS.find(c => c.id === detailOpen.status)?.count || 'bg-surface-2 text-secondary'}`}>
                    <span className={`w-1.5 h-1.5 rounded-sm ${COLUMNS.find(c => c.id === detailOpen.status)?.dot}`} />
                    {COLUMNS.find(c => c.id === detailOpen.status)?.title || detailOpen.status}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_META[detailOpen.priority].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-sm ${PRIORITY_META[detailOpen.priority].dot}`}></span>
                    {PRIORITY_META[detailOpen.priority].label}
                  </span>
                  {detailOpen.category && (
                    <span className="inline-flex items-center rounded-sm border border-border bg-surface-2 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                      <Tag className="w-2.5 h-2.5 mr-1 text-secondary" /> {detailOpen.category}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-primary leading-tight">{detailOpen.title}</h2>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => openEdit(detailOpen)} className="p-1.5 rounded-sm hover:bg-surface-2 text-secondary hover:text-primary transition-colors" title="Редактировать"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteTask(detailOpen.id)} className="p-1.5 rounded-sm hover:bg-rose-950/30 text-secondary hover:text-rose-400 transition-colors" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDetailOpen(null)} className="p-1.5 rounded-sm hover:bg-surface-2 text-secondary hover:text-primary transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-4 py-3.5 space-y-3 overflow-y-auto flex-1">
              {detailOpen.notes && (
                <div className="rounded-md border border-border bg-surface-2/40 p-3">
                  <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5">Заметки</p>
                  <p className="text-xs text-primary whitespace-pre-wrap leading-relaxed">{detailOpen.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-md border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5 flex items-center gap-1"><CalendarClock className="w-2.5 h-2.5" /> Дедлайн</p>
                  {dueLabel(detailOpen.dueAt) ? (
                    <p className={`font-semibold ${dueLabel(detailOpen.dueAt)!.overdue && detailOpen.status !== 'done' ? 'text-rose-400' : 'text-primary'}`}>
                      {dueLabel(detailOpen.dueAt)!.label}
                      {dueLabel(detailOpen.dueAt)!.overdue && detailOpen.status !== 'done' && ' · Просрочено'}
                    </p>
                  ) : <p className="text-secondary/60">Не установлен</p>}
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5 flex items-center gap-1"><User className="w-2.5 h-2.5" /> Исполнитель</p>
                  {detailOpen.assigneeId ? (
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-sm bg-accent/15 text-accent flex items-center justify-center text-[9px] font-semibold border border-accent/20">
                        {initials(userById.get(detailOpen.assigneeId)?.full_name || userById.get(detailOpen.assigneeId)?.username)}
                      </span>
                      {userById.get(detailOpen.assigneeId)?.full_name || userById.get(detailOpen.assigneeId)?.username || `#${detailOpen.assigneeId}`}
                    </p>
                  ) : <p className="text-secondary/60">Не назначен</p>}
                </div>
                {detailOpen.linkedPhone && (
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Связанный телефон</p>
                    <p className="font-semibold text-primary">{detailOpen.linkedPhone}</p>
                  </div>
                )}
                {detailOpen.linkedUserId && (
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5 flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> Связанный пользователь</p>
                    <p className="font-semibold text-primary">ID: {detailOpen.linkedUserId}</p>
                  </div>
                )}
              </div>
              {detailOpen.tags?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-1.5 flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Теги</p>
                  <div className="flex flex-wrap gap-1">
                    {detailOpen.tags.map((t, i) => (
                      <span key={i} className="inline-flex items-center rounded-sm bg-surface-2 text-accent/90 border border-border px-1.5 py-0.5 text-[10px] font-semibold">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="pt-3 border-t border-border/70">
                <p className="text-[10px] font-semibold uppercase text-secondary/70 mb-2.5 flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" /> Комментарии · {detailOpen.comments?.length || 0}
                </p>
                <div className="space-y-2 mb-3">
                  {!detailOpen.comments?.length ? (
                    <p className="text-[11px] text-secondary/60 text-center py-3">Пока нет комментариев. Напишите первый.</p>
                  ) : detailOpen.comments.map((c) => {
                    const a = userById.get(c.authorId);
                    return (
                      <div key={c.id} className="rounded-md border border-border bg-surface-2/30 p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-sm bg-accent/15 text-accent flex items-center justify-center text-[9px] font-semibold border border-accent/20">
                              {initials(a?.full_name || a?.username)}
                            </span>
                            <span className="text-[11px] font-semibold text-primary">{a?.full_name || a?.username || `#${c.authorId}`}</span>
                          </div>
                          <span className="text-[10px] text-secondary">{format(parseISO(c.createdAt), 'd MMM HH:mm', { locale: ru })}</span>
                        </div>
                        <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void postComment(detailOpen.id); } }}
                    placeholder="Ваш комментарий... (Enter — отправить)"
                    className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent/70 placeholder:text-secondary/60 transition-colors"
                  />
                  <button
                    onClick={() => postComment(detailOpen.id)}
                    disabled={postingComment || !commentDraft.trim()}
                    className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-1.5"
                  >
                    {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />} Отпр.
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-border/70 flex flex-wrap justify-between gap-1.5 text-[10px] text-secondary/70">
                <span>Создана: {format(parseISO(detailOpen.createdAt), 'd MMM yyyy HH:mm', { locale: ru })}</span>
                <span>Обновлена: {format(parseISO(detailOpen.updatedAt), 'd MMM yyyy HH:mm', { locale: ru })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============== TASK CARD COMPONENT ============== */
interface TaskCardProps {
  task: Task;
  priorityMeta: Record<Priority, { label: string; color: string; dot: string }>;
  dueLabel: (d: string | null) => { label: string; overdue: boolean } | null;
  userById: Map<number, UserLite>;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDone: () => void;
}
function TaskCard({ task, priorityMeta, dueLabel, userById, dragging, onDragStart, onDragEnd, onOpen, onEdit, onDelete, onToggleDone }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dl = dueLabel(task.dueAt);
  const initials = (name?: string) => (name || '?').slice(0, 2).toUpperCase();
  return (
    <div
      draggable
      onDragStart={(e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', String(task.id));
          e.dataTransfer.effectAllowed = 'move';
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group relative rounded-sm border border-border bg-surface hover:border-slate-600/50 px-2 py-2 cursor-grab active:cursor-grabbing transition-colors ${dragging ? 'opacity-40 z-50' : ''}`}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          className={`mt-0 shrink-0 rounded-sm p-0.5 ${task.status === 'done' ? 'text-emerald-400 bg-emerald-950/30' : 'text-secondary/50 hover:text-accent hover:bg-surface-2'} transition-colors`}
          title={task.status === 'done' ? 'Вернуть в открытое' : 'Отметить выполненным'}
        >
          {task.status === 'done' ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
        </button>
        <button onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className={`text-[11px] font-semibold text-primary leading-snug line-clamp-2 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
            {task.title}
          </p>
        </button>
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-0.5 rounded-sm text-secondary/50 hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-5 z-20 w-32 rounded-sm border border-border bg-surface shadow-lg p-0.5 text-[11px] overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-secondary hover:bg-surface-2 hover:text-primary transition-colors">
                  <Edit3 className="w-3 h-3" /> Редактировать
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpen(); }} className="w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-secondary hover:bg-surface-2 hover:text-primary transition-colors">
                  <MessageSquare className="w-3 h-3" /> Подробнее
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-rose-400 hover:bg-rose-950/30 transition-colors">
                  <Trash2 className="w-3 h-3" /> Удалить
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {task.notes && (
        <p className="text-[10px] text-secondary/70 line-clamp-2 mb-1.5 leading-snug">{task.notes}</p>
      )}

      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {task.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-sm bg-surface-2 text-accent/80 px-1 py-0.5 text-[9px] font-semibold">#{t}</span>
          ))}
          {task.tags.length > 3 && <span className="text-[9px] font-semibold text-secondary/60">+{task.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-border/50">
        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-[9px] font-semibold ${priorityMeta[task.priority].color}`}>
            <span className={`w-1 h-1 rounded-sm ${priorityMeta[task.priority].dot}`}></span>
            {priorityMeta[task.priority].label[0]}
          </span>
          {dl && (
            <span className={`inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-[9px] font-semibold ${dl.overdue && task.status !== 'done' ? 'bg-rose-950/40 text-rose-300' : 'bg-surface-2 text-secondary/70'}`}>
              <Clock3 className="w-2 h-2" />
              {dl.label.split(' ')[0]}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-surface-2 text-secondary/70 px-1 py-0.5 text-[9px] font-semibold">
              <MessageSquare className="w-2 h-2" />{task.comments.length}
            </span>
          )}
        </div>
        {task.assigneeId ? (
          <div
            title={userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username || `Исполнитель #${task.assigneeId}`}
            className="w-[18px] h-[18px] rounded-sm bg-accent/15 text-accent flex items-center justify-center text-[8px] font-semibold border border-accent/20"
          >
            {initials(userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username)}
          </div>
        ) : (
          <div className="w-[18px] h-[18px] rounded-sm bg-surface-2 text-secondary/40 flex items-center justify-center text-[8px] font-semibold border border-border/50" title="Не назначен">
            <User className="w-2 h-2" />
          </div>
        )}
      </div>
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-secondary/10 group-hover:text-accent/40 transition-colors opacity-0 group-hover:opacity-100">
        <GripVertical className="w-3 h-3" />
      </div>
    </div>
  );
}
