import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, DollarSign } from 'lucide-react';
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
  last_message?: string;
  last_message_at?: string;
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
      const freelancerWorks: ActiveWork[] = await Promise.all((asFreelancer || []).map(async (w: any) => {
        // Get last message from chat
        const { data: lastMsg } = await supabase
          .from('proposal_messages')
          .select('content, created_at')
          .eq('proposal_id', w.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
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
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        };
      }));

      const ownerWorks: ActiveWork[] = await Promise.all((asOwner || []).map(async (w: any) => {
        // Get last message from chat
        const { data: lastMsg } = await supabase
          .from('proposal_messages')
          .select('content, created_at')
          .eq('proposal_id', w.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
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
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        };
      }));

      setWorks([...freelancerWorks, ...ownerWorks]);
    } catch (error) {
      console.error('Error loading active works:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (work: ActiveWork) => {
    if (work.work_status === 'freelancer_completed') {
      return {
        text: 'Aguardando Confirmação',
        color: 'bg-blue-500 text-white',
        icon: Clock
      };
    }
    if (work.work_status === 'owner_confirmed') {
      return {
        text: 'Confirmado',
        color: 'bg-green-500 text-white',
        icon: Clock
      };
    }
    return {
      text: 'Em Andamento',
      color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
      icon: Loader2
    };
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
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="pt-6 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 p-4 rounded-xl bg-background/50">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (works.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <CardContent className="pt-6 space-y-4">
        {works.map((work) => {
          const statusInfo = getStatusInfo(work);
          const StatusIcon = statusInfo.icon;
          const remaining = calculateRemainingDays(work);
          
          return (
            <div
              key={work.id}
              className="group relative p-5 rounded-xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 space-y-4"
            >
              {/* Animação de fundo */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              
              <div className="relative space-y-3">
                {/* Título e Status com animação */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${statusInfo.icon === Loader2 ? 'animate-spin' : ''} ${statusInfo.color.includes('gradient') ? 'text-orange-500' : 'text-primary'}`} />
                      <h4 className="font-bold text-base truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        {work.project_title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {work.is_freelancer ? '👤 Cliente' : '💼 Freelancer'}: {work.other_user_name}
                    </p>
                  </div>
                  <Badge className={`${statusInfo.color} shadow-md font-semibold whitespace-nowrap`}>
                    {statusInfo.text}
                  </Badge>
                </div>

                {/* Última mensagem */}
                {work.last_message && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      💬 {work.last_message}
                    </p>
                  </div>
                )}

                {/* Valor e Prazo */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-bold text-green-600">
                        R$ {work.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {work.work_status === 'in_progress' && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                        remaining < 0 
                          ? 'bg-red-500/10 border border-red-500/20' 
                          : 'bg-blue-500/10 border border-blue-500/20'
                      }`}>
                        <Clock className={`h-4 w-4 ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className={`text-xs font-semibold ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {remaining < 0 
                            ? `⚠️ Atrasado ${Math.abs(remaining)}d`
                            : `⏰ ${remaining}d restantes`}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    onClick={() => navigate(`/mensagens?type=proposal&id=${work.id}`)}
                  >
                    💬 Ver Conversa
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
