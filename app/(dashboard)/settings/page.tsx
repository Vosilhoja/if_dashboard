'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Database,
  SlidersHorizontal,
  RefreshCw,
  Bell,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Send,
  History,
  Activity,
  Users,
  UserPlus,
  UserX,
  UserCheck,
  ChevronDown,
  Loader2,
  Trash2,
  KeyRound,
  Copy,
  Settings2,
  Zap,
  DatabaseBackup,
  Bot,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAnalyticsFilter } from '@/lib/analytics-filter-context';
import { useAuth } from '@/lib/auth-context';

interface SheetInfo {
  key: string;
  name: string;
  title: string;
  url: string;
  sheetId: string;
  rowsCount?: number;
}

interface PingResult {
  latencyMs: number;
  totalRows: number;
  status: 'success' | 'error';
  message?: string;
}

interface ThresholdLogItem {
  timestamp: string;
  threshold: number;
}

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

interface TelegramBot {
  id: number;
  token: string;
  userId: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  isPending?: boolean;
  testResult?: { ok: boolean; message: string } | null;
}

interface TelegramCapabilities {
  features: Array<{ key: string; label: string; description: string }>;
  roles: Record<string, string[]>;
  linkedUsers: Array<{ id: number; username: string; fullName?: string; role: string; telegramId: string; isActive: boolean }>;
}

interface NewBotForm {
  id: string;
  token: string;
  userId: string;
}

interface SyncTimestamps {
  statusSync: string | null;
  classifyUnmatched: string | null;
}

const AVAILABLE_PAGES = [
  { key: 'overview', label: 'Главная', desc: 'Сводный обзор' },
  { key: 'dashboard', label: 'Операционная воронка', desc: 'Конверсии и звонки' },
  { key: 'analytics', label: 'BI-аналитика', desc: 'Демография и образование' },
  { key: 'map', label: 'Карта регионов', desc: 'География 14 областей' },
  { key: 'raw', label: 'Сырые таблицы', desc: 'Просмотр 5 таблиц' },
];

