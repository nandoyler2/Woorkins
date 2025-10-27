import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminInvite {
  id: string;
  business_id: string;
  permissions: {
    edit_profile: boolean;
    manage_posts: boolean;
    manage_appointments: boolean;
    manage_products: boolean;
    view_finances: boolean;
    manage_team: boolean;
  };
  status: string;
  invited_at: string;
  business_profiles: {
    company_name: string;
    logo_url: string | null;
  };
}

export default function AdminInvites() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Convites de Administração - Woorkins';
  }, []);

  useEffect(() => {
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
    
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (profileId) {
      loadInvites();
    }
  }, [profileId]);

  const loadInvites = async () => {
    if (!profileId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('business_admins')
      .select(`
        id,
        business_id,
        permissions,
        status,
        invited_at,
        business_profiles:business_id (
          company_name,
          logo_url
        )
      `)
      .eq('profile_id', profileId)
      .order('invited_at', { ascending: false });

    if (!error && data) {
      setInvites(data as any);
    }
    setLoading(false);
  };

  const handleResponse = async (inviteId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('business_admins')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', inviteId);

    if (!error) {
      toast({
        title: status === 'accepted' ? 'Convite aceito!' : 'Convite recusado',
        description: status === 'accepted' 
          ? 'Você agora é um administrador deste perfil.'
          : 'O convite foi recusado.',
      });
      loadInvites();
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a resposta',
        variant: 'destructive',
      });
    }
  };

  const permissionLabels = {
    edit_profile: 'Editar Perfil',
    manage_posts: 'Gerenciar Posts',
    manage_appointments: 'Gerenciar Agendamentos',
    manage_products: 'Gerenciar Produtos',
    view_finances: 'Ver Finanças',
    manage_team: 'Gerenciar Equipe',
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Convites para Administrador</h1>
      </div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Você não tem convites pendentes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invites.map((invite) => (
            <Card key={invite.id} className={`${
              invite.status === 'pending' 
                ? 'border-primary' 
                : invite.status === 'accepted' 
                ? 'border-green-500/50' 
                : 'border-red-500/50'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {invite.business_profiles.logo_url ? (
                      <img
                        src={invite.business_profiles.logo_url}
                        alt={invite.business_profiles.company_name}
                        className="w-16 h-16 rounded-lg object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-border">
                        <Shield className="w-8 h-8 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle>{invite.business_profiles.company_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Convidou você para ser administrador
                      </p>
                    </div>
                  </div>
                  {invite.status === 'pending' && (
                    <span className="text-xs px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full">
                      Pendente
                    </span>
                  )}
                  {invite.status === 'accepted' && (
                    <span className="text-xs px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                      Aceito
                    </span>
                  )}
                  {invite.status === 'rejected' && (
                    <span className="text-xs px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                      Recusado
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Permissões concedidas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(invite.permissions)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                        >
                          {permissionLabels[key as keyof typeof permissionLabels]}
                        </span>
                      ))}
                  </div>
                </div>

                {invite.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResponse(invite.id, 'accepted')}
                      className="flex-1 gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Aceitar
                    </Button>
                    <Button
                      onClick={() => handleResponse(invite.id, 'rejected')}
                      variant="destructive"
                      className="flex-1 gap-2"
                    >
                      <X className="w-4 h-4" />
                      Recusar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
