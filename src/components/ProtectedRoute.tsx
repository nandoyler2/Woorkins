import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Verificar confirmação de email
        const { data: authData } = await supabase.auth.getUser();
        const confirmed = Boolean((authData?.user as any)?.email_confirmed_at || (authData?.user as any)?.confirmed_at);
        setEmailConfirmed(confirmed);

        // Se não confirmado, não precisa checar mais nada aqui
        if (!confirmed) {
          setLoading(false);
          return;
        }

        // Verificar perfil completo (exceto se já estiver em /welcome)
        if (location.pathname !== '/welcome') {
          const onboardingCompleted = localStorage.getItem('onboarding_completed');
          
          if (!onboardingCompleted) {
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', user.id)
              .eq('profile_type', 'user')
              .limit(1);

            if (profileError) throw profileError;

            // Se não tem username válido, perfil está incompleto
            const hasValidUsername = profiles && profiles.length > 0 && profiles[0].username && profiles[0].username.length >= 3;
            setProfileComplete(hasValidUsername);

            if (hasValidUsername) {
              localStorage.setItem('onboarding_completed', 'true');
            }
          } else {
            setProfileComplete(true);
          }
        } else {
          setProfileComplete(true);
        }

        // Verificar status admin
        if (requireAdmin) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });

          if (error) throw error;
          setIsAdmin(Boolean(data));
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setIsAdmin(false);
        setProfileComplete(true); // Em caso de erro, deixa passar
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [user, requireAdmin, location.pathname]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=signin" replace />;
  }

  // Bloquear acesso se email não confirmado
  if (emailConfirmed === false && location.pathname !== '/auth/pending-confirmation') {
    const emailParam = encodeURIComponent(user.email ?? '');
    return <Navigate to={`/auth/pending-confirmation?email=${emailParam}`} replace />;
  }

  // Redirecionar para welcome se perfil incompleto
  if (profileComplete === false && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  if (requireAdmin && isAdmin === false) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};
