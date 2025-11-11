import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { NovoModal } from "@/components/NovoModal";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, User, Building2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthProvider, ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Páginas
import Index from "./pages/Index";
import Agenda from "./pages/Agenda";
import Contas from "./pages/Contas";
import Transacoes from "./pages/Transacoes";
import Cartoes from "./pages/Cartoes";
import ComprasCartao from "./pages/ComprasCartao";
import Categorias from "./pages/Categorias";
import Parcelas from "./pages/Parcelas";
import Projecao from "./pages/Projecao";
import Relatorios from "./pages/Relatorios";
import Alertas from "./pages/Alertas";
import Configuracoes from "./pages/Configuracoes";
import Inventario from "./pages/Inventario";
import Login from "./pages/Login";
import WorkspaceSelector from "./pages/WorkspaceSelector";
import Usuarios from "./pages/Usuarios";
import Workspaces from "./pages/Workspaces";
import NotFound from "./pages/NotFound";

// QueryClient com configurações otimizadas para reduzir requisições
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados são considerados "frescos"
      gcTime: 10 * 60 * 1000, // 10 minutos - cache mantido em memória
      refetchOnWindowFocus: false, // Não recarregar ao focar janela
      refetchOnReconnect: false, // Não recarregar ao reconectar
      retry: 1, // Apenas 1 tentativa em caso de erro
      networkMode: 'offlineFirst', // Usar cache primeiro
    },
    mutations: {
      retry: 2, // 2 tentativas para mutations
    },
  },
});

const AppContent = () => {
  const isMobile = useIsMobile();
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const { currentWorkspace } = useTenant();
  const navigate = useNavigate();

  const handleTrocarWorkspace = () => {
    // Limpar workspace atual sem fazer logout
    localStorage.removeItem('currentWorkspaceId');
    navigate('/workspace');
    window.location.reload();
  };

  return (
    <Routes>
      {/* Rotas públicas (sem sidebar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/workspace" element={<ProtectedRoute><WorkspaceSelector /></ProtectedRoute>} />

      {/* Rotas protegidas (com sidebar) */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <SidebarInset className={`flex-1 ${isMobile ? 'pb-16' : ''}`}>
              {!isMobile && (
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <h1 className="text-lg font-semibold">
                      {currentWorkspace?.nome || 'Carregando...'}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setNovoModalOpen(true)} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Novo
                    </Button>
                    <PrivacyToggle />
                    <ThemeToggle />

                    {/* Menu de Usuário */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <User className="h-4 w-4" />
                          {user?.nome}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-2">
                            <p className="text-sm font-medium leading-none">{user?.nome}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user?.email}
                            </p>
                            {currentWorkspace && (
                              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span className="font-medium">{currentWorkspace.nome}</span>
                              </div>
                            )}
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleTrocarWorkspace}>
                          <Building2 className="mr-2 h-4 w-4" />
                          Trocar Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => logout()}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>
              )}
              <NovoModal open={novoModalOpen} onOpenChange={setNovoModalOpen} />
              <main className={`flex-1 overflow-auto ${isMobile ? 'p-4' : ''}`}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/contas" element={<Contas />} />
                  <Route path="/transacoes" element={<Transacoes />} />
                  <Route path="/cartoes" element={<Cartoes />} />
                  <Route path="/compras-cartao" element={<ComprasCartao />} />
                  <Route path="/parcelas" element={<Parcelas />} />
                  <Route path="/projecao" element={<Projecao />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/alertas" element={<Alertas />} />
                  <Route path="/categorias" element={<Categorias />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />

                  {/* Rota protegida - apenas ADMIN+ */}
                  <Route
                    path="/usuarios"
                    element={
                      <ProtectedRoute requirePermission={{ recurso: 'usuario', acao: 'read' }}>
                        <Usuarios />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rota protegida - apenas SUPER_ADMIN */}
                  <Route
                    path="/workspaces"
                    element={
                      <ProtectedRoute requireRole={999}>
                        <Workspaces />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </SidebarInset>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Toaster />
            <Sonner />
            <SidebarProvider>
              <AppContent />
            </SidebarProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
