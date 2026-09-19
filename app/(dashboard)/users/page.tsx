'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
  RefreshCw,
  History,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface SystemUser {
  id: number;
  username: string;
  full_name?: string;
  role: string;
  permissions?: string[];
  is_active: boolean;
  telegram_id?: string | null;
  last_login?: string | null;
  created_at?: string;
}

const AVAILABLE_PAGES = [
  { key: 'overview', label: 'Главная', desc: 'Сводный обзор и KPI' },
  { key: 'dashboard', label: 'Операционная воронка', desc: 'Контроль звонков и конверсий' },
  { key: 'analytics', label: 'BI-аналитика', desc: 'Демография и образование' },
  { key: 'tasks', label: 'Задачи', desc: 'Напоминания и работа команды' },
  { key: 'health', label: 'Состояние системы', desc: 'Backend и интеграции' },
  { key: 'heatmap', label: 'Тепловая карта', desc: 'Нагрузка по часам' },
  { key: 'telegram', label: 'Telegram боты', desc: 'Управление ботами и функциями' },
  { key: 'calendar', label: 'Календарь', desc: 'События и интеграции' },
  { key: 'map', label: 'Карта регионов', desc: 'География 14 областей' },
  { key: 'raw', label: 'Сырые таблицы', desc: 'Все 5 таблиц Google' },
];

