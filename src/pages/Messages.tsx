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
import { MessageCircle, Loader2, Search, Inbox, Mail, Star, Archive, AlertCircle, Tag, MoreVertical, FileInput, Send, CheckCircle, EyeOff, Pin, PlayCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UnifiedChat } from '@/components/UnifiedChat';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MessagesSkeleton } from '@/components/messages/MessagesSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatShortName } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import notificationSound from '@/assets/notification-sound.mp3';
import emptyMessagesBg from '@/assets/empty-messages-bg.jpg';

const HERO_PHRASES = [
  "Grandes negócios acontecem aqui",
  "Grandes coisas começam com uma boa conversa.",
  "Toda parceria de sucesso começa por aqui.",
  "Troque ideias, feche projetos, conquiste resultados.",
  "Mensagens que viram oportunidades."
];

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
  isUnlocked?: boolean;
  ownerHasMessaged?: boolean;
  isFavorited?: boolean;
  hideFromInbox?: boolean;
  pinnedAt?: string | null;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred' | 'archived' | 'disputes' | 'proposals_received' | 'proposals_sent' | 'completed' | 'in_progress' | 'view_all'>('all');
  const [isInitialLoading, setIsInitialLoading] = useState(cachedData.conversations.length === 0 || !cachedData.lastFetched);
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [conversationToRemove, setConversationToRemove] = useState<Conversation | null>(null);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const hasLoadedData = useRef(false);
  const hasLoadedOnce = useRef(false); // Flag para controlar primeiro carregamento
  const location = useLocation();
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [heroPhrase] = useState(() => HERO_PHRASES[Math.floor(Math.random() * HERO_PHRASES.length)]);

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
                  hideFromInbox: false, // Mensagem nova traz de volta para caixa de entrada
                };
                
                // Se estava oculta, atualizar no banco também
                if (c.hideFromInbox) {
                  supabase.from('negotiations').update({ hide_from_inbox: false }).eq('id', c.id);
                }
                
                cachedData.updateConversation(c.id, 'negotiation', updatedConv);
                return updatedConv;
              }
              return c;
            });
            const sorted = [...updated].sort((a, b) => {
              if (a.pinnedAt && b.pinnedAt) {
                return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
              }
              if (a.pinnedAt && !b.pinnedAt) return -1;
              if (!a.pinnedAt && b.pinnedAt) return 1;
              return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
            });
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
                  hideFromInbox: false, // Mensagem nova traz de volta para caixa de entrada
                };
                
                // Se estava oculta, atualizar no banco também
                if (c.hideFromInbox) {
                  supabase.from('proposals').update({ hide_from_inbox: false }).eq('id', c.id);
                }
                
                cachedData.updateConversation(c.id, 'proposal', updatedConv);
                return updatedConv;
              }
              return c;
            });
            const sorted = [...updated].sort((a, b) => {
              if (a.pinnedAt && b.pinnedAt) {
                return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
              }
              if (a.pinnedAt && !b.pinnedAt) return -1;
              if (!a.pinnedAt && b.pinnedAt) return 1;
              return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
            });
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
          is_favorited,
          hide_from_inbox,
          pinned_at,
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
      } else if (activeFilter === 'view_all') {
        // Ver tudo: não filtra por archived
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
          is_favorited,
          hide_from_inbox,
          pinned_at,
          profiles!negotiations_target_profile_id_fkey(
            company_name,
            logo_url,
            id
          )
        `)
        .eq('target_profile_id', profileId)
        .order('updated_at', { ascending: false });
      if (activeFilter === 'archived') {
        businessNegotiationsQuery = businessNegotiationsQuery.eq('archived', true);
      } else if (activeFilter === 'view_all') {
        // Ver tudo: não filtra por archived
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
          is_unlocked,
          owner_has_messaged,
          is_favorited,
          hide_from_inbox,
          pinned_at,
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
      } else if (activeFilter === 'view_all') {
        // Ver tudo: não filtra por archived
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
          is_unlocked,
          owner_has_messaged,
          is_favorited,
          hide_from_inbox,
          pinned_at,
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
      } else if (activeFilter === 'view_all') {
        // Ver tudo: não filtra por archived
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
          isFavorited: (neg as any).is_favorited || false,
          hideFromInbox: (neg as any).hide_from_inbox || false,
          pinnedAt: (neg as any).pinned_at || null,
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
          isUnlocked: (prop as any).is_unlocked,
          ownerHasMessaged: (prop as any).owner_has_messaged,
          isFavorited: (prop as any).is_favorited || false,
          hideFromInbox: (prop as any).hide_from_inbox || false,
          pinnedAt: (prop as any).pinned_at || null,
        };
      }));

      // Ordenar: pinned primeiro (por pinnedAt DESC), depois por lastMessageAt DESC
      const allConvos = [...negotiationConvos, ...proposalConvos].sort((a, b) => {
        // Se ambos estão pinned, ordenar por pinnedAt
        if (a.pinnedAt && b.pinnedAt) {
          return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
        }
        // Se apenas A está pinned, A vem primeiro
        if (a.pinnedAt && !b.pinnedAt) return -1;
        // Se apenas B está pinned, B vem primeiro
        if (!a.pinnedAt && b.pinnedAt) return 1;
        // Se nenhum está pinned, ordenar por lastMessageAt
        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
      });

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

  const handleToggleFavorite = async (conv: Conversation) => {
    try {
      const table = conv.type === 'negotiation' ? 'negotiations' : 'proposals';
      const newFavoriteState = !conv.isFavorited;
      
      const { error } = await supabase
        .from(table)
        .update({ is_favorited: newFavoriteState })
        .eq('id', conv.id);

      if (error) throw error;

      // Atualizar na lista local
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, isFavorited: newFavoriteState } : c
      ));

      // Recarregar conversas para garantir consistência
      setTimeout(() => loadConversations(true), 300);
      
      toast({ title: newFavoriteState ? "Adicionado às favoritas" : "Removido das favoritas" });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: "Erro ao atualizar favorita", description: String(error) });
    }
  };

  const getTargetFilterName = (conv: Conversation) => {
    if (conv.type === 'proposal') {
      if (conv.workStatus === 'completed' || conv.workStatus === 'payment_complete') {
        return 'Finalizados';
      } else if ((conv as any).isProposalReceived) {
        return 'Propostas Recebidas';
      } else if ((conv as any).isProposalSent) {
        return 'Propostas Enviadas';
      }
    }
    return 'Arquivadas';
  };

  const getTargetFilterIcon = (conv: Conversation) => {
    if (conv.type === 'proposal') {
      if (conv.workStatus === 'completed' || conv.workStatus === 'payment_complete') {
        return { Icon: CheckCircle, color: 'text-green-500' };
      } else if ((conv as any).isProposalReceived) {
        return { Icon: FileInput, color: 'text-green-500' };
      } else if ((conv as any).isProposalSent) {
        return { Icon: Send, color: 'text-purple-500' };
      }
    }
    return { Icon: Archive, color: 'text-gray-500' };
  };

  const handleRemoveFromInbox = async (conv: Conversation) => {
    setConversationToRemove(conv);
    setShowRemoveDialog(true);
  };

  const confirmRemoveFromInbox = async () => {
    if (!conversationToRemove) return;

    try {
      const table = conversationToRemove.type === 'negotiation' ? 'negotiations' : 'proposals';
      
      const { error } = await supabase
        .from(table)
        .update({ hide_from_inbox: true })
        .eq('id', conversationToRemove.id);

      if (error) throw error;

      // Remover da lista local se estiver na caixa de entrada
      if (activeFilter === 'all') {
        setConversations(prev => prev.filter(c => c.id !== conversationToRemove.id));
        if (selectedConversation?.id === conversationToRemove.id) {
          setSelectedConversation(null);
        }
      }

      toast({ title: "Conversa removida da caixa de entrada" });
      
      // Recarregar conversas em background
      setTimeout(() => loadConversations(true), 500);
    } catch (error) {
      console.error('Error removing from inbox:', error);
      toast({ title: "Erro ao remover da caixa de entrada", description: String(error) });
    } finally {
      setShowRemoveDialog(false);
      setConversationToRemove(null);
    }
  };

  const handleShowInInbox = async (conv: Conversation) => {
    try {
      console.log('🔄 handleShowInInbox - before update:', {
        id: conv.id,
        type: conv.type,
        workStatus: conv.workStatus,
        status: conv.status,
        hideFromInbox: conv.hideFromInbox,
        title: conv.title
      });
      
      const table = conv.type === 'negotiation' ? 'negotiations' : 'proposals';
      const { error, data } = await supabase
        .from(table)
        .update({ hide_from_inbox: false })
        .eq('id', conv.id)
        .select();

      if (error) throw error;

      console.log('✅ handleShowInInbox - update successful:', data);

      toast({ title: 'Conversa exibida na caixa de entrada' });

      // Mudar para a aba "Caixa de Entrada" automaticamente
      setActiveFilter('all');
      
      // Forçar recarregamento completo
      await loadConversations(true);
      setTimeout(() => loadConversations(true), 300);
    } catch (error) {
      console.error('❌ Error showing in inbox:', error);
      toast({ title: 'Erro ao exibir na caixa de entrada', description: String(error) });
    }
  };

  const handlePinConversation = async (conv: Conversation) => {
    try {
      // Verificar quantas conversas já estão fixadas
      const pinnedCount = conversations.filter(c => c.pinnedAt).length;
      
      if (pinnedCount >= 3) {
        toast({ 
          title: 'Limite atingido', 
          description: 'Você já tem 3 conversas fixadas. Desfixe uma para fixar outra.',
          variant: 'destructive'
        });
        return;
      }

      const table = conv.type === 'negotiation' ? 'negotiations' : 'proposals';
      const { error } = await supabase
        .from(table)
        .update({ pinned_at: new Date().toISOString() })
        .eq('id', conv.id);

      if (error) throw error;

      // Atualizar localmente
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, pinnedAt: new Date().toISOString() } : c
      ).sort((a, b) => {
        if (a.pinnedAt && b.pinnedAt) {
          return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
        }
        if (a.pinnedAt && !b.pinnedAt) return -1;
        if (!a.pinnedAt && b.pinnedAt) return 1;
        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
      }));

      toast({ title: 'Conversa fixada no topo' });
      
      // Recarregar em background
      setTimeout(() => loadConversations(true), 500);
    } catch (error) {
      console.error('Error pinning conversation:', error);
      toast({ title: 'Erro ao fixar conversa', description: String(error), variant: 'destructive' });
    }
  };

  const handleUnpinConversation = async (conv: Conversation) => {
    try {
      const table = conv.type === 'negotiation' ? 'negotiations' : 'proposals';
      const { error } = await supabase
        .from(table)
        .update({ pinned_at: null })
        .eq('id', conv.id);

      if (error) throw error;

      // Atualizar localmente
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, pinnedAt: null } : c
      ).sort((a, b) => {
        if (a.pinnedAt && b.pinnedAt) {
          return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
        }
        if (a.pinnedAt && !b.pinnedAt) return -1;
        if (!a.pinnedAt && b.pinnedAt) return 1;
        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
      }));

      toast({ title: 'Conversa desfixada' });
      
      // Recarregar em background
      setTimeout(() => loadConversations(true), 500);
    } catch (error) {
      console.error('Error unpinning conversation:', error);
      toast({ title: 'Erro ao desfixar conversa', description: String(error), variant: 'destructive' });
    }
  };
  
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
      in_progress: conversations.filter(c => 
        c.unreadCount > 0 && 
        c.type === 'proposal' && 
        c.workStatus === 'in_progress'
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

  // Helper function to check if conversation appears in inbox
  const isConversationInInbox = (conv: Conversation) => {
    if (conv.hideFromInbox) return false;
    if (conv.type === 'negotiation') return true;
    if (conv.type === 'proposal' && (conv as any).isProposalReceived) return true;
    if (conv.type === 'proposal' && (conv as any).isProposalSent) {
      const isCompleted = conv.workStatus === 'completed' || conv.workStatus === 'payment_complete' || conv.status === 'completed';
      if (isCompleted) return true;
      if ((conv as any).isUnlocked || (conv as any).ownerHasMessaged) return true;
    }
    return false;
  };

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
        case 'view_all':
          // Ver tudo: mostra todas as conversas (arquivadas e não arquivadas)
          return true;
        case 'starred':
          // Apenas conversas favoritadas
          return conv.isFavorited === true;
        case 'in_progress':
          // Apenas propostas em andamento (pagas e iniciadas)
          return conv.type === 'proposal' && conv.workStatus === 'in_progress';
        case 'completed':
          // Apenas propostas finalizadas (completed ou payment_complete)
          // Aparecem aqui independentemente de estarem na caixa de entrada ou não
          return conv.type === 'proposal' && (conv.workStatus === 'completed' || conv.workStatus === 'payment_complete');
        case 'disputes':
          // Only proposals with active disputes
          return conv.type === 'proposal' && conv.hasDispute === true;
        case 'proposals_received':
          // Apenas propostas recebidas (usuário é owner do projeto)
          return conv.type === 'proposal' && (conv as any).isProposalReceived === true;
        case 'proposals_sent':
          // Apenas propostas enviadas (usuário é freelancer)
          // Não exibir projetos finalizados nem em andamento
          return conv.type === 'proposal' && 
                 (conv as any).isProposalSent === true &&
                 conv.workStatus !== 'completed' &&
                 conv.workStatus !== 'payment_complete' &&
                 conv.workStatus !== 'in_progress';
        case 'all':
          // Caixa de entrada: negociações + propostas (recebidas e enviadas)
          // IMPORTANTE: Projetos finalizados também aparecem aqui até serem manualmente removidos
          // Não mostrar conversas que foram manualmente removidas (hide_from_inbox = true)
          if (conv.hideFromInbox) return false;
          
          // Todas as negociações
          if (conv.type === 'negotiation') return true;
          
          // Propostas recebidas (incluindo finalizadas)
          if (conv.type === 'proposal' && (conv as any).isProposalReceived) return true;
          
          // Propostas enviadas: sempre mostrar se finalizadas, senão exigir interação do owner
          if (conv.type === 'proposal' && (conv as any).isProposalSent) {
            const isCompleted = conv.workStatus === 'completed' || conv.workStatus === 'payment_complete' || conv.status === 'completed';
            if (isCompleted) return true;
            if ((conv as any).isUnlocked || (conv as any).ownerHasMessaged) return true;
          }
          
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
            
            {/* Filtro Em Andamento - só exibe se houver projetos em andamento */}
            {conversations.some(c => c.type === 'proposal' && c.workStatus === 'in_progress') && (
              <button
                onClick={() => setActiveFilter('in_progress')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                  activeFilter === 'in_progress' 
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                    : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
                }`}
              >
                <PlayCircle className={`h-4 w-4 ${activeFilter === 'in_progress' ? '' : 'text-blue-500'}`} />
                <span>Em andamento</span>
                {unreadCounts.in_progress > 0 && (
                  <Badge variant="destructive" className="ml-auto">{unreadCounts.in_progress}</Badge>
                )}
              </button>
            )}
            
            {/* Filtro Propostas Recebidas - só exibe se houver propostas recebidas */}
            {conversations.some(c => c.type === 'proposal' && (c as any).isProposalReceived) && (
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
            )}
            
            {/* Filtro Propostas Enviadas - só exibe se houver propostas enviadas (excluindo finalizadas e em andamento) */}
            {conversations.some(c => 
              c.type === 'proposal' && 
              (c as any).isProposalSent === true &&
              c.workStatus !== 'completed' &&
              c.workStatus !== 'payment_complete' &&
              c.workStatus !== 'in_progress'
            ) && (
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
            )}
            
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
              <span>Favoritas</span>
            </button>
            
            {/* Filtro Finalizados - só exibe se houver projetos finalizados */}
            {conversations.some(c => c.type === 'proposal' && (c.workStatus === 'completed' || c.workStatus === 'payment_complete')) && (
              <button
                onClick={() => setActiveFilter('completed')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                  activeFilter === 'completed' 
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                    : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
                }`}
              >
                <CheckCircle className={`h-4 w-4 ${activeFilter === 'completed' ? '' : 'text-green-500'}`} />
                <span>Finalizados</span>
              </button>
            )}
            
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
              onClick={() => setActiveFilter('view_all')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                activeFilter === 'view_all' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 text-muted-foreground hover:scale-102'
              }`}
            >
              <MessageCircle className={`h-4 w-4 ${activeFilter === 'view_all' ? '' : 'text-purple-500'}`} />
              <span>Ver Tudo</span>
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
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                                {conv.title}
                              </p>
                              {conv.pinnedAt && (
                                <Pin className="h-3 w-3 text-primary fill-primary flex-shrink-0" />
                              )}
                              {conv.hasDispute && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex-shrink-0">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {conv.disputeStatus === 'resolved' ? 'Resolvida' : 'Em Disputa'}
                                </span>
                              )}
                            </div>
                            
                            {/* Timestamp antes do menu */}
                            {conv.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                                {(() => {
                                  const messageDate = new Date(conv.lastMessageAt);
                                  const now = new Date();
                                  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
                                  
                                  if (diffInHours < 24) {
                                    return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                  } else {
                                    return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                  }
                                })()}
                              </span>
                            )}

                            {/* Menu dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-primary/10 rounded-full transition-all hover:scale-110 flex-shrink-0"
                                >
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-sm border-primary/20 shadow-xl">
                                {(conv.type === 'proposal' || conv.type === 'negotiation') && (() => {
                                  const badgeInfo = getProposalBadgeInfo(conv);
                                  return (
                                    <DropdownMenuItem className="flex justify-between hover:bg-primary/5 cursor-default">
                                      <span className="text-muted-foreground text-xs">Status:</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeInfo.color}`}>
                                        {badgeInfo.text}
                                      </span>
                                    </DropdownMenuItem>
                                  );
                                })()}
                                {conv.hasDispute && (
                                  <DropdownMenuItem className="flex justify-between hover:bg-primary/5 cursor-default">
                                    <span className="text-muted-foreground text-xs">Disputa:</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                      {conv.disputeStatus === 'resolved' ? 'Resolvida' : 'Em Disputa'}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-primary/10" />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(conv);
                                  }}
                                  className="hover:bg-yellow-500/10 cursor-pointer transition-colors"
                                >
                                  <Star className={`h-4 w-4 mr-3 ${conv.isFavorited ? 'fill-yellow-500 text-yellow-500' : 'text-yellow-500'}`} />
                                  <span className="text-sm">{conv.isFavorited ? 'Remover dos favoritos' : 'Favoritar'}</span>
                                </DropdownMenuItem>
                                
                                {conv.pinnedAt ? (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnpinConversation(conv);
                                    }}
                                    className="hover:bg-blue-500/10 cursor-pointer transition-colors"
                                  >
                                    <Pin className="h-4 w-4 mr-3 fill-blue-500 text-blue-500" />
                                    <span className="text-sm">Desfixar do topo</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePinConversation(conv);
                                    }}
                                    className="hover:bg-blue-500/10 cursor-pointer transition-colors"
                                  >
                                    <Pin className="h-4 w-4 mr-3 text-blue-500" />
                                    <span className="text-sm">Fixar no topo</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {!isConversationInInbox(conv) ? (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowInInbox(conv);
                                    }}
                                    className="hover:bg-green-500/10 cursor-pointer transition-colors"
                                  >
                                    <Inbox className="h-4 w-4 mr-3 text-green-500" />
                                    <span className="text-sm">Exibir na caixa de entrada</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromInbox(conv);
                                    }}
                                    className="hover:bg-red-500/10 cursor-pointer transition-colors"
                                  >
                                    <EyeOff className="h-4 w-4 mr-3 text-red-500" />
                                    <span className="text-sm">Remover da caixa de entrada</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-primary/10" />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveConversation(conv, activeFilter !== 'archived');
                                  }}
                                  className="hover:bg-gray-500/10 cursor-pointer transition-colors"
                                >
                                  <Archive className="h-4 w-4 mr-3 text-gray-500" />
                                  <span className="text-sm">{activeFilter === 'archived' ? 'Desarquivar' : 'Arquivar'}</span>
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
              <div 
                className="h-full flex items-center justify-center relative overflow-hidden"
                style={{
                  backgroundImage: `url(${emptyMessagesBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: 'inset 0 0 120px 40px rgba(0, 0, 0, 0.8), inset 0 0 200px 80px rgba(0, 0, 0, 0.4)'
                }}
              >
                {/* Gradiente overlay das cores do logo - mais forte */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-secondary/90 backdrop-blur-[2px]"></div>
                
                {/* Conteúdo */}
                <div className="relative z-10 text-center p-8 max-w-2xl">
                  <div className="mb-6 animate-fade-in">
                    <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">
                      {heroPhrase}
                    </h1>
                    <p className="text-xl text-white/90 drop-shadow-md mb-6">
                      Selecione uma conversa na lista ou:
                    </p>
                    
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => navigate('/projetos')}
                        size="lg"
                        className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 backdrop-blur-sm transition-all hover:scale-105 shadow-xl text-base px-8"
                      >
                        Veja projetos
                      </Button>
                      <Button
                        onClick={() => navigate('/projetos/novo')}
                        size="lg"
                        className="bg-white text-primary hover:bg-white/90 transition-all hover:scale-105 shadow-xl text-base px-8 font-semibold"
                      >
                        Crie um projeto
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Efeito de brilho sutil */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialog de confirmação para remover da caixa de entrada */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da caixa de entrada?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta conversa será removida da sua caixa de entrada, mas você ainda poderá encontrá-la em:
              </p>
              <div className="bg-primary/10 p-3 rounded-md flex items-center gap-2">
                {conversationToRemove && (() => {
                  const { Icon, color } = getTargetFilterIcon(conversationToRemove);
                  return <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />;
                })()}
                <p className="font-semibold text-foreground">
                  {conversationToRemove ? getTargetFilterName(conversationToRemove) : ''}
                </p>
              </div>
              <p className="text-sm">
                A conversa retornará automaticamente para a caixa de entrada quando você receber uma nova mensagem.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveFromInbox}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
