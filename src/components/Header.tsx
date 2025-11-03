import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, LogOut, User, Home, Search, MessageSquare, Shield, Briefcase, MessageCircle, Plus, FolderOpen, Headset, Newspaper } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import logoWoorkins from '@/assets/logo-woorkins.png';
import woorkoinsIcon from '@/assets/woorkoins-icon-latest.png';
import { SafeImage } from '@/components/ui/safe-image';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchSlideIn } from '@/components/SearchSlideIn';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { formatShortName } from '@/lib/utils';
import { useActiveSupportCount } from '@/hooks/useActiveSupportCount';
import { useNewProjectsCount } from '@/hooks/useNewProjectsCount';

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<string>('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const unreadCount = useUnreadMessages(profileId);
  const activeSupportCount = useActiveSupportCount();
  const newProjectsCount = useNewProjectsCount();

  // Helper to check if current route matches
  const isActiveRoute = (path: string) => location.pathname === path;
  const isProjectsRoute = () => 
    location.pathname === '/projetos' || 
    location.pathname === '/meus-projetos' || 
    location.pathname.startsWith('/projetos/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        if (error) throw error;
        setIsAdmin(Boolean(data));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    const loadProfile = async () => {
      if (!user) return;
      
      // Priorizar perfil do tipo 'user' para o header
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name, company_name, profile_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (profiles && profiles.length > 0) {
        // Procurar perfil do tipo 'user' primeiro
        const userProfile = profiles.find((p: any) => p.profile_type === 'user') || profiles[0];
        setProfileId(userProfile.id);
        setProfileAvatar(userProfile.avatar_url);
        setProfileName(formatShortName(userProfile.full_name || userProfile.company_name) || '');
      }
    };

    checkAdminStatus();
    loadProfile();
  }, [user]);

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Sempre mostrar quando estiver no topo da página
      if (currentScrollY < 100) {
        setIsVisible(true);
      }
      // Mostrar header quando rolar para cima
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } 
      // Esconder header quando rolar para baixo
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-[100] transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-woorkins">
          <Link to="/" className="flex items-center gap-3 hover-scale">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-10 w-auto" />
          </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/painel" 
              className={`flex items-center gap-2 transition-colors pb-1 border-b-2 ${
                isActiveRoute('/painel')
                  ? 'text-primary border-primary'
                  : 'text-foreground/80 hover:text-foreground border-transparent'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Painel</span>
            </Link>
            
            <DropdownMenu open={projectsOpen} onOpenChange={setProjectsOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Link 
                  to="/projetos"
                  className="flex items-center gap-2 transition-colors pb-1 border-b-2 border-transparent"
                  onMouseEnter={() => setProjectsOpen(true)}
                  onMouseLeave={() => setProjectsOpen(false)}
                >
                  <div className="relative w-5 h-5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="url(#projectGradient)" strokeWidth="2">
                      <defs>
                        <linearGradient id="projectGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <span className="font-bold bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">Projetos</span>
                  
                  {newProjectsCount > 0 && (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full blur-sm animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-blue-500 to-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                          {newProjectsCount} {newProjectsCount === 1 ? 'novo' : 'novos'}
                        </div>
                        {/* Seta apontando para baixo */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-teal-500"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-[220px] z-[110] bg-background"
                onMouseEnter={() => setProjectsOpen(true)}
                onMouseLeave={() => setProjectsOpen(false)}
              >
                <DropdownMenuItem asChild>
                  <Link to="/projetos" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Projetos Disponíveis
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/meus-projetos" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Meus Projetos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/projetos/novo" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Projeto
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link 
              to="/hub" 
              className={`flex items-center gap-2 transition-colors pb-1 border-b-2 ${
                location.pathname.startsWith('/hub')
                  ? 'text-primary border-primary'
                  : 'text-foreground/80 hover:text-foreground border-transparent'
              }`}
            >
              <Newspaper className="w-5 h-5" />
              <span>HUB</span>
            </Link>
            
            <Link 
              to="/mensagens"
              className={`flex items-center gap-2 transition-colors relative pb-1 border-b-2 ${
                isActiveRoute('/mensagens')
                  ? 'text-primary border-primary'
                  : 'text-foreground/80 hover:text-foreground border-transparent'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Mensagens</span>
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5 bg-red-500 hover:bg-red-500 text-white text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isAdmin && activeSupportCount > 0 && (
            <Link to="/admin/suporte" className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
              >
                <Headset className="w-5 h-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[9px]"
                >
                  {activeSupportCount > 9 ? '9+' : activeSupportCount}
                </Badge>
              </Button>
            </Link>
          )}
          
          {user && profileId && <NotificationBell profileId={profileId} />}
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px] z-[110] bg-background">
                <div className="flex flex-col items-center gap-2 p-3 border-b border-border">
                  {profileAvatar ? (
                    <SafeImage 
                      src={profileAvatar} 
                      alt="Foto de perfil" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {profileName && (
                    <p className="text-sm font-medium text-center truncate w-full px-2">
                      {profileName}
                    </p>
                  )}
                  <p className="text-xs text-center text-muted-foreground truncate w-full px-2">
                    {user.email}
                  </p>
                </div>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/conta" className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4" />
                    Conta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/financeiro" className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Financeiro
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/woorkoins" className="flex items-center justify-center gap-2">
                    <img src={woorkoinsIcon} alt="" className="h-4 w-auto object-contain" />
                    Woorkoins
                  </Link>
                </DropdownMenuItem>
                <div className="border-t border-border mt-1 pt-1">
                  <DropdownMenuItem onClick={handleSignOut} className="justify-end">
                    <span className="mr-auto">{t('logout')}</span>
                    <LogOut className="w-4 h-4" />
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth?mode=signin">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link to="/auth?mode=signup">{t('signup')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      
      <SearchSlideIn isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
    {/* Spacer para compensar o header fixo */}
    <div className="h-16" />
  </>
  );
};
