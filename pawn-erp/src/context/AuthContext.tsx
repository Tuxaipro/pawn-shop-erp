import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from '../api/auth';
import { getAuthToken, setUnauthorizedHandler } from '../api/client';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('pawn_user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!getAuthToken());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        if (u.sessionTimeoutMinutes) {
          localStorage.setItem('pawn_session_minutes', String(u.sessionTimeoutMinutes));
        }
      })
      .catch(() => {
        authApi.logout();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u, sessionTimeoutMinutes } = await authApi.login(email, password);
    setUser({ ...u, sessionTimeoutMinutes });
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const sessionMinutes =
    user?.sessionTimeoutMinutes ??
    (Number(localStorage.getItem('pawn_session_minutes')) || 30);

  useSessionTimeout(sessionMinutes, logout, !!user && !loading);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
