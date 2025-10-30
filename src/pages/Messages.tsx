import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationCache } from '@/hooks/useConversationCache';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Loader2, Search, Inbox, Mail, Star, Archive, AlertCircle, Tag, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnifiedChat } from '@/components/UnifiedChat';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatFullName } from '@/lib/utils';

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
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [profileId, setProfileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred' | 'archived' | 'disputes'>('all');
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Mensagens - Woorkins';
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profileId) {
      // Carregar do cache primeiro (instantâneo)
      if (cachedConversations.length > 0) {
        setConversations(cachedConversations);
      }
      
      // Forçar atualização para garantir dados frescos com debounce
      const timer = setTimeout(() => {
        loadConversations(true);
      }, 400);
      
      // Subscribe to lightweight realtime updates for conversation list (avoid full reload)
      // IMPORTANTE: Remover selectedConversation das dependências para não recriar canal
      const channel = supabase
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
              const updated = prev.map(c => {
                if (c.type === 'negotiation' && c.id === m.negotiation_id) {
                  const isActive = selectedConversation?.type === 'negotiation' && selectedConversation?.id === c.id;
                  const inc = !isActive && m.sender_id !== profileId ? 1 : 0;
                  const updatedConv = {
                    ...c,
                    lastMessageAt: m.created_at,
                    unreadCount: (c.unreadCount || 0) + inc,
                  };
                  // Atualizar cache também
                  updateConversation(c.id, 'negotiation', updatedConv);
                  return updatedConv;
                }
                return c;
              });
              // Sort by last activity desc
              const sorted = [...updated].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
              setCachedConversations(sorted);
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
              const updated = prev.map(c => {
                if (c.type === 'proposal' && c.id === m.proposal_id) {
                  const isActive = selectedConversation?.type === 'proposal' && selectedConversation?.id === c.id;
                  const inc = !isActive && m.sender_id !== profileId ? 1 : 0;
                  const updatedConv = {
                    ...c,
                    lastMessageAt: m.created_at,
                    unreadCount: (c.unreadCount || 0) + inc,
                  };
                  // Atualizar cache também
                  updateConversation(c.id, 'proposal', updatedConv);
                  return updatedConv;
                }
                return c;
              });
              const sorted = [...updated].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
              setCachedConversations(sorted);
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
            // Quando contadores de não lidas são atualizados, atualizar instantaneamente
            const update: any = payload.new;
            setConversations(prev => {
              const updated = prev.map(c => {
                if (c.type === update.conversation_type && c.id === update.conversation_id) {
                  const updatedConv = {
                    ...c,
                    unreadCount: update.unread_count || 0,
                  };
                  updateConversation(c.id, c.type, updatedConv);
                  return updatedConv;
                }
                return c;
              });
              setCachedConversations(updated);
              return updated;
            });
          }
        )
        .subscribe();

      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }
  }, [profileId, activeFilter]);

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
    }
  };

  const loadConversations = useCallback(async (forceRefresh = false) => {
    // Controle de concorrência: não iniciar se já estiver carregando
    if (isLoadingRef.current) {
      console.log('⏭️ Carregamento já em andamento, pulando...');
      return;
    }

    // Se tem cache válido e não é refresh forçado, usar cache
    if (!forceRefresh && !isStale()) {
      setConversations(cachedConversations);
      return;
    }

    isLoadingRef.current = true;
    setIsBackgroundLoading(true);

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
      const { data: userNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          client_user_id,
          target_profile_id,
          updated_at,
          archived,
          profiles!negotiations_target_profile_id_fkey(
          company_name,
          logo_url,
          id
          )
        `)
        .eq('client_user_id', user?.id)
        .eq('archived', activeFilter === 'archived' ? true : false)
        .order('updated_at', { ascending: false });

      // Load negotiations where user is the business
      const { data: businessNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          client_user_id,
          target_profile_id,
          updated_at,
          archived,
          profiles!negotiations_target_profile_id_fkey(
            name,
          company_name,
          logo_url,
          id
          )
        `)
        .eq('profiles.id', profileId)
        .eq('archived', activeFilter === 'archived' ? true : false)
        .order('updated_at', { ascending: false });

      // Load proposals where user is the freelancer
      const { data: freelancerProposals } = await supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          archived,
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
        .eq('archived', activeFilter === 'archived' ? true : false)
        .order('updated_at', { ascending: false });

      // Load proposals where user is the project owner
      const { data: ownerProposals } = await supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          archived,
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
        .eq('archived', activeFilter === 'archived' ? true : false)
        .order('updated_at', { ascending: false });

      const negotiations = [...(userNegotiations || []), ...(businessNegotiations || [])];
      const proposals = [...(freelancerProposals || []), ...(ownerProposals || [])];

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
          lastMessageAt: neg.updated_at,
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
        
        // If owner, show freelancer info; if freelancer, show owner info
        const otherUserData = isOwner 
          ? {
              id: prop.freelancer_id,
              name: formatFullName((prop as any).freelancer?.full_name || 'Freelancer'),
              avatar: (prop as any).freelancer?.avatar_url,
            }
          : {
              id: prop.project.profile_id,
              name: formatFullName((prop as any).project?.profiles?.full_name || 'Cliente'),
              avatar: (prop as any).project?.profiles?.avatar_url,
            };

        return {
          id: prop.id,
          type: 'proposal' as const,
          title: prop.project.title,
          otherUser: otherUserData,
          lastMessage: prop.message ? prop.message.substring(0, 60) + '...' : undefined,
          lastMessageAt: prop.updated_at,
          unreadCount: unreadMap.get(`proposal-${prop.id}`) ?? (count || 0),
          status: prop.status,
          projectId: prop.project.id,
          freelancerId: prop.freelancer_id,
          hasDispute,
          disputeStatus,
          paymentStatus: (prop as any).payment_status,
          workStatus: (prop as any).work_status,
        };
      }));

      const allConvos = [...negotiationConvos, ...proposalConvos].sort(
        (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );

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
      setCachedConversations(allConvos);
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
        case 'all':
        default:
          return true;
      }
    });

  // Removido loading bloqueante - renderiza imediatamente com cache

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar de Navegação */}
        <div className="w-64 bg-card shadow-lg border-r p-4 flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Mensagens
              </h2>
            </div>
          </div>
          
          <nav className="space-y-1 flex-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeFilter === 'all' 
                  ? 'bg-gradient-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Inbox className="h-5 w-5" />
              <span>Caixa de Entrada</span>
            </button>
            
            <button
              onClick={() => setActiveFilter('unread')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeFilter === 'unread' 
                  ? 'bg-gradient-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Mail className="h-5 w-5" />
              <span>Não Lidas</span>
            </button>
            
            <button
              onClick={() => setActiveFilter('starred')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeFilter === 'starred' 
                  ? 'bg-gradient-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Star className="h-5 w-5" />
              <span>Destacadas</span>
            </button>
            
            <button
              onClick={() => setActiveFilter('archived')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeFilter === 'archived' 
                  ? 'bg-gradient-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Archive className="h-5 w-5" />
              <span>Arquivadas</span>
            </button>
            
            <button
              onClick={() => setActiveFilter('disputes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeFilter === 'disputes' 
                  ? 'bg-gradient-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span>Disputa</span>
            </button>
          </nav>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Lista de Conversas */}
          <div className="w-96 border-r bg-card shadow-md overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por projeto ou cliente"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isBackgroundLoading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Atualizando...</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
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
                      className={`w-full p-3 border-b transition-all text-left ${
                        selectedConversation?.id === conv.id
                          ? 'bg-primary/10 border-l-4 border-l-primary shadow-sm'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conv.otherUser.avatar} />
                            <AvatarFallback className="bg-slate-200 text-slate-700">
                              {conv.otherUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {conv.unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1.5 bg-red-500 hover:bg-red-500 text-white text-xs">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                                {conv.title}
                              </p>
                              <p className="text-xs text-slate-600 truncate">
                                {conv.otherUser.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {conv.lastMessageAt && (
                                <span className="text-xs text-slate-500 flex-shrink-0">
                                  {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                    addSuffix: false,
                                    locale: ptBR,
                                  })}
                                </span>
                              )}
                              
                              {/* Menu dropdown - sempre visível */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 hover:bg-muted"
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
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          {/* Status - visível apenas em telas maiores (lg+) */}
                          <div className="hidden lg:flex items-center gap-2 mb-1">
                            {(conv.type === 'proposal' || conv.type === 'negotiation') && (() => {
                              const badgeInfo = getProposalBadgeInfo(conv);
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${badgeInfo.color}`}>
                                  {badgeInfo.text}
                                </span>
                              );
                            })()}
                            {conv.hasDispute && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {conv.disputeStatus === 'resolved' ? 'Disputa Resolvida' : 'Em Disputa'}
                              </span>
                            )}
                          </div>

                          {conv.lastMessage && (
                            <p className="text-xs text-slate-600 truncate">
                              {conv.lastMessage}
                            </p>
                          )}
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
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageCircle className="h-20 w-20 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-slate-600">
                    Escolha uma conversa da lista para começar
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