export default function UsersManagementPage() {
  const { user: currentUser, role: currentUserRole } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create User Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'operator',
    selectedPages: ['overview', 'dashboard'] as string[],
  });
  const [creating, setCreating] = useState(false);

  // Edit Permissions Modal State
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Loading states per user
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [historyUser, setHistoryUser] = useState<SystemUser | null>(null);
  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canAccess = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/admin/users');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить список пользователей');
      }
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) {
      loadUsers();
    }
  }, [canAccess]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password) {
      setError('Логин и пароль обязательны');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createForm.username.trim(),
          password: createForm.password,
          fullName: createForm.fullName.trim() || createForm.username.trim(),
          role: createForm.role,
          permissions: createForm.selectedPages,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при создании пользователя');
      }

      showNotification(`Пользователь "${createForm.username}" успешно создан`);
      setCreateForm({
        username: '',
        password: '',
        fullName: '',
        role: 'operator',
        selectedPages: ['overview', 'dashboard'],
      });
      setIsCreateOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (targetUser: SystemUser) => {
    setActionLoadingId(targetUser.id);
    try {
      const res = await fetch(`/api/proxy/admin/users/${targetUser.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !targetUser.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка при изменении статуса');

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: !targetUser.is_active } : u))
      );
      showNotification(`Пользователь ${targetUser.username} ${!targetUser.is_active ? 'активирован' : 'деактивирован'}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при изменении активности');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка при смене роли');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showNotification(`Роль успешно обновлена`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при смене роли');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenPermissions = (targetUser: SystemUser) => {
    setEditingUser(targetUser);
    setEditingPermissions(targetUser.permissions || []);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${editingUser.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения прав');

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, permissions: editingPermissions } : u
        )
      );
      showNotification(`Права пользователя "${editingUser.username}" обновлены`);
      setEditingUser(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении прав');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeleteUser = async (targetUser: SystemUser) => {
    if (!confirm(`Вы действительно хотите удалить пользователя "${targetUser.username}"?`)) {
      return;
    }
    setActionLoadingId(targetUser.id);
    try {
      const res = await fetch(`/api/proxy/admin/users/${targetUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка при удалении');

      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      showNotification(`Пользователь "${targetUser.username}" удален`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении');
    } finally {
      setActionLoadingId(null);
    }
  };

  const togglePageInForm = (pageKey: string) => {
    setCreateForm((prev) => {
      const exists = prev.selectedPages.includes(pageKey);
      return {
        ...prev,
        selectedPages: exists
          ? prev.selectedPages.filter((k) => k !== pageKey)
          : [...prev.selectedPages, pageKey],
      };
    });
  };

  const togglePageInModal = (pageKey: string) => {
    setEditingPermissions((prev) => {
      const exists = prev.includes(pageKey);
      return exists ? prev.filter((k) => k !== pageKey) : [...prev, pageKey];
    });
  };

  const openHistory = async (target: SystemUser) => {
    setHistoryUser(target);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/proxy/data/history?sheet=main&query=${encodeURIComponent(target.username)}`);
      const data = await response.json().catch(() => ({}));
      setHistoryRows(data.rows || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!currentUserRole) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return notFound();
  }

  return (
    <div className="app-content pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">
                Управление пользователями
              </h1>
              <p className="text-xs text-secondary">
                Создание учетных записей, распределение ролей и гранулярный доступ к разделам дашборда
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-surface border border-border text-secondary hover:text-primary transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Обновить список"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white hover:opacity-95 font-semibold text-xs transition-all cursor-pointer shadow-xs shadow-accent/25"
          >
            <UserPlus className="w-4 h-4" />
            <span>Создать пользователя</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Users Table Card */}
      <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-primary">Список пользователей системы</h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-secondary text-[11px] font-mono font-semibold border border-border/60">
              {users.length}
            </span>
          </div>
        </div>

        <div className="responsive-data-table overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-surface-2/50 text-[11px] font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Пользователь</th>
                <th className="py-3 px-4">Роль</th>
                <th className="py-3 px-4">Разрешенные страницы</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Последний вход</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
                    <span>Загрузка пользователей...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const isSuperAdmin = u.role === 'super_admin';
                  const isActing = actionLoadingId === u.id;
                  const hasWildcard = Array.isArray(u.permissions) && u.permissions.includes('*');

                  return (
                    <tr key={u.id} className="hover:bg-surface-2/40 transition-colors">
                      <td data-label="Пользователь" className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                            isSuperAdmin
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                              : 'bg-accent/15 text-accent border border-accent/20'
                          }`}>
                            {u.username.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-primary flex items-center gap-1.5">
                              <span>{u.full_name || u.username}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-semibold">
                                  Вы
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-secondary font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td data-label="Роль" className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Главный администратор
                          </span>
                        ) : currentUserRole === 'super_admin' ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            disabled={isActing}
                            className="text-xs px-2 py-1 rounded-lg bg-surface-2 border border-border text-primary font-medium focus:border-accent cursor-pointer"
                          >
                            <option value="admin">Администратор</option>
                            <option value="manager">Менеджер</option>
                            <option value="operator">Оператор</option>
                            <option value="viewer">Наблюдатель</option>
                          </select>
                        ) : (
                          <span className="capitalize font-medium text-secondary">
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td data-label="Разрешенные страницы" className="py-3.5 px-4">
                        {isSuperAdmin || hasWildcard ? (
                          <span className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Все разделы (Полный доступ)</span>
                          </span>
                        ) : Array.isArray(u.permissions) && u.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.permissions.map((p) => {
                              const found = AVAILABLE_PAGES.find((ap) => ap.key === p);
                              return (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-2 border border-border/80 text-primary"
                                >
                                  {found ? found.label : p}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-secondary/70 italic text-[11px]">
                            По умолчанию для роли ({u.role})
                          </span>
                        )}
                      </td>

                      <td data-label="Статус" className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>{u.is_active ? 'Активен' : 'Заблокирован'}</span>
                        </span>
                      </td>

                      <td data-label="Последний вход" className="py-3.5 px-4 text-secondary text-[11px] font-mono">
                        {u.last_login ? new Date(u.last_login).toLocaleString('ru-RU') : 'Никогда'}
                      </td>

                      <td data-label="Действия" className="py-3.5 px-4 text-right">
                        {!isSuperAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openHistory(u)}
                              className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-border text-secondary hover:text-accent transition-colors cursor-pointer"
                              title="История записей пользователя"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenPermissions(u)}
                              className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-border text-secondary hover:text-accent transition-colors cursor-pointer"
                              title="Настроить доступные страницы"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={isActing || isSelf}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                                u.is_active
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                              }`}
                            >
                              {u.is_active ? 'Заблокировать' : 'Активировать'}
                            </button>

                            {currentUserRole === 'super_admin' && !isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isActing}
                                className="p-1.5 rounded-lg bg-surface-2 hover:bg-rose-500/20 border border-border text-secondary hover:text-rose-500 transition-colors cursor-pointer disabled:opacity-40"
                                title="Удалить аккаунт"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-primary">Создать нового пользователя</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">Логин (username): *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="operator_1"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-primary focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">Пароль: *</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Минимум 6 символов"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-primary focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">ФИО / Отображаемое имя:</label>
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="Иван Иванов"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-primary focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">Роль:</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-primary focus:border-accent outline-none cursor-pointer"
                  >
                    <option value="operator">Оператор (operator)</option>
                    <option value="manager">Менеджер (manager)</option>
                    <option value="admin">Администратор (admin)</option>
                    <option value="viewer">Наблюдатель (viewer)</option>
                  </select>
                </div>
              </div>

              {/* Page Permissions Checklist */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary">Доступные разделы дашборда:</label>
                  <span className="text-[11px] text-secondary">
                    Выбрано: {createForm.selectedPages.length} из {AVAILABLE_PAGES.length}
                  </span>
                </div>
                <p className="text-[11px] text-secondary">
                  Если пользователь перейдет по прямой ссылке на неотмеченный раздел, система выдаст страницу 404.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {AVAILABLE_PAGES.map((page) => {
                    const isChecked = createForm.selectedPages.includes(page.key);
                    return (
                      <div
                        key={page.key}
                        onClick={() => togglePageInForm(page.key)}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-accent/10 border-accent/40 text-primary shadow-xs'
                            : 'bg-surface-2/60 border-border/80 text-secondary hover:text-primary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded accent-accent cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">{page.label}</div>
                          <div className="text-[10px] text-secondary mt-0.5 truncate">{page.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-border text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-white hover:opacity-95 text-xs font-bold transition-all shadow-xs shadow-accent/25 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{creating ? 'Создание...' : 'Создать аккаунт'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Permissions */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-primary">
                  Настройка доступа: {editingUser.username}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Выберите разделы, к которым данный пользователь будет иметь доступ
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_PAGES.map((page) => {
                  const isChecked = editingPermissions.includes(page.key);
                  return (
                    <div
                      key={page.key}
                      onClick={() => togglePageInModal(page.key)}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-accent/10 border-accent/40 text-primary shadow-xs'
                          : 'bg-surface-2/60 border-border/80 text-secondary hover:text-primary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 rounded accent-accent cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{page.label}</div>
                        <div className="text-[10px] text-secondary mt-0.5 truncate">{page.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-border text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-white hover:opacity-95 text-xs font-bold transition-all shadow-xs shadow-accent/25 disabled:opacity-50 cursor-pointer"
              >
                {savingPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{savingPermissions ? 'Сохранение...' : 'Сохранить права'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setHistoryUser(null)}>
          <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div><h3 className="font-bold text-primary">История: @{historyUser.username}</h3><p className="text-xs text-secondary">Совпадения в листе Main base</p></div>
              <button onClick={() => setHistoryUser(null)} className="rounded-lg p-2 text-secondary hover:text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-5">
              {historyLoading ? <div className="py-10 text-center text-secondary"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : historyRows.length === 0 ? <p className="py-10 text-center text-secondary">Записи не найдены</p> : <div className="space-y-2">{historyRows.map((row, index) => <pre key={index} className="overflow-x-auto rounded-xl bg-surface-2 p-3 text-[11px] text-secondary">{JSON.stringify(row, null, 2)}</pre>)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
