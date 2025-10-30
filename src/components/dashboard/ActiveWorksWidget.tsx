import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ActiveWork {
  id: string;
  project_title: string;
  budget: number;
  work_status: string;
  payment_status: string;
  freelancer_completed_at?: string;
  owner_confirmed_at?: string;
  created_at: string;
  updated_at?: string;
  delivery_days: number;
  payment_captured_at: string | null;
  is_freelancer: boolean;
  other_user_name: string;
}

interface ActiveWorksWidgetProps {
  profileId: string;
}

export function ActiveWorksWidget({ profileId }: ActiveWorksWidgetProps) {
  const [works, setWorks] = useState<ActiveWork[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveWorks();
  }, [profileId]);

  const calculateRemainingDays = (work: ActiveWork) => {
    const base = work.payment_captured_at || work.updated_at || work.created_at;
    const baseDate = new Date(base as string);
    if (isNaN(baseDate.getTime())) return work.delivery_days;
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = work.delivery_days - daysPassed;
    return remainingDays;
  };

  const loadActiveWorks = async () => {
    try {
      // Get works where user is freelancer
      const { data: asFreelancer, error: freelancerError } = await supabase
        .from('proposals')
        .select(`
          id,
          budget,
          work_status,
          payment_status,
          freelancer_completed_at,
          owner_confirmed_at,
          created_at,
          updated_at,
          delivery_days,
          payment_captured_at,
          project:projects!inner(
            title,
            profile_id,
            owner:profiles!projects_profile_id_fkey(full_name)
          )
        `)
        .eq('freelancer_id', profileId)
        .eq('status', 'accepted')
        .in('payment_status', ['captured', 'paid_escrow', 'paid'])
        .in('work_status', ['in_progress', 'freelancer_completed', 'owner_confirmed']);

      if (freelancerError) throw freelancerError;

      // Get works where user is owner
      const { data: asOwner, error: ownerError } = await supabase
        .from('proposals')
        .select(`
          id,
          budget,
          work_status,
          payment_status,
          freelancer_completed_at,
          owner_confirmed_at,
          created_at,
          updated_at,
          delivery_days,
          payment_captured_at,
          freelancer_id,
          freelancer:profiles!proposals_freelancer_id_fkey(full_name),
          project:projects!inner(
            title,
            profile_id
          )
        `)
        .eq('project.profile_id', profileId)
        .eq('status', 'accepted')
        .in('payment_status', ['captured', 'paid_escrow', 'paid'])
        .in('work_status', ['in_progress', 'freelancer_completed', 'owner_confirmed']);

      if (ownerError) throw ownerError;

      // Combine and format
      const freelancerWorks: ActiveWork[] = (asFreelancer || []).map((w: any) => ({
        id: w.id,
        project_title: w.project.title,
        budget: w.budget,
        work_status: w.work_status,
        payment_status: w.payment_status,
        freelancer_completed_at: w.freelancer_completed_at,
        owner_confirmed_at: w.owner_confirmed_at,
        created_at: w.created_at,
        updated_at: w.updated_at,
        delivery_days: w.delivery_days,
        payment_captured_at: w.payment_captured_at,
        is_freelancer: true,
        other_user_name: w.project.owner.full_name,
      }));

      const ownerWorks: ActiveWork[] = (asOwner || []).map((w: any) => ({
        id: w.id,
        project_title: w.project.title,
        budget: w.budget,
        work_status: w.work_status,
        payment_status: w.payment_status,
        freelancer_completed_at: w.freelancer_completed_at,
        owner_confirmed_at: w.owner_confirmed_at,
        created_at: w.created_at,
        updated_at: w.updated_at,
        delivery_days: w.delivery_days,
        payment_captured_at: w.payment_captured_at,
        is_freelancer: false,
        other_user_name: w.freelancer.full_name,
      }));

      setWorks([...freelancerWorks, ...ownerWorks]);
    } catch (error) {
      console.error('Error loading active works:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (work: ActiveWork) => {
    if (work.work_status === 'freelancer_completed') {
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando Confirmação
        </Badge>
      );
    }
    if (work.work_status === 'owner_confirmed') {
      return (
        <Badge className="bg-green-500/10 text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
        <Briefcase className="h-3 w-3 mr-1" />
        Em Andamento
      </Badge>
    );
  };

  const getActionText = (work: ActiveWork) => {
    if (work.is_freelancer && work.work_status === 'in_progress') {
      return 'Marcar como Concluído';
    }
    if (!work.is_freelancer && work.work_status === 'freelancer_completed') {
      return 'Confirmar Entrega';
    }
    if (work.work_status === 'owner_confirmed') {
      return 'Aguardando Pagamento';
    }
    return 'Ver Detalhes';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Trabalhos em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (works.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Trabalhos em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum trabalho em andamento no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Trabalhos em Andamento
          <Badge variant="secondary">{works.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {works.map((work) => (
          <div
            key={work.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{work.project_title}</h4>
                <p className="text-xs text-muted-foreground">
                  {work.is_freelancer ? 'Cliente' : 'Freelancer'}: {work.other_user_name}
                </p>
              </div>
              {getStatusBadge(work)}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <DollarSign className="h-4 w-4" />
                  R$ {work.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                {work.work_status === 'in_progress' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      const remaining = calculateRemainingDays(work);
                      return remaining < 0 
                        ? `Atrasado ${Math.abs(remaining)}d`
                        : `${remaining}d restantes`;
                    })()}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant={work.work_status === 'owner_confirmed' ? 'ghost' : 'default'}
                onClick={() => navigate(`/mensagens?type=proposal&id=${work.id}`)}
              >
                Ver Conversa
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
