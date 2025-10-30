import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, DollarSign, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

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
          accepted_amount,
          current_proposal_amount,
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
        .in('payment_status', ['captured', 'paid_escrow', 'paid', 'released'])
        .in('work_status', ['in_progress', 'freelancer_completed', 'owner_confirmed']);

      if (freelancerError) throw freelancerError;

      // Get works where user is owner
      const { data: asOwner, error: ownerError } = await supabase
        .from('proposals')
        .select(`
          id,
          budget,
          accepted_amount,
          current_proposal_amount,
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
        .in('payment_status', ['captured', 'paid_escrow', 'paid', 'released'])
        .in('work_status', ['in_progress', 'freelancer_completed', 'owner_confirmed']);

      if (ownerError) throw ownerError;

      // Get correct budget from proposals - priority order:
      // 1. accepted_amount (valor final aceito)
      // 2. current_proposal_amount (valor da última contra-proposta)
      // 3. budget (valor original da proposta)
      const getCorrectBudget = (proposal: any): number => {
        const accepted = proposal.accepted_amount;
        const current = proposal.current_proposal_amount;
        const original = proposal.budget;
        
        console.log(`🔍 Determinando valor correto para proposal ${proposal.id}:`);
        console.log(`   💰 accepted_amount: ${accepted}`);
        console.log(`   📋 current_proposal_amount: ${current}`);
        console.log(`   🎯 budget original: ${original}`);
        
        // Se tem valor aceito (final), usar esse
        if (accepted !== null && accepted !== undefined) {
          console.log(`✅ Usando accepted_amount: R$ ${accepted}`);
          return accepted;
        }
        
        // Se tem contra-proposta em andamento, usar essa
        if (current !== null && current !== undefined) {
          console.log(`📝 Usando current_proposal_amount: R$ ${current}`);
          return current;
        }
        
        // Fallback para valor original
        console.log(`🔄 Usando budget original: R$ ${original}`);
        return original;
      };

      // Combine and format
      const freelancerWorks: ActiveWork[] = await Promise.all((asFreelancer || []).map(async (w: any) => {
        const correctBudget = getCorrectBudget(w);
        
        return {
          id: w.id,
          project_title: w.project.title,
          budget: correctBudget,
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
        };
      }));

      const ownerWorks: ActiveWork[] = await Promise.all((asOwner || []).map(async (w: any) => {
        const correctBudget = getCorrectBudget(w);
        
        return {
          id: w.id,
          project_title: w.project.title,
          budget: correctBudget,
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
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-white',
        icon: Clock
      };
    }
    if (work.work_status === 'owner_confirmed') {
      return {
        text: 'Confirmado',
        color: 'from-green-500 to-emerald-500',
        textColor: 'text-white',
        icon: CheckCircle2
      };
    }
    return {
      text: 'Em Andamento',
      color: 'from-amber-400 via-orange-500 to-pink-500',
      textColor: 'text-white',
      icon: Sparkles
    };
  };

  const getPaymentStatusForFreelancer = (work: ActiveWork) => {
    if (work.payment_status === 'released') {
      return {
        text: '✅ Disponível',
        color: 'from-green-500 to-emerald-500',
        textColor: 'text-white'
      };
    }
    if (['captured', 'paid_escrow', 'paid'].includes(work.payment_status) && work.work_status !== 'completed') {
      return {
        text: '💰 Pendente',
        color: 'from-yellow-500 to-amber-500',
        textColor: 'text-white'
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-primary/5 p-6 backdrop-blur-xl border border-border/50">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-2 w-full mb-4" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (works.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {works.map((work) => {
        const statusInfo = getStatusInfo(work);
        const StatusIcon = statusInfo.icon;
        const remaining = calculateRemainingDays(work);
        const progressPercentage = Math.max(0, Math.min(100, ((work.delivery_days - remaining) / work.delivery_days) * 100));
        const paymentStatus = work.is_freelancer ? getPaymentStatusForFreelancer(work) : null;
        
        return (
          <div
            key={work.id}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-primary/5 backdrop-blur-xl border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Floating particles effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative p-6 space-y-4">
              {/* Header: Icon + Title + Status Badge */}
              <div className="flex items-start gap-4">
                {/* Animated Icon */}
                <div className={`relative flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${statusInfo.color} p-3 shadow-lg ${
                  work.work_status === 'in_progress' ? 'animate-glow-pulse' : ''
                }`}>
                  <StatusIcon className={`w-full h-full text-white ${
                    work.work_status === 'in_progress' ? 'animate-rotate-slow' : ''
                  }`} />
                </div>

                {/* Title & Client Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate mb-1">
                    {work.project_title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{work.is_freelancer ? '👤' : '💼'}</span>
                    <span className="truncate">{work.other_user_name}</span>
                  </p>
                </div>

                {/* Status Badge */}
                <Badge className={`bg-gradient-to-r ${statusInfo.color} ${statusInfo.textColor} shadow-lg border-0 px-4 py-1.5 text-xs font-bold whitespace-nowrap`}>
                  {statusInfo.text}
                </Badge>
              </div>

              {/* Progress Bar (only for in_progress) */}
              {work.work_status === 'in_progress' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Progresso</span>
                    <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-primary'}`}>
                      {remaining < 0 
                        ? `Atrasado ${Math.abs(remaining)}d`
                        : `${remaining}d restantes`}
                    </span>
                  </div>
                  <div className="relative h-2 bg-secondary/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 animate-progress-shine"
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundSize: '200% 100%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom Section: Budget + Payment Status + Button */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <div className="flex items-center gap-3">
                  {/* Budget */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-emerald-600">
                      R$ {work.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Payment Status for Freelancer */}
                  {paymentStatus && (
                    <Badge className={`bg-gradient-to-r ${paymentStatus.color} ${paymentStatus.textColor} border-0 px-3 py-1.5 text-xs font-bold shadow-md`}>
                      {paymentStatus.text}
                    </Badge>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-6"
                  onClick={() => navigate(`/mensagens?type=proposal&id=${work.id}`)}
                >
                  💬 Ver Conversa
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
