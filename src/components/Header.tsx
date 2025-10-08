import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, LogOut, User, Home, Search, MessageSquare, Shield, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoWoorkins from '@/assets/logo-woorkins.png';
import { SafeImage } from '@/components/ui/safe-image';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<string>('');

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_roles' as any)
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!data);
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover-scale">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-10 w-auto" />
          </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link to="/projects" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
              <Briefcase className="w-5 h-5" />
              <span>Projetos</span>
            </Link>
            <Link to="/my-projects" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
              <Briefcase className="w-5 h-5" />
              <span>Meus Projetos</span>
            </Link>
            <Link to="/discover" className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors">
              <Search className="w-5 h-5" />
              <span>{t('discover')}</span>
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && profileId && <NotificationBell profileId={profileId} />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
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
                <Link to="/auth?mode=signin">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link to="/auth?mode=signup">{t('signup')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
