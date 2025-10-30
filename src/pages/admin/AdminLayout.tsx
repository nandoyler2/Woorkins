import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { 
  Users, 
  Flag, 
  Briefcase, 
  BarChart3, 
  Settings, 
  Shield,
  Home,
  CreditCard,
  FileCheck,
  MessageCircle,
  ArrowLeft,
  Ban,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAdminCounts } from '@/hooks/useAdminCounts';

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Moderação", url: "/admin/moderation", icon: Flag },
  { title: "Negócios", url: "/admin/businesses", icon: Briefcase },
  { title: "Conteúdo", url: "/admin/content", icon: FileCheck },
  { title: "Financeiro", url: "/admin/financial", icon: CreditCard },
  { title: "Solicitações de Saques", url: "/admin/withdrawals", icon: Wallet },
  { title: "Suporte", url: "/admin/support", icon: MessageCircle },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { counts } = useAdminCounts();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getBadgeCount = (url: string) => {
    switch (url) {
      case '/admin/moderation':
        return counts.moderation;
      case '/admin/support':
        return counts.support;
      case '/admin/users':
        return counts.documentVerifications + counts.systemBlocks;
      case '/admin/withdrawals':
        return counts.withdrawalRequests;
      default:
        return 0;
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Shield className="h-6 w-6 text-primary" />
            {!collapsed && <SidebarGroupLabel className="text-lg font-bold">Admin Panel</SidebarGroupLabel>}
          </div>

          <div className="px-2 py-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              asChild
            >
              <NavLink to="/painel">
                <ArrowLeft className="h-4 w-4" />
                {!collapsed && <span>Voltar ao Woorkins</span>}
              </NavLink>
            </Button>
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const badgeCount = getBadgeCount(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/admin"}
                        className={({ isActive }) => 
                          isActive || (item.url !== "/admin" && location.pathname.startsWith(item.url))
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted/50"
                        }
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span>{item.title}</span>
                              {badgeCount > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-[10px]"
                                >
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </Badge>
                              )}
                            </>
                          )}
                          {collapsed && badgeCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[9px]"
                            >
                              {badgeCount > 9 ? '9+' : badgeCount}
                            </Badge>
                          )}
                        </div>
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

export const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-background">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
