import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationCache } from '@/hooks/useConversationCache';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Loader2, Search, Inbox, Mail, Star, Archive, AlertCircle, Tag, MoreVertical, FileInput, Send } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnifiedChat } from '@/components/UnifiedChat';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MessagesSkeleton } from '@/components/messages/MessagesSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatShortName } from '@/lib/utils';
import notificationSound from '@/assets/notification-sound.mp3';

interface Conversation {
  id: string;
  type: 'negotiation' | 'proposal';
  title: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
  businessName?: string;
  projectId?: string;
  businessId?: string;
  freelancerId?: string;
  hasDispute?: boolean;
  disputeStatus?: string;
  paymentStatus?: string;
  workStatus?: string;
  isProposalReceived?: boolean;
  isProposalSent?: boolean;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    conversations: cachedConversations, 
    setConversations: setCachedConversations,
    updateConversation,
    isStale
  } = useConversationCache();
  const cachedData = useConversationCache();
  const [conversations, setConversations] = useState<Conversation[]>(cachedData.conversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [profileId, setProfileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred' | 'archived' | 'disputes' | 'proposals_received' | 'proposals_sent'>('all');
  const [isInitialLoading, setIsInitialLoading] = useState(cachedData.conversations.length === 0 || !cachedData.lastFetched);
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const hasLoadedData = useRef(false);
  const hasLoadedOnce = useRef(false); // Flag para controlar primeiro carregamento
  const location = useLocation();
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializar áudio de notificação
  useEffect(() => {
    notificationAudioRef.current = new Audio(notificationSound);
    notificationAudioRef.current.volume = 0.5;
  }, []);

  // Função para tocar som de notificação
  const playNotificationSound = () => {
    if (notificationAudioRef.current) {
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(err => {
        console.log('Erro ao tocar notificação:', err);
      });
    }
  };

  useEffect(() => {
    document.title = 'Mensagens - Woorkins';
  }, []);

  // Ao trocar para Arquivadas, limpar busca para não esconder resultados
  useEffect(() => {
    if (activeFilter === 'archived' && searchQuery) {
      setSearchQuery('');
    }
  }, [activeFilter]);

  useEffect(() => {
    if (user && !hasLoadedData.current) {
      hasLoadedData.current = true;
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profileId) {
      console.log('🔄 Carregando conversas (filtro:', activeFilter, ')');
      
      // SEMPRE usar cache primeiro se disponível
      if (cachedData.conversations.length > 0) {
        setConversations(cachedData.conversations);
      }
      
      // Apenas mostrar skeleton completo no PRIMEIRO carregamento ABSOLUTO (sem cache)
      if (!hasLoadedOnce.current && cachedData.conversations.length === 0) {
        setIsInitialLoading(true);
        hasLoadedOnce.current = true;
      } else {
        // Qualquer outro caso - carregar em background
        setIsBackgroundLoading(true);
      }
      
      loadConversations(true).finally(() => {
        setIsFilterChanging(false);
        setIsInitialLoading(false);
        setIsBackgroundLoading(false);
      });
      
      const channel = setupRealtimeSubscriptions();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profileId, activeFilter]);

  const setupRealtimeSubscriptions = () => {
    return supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages'
        },
        (payload) => {
          const m: any = payload.new;
          setConversations(prev => {
            // Apenas atualizar conversas que já estão na lista atual
            // Isso evita que conversas arquivadas apareçam quando uma mensagem nova chega
            const existsInCurrent = prev.some(c => c.type === 'negotiation' && c.id === m.negotiation_id);
            if (!existsInCurrent) return prev;
            
            const updated = prev.map(c => {
              if (c.type === 'negotiation' && c.id === m.negotiation_id) {
                const isActive = selectedConversation?.type === 'negotiation' && selectedConversation?.id === c.id;
                const inc = !isActive && m.sender_id !== profileId ? 1 : 0;
                
                // Tocar som se for mensagem nova de outro usuário
                if (inc > 0) {
                  playNotificationSound();
                }
                
                const updatedConv = {
                  ...c,
                  lastMessageAt: m.created_at,
                  unreadCount: (c.unreadCount || 0) + inc,
                };
                cachedData.updateConversation(c.id, 'negotiation', updatedConv);
                return updatedConv;
              }
              return c;
            });
            const sorted = [...updated].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
            cachedData.setConversations(sorted);
            return sorted;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_messages'
        },
        (payload) => {
          const m: any = payload.new;
          setConversations(prev => {
            // Apenas atualizar conversas que já estão na lista atual
            const existsInCurrent = prev.some(c => c.type === 'proposal' && c.id === m.proposal_id);
            if (!existsInCurrent) return prev;
            
            const updated = prev.map(c => {
              if (c.type === 'proposal' && c.id === m.proposal_id) {
                const isActive = selectedConversation?.type === 'proposal' && selectedConversation?.id === c.id;
                const inc = !isActive && m.sender_id !== profileId ? 1 : 0;
                
                // Tocar som se for mensagem nova de outro usuário
                if (inc > 0) {
                  playNotificationSound();
                }
                
                const updatedConv = {
                  ...c,
                  lastMessageAt: m.created_at,
                  unreadCount: (c.unreadCount || 0) + inc,
                };
                cachedData.updateConversation(c.id, 'proposal', updatedConv);
                return updatedConv;
              }
              return c;
            });
            const sorted = [...updated].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
            cachedData.setConversations(sorted);
            return sorted;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_unread_counts',
          filter: `user_id=eq.${profileId}`
        },
        (payload) => {
          const update: any = payload.new;
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.type === update.conversation_type && c.id === update.conversation_id) {
                const updatedConv = {
                  ...c,
                  unreadCount: update.unread_count || 0,
                };
                cachedData.updateConversation(c.id, c.type, updatedConv);
                return updatedConv;
              }
              return c;
            });
            cachedData.setConversations(updated);
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals'
        },
        (payload) => {
          const updated: any = payload.new;
          setConversations(prev => {
            const updatedList = prev.map(c => {
              if (c.type === 'proposal' && c.id === updated.id) {
                const updatedConv = {
                  ...c,
                  status: updated.status,
                  paymentStatus: updated.payment_status,
                  workStatus: updated.work_status,
                  lastMessageAt: updated.updated_at,
                };
                cachedData.updateConversation(c.id, 'proposal', updatedConv);
                return updatedConv;
              }
              return c;
            });
            const sorted = [...updatedList].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
            cachedData.setConversations(sorted);
            return sorted;
          });
        }
      )
      .subscribe();
  };

  // Auto-select conversation from query params (only from notifications)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type') as 'negotiation' | 'proposal' | null;
    const id = params.get('id');
    if (type && id && conversations.length > 0) {
      const match = conversations.find(c => c.id === id && c.type === type);
      if (match) setSelectedConversation(match);
    }
  }, [location.search, conversations]);

  const loadProfile = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (profiles && profiles.length > 0) {
        setProfileId(profiles[0].id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setIsInitialLoading(false);
    }
  };

  const loadConversations = useCallback(async (forceRefresh = false) => {
    // Controle de concorrência: permitir override quando for forceRefresh
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏭️ Carregamento já em andamento, pulando...');
      return;
    }

    // Se tem cache válido e não é refresh forçado, usar cache sem fetch
    if (!forceRefresh && !cachedData.isStale()) {
      setConversations(cachedData.conversations);
      setIsInitialLoading(false);
      setIsBackgroundLoading(false);
      return;
    }

    isLoadingRef.current = true;
    // NÃO limpar conversas existentes - manter visíveis durante o load

    // Timeout de segurança: 10s max
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Timeout de carregamento, limpando flag');
      setIsBackgroundLoading(false);
      isLoadingRef.current = false;
    }, 10000);

    try {
      // Load aggregated unread counts for this user once
      const { data: unreadRows } = await supabase
        .from('message_unread_counts')
        .select('conversation_id, conversation_type, unread_count')
        .eq('user_id', profileId);
      const unreadMap = new Map<string, number>(
        (unreadRows || []).map((r: any) => [`${r.conversation_type}-${r.conversation_id}`, r.unread_count ?? 0])
      );

      // Load negotiations where user is the client
      let userNegotiationsQuery = supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          client_user_id,
          target_profile_id,
          updated_at,
          archived,
          archived_at,
          profiles!negotiations_target_profile_id_fkey(
            company_name,
            logo_url,
            id
          )
        `)
        .eq('client_user_id', user?.id)
        .order('updated_at', { ascending: false });
      if (activeFilter === 'archived') {
        userNegotiationsQuery = userNegotiationsQuery.eq('archived', true);
      } else {
        userNegotiationsQuery = userNegotiationsQuery.or('archived.is.null,archived.eq.false');
      }
      const { data: userNegotiations } = await userNegotiationsQuery;

      // Load negotiations where user is the business
      let businessNegotiationsQuery = supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          client_user_id,
          target_profile_id,
          updated_at,
          archived,
          archived_at,
          profiles!negotiations_target_profile_id_fkey(
            name,
            company_name,
            logo_url,
            id
          )
        `)
        .eq('target_profile_id', profileId)
        .order('updated_at', { ascending: false });
      if (activeFilter === 'archived') {
        businessNegotiationsQuery = businessNegotiationsQuery.eq('archived', true);
      } else {
        businessNegotiationsQuery = businessNegotiationsQuery.or('archived.is.null,archived.eq.false');
      }
      const { data: businessNegotiations } = await businessNegotiationsQuery;

      // Load proposals where user is the freelancer
      let freelancerProposalsQuery = supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          archived,
          archived_at,
          freelancer_id,
          payment_status,
          work_status,
          project:projects!inner(
            id,
            title,
            profile_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('freelancer_id', profileId)
        .order('updated_at', { ascending: false });
      if (activeFilter === 'archived') {
        freelancerProposalsQuery = freelancerProposalsQuery.eq('archived', true);
      } else {
        freelancerProposalsQuery = freelancerProposalsQuery.or('archived.is.null,archived.eq.false');
      }
      const { data: freelancerProposals } = await freelancerProposalsQuery;

      // Load proposals where user is the project owner
      let ownerProposalsQuery = supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          archived,
          archived_at,
          freelancer_id,
          payment_status,
          work_status,
          freelancer:profiles!proposals_freelancer_id_fkey(
            full_name,
            avatar_url
          ),
          project:projects!inner(
            id,
            title,
            profile_id
          )
        `)
        .eq('project.profile_id', profileId)
        .order('updated_at', { ascending: false });
      if (activeFilter === 'archived') {
        ownerProposalsQuery = ownerProposalsQuery.eq('archived', true);
      } else {
        ownerProposalsQuery = ownerProposalsQuery.or('archived.is.null,archived.eq.false');
      }
      const { data: ownerProposals } = await ownerProposalsQuery;

      const negotiations = [...(userNegotiations || []), ...(businessNegotiations || [])];
      
      // Separar propostas recebidas (owner) e enviadas (freelancer)
      const proposalsReceived = ownerProposals || [];
      const proposalsSent = freelancerProposals || [];
      
      // Para caixa de entrada: apenas negociações e propostas recebidas
      const proposals = [...proposalsReceived, ...proposalsSent];

      // Count unread messages for each negotiation
      const negotiationConvos: Conversation[] = await Promise.all((negotiations || []).map(async (neg) => {
        const { count } = await supabase
          .from('negotiation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('negotiation_id', neg.id)
          .neq('sender_id', profileId)
          .in('status', ['sent', 'delivered']);

        return {
          id: neg.id,
          type: 'negotiation' as const,
          title: neg.service_description || 'Negociação',
          otherUser: {
            id: (neg.profiles as any)?.id || '',
          name: (neg.profiles as any)?.company_name || (neg.profiles as any)?.name || 'Usuário',
          avatar: (neg.profiles as any)?.logo_url || (neg.profiles as any)?.avatar_url,
          },
          lastMessageAt: activeFilter === 'archived' ? ((neg as any).archived_at ?? neg.updated_at) : neg.updated_at,
          unreadCount: unreadMap.get(`negotiation-${neg.id}`) ?? (count || 0),
          status: neg.status,
          businessName: (neg.profiles as any)?.company_name || (neg.profiles as any)?.name || 'Usuário',
          businessId: neg.target_profile_id,
        };
      }));

      // Count unread messages for each proposal
      const proposalConvos: Conversation[] = await Promise.all((proposals || []).map(async (prop) => {
        const { count } = await supabase
          .from('proposal_messages')
          .select('*', { count: 'exact', head: true })
          .eq('proposal_id', prop.id)
          .neq('sender_id', profileId)
          .in('status', ['sent', 'delivered']);

        // Check for disputes
        const { data: disputes } = await supabase
          .from('project_disputes')
          .select('id, status')
          .eq('proposal_id', prop.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const hasDispute = disputes && disputes.length > 0;
        const disputeStatus = disputes?.[0]?.status;

        // Determine if current user is the project owner or freelancer
        const isOwner = prop.project.profile_id === profileId;
        const isFreelancer = prop.freelancer_id === profileId;
        
        // If owner, show freelancer info; if freelancer, show owner info
        const otherUserData = isOwner 
          ? {
              id: prop.freelancer_id,
              name: formatShortName((prop as any).freelancer?.full_name || 'Freelancer'),
              avatar: (prop as any).freelancer?.avatar_url,
            }
          : {
              id: prop.project.profile_id,
              name: formatShortName((prop as any).project?.profiles?.full_name || 'Cliente'),
              avatar: (prop as any).project?.profiles?.avatar_url,
            };

        return {
          id: prop.id,
          type: 'proposal' as const,
          title: prop.project.title,
          otherUser: otherUserData,
          lastMessage: prop.message ? prop.message.substring(0, 60) + '...' : undefined,
          lastMessageAt: activeFilter === 'archived' ? ((prop as any).archived_at ?? prop.updated_at) : prop.updated_at,
          unreadCount: unreadMap.get(`proposal-${prop.id}`) ?? (count || 0),
          status: prop.status,
          projectId: prop.project.id,
          freelancerId: prop.freelancer_id,
          hasDispute,
          disputeStatus,
          paymentStatus: (prop as any).payment_status,
          workStatus: (prop as any).work_status,
          isProposalReceived: isOwner,
          isProposalSent: isFreelancer,
        };
      }));

      const allConvos = [...negotiationConvos, ...proposalConvos].sort(
        (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );

      // Atualizar cache
      cachedData.setConversations(allConvos);
      
      // Reconcile aggregated unread counts to ensure header badge updates immediately
      const aggregateRows = allConvos.map((c) => ({
        user_id: profileId,
        conversation_id: c.id,
        conversation_type: c.type,
        unread_count: c.unreadCount,
        last_read_at: c.unreadCount === 0 ? new Date().toISOString() : null,
      }));
      if (aggregateRows.length) {
        try {
          await supabase
            .from('message_unread_counts')
            .upsert(aggregateRows, { onConflict: 'user_id,conversation_id,conversation_type' });
        } catch (upsertError) {
          console.warn('Erro ao atualizar unread counts (RLS):', upsertError);
        }
      }

      // Atualizar tanto o estado local quanto o cache global
      setConversations(allConvos);
      setIsInitialLoading(false);
      setIsBackgroundLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setIsBackgroundLoading(false);
      isLoadingRef.current = false;
    }
  }, [profileId, activeFilter, isStale, cachedConversations, setCachedConversations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      accepted: 'Aceito',
      completed: 'Concluído',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado',
      pending: 'Pendente',
      open: 'Aberto',
    };
    return statusMap[status] || status;
  };

  const handleArchiveConversation = async (conv: Conversation, archived: boolean) => {
    try {
      const table = conv.type === 'negotiation' ? 'negotiations' : 'proposals';
      
      const { error } = await supabase
        .from(table)
        .update({ 
          archived,
          archived_at: archived ? new Date().toISOString() : null
        })
        .eq('id', conv.id);

      if (error) throw error;

      // Remover da lista local instantaneamente
      setConversations(prev => prev.filter(c => c.id !== conv.id));
      
      // Se arquivou, limpar seleção
      if (archived && selectedConversation?.id === conv.id) {
        setSelectedConversation(null);
      }

      // Se estiver na aba Arquivadas, forçar reload imediato
      if (activeFilter === 'archived') {
        setTimeout(() => loadConversations(true), 300);
      } else {
        // Recarregar conversas em background
        setTimeout(() => loadConversations(true), 500);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  // Função para obter informações dinâmicas do badge baseado no status
  const getProposalBadgeInfo = (conv: Conversation) => {
    const isFreelancer = conv.freelancerId === profileId;
    const isOwner = !isFreelancer;
    const status = conv.status;
    
    // Badges para propostas - PRIORIZAR work_status e payment_status
    if (conv.type === 'proposal') {
      const ws = conv.workStatus;
      const isPaid = ['captured', 'paid_escrow', 'paid', 'released'].includes(conv.paymentStatus || '');
      
      // Estados de trabalho têm prioridade máxima
      if (ws === 'freelancer_completed') {
        return isOwner
          ? { text: 'Concluído - Confirmar', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
          : { text: 'Aguardando confirmação', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
      }
      if (ws === 'in_progress') {
        return { text: 'Em andamento', color: 'bg-blue-500 text-white dark:bg-blue-600' };
      }
      if (ws === 'owner_confirmed') {
        return { text: 'Confirmado', color: 'bg-green-500 text-white dark:bg-green-600' };
      }
      if (ws === 'completed') {
        return { text: 'Projeto finalizado', color: 'bg-green-700 text-white dark:bg-green-800' };
      }

      // Pagamento efetuado, mas sem work_status avançado
      if (isPaid) {
        return isOwner
          ? { text: 'Projeto iniciado', color: 'bg-green-500 text-white dark:bg-green-600' }
          : { text: 'Pago - Trabalhar', color: 'bg-green-500 text-white dark:bg-green-600' };
      }

      // Status de proposta aceita sem pagamento
      if (status === 'accepted') {
        return { text: 'Aguardando pagamento', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
      }

      // Demais status de proposta baseados na perspectiva
      if (isFreelancer) {
        switch (status) {
          case 'pending':
            return { text: 'Proposta enviada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
          case 'counter_proposal':
            return { text: 'Contraproposta recebida', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
          case 'rejected':
            return { text: 'Proposta rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
          case 'cancelled':
            return { text: 'Cancelado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
          default:
            return { text: 'Proposta enviada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
        }
      } else {
        // Perspectiva do Dono do Projeto
        switch (status) {
          case 'pending':
            return { text: 'Proposta recebida', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
          case 'counter_proposal':
            return { text: 'Contraproposta enviada', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
          case 'rejected':
            return { text: 'Proposta rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
          case 'cancelled':
            return { text: 'Cancelado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
          default:
            return { text: 'Proposta recebida', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
        }
      }
    }
    
    // Badges para negociações
    if (conv.type === 'negotiation') {
      switch (status) {
        case 'open':
          return { text: 'Negociação aberta', color: 'bg-blue-500 text-white dark:bg-blue-600' };
        case 'accepted':
          return { text: 'Negociação aceita', color: 'bg-green-500 text-white dark:bg-green-600' };
        case 'rejected':
          return { text: 'Negociação rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
        case 'completed':
          return { text: 'Concluída', color: 'bg-green-700 text-white dark:bg-green-800' };
        default:
          return { text: 'Negociação', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' };
      }
    }
    
    return { text: 'Status', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' };
  };

  // Calcular contadores de mensagens não lidas por categoria
  const unreadCounts = useMemo(() => {
    return {
      all: conversations.filter(c => 
        c.unreadCount > 0 && 
        (c.type === 'negotiation' || (c.type === 'proposal' && (c as any).isProposalReceived))
      ).length,
      proposals_received: conversations.filter(c => 
        c.unreadCount > 0 && 
        c.type === 'proposal' && 
        (c as any).isProposalReceived === true
      ).length,
      proposals_sent: conversations.filter(c => 
        c.unreadCount > 0 && 
        c.type === 'proposal' && 
        (c as any).isProposalSent === true
      ).length,
      unread: conversations.filter(c => c.unreadCount > 0).length,
      disputes: conversations.filter(c => 
        c.unreadCount > 0 && 
        c.type === 'proposal' && 
        c.hasDispute === true
      ).length,
      archived: conversations.filter(c => c.unreadCount > 0).length,
    };
  }, [conversations]);

  const filteredConversations = conversations
    .filter(conv => {
      // Search filter
      const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Tab filters
      switch (activeFilter) {
        case 'unread':
          return conv.unreadCount > 0;
        case 'archived':
          // Already filtered by archived in loadConversations
          return true;
        case 'starred':
          // TODO: Implement starred functionality
          return false;
        case 'disputes':
          // Only proposals with active disputes
          return conv.type === 'proposal' && conv.hasDispute === true;
        case 'proposals_received':
          // Apenas propostas recebidas (usuário é owner do projeto)
          return conv.type === 'proposal' && (conv as any).isProposalReceived === true;
        case 'proposals_sent':
          // Apenas propostas enviadas (usuário é freelancer)
          return conv.type === 'proposal' && (conv as any).isProposalSent === true;
        case 'all':
          // Caixa de entrada: negociações + propostas recebidas (NÃO incluir propostas enviadas)
          if (conv.type === 'negotiation') return true;
          if (conv.type === 'proposal' && (conv as any).isProposalReceived) return true;
          return false;
        default:
          return true;
      }
    });

  // Removido loading bloqueante - renderiza imediatamente com cache

  if (isInitialLoading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Header />
        <main className="flex-1 container mx-auto py-6">
          <MessagesSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar de Navegação */}
        <div className="w-64 bg-gradient-to-br from-primary/10 via-card to-secondary/10 shadow-xl border-r border-primary/20 p-4 flex flex-col backdrop-blur-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Mensagens
              </h2>
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'all' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <Inbox className={`h-4 w-4 ${activeFilter === 'all' ? '' : 'text-blue-500'}`} />
              <span>Caixa de Entrada</span>
              {unreadCounts.all > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.all}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveFilter('proposals_received')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'proposals_received' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <FileInput className={`h-4 w-4 ${activeFilter === 'proposals_received' ? '' : 'text-green-500'}`} />
              <span>Propostas Recebidas</span>
              {unreadCounts.proposals_received > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.proposals_received}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveFilter('proposals_sent')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'proposals_sent' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <Send className={`h-4 w-4 ${activeFilter === 'proposals_sent' ? '' : 'text-purple-500'}`} />
              <span>Propostas Enviadas</span>
              {unreadCounts.proposals_sent > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.proposals_sent}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveFilter('unread')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'unread' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <Mail className={`h-4 w-4 ${activeFilter === 'unread' ? '' : 'text-orange-500'}`} />
              <span>Não Lidas</span>
              {unreadCounts.unread > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.unread}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveFilter('starred')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'starred' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <Star className={`h-4 w-4 ${activeFilter === 'starred' ? '' : 'text-yellow-500'}`} />
              <span>Destacadas</span>
            </button>
            
            <button
              onClick={() => setActiveFilter('archived')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'archived' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <Archive className={`h-4 w-4 ${activeFilter === 'archived' ? '' : 'text-gray-500'}`} />
              <span>Arquivadas</span>
              {unreadCounts.archived > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.archived}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveFilter('disputes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'disputes' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <AlertCircle className={`h-4 w-4 ${activeFilter === 'disputes' ? '' : 'text-red-500'}`} />
              <span>Disputa</span>
              {unreadCounts.disputes > 0 && (
                <Badge variant="destructive" className="ml-auto">{unreadCounts.disputes}</Badge>
              )}
            </button>
          </nav>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Lista de Conversas */}
          <div className="w-96 border-r bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-sm">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary rounded-2xl bg-white dark:bg-slate-900 shadow-md text-base font-medium"
                />
              </div>
              {isBackgroundLoading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="font-medium">Atualizando...</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 && !isBackgroundLoading ? (
                <div className="text-center py-12 text-muted-foreground px-4">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                  </p>
                  <p className="text-sm mt-1">
                    {searchQuery ? 'Tente outro termo' : 'Suas mensagens aparecerão aqui'}
                  </p>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => (
                    <button
                      key={`${conv.type}-${conv.id}`}
                      type="button"
                      onClick={() => {
                        // Atualização instantânea sem reload
                        setSelectedConversation(conv);

                        // Zero local badge imediatamente para feedback visual
                        setConversations(prev => prev.map(c => 
                          c.id === conv.id && c.type === conv.type 
                            ? { ...c, unreadCount: 0 } 
                            : c
                        ));

                        // Marcar como lido em background (sem await para não travar UI)
                        const markAsRead = async () => {
                          const table = conv.type === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
                          const idColumn = conv.type === 'negotiation' ? 'negotiation_id' : 'proposal_id';
                          
                          await (supabase.from(table) as any)
                            .update({ status: 'read', read_at: new Date().toISOString() })
                            .eq(idColumn, conv.id)
                            .neq('sender_id', profileId)
                            .in('status', ['sent','delivered']);

                          await supabase
                            .from('message_unread_counts')
                            .upsert(
                              {
                                user_id: profileId,
                                conversation_id: conv.id,
                                conversation_type: conv.type,
                                unread_count: 0,
                                last_read_at: new Date().toISOString(),
                              },
                              { onConflict: 'user_id,conversation_id,conversation_type' }
                            );
                        };
                        
                        markAsRead();
                      }}
                      className={`w-full p-4 border-b transition-all duration-200 text-left group hover:scale-[1.02] ${
                        selectedConversation?.id === conv.id
                          ? 'bg-[linear-gradient(90deg,hsl(173_84%_37%/0.25),hsl(173_84%_37%/0.05))] border-l-4 border-l-[#11aa9b] shadow-lg'
                          : 'hover:bg-gradient-to-r hover:from-muted hover:to-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex flex-col items-center">
                          <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-primary/50 transition-all">
                            <AvatarImage src={conv.otherUser.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                              {conv.otherUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {conv.unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1.5 bg-red-500 hover:bg-red-500 text-white text-xs animate-pulse shadow-lg">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </Badge>
                          )}
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                              {(() => {
                                const messageDate = new Date(conv.lastMessageAt);
                                const now = new Date();
                                const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
                                
                                if (diffInHours < 24) {
                                  return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h';
                                } else {
                                  return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                }
                              })()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                                {conv.title}
                              </p>
                              {conv.hasDispute && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex-shrink-0">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {conv.disputeStatus === 'resolved' ? 'Resolvida' : 'Em Disputa'}
                                </span>
                              )}
                            </div>
                            
                            {/* Menu dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {(conv.type === 'proposal' || conv.type === 'negotiation') && (() => {
                                  const badgeInfo = getProposalBadgeInfo(conv);
                                  return (
                                    <DropdownMenuItem className="flex justify-between">
                                      <span className="text-muted-foreground">Status:</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeInfo.color}`}>
                                        {badgeInfo.text}
                                      </span>
                                    </DropdownMenuItem>
                                  );
                                })()}
                                {conv.hasDispute && (
                                  <DropdownMenuItem className="flex justify-between">
                                    <span className="text-muted-foreground">Disputa:</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                      {conv.disputeStatus === 'resolved' ? 'Resolvida' : 'Em Disputa'}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveConversation(conv, activeFilter !== 'archived');
                                  }}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  {activeFilter === 'archived' ? 'Desarquivar' : 'Arquivar'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-600 truncate">
                              {conv.otherUser.name}
                            </p>
                            {(conv.type === 'proposal' || conv.type === 'negotiation') && (() => {
                              const badgeInfo = getProposalBadgeInfo(conv);
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${badgeInfo.color}`}>
                                  {badgeInfo.text}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 bg-card overflow-hidden flex flex-col">
            {selectedConversation ? (
              <UnifiedChat
                conversationId={selectedConversation.id}
                conversationType={selectedConversation.type}
                otherUser={selectedConversation.otherUser}
                profileId={profileId}
                projectId={selectedConversation.projectId}
                projectTitle={selectedConversation.type === 'proposal' ? selectedConversation.title : undefined}
                businessName={selectedConversation.businessName}
                businessId={selectedConversation.businessId}
                suppressToasts={true}
                onConversationDeleted={() => {
                  setSelectedConversation(null);
                  loadConversations();
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
                <div className="text-center p-8 max-w-md">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-full">
                      <MessageCircle className="h-16 w-16 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Selecione uma conversa
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Escolha uma conversa da lista para começar a trocar mensagens
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
