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
import { Plus, LogOut, User } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthProvider, ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
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
import Usuarios from "./pages/Usuarios";
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

  const getRoleBadgeColor = (nivel: number) => {
    if (nivel >= 999) return "bg-purple-500";
    if (nivel >= 100) return "bg-red-500";
    if (nivel >= 50) return "bg-orange-500";
    return "bg-blue-500";
  };

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <SidebarInset className={`flex-1 ${isMobile ? 'pb-16' : ''}`}>
        {!isMobile && (
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-semibold">Opus One Ecom Financeiro</h1>
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
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{user?.nome}</p>
                    <p className="text-xs">{user?.email}</p>
                    <div className="flex gap-1 mt-2">
                      {user?.roles?.map((role) => (
                        <Badge
                          key={role.id}
                          className={`${getRoleBadgeColor(role.nivel_acesso)} text-xs`}
                        >
                          {role.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
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
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/contas" element={<ProtectedRoute><Contas /></ProtectedRoute>} />
            <Route path="/transacoes" element={<ProtectedRoute><Transacoes /></ProtectedRoute>} />
            <Route path="/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
            <Route path="/compras-cartao" element={<ProtectedRoute><ComprasCartao /></ProtectedRoute>} />
            <Route path="/parcelas" element={<ProtectedRoute><Parcelas /></ProtectedRoute>} />
            <Route path="/projecao" element={<ProtectedRoute><Projecao /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
            <Route path="/categorias" element={<ProtectedRoute><Categorias /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            
            {/* Rota protegida - apenas ADMIN+ */}
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute requirePermission={{ recurso: 'usuario', acao: 'read' }}>
                  <Usuarios />
                </ProtectedRoute>
              } 
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </SidebarInset>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
