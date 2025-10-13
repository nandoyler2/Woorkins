import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, LogOut, User, Home, Search, MessageSquare, Shield, Briefcase, MessageCircle, Plus, FolderOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import logoWoorkins from '@/assets/logo-woorkins.png';
import { SafeImage } from '@/components/ui/safe-image';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchSlideIn } from '@/components/SearchSlideIn';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const unreadCount = useUnreadMessages(profileId);

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
      
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setProfileId(data.id);
      }
    };

    checkAdminStatus();
    loadProfile();
  }, [user]);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-woorkins">
          <Link to="/" className="flex items-center gap-3 hover-scale">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-10 w-auto" />
          </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/painel" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
              <Home className="w-5 h-5" />
              <span>Painel</span>
            </Link>
            
            <DropdownMenu open={projectsOpen} onOpenChange={setProjectsOpen}>
              <DropdownMenuTrigger 
                className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors bg-transparent border-0 shadow-none p-0 h-auto font-normal cursor-pointer data-[state=open]:text-foreground"
                onMouseEnter={() => setProjectsOpen(true)}
                onMouseLeave={() => setProjectsOpen(false)}
              >
                <Briefcase className="w-5 h-5" />
                <span>Projetos</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-[220px]"
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
            
            <Link to="/mensagens" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors relative">
              <MessageCircle className="w-5 h-5" />
              <span>Mensagens</span>
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 px-1.5 bg-red-500 hover:bg-red-500 text-white text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Link>
            
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
            >
              <Search className="w-5 h-5" />
              <span>{t('discover')}</span>
            </button>
          </nav>
        )}

        <div className="flex items-center gap-3">
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/painel">Painel</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/mensagens">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Mensagens
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">{t('profile')}</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="text-primary">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/autenticacao?mode=signin">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link to="/autenticacao?mode=signup">{t('signup')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      
      <SearchSlideIn isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};
