import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  FileText,
  DollarSign,
  TrendingUp,
  Flag,
  FileCheck,
  Shield,
  CreditCard,
  Briefcase,
  BarChart3,
  Megaphone,
  Home,
} from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { cn } from '@/lib/utils';

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Usuários', url: '/admin/usuarios', icon: Users, badge: 'systemBlocks' },
  { title: 'Moderação', url: '/admin/moderacao', icon: Flag, badge: 'moderation' },
  { title: 'Suporte', url: '/admin/suporte', icon: MessageSquare, badge: 'support' },
  { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign, badge: 'withdrawalRequests' },
  { title: 'Planos', url: '/admin/planos', icon: CreditCard },
  { title: 'Perfis Profissionais', url: '/admin/perfis-profissionais', icon: Briefcase },
  { title: 'Análises', url: '/admin/analises', icon: TrendingUp },
  { title: 'Relatórios', url: '/admin/relatorios', icon: BarChart3 },
  { title: 'Hub de Artigos', url: '/admin/artigos-hub', icon: FileText },
  { title: 'Páginas Legais', url: '/admin/paginas-legais', icon: FileCheck },
  { title: 'Gestão de Conteúdo', url: '/admin/conteudo', icon: Megaphone },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  { title: 'IA', url: '/admin/ia', icon: Shield },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { counts } = useAdminCounts();
  const isCollapsed = state === 'collapsed';

  const getBadgeCount = (badgeKey?: string) => {
    if (!badgeKey) return null;
    return counts[badgeKey as keyof typeof counts] || 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="relative">
        {/* Botão Voltar ao Woorkins */}
        <div className="p-4 border-b border-border">
          <Link 
            to="/painel" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg"
          >
            <Home className="h-5 w-5" />
            {!isCollapsed && <span className="font-semibold">Voltar ao Woorkins</span>}
          </Link>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
            {!isCollapsed && 'Painel Administrativo'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const badgeCount = getBadgeCount(item.badge);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        'transition-all duration-200',
                        isActive && 'bg-primary/10 text-primary font-semibold border-l-4 border-primary'
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-4 py-2">
                        <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                        {!isCollapsed && (
                          <span className="flex-1">{item.title}</span>
                        )}
                        {!isCollapsed && badgeCount! > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto animate-pulse"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                        {isCollapsed && badgeCount! > 0 && (
                          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
                        )}
                      </Link>
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

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 border-b bg-background">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger className="hover:bg-accent/50 transition-colors" />
              <div className="flex-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Painel Administrativo Woorkins
                </h1>
              </div>
            </div>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
