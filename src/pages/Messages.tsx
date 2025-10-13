import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Loader2, Search, Inbox, Mail, Star, Archive, AlertCircle, Tag } from 'lucide-react';
import { UnifiedChat } from '@/components/UnifiedChat';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [profileId, setProfileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=signin');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (profileId) {
      loadConversations();
      
      // Subscribe to realtime updates for new messages
      const channel = supabase
        .channel('conversations-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'negotiation_messages'
          },
          () => loadConversations()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'proposal_messages'
          },
          () => loadConversations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profileId]);

  // Auto-select conversation from query params
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Load negotiations where user is the client
      const { data: userNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          user_id,
          business_id,
          updated_at,
          business_profiles!inner(
            company_name,
            logo_url,
            profile_id
          )
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      // Load negotiations where user is the business
      const { data: businessNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          status,
          service_description,
          user_id,
          business_id,
          updated_at,
          business_profiles!inner(
            company_name,
            logo_url,
            profile_id
          )
        `)
        .eq('business_profiles.profile_id', profileId)
        .order('updated_at', { ascending: false });

      // Load proposals where user is the freelancer
      const { data: freelancerProposals } = await supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          freelancer_id,
          project:projects!inner(
            id,
            title,
            profile_id,
            profiles!inner(
              full_name,
              avatar_url,
              user_id
            )
          )
        `)
        .eq('freelancer_id', profileId)
        .order('updated_at', { ascending: false });

      // Load proposals where user is the project owner
      const { data: ownerProposals } = await supabase
        .from('proposals')
        .select(`
          id,
          status,
          message,
          updated_at,
          freelancer_id,
          project:projects!inner(
            id,
            title,
            profile_id,
            profiles!inner(
              full_name,
              avatar_url,
              user_id
            )
          )
        `)
        .eq('project.profile_id', profileId)
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
            id: neg.business_profiles.profile_id,
            name: neg.business_profiles.company_name,
            avatar: neg.business_profiles.logo_url,
          },
          lastMessageAt: neg.updated_at,
          unreadCount: count || 0,
          status: neg.status,
          businessName: neg.business_profiles.company_name,
          businessId: neg.business_id,
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

        return {
          id: prop.id,
          type: 'proposal' as const,
          title: prop.project.title,
          otherUser: {
            id: prop.project.profile_id,
            name: prop.project.profiles.full_name,
            avatar: prop.project.profiles.avatar_url,
          },
          lastMessage: prop.message.substring(0, 60) + '...',
          lastMessageAt: prop.updated_at,
          unreadCount: count || 0,
          status: prop.status,
          projectId: prop.project.id,
        };
      }));

      const allConvos = [...negotiationConvos, ...proposalConvos].sort(
        (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );

      setConversations(allConvos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar de Navegação */}
        <div className="w-64 bg-card shadow-lg border-r p-4 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Mensagens</h2>
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
            
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>Disputa</span>
            </button>
          </nav>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Etiquetas</h3>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg">
              <Tag className="h-4 w-4" />
              <span>+ Adicionar etiqueta...</span>
            </button>
          </div>
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
                      onClick={async () => {
                        setSelectedConversation(conv);
                        // Zero local badge immediately
                        setConversations(prev => prev.map(c => c.id === conv.id && c.type === conv.type ? { ...c, unreadCount: 0 } : c));
                        // Persist read state
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
                            {conv.lastMessageAt && (
                              <span className="text-xs text-slate-500 flex-shrink-0">
                                {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                  addSuffix: false,
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          </div>
                          
                          {conv.type === 'proposal' && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                Enviada pelo sistema
                              </span>
                            </div>
                          )}

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
          <div className="flex-1 bg-card overflow-hidden">
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
