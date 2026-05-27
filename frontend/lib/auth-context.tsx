'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, storeAuth, clearAuth, API_BASE_URL } from './api';

export interface User {
  id: number;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  full_name: string;
  approval_status?: string;
  email_verified?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load user from localStorage on mount
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);

    const handleUnauthorized = () => {
      setUser(null);
      router.push('/');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router]);

  useEffect(() => {
    // Black & yellow theme is always active; blind mode adds extra contrast class
    const syncTheme = () => {
      document.documentElement.classList.add('dark');
      const mode = localStorage.getItem('accessibilityMode');
      if (mode === 'blind') {
        document.documentElement.classList.add('blind-accessibility');
      } else {
        document.documentElement.classList.remove('blind-accessibility');
      }
    };

    syncTheme();

    window.addEventListener('accessibility-mode-change', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      window.removeEventListener('accessibility-mode-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const login = (token: string, userData: User) => {
    storeAuth(token, userData);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore errors
    }
    clearAuth();
    setUser(null);
    router.push('/');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Persist to localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...updates }));
        } catch {
          // ignore parse errors
        }
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
