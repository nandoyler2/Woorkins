import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Briefcase, Loader2, Search, Check, CheckCheck } from 'lucide-react';
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
    name: string;
    avatar?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [profileId, setProfileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

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
    }
  }, [profileId]);

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
      // Load negotiations
      const { data: negotiations } = await supabase
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
        .or(`user_id.eq.${user?.id},business_profiles.profile_id.eq.${profileId}`)
        .order('updated_at', { ascending: false });

      // Load proposals
      const { data: proposals } = await supabase
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
        .or(`freelancer_id.eq.${profileId},project.profile_id.eq.${profileId}`)
        .order('updated_at', { ascending: false });

      const negotiationConvos: Conversation[] = (negotiations || []).map(neg => ({
        id: neg.id,
        type: 'negotiation' as const,
        title: neg.service_description || 'Negociação',
        otherUser: {
          name: neg.business_profiles.company_name,
          avatar: neg.business_profiles.logo_url,
        },
        lastMessageAt: neg.updated_at,
        unreadCount: 0,
        status: neg.status,
      }));

      const proposalConvos: Conversation[] = (proposals || []).map(prop => ({
        id: prop.id,
        type: 'proposal' as const,
        title: prop.project.title,
        otherUser: {
          name: prop.project.profiles.full_name,
          avatar: prop.project.profiles.avatar_url,
        },
        lastMessage: prop.message.substring(0, 60) + '...',
        lastMessageAt: prop.updated_at,
        unreadCount: 0,
        status: prop.status,
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 max-w-woorkins">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Mensagens
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas conversas de propostas e negociações
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
          {/* Lista de Conversas */}
          <Card className="lg:col-span-1 overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            <div className="p-4 border-b bg-card/80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto h-[calc(100%-73px)]">
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
                <div className="p-2">
                  {filteredConversations.map((conv) => (
                    <button
                      key={`${conv.type}-${conv.id}`}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-3 rounded-lg mb-2 transition-all hover:scale-[1.02] ${
                        selectedConversation?.id === conv.id
                          ? 'bg-primary/10 border-2 border-primary/20'
                          : 'hover:bg-muted/50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-background">
                            <AvatarImage src={conv.otherUser.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {conv.otherUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                        
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold truncate text-sm">
                              {conv.otherUser.name}
                            </span>
                            {conv.lastMessageAt && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                  addSuffix: false,
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 mb-1">
                            {conv.type === 'negotiation' ? (
                              <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <MessageCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.title}
                            </p>
                          </div>

                          {conv.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {conv.lastMessage}
                            </p>
                          )}

                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-2 py-0 ${getStatusColor(conv.status)}`}
                            >
                              {getStatusText(conv.status)}
                            </Badge>
                            {conv.unreadCount > 0 && (
                              <Badge className="text-xs h-5 min-w-5 flex items-center justify-center p-1 bg-primary">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Área de Chat */}
          <Card className="lg:col-span-2 overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm">
            {selectedConversation ? (
              <UnifiedChat
                conversationId={selectedConversation.id}
                conversationType={selectedConversation.type}
                otherUser={selectedConversation.otherUser}
                profileId={profileId}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <MessageCircle className="relative h-20 w-20 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-muted-foreground">
                    Escolha uma conversa da lista para começar
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
