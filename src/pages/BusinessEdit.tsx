import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Eye,
  MessagesSquare,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import BusinessAdministrators from './BusinessAdministrators';

type Section = 'posts' | 'evaluations' | 'settings' | 'tools' | 'profile-cover' | 'admin';

const BusinessEdit = () => {
  const { slug } = useParams();
  const [activeSection, setActiveSection] = useState<Section>('posts');

  const menuItems = [
    { id: 'posts' as Section, label: 'Posts', icon: MessagesSquare },
    { id: 'evaluations' as Section, label: 'Avaliações', icon: Users },
    { id: 'settings' as Section, label: 'Configurações', icon: AlertTriangle },
  ];

  const customizationItems = [
    { id: 'tools' as Section, label: 'Ferramentas', icon: Zap },
    { id: 'profile-cover' as Section, label: 'Perfil e Capa', icon: Eye },
  ];

  const adminItems = [
    { id: 'admin' as Section, label: 'Administradores', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'admin':
        return <BusinessAdministrators businessId={slug || ''} />;
      case 'posts':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Posts</h2>
            <p className="text-muted-foreground">Gerencie os posts do seu negócio</p>
          </Card>
        );
      case 'evaluations':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Avaliações</h2>
            <p className="text-muted-foreground">Visualize as avaliações do seu negócio</p>
          </Card>
        );
      case 'settings':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Configurações</h2>
            <p className="text-muted-foreground">Configure seu negócio</p>
          </Card>
        );
      case 'tools':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Ferramentas</h2>
            <p className="text-muted-foreground">Ferramentas ativas do seu negócio</p>
          </Card>
        );
      case 'profile-cover':
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Perfil e Capa</h2>
            <p className="text-muted-foreground">Personalize o perfil e a capa do seu negócio</p>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={activeSection === item.id}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator />

            <SidebarGroup>
              <SidebarGroupLabel>Personalização</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customizationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={activeSection === item.id}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator />

            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={activeSection === item.id}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">Editar Negócio</h1>
              {renderContent()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default BusinessEdit;
