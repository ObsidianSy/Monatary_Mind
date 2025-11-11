import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ============================================
// CONFIGURAÇÃO DA API
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ============================================
// TIPOS
// ============================================
export interface Workspace {
    id: string;
    tenant_id: string;
    nome: string;
    descricao: string | null;
    cor: string | null;
    icone: string | null;
    is_padrao: boolean;
}

interface TenantContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    loading: boolean;
    selectWorkspace: (workspaceId: string) => Promise<void>;
    fetchWorkspaces: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export function TenantProvider({ children }: { children: ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Buscar workspaces quando o usuário fizer login
    useEffect(() => {
        if (user) {
            fetchWorkspaces();
        } else {
            setWorkspaces([]);
            setCurrentWorkspace(null);
            setLoading(false);
        }
    }, [user]);

    async function fetchWorkspaces() {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            console.log('🔍 TenantContext - Buscando workspaces, token:', token ? 'existe' : 'não existe');

            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/workspaces`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
            });

            console.log('📡 TenantContext - Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ TenantContext - Workspaces recebidos:', data.workspaces);
                setWorkspaces(data.workspaces || []);

                // Se já tem workspace no localStorage, restaurar
                const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
                if (savedWorkspaceId) {
                    const savedWorkspace = data.workspaces.find((w: Workspace) => w.id === savedWorkspaceId);
                    if (savedWorkspace) {
                        setCurrentWorkspace(savedWorkspace);
                    }
                }
            } else {
                const errorData = await response.json();
                console.error('❌ TenantContext - Erro ao buscar workspaces:', errorData);
            }
        } catch (error) {
            console.error('❌ TenantContext - Erro ao buscar workspaces:', error);
        } finally {
            setLoading(false);
        }
    }

    async function selectWorkspace(workspaceId: string) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const response = await fetch(`${API_BASE_URL}/auth/select-workspace`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({ workspaceId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao selecionar workspace');
            }

            // Atualizar token com tenant_id
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentWorkspaceId', workspaceId);

            // Atualizar workspace atual
            const workspace = workspaces.find(w => w.id === workspaceId);
            if (workspace) {
                setCurrentWorkspace(workspace);
            }

            // Recarregar a página para aplicar o novo contexto
            window.location.reload();
        } catch (error: any) {
            console.error('Erro ao selecionar workspace:', error);
            throw error;
        }
    }

    const value: TenantContextType = {
        workspaces,
        currentWorkspace,
        loading,
        selectWorkspace,
        fetchWorkspaces,
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

// ============================================
// HOOK
// ============================================
export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant deve ser usado dentro de um TenantProvider');
    }
    return context;
}