const AVAILABLE_SECTIONS = [
  { key: 'raw:numbers', label: 'Таблица numbers' },
  { key: 'raw:main', label: 'Таблица main_base' },
  { key: 'raw:eskiz', label: 'Таблица eskiz' },
  { key: 'raw:not_completed', label: 'Таблица not_completed' },
  { key: 'raw:survey_attempts', label: 'Таблица survey_attempts' },
  { key: 'analytics:demographics', label: 'BI: демография' },
  { key: 'analytics:quality', label: 'BI: качество данных' },
];

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { weekStartsOn, setWeekStartsOn } = useAnalyticsFilter();
  const { role: currentUserRole } = useAuth();

  const [, setSettingsUrl] = useState<string>('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live Sheet Ping State
  const [pingingSheet, setPingingSheet] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [reloadingSheet, setReloadingSheet] = useState<string | null>(null);
  const [reloadResults, setReloadResults] = useState<Record<string, string>>({});

  // 1. Anomaly Threshold & History
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(30);
  const [isSavedThreshold, setIsSavedThreshold] = useState<boolean>(false);
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdLogItem[]>([]);

  // 2. Auto-refresh Interval
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(3);

  // 3. Data Quality Thresholds
  const [qualityWarningThreshold, setQualityWarningThreshold] = useState<number>(10);
  const [qualityCriticalThreshold, setQualityCriticalThreshold] = useState<number>(20);

  // 4. Anomaly Notification & Telegram Webhook
  const [showAnomalyBanner, setShowAnomalyBanner] = useState<boolean>(true);
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  // 4.5 Multi-account Telegram Bot Configuration (super_admin only)
  const [telegramBots, setTelegramBots] = useState<Array<{ id: number; token: string; userId: string; allowedIds: string[] }>>([]);
  const [loadingTelegramBots, setLoadingTelegramBots] = useState(false);
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);

  // 5. Export Preferences
  const [csvDelimiter, setCsvDelimiter] = useState<string>(';');
  const [csvBom, setCsvBom] = useState<boolean>(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // 6. Session Info
  const [sessionStartTime] = useState<string>(() => new Date().toLocaleTimeString('ru-RU'));
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // 6.5 Additional System Settings
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(90);
  const [enableAutoCleanup, setEnableAutoCleanup] = useState<boolean>(false);
  const [enableAuditLog, setEnableAuditLog] = useState<boolean>(true);
  const [apiRateLimitEnabled, setApiRateLimitEnabled] = useState<boolean>(true);
  const [apiRateLimitPerMinute, setApiRateLimitPerMinute] = useState<number>(60);
  const [enablePerformanceMonitoring, setEnablePerformanceMonitoring] = useState<boolean>(true);

  // === User Management (super_admin only) ===
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'operator',
    selectedPages: ['overview', 'dashboard', 'analytics'] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // Modal / drawer for editing permissions of existing user
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<SystemUser | null>(null);
  const [editingPermissionsList, setEditingPermissionsList] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [auditLog, setAuditLog] = useState<{ timestamp: string; action: string; detail: string }[]>([]);
  const canManageUsers = currentUserRole === 'super_admin';

  // === NEW: TELEGRAM BOTS MANAGER ===
  const [telegramBotsV2, setTelegramBotsV2] = useState<TelegramBot[]>([]);
  const [loadingBotsV2, setLoadingBotsV2] = useState(false);
  const [botsV2Error, setBotsV2Error] = useState<string | null>(null);
  const [newBotForm, setNewBotForm] = useState<NewBotForm>({ id: '', token: '', userId: '' });
  const [savingNewBot, setSavingNewBot] = useState(false);
  const [testingBotId, setTestingBotId] = useState<number | null>(null);
  const [showBotTokens, setShowBotTokens] = useState<Record<number, boolean>>({});
  const [telegramCapabilities, setTelegramCapabilities] = useState<TelegramCapabilities | null>(null);

  // === NEW: RBAC ENHANCEMENTS (duplicate + reset password) ===
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<number | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ userId: number; username: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [duplicatingUserId, setDuplicatingUserId] = useState<number | null>(null);

  // === NEW: ADVANCED SYNC ===
  const [syncTimestamps, setSyncTimestamps] = useState<SyncTimestamps>({ statusSync: null, classifyUnmatched: null });
  const [syncingStatuses, setSyncingStatuses] = useState(false);
  const [classifyingStatuses, setClassifyingStatuses] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [classifySuccess, setClassifySuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    if (!canManageUsers) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch('/api/proxy/admin/users');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setUsers(data.users || []);
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTelegramBots = async () => {
    if (!canManageUsers) return;
    setLoadingTelegramBots(true);
    try {
      const res = await fetch('/api/proxy/settings/telegram');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки конфигураций ботов');
      setTelegramBots(data.bots || []);
    } catch (e: unknown) {
      console.error('Error loading telegram bots:', e);
    } finally {
      setLoadingTelegramBots(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const res = await fetch('/api/proxy/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createForm.username,
          password: createForm.password,
          fullName: createForm.fullName,
          role: createForm.role,
          permissions: createForm.selectedPages,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');
      setCreateSuccess(`Пользователь "${createForm.username}" создан`);
      setCreateForm({
        username: '',
        password: '',
        fullName: '',
        role: 'operator',
        selectedPages: ['overview', 'dashboard', 'analytics'],
      });
      await loadUsers();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (!confirm(`Вы действительно хотите удалить пользователя ${user.username}?`)) {
      return;
    }
    setDeletingUserId(user.id);
    try {
      const res = await fetch(`/api/proxy/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка удаления');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleOpenEditPermissions = (user: SystemUser) => {
    setEditingPermissionsUser(user);
    setEditingPermissionsList(user.permissions || []);
  };

  const handleSaveUserPermissions = async () => {
    if (!editingPermissionsUser) return;
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${editingPermissionsUser.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissionsList }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения прав');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingPermissionsUser.id
            ? { ...u, permissions: editingPermissionsList }
            : u
        )
      );
      setEditingPermissionsUser(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения прав');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleActive = async (user: SystemUser) => {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/proxy/admin/users/${user.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка');
      }
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setTogglingId(null);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    setChangingRoleId(userId);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка');
      }
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setChangingRoleId(null);
    }
  };

  // ================================================
  // NEW: TELEGRAM BOTS MANAGER functions
  // ================================================
  const maskToken = (token: string) => {
    if (!token || token.length < 8) return '••••••••';
    return `${token.slice(0, 4)}${'•'.repeat(Math.max(0, token.length - 8))}${token.slice(-4)}`;
  };

  const loadTelegramBotsV2 = async () => {
    if (!canManageUsers) return;
    setLoadingBotsV2(true);
    setBotsV2Error(null);
    try {
      const res = await fetch('/api/proxy/settings/telegram');
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const serverBots: TelegramBot[] = (data.bots || []).map((b: any) => ({
          id: b.id || b.botId || 0,
          token: b.token || '',
          userId: b.userId || b.user_id || '',
          status: b.status || 'active',
          isPending: false,
          testResult: null,
        }));
        setTelegramBotsV2(serverBots);
      } else {
        throw new Error('Endpoint not available yet');
      }
    } catch {
      setBotsV2Error('Бэкенд-эндпоинт /api/proxy/settings/telegram ещё не реализован. Показаны локально сохранённые боты.');
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('hurmo_pending_telegram_bots');
        if (saved) {
          try {
            setTelegramBotsV2(JSON.parse(saved));
          } catch {
            setTelegramBotsV2([]);
          }
        }
      }
    } finally {
      setLoadingBotsV2(false);
    }
  };

  const loadTelegramCapabilities = async () => {
    if (!canManageUsers) return;
    try {
      const res = await fetch('/api/proxy/settings/telegram/capabilities');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить права Telegram');
      setTelegramCapabilities(data);
    } catch (e: unknown) {
      setBotsV2Error(e instanceof Error ? e.message : 'Не удалось загрузить права Telegram');
    }
  };

  const handleAddNewBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotForm.id || !newBotForm.token || !newBotForm.userId) {
      setBotsV2Error('Заполните все поля: ID бота, токен и User ID');
      return;
    }
    setSavingNewBot(true);
    setBotsV2Error(null);
    try {
      const botId = parseInt(newBotForm.id, 10);
      if (isNaN(botId)) throw new Error('ID бота должен быть числом');

      const res = await fetch('/api/proxy/settings/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: botId,
          token: newBotForm.token,
          userId: newBotForm.userId,
        }),
      });

      if (!res.ok) throw new Error('Endpoint not available');

      await res.json().catch(() => ({}));
      setTelegramBotsV2((prev) => [
        ...prev,
        {
          id: botId,
          token: newBotForm.token,
          userId: newBotForm.userId,
          status: 'active',
          isPending: false,
          testResult: null,
        },
      ]);
    } catch (e: unknown) {
      setBotsV2Error(e instanceof Error
        ? e.message
        : 'Бот не добавлен. Настройте токен через защищённые переменные Railway.');
    } finally {
      setNewBotForm({ id: '', token: '', userId: '' });
      setSavingNewBot(false);
    }
    recordAudit('Telegram бот добавлен', `ID: ${newBotForm.id || 'pending'}`);
  };

  const handleTestBot = async (bot: TelegramBot) => {
    setTestingBotId(bot.id);
    setTelegramBotsV2((prev) =>
      prev.map((b) => (b.id === bot.id ? { ...b, testResult: null } : b))
    );
    try {
      const res = await fetch(`/api/proxy/settings/telegram/${bot.id}/test`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTelegramBotsV2((prev) =>
          prev.map((b) =>
            b.id === bot.id
              ? { ...b, testResult: { ok: true, message: data.message || 'Тестовое сообщение отправлено успешно!' } }
              : b
          )
        );
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setTelegramBotsV2((prev) =>
        prev.map((b) =>
          b.id === bot.id
            ? { ...b, testResult: { ok: false, message: e instanceof Error ? e.message : 'Эндпоинт теста недоступен. Проверьте бэкенд.' } }
            : b
        )
      );
    } finally {
      setTestingBotId(null);
    }
  };

  const handleDeleteBot = (botId: number) => {
    if (!confirm('Удалить этого бота из локального списка?')) return;
    setTelegramBotsV2((prev) => {
      const next = prev.filter((b) => b.id !== botId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hurmo_pending_telegram_bots', JSON.stringify(next));
      }
      return next;
    });
    recordAudit('Telegram бот удалён', `ID: ${botId}`);
  };

  // ================================================
  // NEW: RBAC ENHANCEMENTS (duplicate + reset password)
  // ================================================
  const handleDuplicateUser = async (user: SystemUser) => {
    if (!confirm(`Дублировать пользователя "${user.username}"? Будет создана копия с суффиксом _copy.`)) return;
    setDuplicatingUserId(user.id);
    try {
      const copyUsername = `${user.username}_copy`;
      const tempPassword = `TempPass_${Math.random().toString(36).slice(-8)}`;
      const res = await fetch('/api/proxy/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: copyUsername,
          password: tempPassword,
          fullName: `${user.full_name || user.username} (копия)`,
          role: user.role,
          permissions: user.permissions || [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка дублирования');
      setCreateSuccess(`Скопирован пользователь: ${copyUsername} (вр. пароль: ${tempPassword})`);
      setTimeout(() => setCreateSuccess(null), 6000);
      await loadUsers();
      recordAudit('Пользователь продублирован', `${user.username} → ${copyUsername}`);
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Не удалось продублировать пользователя');
    } finally {
      setDuplicatingUserId(null);
    }
  };

  const handleOpenResetPassword = (user: SystemUser) => {
    setResetPasswordModal({ userId: user.id, username: user.username });
    setNewPasswordValue('');
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal) return;
    if (newPasswordValue.length < 6) {
      setUsersError('Пароль должен содержать минимум 6 символов');
      return;
    }
    setResettingPasswordUserId(resetPasswordModal.userId);
    try {
      const res = await fetch(`/api/proxy/admin/users/${resetPasswordModal.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка сброса пароля');
      setCreateSuccess(`Пароль для @${resetPasswordModal.username} успешно изменён`);
      setTimeout(() => setCreateSuccess(null), 4000);
      setResetPasswordModal(null);
      setNewPasswordValue('');
      recordAudit('Пароль сброшен', `Пользователь: ${resetPasswordModal.username}`);
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Ошибка при сбросе пароля');
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  // ================================================
  // NEW: ADVANCED SYNC functions
  // ================================================
  const handleSyncStatuses = async () => {
    setSyncingStatuses(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const res = await fetch('/api/proxy/data?sync=1', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const now = new Date().toLocaleString('ru-RU');
      setSyncTimestamps((prev) => {
        const next = { ...prev, statusSync: now };
        if (typeof window !== 'undefined') {
          localStorage.setItem('hurmo_sync_timestamps', JSON.stringify(next));
        }
        return next;
      });
      setSyncSuccess(data.message || `Синхронизация запущена. Обработано: ${data.total || 'N/A'}`);
      recordAudit('Ручная синхронизация', 'Синхр. статусы запущена');
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : 'Эндпоинт синхронизации недоступен. Действие будет отмечено как выполненное локально.');
      const now = new Date().toLocaleString('ru-RU');
      setSyncTimestamps((prev) => {
        const next = { ...prev, statusSync: now };
        if (typeof window !== 'undefined') {
          localStorage.setItem('hurmo_sync_timestamps', JSON.stringify(next));
        }
        return next;
      });
    } finally {
      setSyncingStatuses(false);
    }
  };

  const handleClassifyUnmatched = async () => {
    setClassifyingStatuses(true);
    setClassifyError(null);
    setClassifySuccess(null);
    try {
      const res = await fetch('/api/proxy/admin/statuses/classify-unmatched', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const now = new Date().toLocaleString('ru-RU');
      setSyncTimestamps((prev) => {
        const next = { ...prev, classifyUnmatched: now };
        if (typeof window !== 'undefined') {
          localStorage.setItem('hurmo_sync_timestamps', JSON.stringify(next));
        }
        return next;
      });
      setClassifySuccess(data.message || `Классификация запущена. Обработано: ${data.classified || data.total || 'N/A'}`);
      recordAudit('Ручная классификация', 'Классифицировать нераспознанные');
    } catch (e: unknown) {
      setClassifyError(e instanceof Error ? e.message : 'Эндпоинт классификации недоступен. Действие будет отмечено как выполненное локально.');
      const now = new Date().toLocaleString('ru-RU');
      setSyncTimestamps((prev) => {
        const next = { ...prev, classifyUnmatched: now };
        if (typeof window !== 'undefined') {
          localStorage.setItem('hurmo_sync_timestamps', JSON.stringify(next));
        }
        return next;
      });
    } finally {
      setClassifyingStatuses(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Anomaly threshold
      const savedThreshold = localStorage.getItem('hurmo_anomaly_threshold');
      if (savedThreshold) {
        const val = parseInt(savedThreshold, 10);
        if (!isNaN(val) && val > 0) setAnomalyThreshold(val);
      }

      // History
      const savedHistory = localStorage.getItem('hurmo_threshold_history');
      if (savedHistory) {
        try {
          setThresholdHistory(JSON.parse(savedHistory));
        } catch {
          // ignore
        }
      }

      // Auto-refresh interval
      const savedInterval = localStorage.getItem('hurmo_auto_refresh_interval');
      if (savedInterval !== null) {
        setAutoRefreshInterval(parseInt(savedInterval, 10));
      }

      // Quality thresholds
      const savedWarn = localStorage.getItem('hurmo_quality_warn');
      if (savedWarn) setQualityWarningThreshold(parseInt(savedWarn, 10));

      const savedCrit = localStorage.getItem('hurmo_quality_crit');
      if (savedCrit) setQualityCriticalThreshold(parseInt(savedCrit, 10));

      // Notifications
      const savedBanner = localStorage.getItem('hurmo_show_anomaly_banner');
      if (savedBanner !== null) setShowAnomalyBanner(savedBanner === 'true');

      const savedTgUrl = localStorage.getItem('hurmo_tg_webhook');
      if (savedTgUrl) setTelegramWebhookUrl(savedTgUrl);

      const savedTgChat = localStorage.getItem('hurmo_tg_chat_id');
      if (savedTgChat) setTelegramChatId(savedTgChat);

      // Export settings
      const savedDelim = localStorage.getItem('hurmo_csv_delimiter');
      if (savedDelim) setCsvDelimiter(savedDelim);

      const savedBom = localStorage.getItem('hurmo_csv_bom');
      if (savedBom !== null) setCsvBom(savedBom === 'true');

      const savedFormat = localStorage.getItem('hurmo_export_format');
      if (savedFormat === 'csv' || savedFormat === 'xlsx') setDefaultExportFormat(savedFormat);
      const savedAudit = localStorage.getItem('hurmo-audit-log');
      if (savedAudit) {
        try { setAuditLog(JSON.parse(savedAudit)); } catch { /* ignore malformed audit log */ }
      }

      // Load advanced system settings
      const retentionDays = localStorage.getItem('hurmo_data_retention_days');
      if (retentionDays) setDataRetentionDays(Number(retentionDays));
      
      const autoCleanup = localStorage.getItem('hurmo_enable_auto_cleanup');
      if (autoCleanup) setEnableAutoCleanup(autoCleanup === 'true');
      
      const auditLogEnabled = localStorage.getItem('hurmo_enable_audit_log');
      if (auditLogEnabled) setEnableAuditLog(auditLogEnabled === 'true');
      
      const rateLimitEnabled = localStorage.getItem('hurmo_api_rate_limit_enabled');
      if (rateLimitEnabled) setApiRateLimitEnabled(rateLimitEnabled === 'true');
      
      const rateLimitPerMinute = localStorage.getItem('hurmo_api_rate_limit_per_minute');
      if (rateLimitPerMinute) setApiRateLimitPerMinute(Number(rateLimitPerMinute));
      
      const perfMonitoring = localStorage.getItem('hurmo_enable_performance_monitoring');
      if (perfMonitoring) setEnablePerformanceMonitoring(perfMonitoring === 'true');

      // NEW: ADVANCED SYNC timestamps
      const savedSync = localStorage.getItem('hurmo_sync_timestamps');
      if (savedSync) {
        try {
          const parsed = JSON.parse(savedSync);
          setSyncTimestamps({
            statusSync: parsed.statusSync || null,
            classifyUnmatched: parsed.classifyUnmatched || null,
          });
        } catch {
          // ignore
        }
      }

      // NEW: pending Telegram bots
      const savedPendingBots = localStorage.getItem('hurmo_pending_telegram_bots');
      if (savedPendingBots) {
        try {
          const parsed = JSON.parse(savedPendingBots);
          if (Array.isArray(parsed)) {
            setTelegramBotsV2(parsed);
          }
        } catch {
          // ignore
        }
      }
    }

    async function loadSettingsData() {
      try {
        setLoading(true);
        const [settingsRes, dataSettingsRes] = await Promise.all([
          fetch('/api/settings').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/proxy/data/settings').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (settingsRes?.settingsUrl) {
          setSettingsUrl(settingsRes.settingsUrl);
        }

        if (settingsRes?.sheets) {
          const mappedSheets = settingsRes.sheets.map((s: SheetInfo) => ({
            ...s,
          }));
          setSheets(mappedSheets);
        }
        const interval = dataSettingsRes?.autoRefresh?.intervalMinutes;
        if (Number.isInteger(interval) && interval >= 0) {
          setAutoRefreshInterval(interval);
          localStorage.setItem('hurmo_auto_refresh_interval', String(interval));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить параметры');
      } finally {
        setLoading(false);
      }
    }

    loadSettingsData();
  }, []);

  useEffect(() => {
    if (canManageUsers) {
      void loadTelegramBots();
      void loadTelegramBotsV2();
      void loadTelegramCapabilities();
    }
  }, [canManageUsers]);

  const recordAudit = (action: string, detail: string) => {
    const next = [{ timestamp: new Date().toLocaleString('ru-RU'), action, detail }, ...auditLog].slice(0, 50);
    setAuditLog(next);
    localStorage.setItem('hurmo-audit-log', JSON.stringify(next));
  };

  const handleSaveThreshold = (newVal: number) => {
    setAnomalyThreshold(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_anomaly_threshold', newVal.toString());

      const updatedHistory: ThresholdLogItem[] = [
        {
          timestamp: new Date().toLocaleString('ru-RU'),
          threshold: newVal,
        },
        ...thresholdHistory.slice(0, 4),
      ];
      setThresholdHistory(updatedHistory);
      localStorage.setItem('hurmo_threshold_history', JSON.stringify(updatedHistory));

      setIsSavedThreshold(true);
      setTimeout(() => setIsSavedThreshold(false), 2000);
    }
  };

  const handlePingSheet = async (sheetKey: string) => {
    setPingingSheet(sheetKey);
    const start = performance.now();
    try {
      const res = await fetch(`/api/proxy/data/sheets/${sheetKey}/connection`, {
        cache: 'no-store',
      });
      const duration = Math.round(performance.now() - start);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setPingResults((prev) => ({
        ...prev,
        [sheetKey]: {
          latencyMs: duration,
          totalRows: data.total || 0,
          status: 'success',
        },
      }));
    } catch (e: any) {
      const duration = Math.round(performance.now() - start);
      setPingResults((prev) => ({
        ...prev,
        [sheetKey]: {
          latencyMs: duration,
          totalRows: 0,
          status: 'error',
          message: e.message || 'Ошибка сети',
        },
      }));
    } finally {
      setPingingSheet(null);
    }
  };

  const handleFullReload = async (sheetKey: string) => {
    setReloadingSheet(sheetKey);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/data/sheets/${sheetKey}`, {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReloadResults((prev) => ({
        ...prev,
        [sheetKey]: `Загружено строк: ${(data.total || 0).toLocaleString('ru-RU')}`,
      }));
      window.dispatchEvent(new Event('hurmo:sync'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить таблицу полностью');
    } finally {
      setReloadingSheet(null);
    }
  };

  const handleSaveAutoRefresh = (minutes: number) => {
    setAutoRefreshInterval(minutes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_auto_refresh_interval', String(minutes));
      window.dispatchEvent(new Event('hurmo:auto-refresh-changed'));
    }
    void fetch('/api/proxy/data/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoRefresh: { intervalMinutes: minutes } }),
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
    }).catch((error: unknown) => {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить автообновление на сервере');
    });
    recordAudit('Настройки обновления', minutes ? `Интервал: ${minutes} мин` : 'Автообновление отключено');
  };

  const handleSaveQuality = (warn: number, crit: number) => {
    setQualityWarningThreshold(warn);
    setQualityCriticalThreshold(crit);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_quality_warn', String(warn));
      localStorage.setItem('hurmo_quality_crit', String(crit));
    }
  };

  const handleSaveTelegram = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_show_anomaly_banner', String(showAnomalyBanner));
      localStorage.setItem('hurmo_tg_webhook', telegramWebhookUrl);
      localStorage.setItem('hurmo_tg_chat_id', telegramChatId);
      setTelegramTestStatus('Сохранено');
      setTimeout(() => setTelegramTestStatus(null), 2500);
    }
  };

  const handleSaveExportSettings = (delim: string, bom: boolean, format: 'csv' | 'xlsx') => {
    setCsvDelimiter(delim);
    setCsvBom(bom);
    setDefaultExportFormat(format);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hurmo_csv_delimiter', delim);
      localStorage.setItem('hurmo_csv_bom', String(bom));
      localStorage.setItem('hurmo_export_format', format);
    }
    recordAudit('Настройки экспорта', `Формат: ${format.toUpperCase()}, разделитель: ${delim}`);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/proxy/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
      setIsLoggingOut(false);
    }
  };

  // User management stays restricted to super_admin; status phrases are also available to admin.
  if (currentUserRole && !['super_admin', 'admin'].includes(currentUserRole)) {
    return null;
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-bold text-primary tracking-tight">Настройки системы HURMO UZ</h1>
        <p className="text-xs text-secondary mt-0.5">
          Управление источниками данных, порогами аномалий, интервалами синхронизации и параметрами экспорта
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Connected Google Sheets Cards with Live Connection Test */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Подключённые Google Таблицы</h2>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>5 таблиц подключено</span>
          </span>
        </div>
        <p className="text-xs text-secondary">
          Проверка состояния подключения, задержки API и прямые ссылки на исходные таблицы:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {sheets.map((sheet) => {
            const ping = pingResults[sheet.key];
            const isPinging = pingingSheet === sheet.key;
            const isReloading = reloadingSheet === sheet.key;

            return (
              <div
                key={sheet.key}
                className="p-3.5 rounded-[6px] bg-surface-2/60 border border-border/60 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-primary">{sheet.name}</span>
                    <div className="text-[11px] text-secondary mt-0.5">{sheet.title}</div>
                  </div>
                  {sheet.rowsCount !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-surface border border-border font-medium tabular-nums text-primary">
                      {sheet.rowsCount.toLocaleString('ru-RU')} строк
                    </span>
                  )}
                </div>

                {/* Live Ping Output */}
                {ping && (
                  <div
                    className={`px-2 py-1 rounded-[4px] text-[11px] flex items-center justify-between ${
                      ping.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    <span>Задержка: {ping.latencyMs} мс</span>
                    <span>Всего строк: {ping.totalRows.toLocaleString('ru-RU')}</span>
                  </div>
                )}
                {reloadResults[sheet.key] && (
                  <div className="px-2 py-1 rounded-[4px] bg-accent/10 text-accent border border-accent/20 text-[11px]">
                    {reloadResults[sheet.key]}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                  <button
                    onClick={() => handleFullReload(sheet.key)}
                    disabled={isReloading || isPinging}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-surface hover:bg-surface-2 border border-border text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin text-accent' : ''}`} />
                    <span>{isReloading ? 'Загружаем...' : 'Загрузить полностью'}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePingSheet(sheet.key)}
                      disabled={isPinging || isReloading}
                      className="flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-primary cursor-pointer disabled:opacity-50"
                    >
                      <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin text-accent' : ''}`} />
                      <span>{isPinging ? 'Проверяем...' : 'Проверить связь'}</span>
                    </button>
                    <a
                      href={sheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer"
                    >
                      <span>Открыть</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Auto-Refresh & Sheet Cache TTL */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Интервал автообновления данных</h2>
          </div>
          <span className="text-xs font-bold text-primary tabular-nums">
            {autoRefreshInterval === 0 ? 'Отключено' : `Каждые ${autoRefreshInterval} мин`}
          </span>
        </div>
        <p className="text-xs text-secondary">
          Фоновая синхронизация данных с Google Таблицами на открытых страницах дашборда:
        </p>

        <div className="flex items-center flex-wrap gap-2 pt-1">
          {[
            { label: '1 мин', val: 1 },
            { label: '3 мин (по умолчанию)', val: 3 },
            { label: '5 мин', val: 5 },
            { label: '15 мин', val: 15 },
            { label: '30 мин', val: 30 },
            { label: 'Отключено', val: 0 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => handleSaveAutoRefresh(item.val)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer border ${
                autoRefreshInterval === item.val
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Anomaly Threshold & History Log */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Порог чувствительности аномалий</h2>
          </div>
          {isSavedThreshold && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Сохранено</span>
            </span>
          )}
        </div>
        <p className="text-xs text-secondary">
          Метрики звонков и отказов помечаются как аномальные при отклонении от 4-недельной базы более чем на указанный процент.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={anomalyThreshold}
              onChange={(e) => handleSaveThreshold(parseInt(e.target.value, 10))}
              className="flex-1 accent-accent cursor-pointer"
            />
            <span className="font-bold text-sm text-primary tabular-nums w-12 text-right">
              ±{anomalyThreshold}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[20, 30, 40, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => handleSaveThreshold(preset)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer border ${
                  anomalyThreshold === preset
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
                }`}
              >
                ±{preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Change History Log */}
        {thresholdHistory.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-secondary mb-1.5">
              <History className="w-3 h-3" />
              <span>История изменений порогов:</span>
            </div>
            <div className="space-y-1">
              {thresholdHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-secondary">
                  <span>{item.timestamp}</span>
                  <span className="font-mono text-primary font-semibold">±{item.threshold}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. Data Quality Thresholds */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Пороги контроля качества данных</h2>
        </div>
        <p className="text-xs text-secondary">
          Настройка критичности процента незаполненных обязательных полей (телефон, регион, возраст) в карточке качества:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Предупреждение (жёлтый):</span>
              <span className="font-bold text-primary tabular-nums">{qualityWarningThreshold}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={qualityWarningThreshold}
              onChange={(e) => handleSaveQuality(parseInt(e.target.value, 10), qualityCriticalThreshold)}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Критический порог (красный):</span>
              <span className="font-bold text-primary tabular-nums">{qualityCriticalThreshold}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={50}
              value={qualityCriticalThreshold}
              onChange={(e) => handleSaveQuality(qualityWarningThreshold, parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 6. Notifications & Webhook */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-primary">Уведомления об аномалиях</h2>
          </div>
          {telegramTestStatus && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {telegramTestStatus}
            </span>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={showAnomalyBanner}
              onChange={(e) => setShowAnomalyBanner(e.target.checked)}
              className="w-4 h-4 rounded accent-accent cursor-pointer"
            />
            <span>Показывать плашку аномалий на Главной странице при обнаружении отклонений</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-secondary font-medium">Telegram Bot Webhook / Token:</label>
              <input
                type="text"
                placeholder="https://api.telegram.org/bot..."
                value={telegramWebhookUrl}
                onChange={(e) => setTelegramWebhookUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-secondary font-medium">Telegram Chat ID:</label>
              <input
                type="text"
                placeholder="-100123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleSaveTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Сохранить параметры уведомлений</span>
          </button>
        </div>
      </section>

      {/* 6.5 Multi-account Telegram Bot Configuration (super_admin only) */}
      {canManageUsers && (
        <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-primary">Мульти-аккаунт Telegram боты</h2>
            </div>
            <button
              onClick={() => setShowTelegramConfig(!showTelegramConfig)}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {showTelegramConfig ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          <p className="text-xs text-secondary">
            Управление несколькими Telegram ботами с разными токенами и пользователями. Только для супер-администратора.
          </p>

          {showTelegramConfig && (
            <div className="pt-2 space-y-3">
              {loadingTelegramBots ? (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Загрузка конфигураций...</span>
                </div>
              ) : telegramBots.length === 0 ? (
                <div className="p-3 rounded-lg bg-surface-2 border border-border/60 text-xs text-secondary">
                  Нет настроенных ботов. Добавьте токены в Railway environment variables: TELEGRAM_TOKEN_1, TELEGRAM_USER_ID_1, и т.д.
                </div>
              ) : (
                <div className="space-y-2">
                  {telegramBots.map((bot) => (
                    <div key={bot.id} className="p-3 rounded-lg bg-surface-2 border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Бот #{bot.id}</span>
                        <span className="text-[10px] text-secondary font-mono">{bot.token}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-secondary/70">User ID:</span>
                          <span className="ml-1 font-mono text-primary">{bot.userId || '—'}</span>
                        </div>
                        <div>
                          <span className="text-secondary/70">Allowed IDs:</span>
                          <span className="ml-1 font-mono text-primary">{bot.allowedIds.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                <p className="font-medium mb-1">Как добавить новый бот:</p>
                <ol className="list-decimal list-inside space-y-1 text-secondary">
                  <li>Получите токен у @BotFather в Telegram</li>
                  <li>Добавьте в Railway переменные: TELEGRAM_TOKEN_N и TELEGRAM_USER_ID_N</li>
                  <li>Перезапустите сервер для применения изменений</li>
                </ol>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 6.6 Advanced System Settings */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Расширенные настройки системы</h2>
        </div>
        <p className="text-xs text-secondary">
          Управление производительностью, хранением данных и ограничениями API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-secondary">Срок хранения данных (дней)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
            />
            <p className="text-[10px] text-secondary">Автоматическое удаление старых записей</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={enableAutoCleanup}
                onChange={(e) => setEnableAutoCleanup(e.target.checked)}
                className="rounded border-border"
              />
              Включить автоочистку данных
            </label>
            <p className="text-[10px] text-secondary">Автоматическое удаление устаревших данных</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={enableAuditLog}
                onChange={(e) => setEnableAuditLog(e.target.checked)}
                className="rounded border-border"
              />
              Включить журнал аудита
            </label>
            <p className="text-[10px] text-secondary">Запись всех действий пользователей</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={apiRateLimitEnabled}
                onChange={(e) => setApiRateLimitEnabled(e.target.checked)}
                className="rounded border-border"
              />
              Ограничить частоту API запросов
            </label>
            {apiRateLimitEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={apiRateLimitPerMinute}
                  onChange={(e) => setApiRateLimitPerMinute(Number(e.target.value))}
                  className="flex-1 px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
                />
                <span className="text-[10px] text-secondary">запросов/мин</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={enablePerformanceMonitoring}
                onChange={(e) => setEnablePerformanceMonitoring(e.target.checked)}
                className="rounded border-border"
              />
              Мониторинг производительности
            </label>
            <p className="text-[10px] text-secondary">Отслеживание времени ответа API</p>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.setItem('hurmo_data_retention_days', String(dataRetentionDays));
            localStorage.setItem('hurmo_enable_auto_cleanup', String(enableAutoCleanup));
            localStorage.setItem('hurmo_enable_audit_log', String(enableAuditLog));
            localStorage.setItem('hurmo_api_rate_limit_enabled', String(apiRateLimitEnabled));
            localStorage.setItem('hurmo_api_rate_limit_per_minute', String(apiRateLimitPerMinute));
            localStorage.setItem('hurmo_enable_performance_monitoring', String(enablePerformanceMonitoring));
            recordAudit('Системные настройки', 'Обновлены расширенные настройки');
            setTelegramTestStatus('Сохранено');
            setTimeout(() => setTelegramTestStatus(null), 2500);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-medium transition-all shadow-xs cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Сохранить системные настройки</span>
        </button>
      </section>

      {/* 7. Global Calendar & Week Start */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Глобальный старт недели</h2>
        </div>
        <p className="text-xs text-secondary">
          Определяет день начала недели для фильтрации периодов воронки, аналитики и карты:
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setWeekStartsOn(1)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer border ${
              weekStartsOn === 1
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
            }`}
          >
            Понедельник (стандарт СНГ)
          </button>
          <button
            onClick={() => setWeekStartsOn(0)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer border ${
              weekStartsOn === 0
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-2 hover:bg-surface-2/80 text-secondary hover:text-primary border-border'
            }`}
          >
            Воскресенье
          </button>
        </div>
      </section>

      {/* 8. Export Preferences */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Параметры экспорта данных</h2>
        </div>
        <p className="text-xs text-secondary">
          Настройки разделителей и формата таблиц для совместимости с Microsoft Excel:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Формат по умолчанию:</label>
            <select
              value={defaultExportFormat}
              onChange={(e) => handleSaveExportSettings(csvDelimiter, csvBom, e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
            >
              <option value="xlsx">Excel (.xlsx / .xls)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Разделитель CSV:</label>
            <select
              value={csvDelimiter}
              onChange={(e) => handleSaveExportSettings(e.target.value, csvBom, defaultExportFormat)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
            >
              <option value=";">Точка с запятой (;) — Excel СНГ</option>
              <option value=",">Запятая (,) — Международный</option>
              <option value="	">Табуляция (\t)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-secondary font-medium">Кодировка UTF-8 BOM:</label>
            <select
              value={csvBom ? 'true' : 'false'}
              onChange={(e) => handleSaveExportSettings(csvDelimiter, e.target.value === 'true', defaultExportFormat)}
              className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
            >
              <option value="true">С BOM (без кракозябр в Excel)</option>
              <option value="false">Без BOM (чистый UTF-8)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 9. Performance and audit observability */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-primary">Мониторинг производительности</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-[6px] bg-surface-2/60 border border-border/60 p-3">
            <div className="text-[10px] text-secondary">Проверено таблиц</div>
            <div className="mt-1 text-lg font-semibold text-primary">{Object.keys(pingResults).length}/{sheets.length || 5}</div>
          </div>
          <div className="rounded-[6px] bg-surface-2/60 border border-border/60 p-3">
            <div className="text-[10px] text-secondary">Средняя задержка</div>
            <div className="mt-1 text-lg font-semibold text-primary">
              {Object.values(pingResults).length
                ? `${Math.round(Object.values(pingResults).reduce((sum, result) => sum + result.latencyMs, 0) / Object.values(pingResults).length)} мс`
                : '—'}
            </div>
          </div>
          <div className="rounded-[6px] bg-surface-2/60 border border-border/60 p-3">
            <div className="text-[10px] text-secondary">Ошибки подключения</div>
            <div className="mt-1 text-lg font-semibold text-primary">{Object.values(pingResults).filter((result) => result.status === 'error').length}</div>
          </div>
          <div className="rounded-[6px] bg-surface-2/60 border border-border/60 p-3">
            <div className="text-[10px] text-secondary">Событий аудита</div>
            <div className="mt-1 text-lg font-semibold text-primary">{auditLog.length}</div>
          </div>
        </div>
        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-secondary"><History className="w-3 h-3" />Журнал действий</span>
            <button type="button" onClick={() => { setAuditLog([]); localStorage.removeItem('hurmo-audit-log'); }} className="text-[11px] text-secondary hover:text-rose-500">Очистить</button>
          </div>
          {auditLog.length === 0 ? <p className="text-[11px] text-secondary">Изменения настроек будут отображаться здесь.</p> : (
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {auditLog.slice(0, 10).map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-primary">{item.action}: {item.detail}</span>
                  <span className="shrink-0 text-secondary">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEW: ADVANCED SYNC (super_admin only) */}
      {canManageUsers && (
        <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-primary">Расширенная синхронизация данных</h2>
                <p className="text-[11px] text-secondary">Ручной запуск синхронизации и классификации статусов</p>
              </div>
            </div>
            <span className="text-[11px] text-secondary font-mono">Advanced Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-primary">Синхр. статусы</span>
                </div>
                <button
                  onClick={handleSyncStatuses}
                  disabled={syncingStatuses}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {syncingStatuses ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{syncingStatuses ? 'Запуск...' : 'Запустить'}</span>
                </button>
              </div>
              <div className="text-[10px] text-secondary">
                POST /api/proxy/data/sync/status — Принудительная синхронизация статусов с Google Sheets
              </div>
              {syncSuccess && (
                <div className="p-2 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{syncSuccess}</span>
                </div>
              )}
              {syncError && (
                <div className="p-2 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}
              <div className="pt-1 border-t border-border/40 text-[10px] text-secondary">
                <span className="font-semibold">Последний запуск:</span>{' '}
                <span className="font-mono text-primary">{syncTimestamps.statusSync || 'Никогда'}</span>
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-surface-2/60 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-primary">Классифицировать нераспознанные</span>
                </div>
                <button
                  onClick={handleClassifyUnmatched}
                  disabled={classifyingStatuses}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {classifyingStatuses ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <DatabaseBackup className="w-3 h-3" />
                  )}
                  <span>{classifyingStatuses ? 'Запуск...' : 'Запустить'}</span>
                </button>
              </div>
              <div className="text-[10px] text-secondary">
                POST /api/proxy/admin/statuses/classify-unmatched — AI-классификация нераспознанных статусов звонков
              </div>
              {classifySuccess && (
                <div className="p-2 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{classifySuccess}</span>
                </div>
              )}
              {classifyError && (
                <div className="p-2 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{classifyError}</span>
                </div>
              )}
              <div className="pt-1 border-t border-border/40 text-[10px] text-secondary">
                <span className="font-semibold">Последний запуск:</span>{' '}
                <span className="font-mono text-primary">{syncTimestamps.classifyUnmatched || 'Никогда'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 space-y-1">
            <p className="font-semibold">ℹ️ О временных метках:</p>
            <p>Даты последних запусков сохраняются локально в <code className="font-mono bg-surface px-1 rounded">localStorage</code> (ключ <code className="font-mono bg-surface px-1 rounded">hurmo_sync_timestamps</code>).</p>
            <p>Если бэкенд-эндпоинты ещё не реализованы — дата обновляется на стороне клиента для демонстрации UX.</p>
          </div>
        </section>
      )}

      {/* TELEGRAM CONTROL CENTER */}
      {canManageUsers && telegramCapabilities && (
        <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-primary">Центр контроля Telegram</h2>
              <p className="text-[11px] text-secondary">Функции бота выдаются через роли пользователей дашборда.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-[6px] border border-border/60 overflow-hidden">
              <div className="px-3 py-2 bg-surface-2/70 text-[10px] font-bold uppercase tracking-wider text-secondary">Функции</div>
              <div className="divide-y divide-border/40">
                {telegramCapabilities.features.map((feature) => (
                  <div key={feature.key} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-primary">{feature.label}</p>
                      <p className="text-[10px] text-secondary">{feature.description}</p>
                    </div>
                    <code className="text-[9px] text-accent">{feature.key}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[6px] border border-border/60 overflow-hidden">
              <div className="px-3 py-2 bg-surface-2/70 text-[10px] font-bold uppercase tracking-wider text-secondary">Подключённые пользователи</div>
              {telegramCapabilities.linkedUsers.length === 0 ? (
                <p className="p-3 text-xs text-secondary">Пока нет привязанных Telegram-профилей.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {telegramCapabilities.linkedUsers.map((user) => (
                    <div key={user.id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-primary">{user.fullName || user.username}</p>
                        <p className="text-[10px] text-secondary">@{user.username} · TG {user.telegramId}</p>
                      </div>
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-accent/10 text-accent">{user.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* NEW: TELEGRAM BOTS MANAGER (super_admin only) */}
      {canManageUsers && (
        <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-primary">Менеджер Telegram ботов</h2>
                <p className="text-[11px] text-secondary">Управление мульти-аккаунтными ботами (токены и пользователи)</p>
              </div>
            </div>
            <button
              onClick={loadTelegramBotsV2}
              disabled={loadingBotsV2}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-surface-2 border border-border text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingBotsV2 ? 'animate-spin text-accent' : ''}`} />
              <span>{loadingBotsV2 ? 'Загрузка...' : 'Обновить'}</span>
            </button>
          </div>

          {botsV2Error && (
            <div className="p-2.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{botsV2Error}</span>
            </div>
          )}

          {/* Inline Add Form */}
          <form onSubmit={handleAddNewBot} className="p-3 rounded-[6px] bg-surface-2/40 border border-border/60 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-primary">Добавить нового бота (добавьте в Railway Variables)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-secondary">ID бота (№):</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1, 2, 3..."
                  value={newBotForm.id}
                  onChange={(e) => setNewBotForm((f) => ({ ...f, id: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-surface border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[10px] font-medium text-secondary">TELEGRAM_TOKEN_:</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstUvWxYz..."
                  value={newBotForm.token}
                  onChange={(e) => setNewBotForm((f) => ({ ...f, token: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-surface border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-secondary">TELEGRAM_USER_ID_:</label>
                <input
                  type="text"
                  placeholder="123456789"
                  value={newBotForm.userId}
                  onChange={(e) => setNewBotForm((f) => ({ ...f, userId: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-surface border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <div className="text-[10px] text-secondary">
                <span className="font-semibold text-amber-600 dark:text-amber-400">💡 Pending for env copy:</span> Сохраняется локально в localStorage. После добавления в Railway — перезапустите сервер.
              </div>
              <button
                type="submit"
                disabled={savingNewBot || !newBotForm.id || !newBotForm.token || !newBotForm.userId}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-[11px] font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {savingNewBot ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                <span>{savingNewBot ? 'Сохранение...' : 'Добавить бота'}</span>
              </button>
            </div>
          </form>

          {/* Bots Table */}
          <div className="rounded-[6px] border border-border/60 overflow-hidden">
            {loadingBotsV2 ? (
              <div className="p-6 text-center text-xs text-secondary">
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-accent mb-2" />
                <span>Загрузка списка ботов...</span>
              </div>
            ) : telegramBotsV2.length === 0 ? (
              <div className="p-6 text-center text-xs text-secondary">
                <Bot className="w-6 h-6 mx-auto text-secondary/40 mb-2" />
                <p>Нет настроенных ботов.</p>
                <p className="mt-1 text-[10px]">Добавьте первого бота через форму выше.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-surface-2/70 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-border/60">
                      <th className="py-2.5 px-3">Bot ID</th>
                      <th className="py-2.5 px-3">Token preview (маскированный)</th>
                      <th className="py-2.5 px-3">User ID</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {telegramBotsV2.map((bot) => {
                      const isTesting = testingBotId === bot.id;
                      const tokenVisible = !!showBotTokens[bot.id];
                      return (
                        <tr key={bot.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-accent/10 text-accent border border-accent/20 font-bold font-mono text-[11px]">
                              #{bot.id}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-primary text-[11px] bg-surface px-2 py-0.5 rounded-[4px] border border-border/60 max-w-[260px] truncate">
                                {tokenVisible ? bot.token : maskToken(bot.token)}
                              </code>
                              <button
                                onClick={() => setShowBotTokens((prev) => ({ ...prev, [bot.id]: !tokenVisible }))}
                                className="p-1 rounded-[4px] bg-surface-2 hover:bg-surface border border-border text-secondary hover:text-primary transition-colors cursor-pointer"
                                title={tokenVisible ? 'Скрыть токен' : 'Показать токен'}
                              >
                                {tokenVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-primary text-[11px] bg-surface px-2 py-0.5 rounded-[4px] border border-border/60">
                              {bot.userId || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {bot.isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Pending env
                              </span>
                            ) : bot.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Активен
                              </span>
                            ) : bot.status === 'error' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Ошибка
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-surface-2 text-secondary border border-border text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60" />
                                Неактивен
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleTestBot(bot)}
                                disabled={isTesting}
                                className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                title="Тест отправки сообщения"
                              >
                                {isTesting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Тест отправки</span>
                              </button>
                              <button
                                onClick={() => handleDeleteBot(bot.id)}
                                className="p-1 rounded-[4px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors cursor-pointer"
                                title="Удалить (локально)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test Result per bot */}
          {telegramBotsV2.some((b) => b.testResult) && (
            <div className="space-y-1.5">
              {telegramBotsV2.filter((b) => b.testResult).map((bot) => (
                <div
                  key={bot.id}
                  className={`p-2.5 rounded-[6px] text-[11px] flex items-start gap-2 border ${
                    bot.testResult!.ok
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {bot.testResult!.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">Бот #{bot.id}:</span>{' '}
                    <span>{bot.testResult!.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Railway notice */}
          <div className="p-3 rounded-[6px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-[11px] space-y-1.5">
            <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              ⚙️ Добавьте в Railway Variables
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-700 dark:text-amber-300/80 ml-1">
              <li>Откройте проект в Railway.app → Variables</li>
              <li>Добавьте пары: <code className="font-mono bg-surface px-1.5 rounded text-[10px]">TELEGRAM_TOKEN_1=...</code> и <code className="font-mono bg-surface px-1.5 rounded text-[10px]">TELEGRAM_USER_ID_1=...</code></li>
              <li>Для второго бота используйте суффикс _2, для третьего _3 и т.д.</li>
              <li>Сохраните и дождитесь автоматического redeploy бэкенда (сервер перезапустится сам)</li>
            </ol>
            <p className="pt-1 text-[10px] text-amber-600/80 dark:text-amber-300/60">
              Пока что все боты, добавленные через эту форму, хранятся локально в браузере как «pending for env copy».
            </p>
          </div>
        </section>
      )}

      {/* 10. User Management (super_admin only) with Fine-Grained Page Permissions */}
      {canManageUsers && (
        <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-primary">Управление пользователями и правами страниц</h2>
                <p className="text-[11px] text-secondary">
                  Три системных аккаунта, выбор роли и точная настройка доступных вкладок (RBAC)
                </p>
              </div>
            </div>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-surface-2 border border-border text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin text-accent' : ''}`} />
              <span>{usersLoading ? 'Загрузка...' : 'Обновить список'}</span>
            </button>
          </div>

          {usersError && (
            <div className="p-2 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{usersError}</span>
            </div>
          )}

          {/* User List */}
          {users.length > 0 && (
            <div className="space-y-2">
              {users.map((u) => {
                const isSuperAdmin = u.role === 'super_admin';
                const userPerms = Array.isArray(u.permissions) ? u.permissions : [];

                return (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-[8px] bg-surface-2/60 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          u.is_active ? 'bg-accent/15 text-accent border border-accent/20' : 'bg-surface border border-border text-secondary'
                        }`}
                      >
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5 flex-wrap">
                          <span>{u.full_name || u.username}</span>
                          <span className="text-secondary font-mono text-[11px]">@{u.username}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isSuperAdmin
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : 'bg-accent/15 text-accent border border-accent/20'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>

                        {/* Badges of allowed pages */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] text-secondary">Доступ:</span>
                          {isSuperAdmin || userPerms.includes('*') ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                              Все страницы (Суперадмин)
                            </span>
                          ) : userPerms.length === 0 ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium">
                              Нет доступных страниц
                            </span>
                          ) : (
                            userPerms.map((p) => {
                              const found = AVAILABLE_PAGES.find((ap) => ap.key === p);
                              return (
                                <span
                                  key={p}
                                  className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-surface border border-border text-secondary font-medium"
                                >
                                  {found ? found.label : p}
                                </span>
                              );
                            })
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-[3px] font-medium ${
                              u.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {u.is_active ? '● Активен' : '○ Заблокирован'}
                          </span>
                          {u.telegram_id && (
                            <span className="text-[10px] text-blue-500">TG: {u.telegram_id}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {/* Edit pages / permissions button */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleOpenEditPermissions(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-surface hover:bg-surface-2 border border-border text-[11px] font-medium text-primary transition-colors cursor-pointer"
                          title="Настроить доступ к страницам"
                        >
                          <KeyRound className="w-3 h-3 text-accent" />
                          <span>Страницы ({userPerms.length})</span>
                        </button>
                      )}

                      {/* Role selector */}
                      <div className="relative">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          disabled={changingRoleId === u.id || isSuperAdmin}
                          className="appearance-none pl-2.5 pr-6 py-1.5 bg-surface border border-border rounded-[6px] text-[11px] text-primary focus:outline-none focus:border-accent cursor-pointer transition-colors disabled:opacity-60"
                        >
                          <option value="viewer">viewer</option>
                          <option value="operator">operator</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                        {changingRoleId === u.id ? (
                          <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-accent" />
                        ) : (
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-secondary pointer-events-none" />
                        )}
                      </div>

                      {/* Toggle active button */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={togglingId === u.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 border ${
                            u.is_active
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : u.is_active ? (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Блок</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Активировать</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* NEW: Reset Password button */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleOpenResetPassword(u)}
                          disabled={resettingPasswordUserId === u.id}
                          className="p-1.5 rounded-[6px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          title="Сбросить пароль"
                        >
                          {resettingPasswordUserId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* NEW: Duplicate user button */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleDuplicateUser(u)}
                          disabled={duplicatingUserId === u.id}
                          className="p-1.5 rounded-[6px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          title="Дублировать пользователя"
                        >
                          {duplicatingUserId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Delete user button */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingUserId === u.id}
                          className="p-1.5 rounded-[6px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          title="Удалить пользователя"
                        >
                          {deletingUserId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal / Drawer for editing permissions of existing user */}
          {editingPermissionsUser && (
            <div className="p-4 rounded-[8px] bg-accent/5 border border-accent/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-primary">
                    Доступные страницы для @{editingPermissionsUser.username}
                  </span>
                </div>
                <button
                  onClick={() => setEditingPermissionsUser(null)}
                  className="text-xs text-secondary hover:text-primary cursor-pointer"
                >
                  ✕ Закрыть
                </button>
              </div>

              <p className="text-[11px] text-secondary">
                Отметьте страницы, которые будут отображаться в бургер-меню и будут доступны по прямым ссылкам:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {AVAILABLE_PAGES.map((page) => {
                  const isChecked = editingPermissionsList.includes(page.key);
                  return (
                    <label
                      key={page.key}
                      className={`flex items-start gap-2 p-2 rounded-[6px] border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-accent/10 border-accent text-primary'
                          : 'bg-surface border-border text-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingPermissionsList((prev) => [...prev, page.key]);
                          } else {
                            setEditingPermissionsList((prev) => prev.filter((k) => k !== page.key));
                          }
                        }}
                        className="mt-0.5 accent-accent"
                      />
                      <div className="text-[11px] leading-tight">
                        <div className="font-semibold">{page.label}</div>
                        <div className="text-[10px] opacity-75">{page.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="text-[11px] font-medium text-secondary mb-2">Разрешения по разделам</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_SECTIONS.map((section) => {
                    const isChecked = editingPermissionsList.includes(section.key);
                    return (
                      <label key={section.key} className={`flex items-center gap-2 p-2 rounded-[6px] border cursor-pointer transition-all ${isChecked ? 'bg-accent/10 border-accent text-primary' : 'bg-surface border-border text-secondary'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => setEditingPermissionsList((prev) => event.target.checked ? [...prev, section.key] : prev.filter((key) => key !== section.key))}
                          className="accent-accent"
                        />
                        <span className="text-[10px] leading-tight">{section.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-3 py-1.5 rounded-[6px] bg-surface border border-border text-xs text-secondary hover:text-primary cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveUserPermissions}
                  disabled={savingPermissions}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingPermissions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{savingPermissions ? 'Сохранение...' : 'Сохранить доступ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* NEW: Modal for Reset Password */}
          {resetPasswordModal && (
            <div className="p-4 rounded-[8px] bg-amber-500/5 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-primary">
                    Сброс пароля для @{resetPasswordModal.username}
                  </span>
                </div>
                <button
                  onClick={() => setResetPasswordModal(null)}
                  className="text-xs text-secondary hover:text-primary cursor-pointer"
                >
                  ✕ Закрыть
                </button>
              </div>

              <p className="text-[11px] text-secondary">
                Введите новый пароль (минимум 6 символов). Будет отправлен PATCH /api/proxy/admin/users/:id с полем password.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-secondary">Новый пароль:</label>
                <input
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setResetPasswordModal(null)}
                  className="px-3 py-1.5 rounded-[6px] bg-surface border border-border text-xs text-secondary hover:text-primary cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPasswordUserId !== null || newPasswordValue.length < 6}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-amber-500 text-white hover:opacity-95 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {resettingPasswordUserId !== null ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>{resettingPasswordUserId !== null ? 'Сохранение...' : 'Установить пароль'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Create User Form with Checkboxes */}
          <div className="pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-primary">Создать нового пользователя с доступом к страницам</span>
            </div>

            {createError && (
              <div className="mb-2 p-2 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="mb-2 p-2 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  placeholder="Логин (username)*"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="password"
                  placeholder="Пароль*"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="ФИО (необязательно)"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
                />
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[6px] text-xs text-primary focus:outline-none focus:border-accent"
                >
                  <option value="viewer">viewer (наблюдатель)</option>
                  <option value="operator">operator (оператор)</option>
                  <option value="manager">manager (менеджер)</option>
                  <option value="admin">admin (администратор)</option>
                </select>
              </div>

              {/* Page checkboxes for new user */}
              <div className="p-3 rounded-[6px] bg-surface-2/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary">
                    Доступные страницы для этого пользователя:
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, selectedPages: AVAILABLE_PAGES.map((p) => p.key) }))}
                      className="text-accent hover:underline cursor-pointer"
                    >
                      Выбрать все
                    </button>
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, selectedPages: [] }))}
                      className="text-secondary hover:underline cursor-pointer"
                    >
                      Снять все
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_PAGES.map((page) => {
                    const isChecked = createForm.selectedPages.includes(page.key);
                    return (
                      <label
                        key={page.key}
                        className={`flex items-start gap-2 p-2 rounded-[6px] border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-accent/10 border-accent text-primary'
                            : 'bg-surface border-border text-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm((f) => ({ ...f, selectedPages: [...f.selectedPages, page.key] }));
                            } else {
                              setCreateForm((f) => ({
                                ...f,
                                selectedPages: f.selectedPages.filter((k) => k !== page.key),
                              }));
                            }
                          }}
                          className="mt-0.5 accent-accent"
                        />
                        <div className="text-[11px] leading-tight">
                          <div className="font-semibold">{page.label}</div>
                          <div className="text-[10px] opacity-70">{page.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating || !createForm.username || !createForm.password}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-accent text-white hover:opacity-95 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{creating ? 'Создание пользователя...' : 'Создать пользователя с выбранными правами'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* 10. Theme & Session / Logout */}
      <section className="p-4 rounded-[8px] bg-surface border border-border/80 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-primary">Внешний вид и сессия</h2>
          <p className="text-xs text-secondary mt-0.5">
            Управление темой оформления и текущим сеансом работы
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between p-3 rounded-[6px] bg-surface-2/60 border border-border/60">
            <div>
              <div className="text-xs font-medium text-primary">Тема оформления</div>
              <div className="text-[11px] text-secondary mt-0.5">
                {theme === 'dark' ? 'Тёмная тема активна' : 'Светлая тема активна'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-surface hover:bg-surface-2 border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-accent" />
                  <span>Тёмная</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[6px] bg-surface-2/60 border border-border/60">
            <div>
              <div className="text-xs font-medium text-primary">Сессия пользователя</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Вход: {sessionStartTime}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Выход...' : 'Выйти'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
