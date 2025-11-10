import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================
// CONFIGURAÇÃO DA API
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ============================================
// TIPOS
// ============================================
export interface User {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  email_verificado: boolean;
  ultimo_acesso: Date | null;
  roles: {
    id: string;
    nome: string;
    nivel_acesso: number;
  }[];
  permissions: {
    recurso: string;
    acao: string;
  }[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, nome: string) => Promise<void>;
  hasPermission: (recurso: string, acao: string) => boolean;
  hasRole: (minLevel: number) => boolean;
  isSuperAdmin: () => boolean;
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar se está autenticado ao carregar
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Salvar token
      localStorage.setItem('token', data.token);
      setUser(data.user);
      
      // Redirecionar para dashboard
      navigate('/');
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login');
    }
  }

  async function logout() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      navigate('/login');
    }
  }

  async function register(email: string, password: string, nome: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nome }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar');
      }

      // Após registrar, fazer login automaticamente
      await login(email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao registrar');
    }
  }

  function hasPermission(recurso: string, acao: string): boolean {
    if (!user) return false;
    
    // SUPER_ADMIN tem acesso total
    if (isSuperAdmin()) return true;
    
    return user.permissions.some(
      p => p.recurso === recurso && p.acao === acao
    );
  }

  function hasRole(minLevel: number): boolean {
    if (!user || !user.roles || user.roles.length === 0) return false;
    const maxUserLevel = Math.max(...user.roles.map(r => r.nivel_acesso));
    return maxUserLevel >= minLevel;
  }

  function isSuperAdmin(): boolean {
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nivel_acesso >= 999);
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    hasPermission,
    hasRole,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// ============================================
// COMPONENTE DE PROTEÇÃO DE ROTA
// ============================================
interface ProtectedRouteProps {
  children: ReactNode;
  requirePermission?: { recurso: string; acao: string };
  requireRole?: number;
}

export function ProtectedRoute({ children, requirePermission, requireRole }: ProtectedRouteProps) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Verificar permissão específica
  if (requirePermission && !hasPermission(requirePermission.recurso, requirePermission.acao)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  // Verificar role mínima
  if (requireRole !== undefined && !hasRole(requireRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Seu nível de acesso é insuficiente para esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
