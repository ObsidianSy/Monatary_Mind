import { useState } from "react";
import {
  Home,
  CreditCard,
  Receipt,
  Repeat,
  Target,
  Settings,
  TrendingUp,
  Bell,
  FileText,
  Calendar,
  Code,
  Wallet,
  Package,
  Users,
  Building2
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// Main navigation items
const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Transações", url: "/transacoes", icon: Receipt },
  { title: "Cartões", url: "/cartoes", icon: CreditCard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Contas", url: "/contas", icon: Wallet },
  { title: "Categorias", url: "/categorias", icon: Target },
  { title: "Inventário", url: "/inventario", icon: Package },
];

// Secondary/advanced features
const advancedMenuItems = [
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Projeção", url: "/projecao", icon: TrendingUp },
  { title: "Alertas", url: "/alertas", icon: Bell },
];

// System items
const systemMenuItems = [
  { title: "Usuários", url: "/usuarios", icon: Users, requirePermission: { recurso: 'usuario', acao: 'read' } },
  { title: "Workspaces", url: "/workspaces", icon: Building2, requireRole: 999 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const currentPath = location.pathname;
  const { hasPermission, user } = useAuth();
  const { currentWorkspace } = useTenant();

  // Verificar se usuário tem role mínimo necessário
  const hasRole = (minLevel: number) => {
    if (!user?.roles) return false;
    return user.roles.some(role => role.nivel_acesso >= minLevel);
  };

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent ${isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
      : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
    }`;

  if (isMobile) {
    // Mobile: Bottom Navigation
    return (
      <Sidebar className="fixed bottom-0 left-0 right-0 h-16 w-full border-t bg-sidebar-background z-50">
        <SidebarContent className="flex-row items-center justify-around h-full p-0">
          <div className="flex items-center justify-around w-full px-2">
            {mainMenuItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Desktop: Normal Sidebar
  return (
    <Sidebar className={state === "collapsed" ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {state !== "collapsed" && (
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">
                  {currentWorkspace?.nome || 'Carregando...'}
                </h1>
                <p className="text-xs text-sidebar-foreground/70">Financeiro</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-5 h-5" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análises</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {advancedMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-5 h-5" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemMenuItems.map((item: any) => {
                // Verificar permissão se necessário
                if (item.requirePermission && !hasPermission(item.requirePermission.recurso, item.requirePermission.acao)) {
                  return null;
                }

                // Verificar role se necessário
                if (item.requireRole && !hasRole(item.requireRole)) {
                  return null;
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="w-5 h-5" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}