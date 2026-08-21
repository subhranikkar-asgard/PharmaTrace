import { useState, useCallback } from 'react';
import { login as apiLogin, getMe } from '../services/api';
import type { LoginResponse } from '../types';

const TOKEN_KEY = 'pharmatrace_token';
const USER_KEY  = 'pharmatrace_user';

function getStoredUser(): LoginResponse['user'] | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useAuth() {
  const [user, setUser] = useState<LoginResponse['user'] | null>(getStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const isAuthenticated = !!user;
  const hasRole = (role: string) => user?.role === role;

  return { user, login, logout, loading, error, isAuthenticated, hasRole };
}
