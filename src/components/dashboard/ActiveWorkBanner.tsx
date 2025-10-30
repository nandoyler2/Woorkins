import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, User, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActiveWork {
  id: string;
  project_id: string;
  project_title: string;
  delivery_days: number;
  payment_captured_at: string;
  is_freelancer: boolean;
  other_user_name: string;
}

interface ActiveWorkBannerProps {
  profileId: string;
}

export function ActiveWorkBanner({ profileId }: ActiveWorkBannerProps) {
  const [work, setWork] = useState<ActiveWork | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveWork();
  }, [profileId]);

  const loadActiveWork = async () => {
    try {
      // Get work where user is freelancer
      const { data: asFreelancer, error: freelancerError } = await supabase
        .from('proposals')
        .select(`
          id,
          delivery_days,
          payment_captured_at,
          project:projects!inner(
            id,
            title,
            profile_id,
            owner:profiles!projects_profile_id_fkey(full_name)
          )
        `)
        .eq('freelancer_id', profileId)
        .eq('status', 'accepted')
        .in('payment_status', ['captured', 'paid_escrow'])
        .eq('work_status', 'in_progress')
        .order('payment_captured_at', { ascending: false })
        .limit(1)
        .single();

      if (asFreelancer && !freelancerError) {
        setWork({
          id: asFreelancer.id,
          project_id: asFreelancer.project.id,
          project_title: asFreelancer.project.title,
          delivery_days: asFreelancer.delivery_days,
          payment_captured_at: asFreelancer.payment_captured_at,
          is_freelancer: true,
          other_user_name: asFreelancer.project.owner.full_name,
        });
        setLoading(false);
        return;
      }

      // Get work where user is owner
      const { data: asOwner, error: ownerError } = await supabase
        .from('proposals')
        .select(`
          id,
          delivery_days,
          payment_captured_at,
          freelancer:profiles!proposals_freelancer_id_fkey(full_name),
          project:projects!inner(
            id,
            title,
            profile_id
          )
        `)
        .eq('project.profile_id', profileId)
        .eq('status', 'accepted')
        .in('payment_status', ['captured', 'paid_escrow'])
        .eq('work_status', 'in_progress')
        .order('payment_captured_at', { ascending: false })
        .limit(1)
        .single();

      if (asOwner && !ownerError) {
        setWork({
          id: asOwner.id,
          project_id: asOwner.project.id,
          project_title: asOwner.project.title,
          delivery_days: asOwner.delivery_days,
          payment_captured_at: asOwner.payment_captured_at,
          is_freelancer: false,
          other_user_name: asOwner.freelancer.full_name,
        });
      }
    } catch (error) {
      console.error('Error loading active work:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRemainingDays = () => {
    if (!work) return 0;
    
    const capturedDate = new Date(work.payment_captured_at);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = work.delivery_days - daysPassed;
    
    return remainingDays;
  };

  const handleGoToChat = () => {
    navigate(`/mensagens?type=proposal&id=${work?.id}`);
  };

  if (loading || !work) {
    return null;
  }

  const remainingDays = calculateRemainingDays();
  const isUrgent = remainingDays <= 2;
  const isOverdue = remainingDays < 0;

  return (
    <div className="animate-fade-in">
      <div 
        className={`
          relative overflow-hidden rounded-xl border-2 p-4 
          ${isOverdue 
            ? 'bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 border-destructive/30' 
            : isUrgent 
              ? 'bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-yellow-500/10 border-yellow-500/30'
              : 'bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30'
          }
          shadow-lg backdrop-blur-sm
          hover:shadow-xl transition-all duration-300
          animate-scale-in
        `}
      >
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[slide-in-right_3s_ease-in-out_infinite]" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`
                h-2 w-2 rounded-full animate-pulse
                ${isOverdue ? 'bg-destructive' : isUrgent ? 'bg-yellow-500' : 'bg-primary'}
              `} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trabalho em Andamento
              </span>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                {work.is_freelancer 
                  ? `Você tem um trabalho em andamento de ${work.other_user_name}`
                  : `Você tem um trabalho em andamento sendo feito por ${work.other_user_name}`
                }
              </h3>
              
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">{work.project_title}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Clock className={`h-4 w-4 ${isOverdue ? 'text-destructive' : isUrgent ? 'text-yellow-600' : ''}`} />
                  <span className={`font-semibold ${isOverdue ? 'text-destructive' : isUrgent ? 'text-yellow-600' : ''}`}>
                    {isOverdue 
                      ? `Atrasado ${Math.abs(remainingDays)} dia${Math.abs(remainingDays) !== 1 ? 's' : ''}`
                      : `Faltam ${remainingDays} dia${remainingDays !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{work.is_freelancer ? 'Cliente' : 'Freelancer'}: {work.other_user_name}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleGoToChat}
            className="flex-shrink-0 gap-2 shadow-md hover:shadow-lg transition-all hover-scale"
            size="lg"
          >
            <MessageSquare className="h-5 w-5" />
            Ir para Conversa
          </Button>
        </div>
      </div>
    </div>
  );
}
