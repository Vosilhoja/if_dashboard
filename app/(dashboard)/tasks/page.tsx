'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  CalendarClock,
  Clock3,
  Flag,
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
import { motion, AnimatePresence } from 'framer-motion';
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
  id: number;
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
}

interface UserLite {
  id: number;
  username: string;
  full_name?: string;
  role?: string;
}

const COLUMNS: { id: Status; title: string; accent: string; count: string }[] = [
  { id: 'open', title: 'Открыто', accent: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30', count: 'bg-sky-500/15 text-sky-400' },
  { id: 'in_progress', title: 'В работе', accent: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30', count: 'bg-amber-500/15 text-amber-400' },
  { id: 'done', title: 'Готово', accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30', count: 'bg-emerald-500/15 text-emerald-400' },
  { id: 'cancelled', title: 'Отменено', accent: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/30', count: 'bg-rose-500/15 text-rose-400' },
];

const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  low: { label: 'Низкий', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  medium: { label: 'Средний', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30', dot: 'bg-sky-400' },
  high: { label: 'Высокий', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  urgent: { label: 'Срочный', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', dot: 'bg-rose-500' },
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
  const { user } = useAuth();
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
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    } catch {}
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
      const r = await fetch(`/api/proxy/tasks?${buildQuery()}`, { cache: 'no-store' });
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
  }, []);
  useEffect(() => {
    void loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.priority, filters.category, filters.assignee, filters.period, filters.mineOnly]);

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

  const deleteTask = async (id: number) => {
    if (!confirm('Удалить задачу?')) return;
    await fetch(`/api/proxy/tasks/${id}`, { method: 'DELETE' });
    if (detailOpen?.id === id) setDetailOpen(null);
    void loadTasks();
  };

  const updateStatus = async (id: number, status: Status) => {
    const r = await fetch(`/api/proxy/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const postComment = async (taskId: number) => {
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
    <div className="space-y-5">
      {/* ============== HEADER ============== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">Telegram / CRM</p>
          <h1 className="text-2xl font-black text-primary mt-1">Задачи</h1>
          <p className="text-sm text-secondary mt-1">Полноценная CRM-воронка: канбан-доска, приоритеты, исполнители, теги и комментарии.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-surface p-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${viewMode === 'kanban' ? 'bg-accent text-white' : 'text-secondary hover:text-primary'}`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Канбан
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-secondary hover:text-primary'}`}
              title="Список"
            >
              <List className="w-3.5 h-3.5" /> Список
            </button>
          </div>
          <button
            onClick={() => void loadTasks()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-secondary hover:text-primary transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Обновить
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Новая задача
          </button>
        </div>
      </div>

      {/* ============== FILTERS ============== */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Поиск по названию, заметкам, телефону..."
            className="w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.period}
            onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Priority | '' }))}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs font-bold text-primary outline-none focus:border-accent"
          >
            <option value="">Любой приоритет</option>
            <option value="urgent">Срочный</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${showFilters ? 'bg-accent text-white border-accent' : 'border-border bg-surface-2 text-secondary hover:text-primary'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Фильтры
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <label className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold cursor-pointer transition-colors ${filters.mineOnly ? 'bg-accent text-white border-accent' : 'border-border bg-surface-2 text-secondary hover:text-primary'}`}>
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

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden"
          >
            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-secondary/80 mb-1 block">Исполнитель</label>
                <select
                  value={filters.assignee}
                  onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent"
                >
                  <option value="">Все исполнители</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username} (@{u.username})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-secondary/80 mb-1 block">Категория</label>
                <input
                  list="category-list"
                  value={filters.category}
                  onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Выберите или введите"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-primary outline-none focus:border-accent"
                />
                <datalist id="category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setFilters({ q: '', priority: '', category: '', assignee: '', period: '', mineOnly: false })}
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== ERROR / LOADING ============== */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <Circle className="w-4 h-4 fill-rose-500 text-rose-500" /> {error}
        </div>
      )}

      {loading && !tasks.length ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center text-secondary flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          Загрузка задач...
        </div>
      ) : viewMode === 'kanban' ? (
        /* ============== KANBAN VIEW ============== */
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const items = tasksByStatus[col.id];
            const isOver = dragOverColumn === col.id;
            return (
              <div
                key={col.id}
                className={`rounded-2xl border bg-gradient-to-b ${col.accent} p-3 flex flex-col min-h-[200px] transition-all ${isOver ? 'ring-2 ring-accent/50 scale-[1.01]' : ''}`}
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-primary">{col.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.count}`}>{items.length}</span>
                  </div>
                  <button
                    onClick={() => { setEditingTask(null); setForm({ ...emptyForm(), status: col.id }); setModalOpen(true); }}
                    className="p-1 rounded-lg hover:bg-surface-2/80 text-secondary hover:text-primary transition-colors"
                    title="Добавить в колонку"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 flex-1">
                  {!items.length ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-[11px] text-secondary/70">
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
        <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-[10px] uppercase text-secondary/80 font-black tracking-wider">
                <tr>
                  <th className="text-left p-3">Задача</th>
                  <th className="text-left p-3">Приоритет</th>
                  <th className="text-left p-3">Исполнитель</th>
                  <th className="text-left p-3">Категория</th>
                  <th className="text-left p-3">Дедлайн</th>
                  <th className="text-left p-3">Статус</th>
                  <th className="text-right p-3 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!tasks.length ? (
                  <tr><td colSpan={7} className="p-10 text-center text-secondary">Задач нет — создайте первую.</td></tr>
                ) : tasks.map((task) => {
                  const dl = dueLabel(task.dueAt);
                  return (
                    <tr key={task.id} className="hover:bg-surface-2/40 transition-colors group">
                      <td className="p-3 align-top">
                        <button onClick={() => setDetailOpen(task)} className="text-left">
                          <p className="font-bold text-primary leading-tight hover:text-accent transition-colors line-clamp-1">{task.title}</p>
                          {task.notes && <p className="text-xs text-secondary mt-1 line-clamp-1">{task.notes}</p>}
                          {task.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.slice(0, 4).map((t, i) => (
                                <span key={i} className="inline-flex items-center rounded-md bg-accent/10 text-accent px-1.5 py-0.5 text-[10px] font-bold">#{t}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="p-3 align-top"><span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${PRIORITY_META[task.priority].color}`}><span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[task.priority].dot}`}></span>{PRIORITY_META[task.priority].label}</span></td>
                      <td className="p-3 align-top">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">
                              {initials(userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username)}
                            </div>
                            <span className="text-xs text-primary font-medium">{userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username || `#${task.assigneeId}`}</span>
                          </div>
                        ) : <span className="text-xs text-secondary/70">—</span>}
                      </td>
                      <td className="p-3 align-top text-xs text-primary">{task.category || <span className="text-secondary/70">—</span>}</td>
                      <td className="p-3 align-top text-xs">
                        {dl ? (
                          <span className={`inline-flex items-center gap-1 ${dl.overdue && task.status !== 'done' ? 'text-rose-400 font-bold' : 'text-secondary'}`}>
                            <Clock3 className="w-3 h-3" />{dl.label}
                          </span>
                        ) : <span className="text-secondary/70">—</span>}
                      </td>
                      <td className="p-3 align-top">
                        <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold ${COLUMNS.find(c => c.id === task.status)?.count || 'bg-surface-2 text-secondary'}`}>
                          {COLUMNS.find(c => c.id === task.status)?.title || task.status}
                        </span>
                      </td>
                      <td className="p-3 pr-4 align-top text-right">
                        <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-surface-2 text-secondary hover:text-primary" title="Редактировать"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-secondary hover:text-rose-400" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
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
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border/80 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-primary">{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h2>
                  <p className="text-xs text-secondary mt-0.5">Заполните поля — всё сохраняется в CRM и Telegram.</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-surface-2 text-secondary hover:text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={submitForm} className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block">Название *</label>
                  <input
                    required
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Например: Перезвонить клиенту по поводу льгот"
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block">Статус</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                    >
                      {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block">Приоритет</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                    >
                      {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><User className="w-3 h-3" /> Исполнитель</label>
                    <select
                      value={form.assigneeId}
                      onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                    >
                      <option value="">— Не назначен —</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username} (@{u.username})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Дедлайн</label>
                    <input
                      type="datetime-local"
                      value={form.dueAt}
                      onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><Tag className="w-3 h-3" /> Категория</label>
                    <input
                      list="form-cat-list"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Например: Звонки / Отчеты / Перезвон"
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                    />
                    <datalist id="form-cat-list">
                      {categories.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><Tag className="w-3 h-3" /> Теги (через запятую)</label>
                    <input
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="например: анжума, регион, отказ"
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Связанный телефон</label>
                    <input
                      value={form.linkedPhone}
                      onChange={(e) => setForm({ ...form, linkedPhone: e.target.value })}
                      placeholder="+998..."
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block flex items-center gap-1"><Link2 className="w-3 h-3" /> Связанный пользователь (ID)</label>
                    <input
                      value={form.linkedUserId}
                      onChange={(e) => setForm({ ...form, linkedUserId: e.target.value })}
                      placeholder="ID пользователя Hurmo CRM"
                      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-secondary/80 mb-1 block">Заметки / Текст для Telegram</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    placeholder="Текст заметки или шаблон сообщения. Поддерживается многострочность."
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70 resize-none"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-secondary hover:text-primary transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60 transition-opacity"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingTask ? 'Сохранить' : 'Создать задачу'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============== DETAIL MODAL ============== */}
      <AnimatePresence>
        {detailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetailOpen(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border/80 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold ${COLUMNS.find(c => c.id === detailOpen.status)?.count || 'bg-surface-2 text-secondary'}`}>
                      {COLUMNS.find(c => c.id === detailOpen.status)?.title || detailOpen.status}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${PRIORITY_META[detailOpen.priority].color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[detailOpen.priority].dot}`}></span>
                      {PRIORITY_META[detailOpen.priority].label}
                    </span>
                    {detailOpen.category && (
                      <span className="inline-flex items-center rounded-lg border border-border bg-surface-2 text-primary px-2 py-1 text-[10px] font-bold">
                        <Tag className="w-3 h-3 mr-1 text-secondary" /> {detailOpen.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-primary leading-tight">{detailOpen.title}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(detailOpen)} className="p-2 rounded-xl hover:bg-surface-2 text-secondary hover:text-primary transition-colors" title="Редактировать"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => deleteTask(detailOpen.id)} className="p-2 rounded-xl hover:bg-rose-500/10 text-secondary hover:text-rose-400 transition-colors" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => setDetailOpen(null)} className="p-2 rounded-xl hover:bg-surface-2 text-secondary hover:text-primary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {detailOpen.notes && (
                  <div className="rounded-xl border border-border bg-surface-2/60 p-4">
                    <p className="text-[10px] font-black uppercase text-secondary/80 mb-2">Заметки</p>
                    <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{detailOpen.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] font-black uppercase text-secondary/80 mb-2 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Дедлайн</p>
                    {dueLabel(detailOpen.dueAt) ? (
                      <p className={`font-bold ${dueLabel(detailOpen.dueAt)!.overdue && detailOpen.status !== 'done' ? 'text-rose-400' : 'text-primary'}`}>
                        {dueLabel(detailOpen.dueAt)!.label}
                        {dueLabel(detailOpen.dueAt)!.overdue && detailOpen.status !== 'done' && ' · Просрочено'}
                      </p>
                    ) : <p className="text-secondary/70">Не установлен</p>}
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] font-black uppercase text-secondary/80 mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Исполнитель</p>
                    {detailOpen.assigneeId ? (
                      <p className="font-bold text-primary flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">
                          {initials(userById.get(detailOpen.assigneeId)?.full_name || userById.get(detailOpen.assigneeId)?.username)}
                        </span>
                        {userById.get(detailOpen.assigneeId)?.full_name || userById.get(detailOpen.assigneeId)?.username || `#${detailOpen.assigneeId}`}
                      </p>
                    ) : <p className="text-secondary/70">Не назначен</p>}
                  </div>
                  {detailOpen.linkedPhone && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[10px] font-black uppercase text-secondary/80 mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> Связанный телефон</p>
                      <p className="font-bold text-primary">{detailOpen.linkedPhone}</p>
                    </div>
                  )}
                  {detailOpen.linkedUserId && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[10px] font-black uppercase text-secondary/80 mb-2 flex items-center gap-1"><Link2 className="w-3 h-3" /> Связанный пользователь</p>
                      <p className="font-bold text-primary">ID: {detailOpen.linkedUserId}</p>
                    </div>
                  )}
                </div>
                {detailOpen.tags?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-secondary/80 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Теги</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailOpen.tags.map((t, i) => (
                        <span key={i} className="inline-flex items-center rounded-lg bg-accent/15 text-accent border border-accent/25 px-2 py-1 text-[11px] font-bold">#{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="pt-4 border-t border-border/80">
                  <p className="text-[10px] font-black uppercase text-secondary/80 mb-3 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Комментарии · {detailOpen.comments?.length || 0}
                  </p>
                  <div className="space-y-3 mb-4">
                    {!detailOpen.comments?.length ? (
                      <p className="text-xs text-secondary/70 text-center py-4">Пока нет комментариев. Напишите первый.</p>
                    ) : detailOpen.comments.map((c) => {
                      const a = userById.get(c.authorId);
                      return (
                        <div key={c.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">
                                {initials(a?.full_name || a?.username)}
                              </span>
                              <span className="text-xs font-bold text-primary">{a?.full_name || a?.username || `#${c.authorId}`}</span>
                            </div>
                            <span className="text-[10px] text-secondary">{format(parseISO(c.createdAt), 'd MMM HH:mm', { locale: ru })}</span>
                          </div>
                          <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{c.text}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void postComment(detailOpen.id); } }}
                      placeholder="Ваш комментарий... (Enter — отправить)"
                      className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-secondary/70"
                    />
                    <button
                      onClick={() => postComment(detailOpen.id)}
                      disabled={postingComment || !commentDraft.trim()}
                      className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60 transition-opacity inline-flex items-center gap-1.5"
                    >
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Отпр.
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/80 flex flex-wrap justify-between gap-2 text-[11px] text-secondary">
                  <span>Создана: {format(parseISO(detailOpen.createdAt), 'd MMM yyyy HH:mm', { locale: ru })}</span>
                  <span>Обновлена: {format(parseISO(detailOpen.updatedAt), 'd MMM yyyy HH:mm', { locale: ru })}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <motion.div
      layout
      draggable
      onDragStart={(e) => {
        const de = e as unknown as React.DragEvent<HTMLDivElement>;
        if (de.dataTransfer) {
          de.dataTransfer.setData('text/plain', String(task.id));
          de.dataTransfer.effectAllowed = 'move';
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      whileHover={{ y: -2 }}
      className={`group relative rounded-xl border border-border bg-surface shadow-xs hover:shadow-md hover:border-accent/30 p-3 cursor-grab active:cursor-grabbing transition-all ${dragging ? 'opacity-40 rotate-1 scale-105 z-50' : ''}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          className={`mt-0.5 shrink-0 rounded-md p-1 ${task.status === 'done' ? 'text-emerald-500 bg-emerald-500/10' : 'text-secondary/60 hover:text-accent hover:bg-surface-2'}`}
          title={task.status === 'done' ? 'Вернуть в открытое' : 'Отметить выполненным'}
        >
          {task.status === 'done' ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className={`text-xs font-bold text-primary leading-tight line-clamp-2 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
            {task.title}
          </p>
        </button>
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1 rounded-md text-secondary/60 hover:text-primary hover:bg-surface-2 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-7 z-20 w-36 rounded-xl border border-border bg-surface shadow-xl p-1 text-xs overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-secondary hover:bg-surface-2 hover:text-primary">
                  <Edit3 className="w-3.5 h-3.5" /> Редактировать
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpen(); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-secondary hover:bg-surface-2 hover:text-primary">
                  <MessageSquare className="w-3.5 h-3.5" /> Подробнее
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-rose-400 hover:bg-rose-500/10">
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {task.notes && (
        <p className="text-[11px] text-secondary line-clamp-2 mb-2 leading-relaxed">{task.notes}</p>
      )}

      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-md bg-accent/10 text-accent px-1.5 py-0.5 text-[9px] font-bold">#{t}</span>
          ))}
          {task.tags.length > 3 && <span className="text-[9px] font-bold text-secondary/70">+{task.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/50 mt-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${priorityMeta[task.priority].color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta[task.priority].dot}`}></span>
            {priorityMeta[task.priority].label[0]}
          </span>
          {dl && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${dl.overdue && task.status !== 'done' ? 'bg-rose-500/15 text-rose-400' : 'bg-surface-2 text-secondary'}`}>
              <Clock3 className="w-2.5 h-2.5" />
              {dl.label.split(' ')[0]}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 text-secondary px-1.5 py-0.5 text-[9px] font-bold">
              <MessageSquare className="w-2.5 h-2.5" />{task.comments.length}
            </span>
          )}
        </div>
        {task.assigneeId ? (
          <div
            title={userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username || `Исполнитель #${task.assigneeId}`}
            className="w-5 h-5 rounded-md bg-gradient-to-br from-accent/40 to-accent text-white flex items-center justify-center text-[9px] font-black border border-accent/50"
          >
            {initials(userById.get(task.assigneeId)?.full_name || userById.get(task.assigneeId)?.username)}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-md bg-surface-2 text-secondary/40 flex items-center justify-center text-[9px] font-black border border-border/60" title="Не назначен">
            <User className="w-2.5 h-2.5" />
          </div>
        )}
      </div>
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-secondary/20 group-hover:text-accent/60 transition-colors opacity-0 group-hover:opacity-100">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
    </motion.div>
  );
}
