import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Home,
    User,
    Briefcase,
    TrendingUp,
    Building2,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mapeamento de ícones
const iconMap: Record<string, any> = {
    home: Home,
    user: User,
    briefcase: Briefcase,
    trending: TrendingUp,
    building: Building2,
};

// Mapeamento de cores
const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    green: '#10B981',
    purple: '#A855F7',
    orange: '#F97316',
    pink: '#EC4899',
    red: '#EF4444',
};

export default function WorkspaceSelector() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { workspaces, currentWorkspace, loading: tenantLoading, selectWorkspace } = useTenant();
    const { toast } = useToast();

    console.log('🎯 WorkspaceSelector - Estado:', {
        user: user?.email,
        authLoading,
        tenantLoading,
        workspacesCount: workspaces.length,
        workspaces,
        currentWorkspace
    });

    // Se já tem workspace selecionado, redirecionar
    useEffect(() => {
        if (!authLoading && !tenantLoading && currentWorkspace) {
            console.log('✅ Já tem workspace, redirecionando para /');
            navigate('/');
        }
    }, [currentWorkspace, authLoading, tenantLoading, navigate]);

    // Se não está logado, redirecionar para login
    useEffect(() => {
        if (!authLoading && !user) {
            console.log('❌ Não está logado, redirecionando para /login');
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    const handleSelectWorkspace = async (workspaceId: string) => {
        try {
            await selectWorkspace(workspaceId);
            toast({
                title: 'Workspace selecionado!',
                description: 'Carregando seus dados...',
            });
        } catch (error: any) {
            toast({
                title: 'Erro ao selecionar workspace',
                description: error.message || 'Tente novamente',
                variant: 'destructive',
            });
        }
    };

    if (authLoading || tenantLoading) {
        return (
            <div className="fixed inset-0 w-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" strokeWidth={2} />
                    <p className="text-muted-foreground text-lg">Carregando workspaces...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 overflow-auto">
            <div className="w-full max-w-6xl mx-auto py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-slate-900">
                        Selecione seu Workspace
                    </h1>
                    <p className="text-slate-600 text-base">
                        Olá, <span className="font-semibold text-slate-900">{user?.nome}</span>! Escolha qual conta você deseja acessar
                    </p>
                </div>

                {/* Workspace Grid */}
                {workspaces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                        {workspaces.map((workspace) => {
                            const Icon = iconMap[workspace.icone || 'building'] || Building2;
                            const color = colorMap[workspace.cor || 'blue'] || '#3B82F6';

                            return (
                                <div
                                    key={workspace.id}
                                    className="group relative"
                                    onClick={() => handleSelectWorkspace(workspace.id)}
                                >
                                    {/* Card com novo design */}
                                    <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-900 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl">
                                        {/* Conteúdo */}
                                        <div className="relative p-6 flex flex-col items-center text-center space-y-4">
                                            {/* Ícone circular grande */}
                                            <div
                                                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            >
                                                <Icon
                                                    className="h-10 w-10 text-white"
                                                    strokeWidth={2}
                                                />
                                            </div>

                                            {/* Texto */}
                                            <div className="space-y-1.5">
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {workspace.nome}
                                                </h3>
                                                <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">
                                                    {workspace.descricao || 'Workspace'}
                                                </p>
                                            </div>

                                            {/* Botão */}
                                            <Button
                                                className="w-full rounded-xl text-sm font-semibold h-11 bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectWorkspace(workspace.id);
                                                }}
                                            >
                                                Acessar
                                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="max-w-md mx-auto border-2 shadow-xl">
                        <CardHeader>
                            <CardTitle>Nenhum workspace encontrado</CardTitle>
                            <CardDescription>
                                Entre em contato com o administrador para ter acesso aos workspaces.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    );
}
