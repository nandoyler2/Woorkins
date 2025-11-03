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
        // Fazer todas as verificações em paralelo
        const checks = await Promise.all([
          // Verificar email confirmado
          supabase.auth.getUser(),
          // Verificar admin (se necessário)
          requireAdmin
            ? supabase.rpc('has_role', {
                _user_id: user.id,
                _role: 'admin'
              })
            : Promise.resolve({ data: null, error: null }),
          // Verificar perfil completo (se não for /welcome e não for admin)
          (location.pathname !== '/welcome' && !requireAdmin)
            ? supabase
                .from('profiles')
                .select('username, category')
                .eq('user_id', user.id)
                .eq('profile_type', 'user')
                .maybeSingle()
            : Promise.resolve({ data: null, error: null })
        ]);

        const [authResult, adminResult, profileResult] = checks;

        // Email confirmado
        const confirmed = Boolean(
          (authResult.data?.user as any)?.email_confirmed_at || 
          (authResult.data?.user as any)?.confirmed_at
        );
        setEmailConfirmed(confirmed);

        // Admin
        if (requireAdmin) {
          setIsAdmin(Boolean(adminResult.data));
          setProfileComplete(true); // Admin não precisa verificar perfil completo
        } else {
          // Perfil completo (apenas para não-admin)
          if (location.pathname !== '/welcome' && confirmed) {
            const profile = profileResult.data as any;
            const hasValidUsername = profile && 
              profile.username && profile.username.length >= 3;
            const hasCategory = profile && profile.category;
            setProfileComplete(Boolean(hasValidUsername && hasCategory));
          } else {
            setProfileComplete(true);
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setIsAdmin(false);
        setProfileComplete(true);
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [user, requireAdmin, location.pathname]);

  // Renderizar imediatamente durante authLoading inicial
  if (authLoading) {
    return <>{children}</>;
  }

  // Pequeno delay para evitar flash - mas não bloqueia renderização
  if (loading) {
    return <>{children}</>;
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
