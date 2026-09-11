'use client';

/**
 * lib/auth-context.tsx
 * Global React Context для хранения данных текущего пользователя (роль, username, etc.)
 * Используется Sidebar, Settings, и любым компонентом которому нужна роль.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, logout as apiLogout, AuthUser } from './api-client';

interface AuthContextValue {
  user: AuthUser | null;
  role: AuthUser['role'] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isLoading,
        isAuthenticated: !!user,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Проверяет есть ли у пользователя достаточная роль */
const ROLE_HIERARCHY: Record<AuthUser['role'], number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
  super_admin: 5,
};

export function hasMinRole(userRole: AuthUser['role'] | null, minRole: AuthUser['role']): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
}

/**
 * Проверяет, доступна ли страница пользователю.
 * super_admin имеет доступ абсолютно ко всем страницам.
 * Для остальных проверяются права в массиве user.permissions.
 */
export function canAccessPage(user: AuthUser | null, pathname: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  // Settings доступен ТОЛЬКО super_admin
  if (pathname.startsWith('/settings')) {
    return false;
  }

  // Определение ключа страницы по URL
  let pageKey = '';
  if (pathname === '/' || pathname.startsWith('/overview')) pageKey = 'overview';
  else if (pathname.startsWith('/dashboard')) pageKey = 'dashboard';
  else if (pathname.startsWith('/analytics')) pageKey = 'analytics';
  else if (pathname.startsWith('/map')) pageKey = 'map';
  else if (pathname.startsWith('/raw')) pageKey = 'raw';
  else if (pathname.startsWith('/chat')) pageKey = 'chat';

  if (!pageKey) return true;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes('*')) return true;

  return perms.includes(pageKey);
}
