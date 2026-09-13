import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface AuditorUser {
  email: string;
  name: string;
  role: string;
  title: string;
  department: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuditorUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'mplads-auth-token';
const USER_KEY = 'mplads-auth-user';

// Official demo credentials specified for SIH 2026 prototype evaluation
export const DEMO_AUDITOR_EMAIL = 'auditor@mplads-demo.local';
export const DEMO_AUDITOR_PASSWORD = 'Auditor@123';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuditorUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedUser) {
        return JSON.parse(savedUser) as AuditorUser;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(TOKEN_KEY));
    } catch {
      return false;
    }
  });

  // Verify token consistency on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token && isAuthenticated) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [isAuthenticated]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      // Demo credential verification
      if (cleanEmail === DEMO_AUDITOR_EMAIL.toLowerCase() && cleanPass === DEMO_AUDITOR_PASSWORD) {
        const token = `sih26102-auditor-session-${Date.now()}`;
        const auditorProfile: AuditorUser = {
          email: DEMO_AUDITOR_EMAIL,
          name: 'Dr. A. Sharma',
          role: 'AUDITOR',
          title: 'Senior Audit Officer',
          department: 'Office of the Principal Accountant General',
        };

        try {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(auditorProfile));
        } catch {
          // ignore
        }

        setIsAuthenticated(true);
        setUser(auditorProfile);

        return { success: true };
      }

      return {
        success: false,
        error: 'Invalid email or password. Please verify your auditor credentials.',
      };
    },
    []
  );

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }

    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    navigate('/', { replace: true });
  }, [clearSession, navigate]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
