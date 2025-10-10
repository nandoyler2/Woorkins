import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCheck, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProposalChat } from '@/components/ProposalChat';
import { NegotiationChat } from '@/components/NegotiationChat';

interface Conversation {
  id: string;
  type: 'proposal' | 'negotiation';
  otherUser: {
    id: string;
    name: string;
    avatar: string | null;
    online?: boolean;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    read: boolean;
  };
  unreadCount: number;
  projectTitle?: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentProfileId, setCurrentProfileId] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadConversations();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCurrentProfileId(data.id);
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    const { data: proposals } = await supabase
      .from('proposals')
      .select(`
        id,
        created_at,
        project:projects(id, title),
        freelancer:freelancer_profile_id(id, full_name, avatar_url, user_id),
        client:project:projects(user:created_by(id, full_name, avatar_url))
      `)
      .or(`freelancer_profile_id.eq.${profile.id},projects.created_by.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const { data: negotiations } = await supabase
      .from('negotiations')
      .select(`
        id,
        created_at,
        business:business_id(id, name, logo_url, user_id),
        user:user_id(id, full_name, avatar_url)
      `)
      .or(`business_id.in.(select id from businesses where user_id = '${user.id}'),user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const conversationList: Conversation[] = [];

    if (proposals) {
      for (const proposal of proposals) {
        const isFreelancer = proposal.freelancer?.id === profile.id;
        const otherUser = isFreelancer
          ? (proposal as any).project?.user
          : proposal.freelancer;

        if (!otherUser) continue;

        const { data: lastMessage } = await supabase
          .from('proposal_messages')
          .select('content, created_at, sender_id')
          .eq('proposal_id', proposal.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from('proposal_messages')
          .select('*', { count: 'exact', head: true })
          .eq('proposal_id', proposal.id)
          .neq('sender_id', profile.id);

        conversationList.push({
          id: proposal.id,
          type: 'proposal',
          otherUser: {
            id: otherUser.id,
            name: otherUser.full_name || 'Usuário',
            avatar: otherUser.avatar_url,
          },
          lastMessage: {
            content: lastMessage?.content || 'Nova proposta',
            timestamp: lastMessage?.created_at || proposal.created_at,
            read: lastMessage?.sender_id === profile.id,
          },
          unreadCount: unreadCount || 0,
          projectTitle: (proposal as any).project?.title,
        });
      }
    }

    if (negotiations) {
      for (const negotiation of negotiations) {
        const isBusinessOwner = (negotiation as any).business?.user_id === user.id;
        const otherUser = isBusinessOwner
          ? (negotiation as any).user
          : {
              id: (negotiation as any).business?.id,
              full_name: (negotiation as any).business?.name,
              avatar_url: (negotiation as any).business?.logo_url
            };

        if (!otherUser) continue;

        const { data: lastMessage } = await supabase
          .from('negotiation_messages')
          .select('content, created_at, sender_id')
          .eq('negotiation_id', negotiation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from('negotiation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('negotiation_id', negotiation.id)
          .neq('sender_id', isBusinessOwner ? (negotiation as any).business.id : user.id);

        conversationList.push({
          id: negotiation.id,
          type: 'negotiation',
          otherUser: {
            id: otherUser.id,
            name: otherUser.full_name || 'Usuário',
            avatar: otherUser.avatar_url,
          },
          lastMessage: {
            content: lastMessage?.content || 'Nova negociação',
            timestamp: lastMessage?.created_at || negotiation.created_at,
            read: false,
          },
          unreadCount: unreadCount || 0,
        });
      }
    }

    conversationList.sort((a, b) =>
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );

    setConversations(conversationList);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-woorkins">
          <h1 className="text-3xl font-bold mb-8">Mensagens</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conversation.otherUser.avatar || undefined} />
                            <AvatarFallback>
                              {conversation.otherUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.otherUser.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold truncate">
                              {conversation.otherUser.name}
                            </span>
                            {conversation.lastMessage.read ? (
                              <CheckCheck className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <Check className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>

                          {conversation.projectTitle && (
                            <p className="text-xs text-primary mb-1 truncate">
                              {conversation.projectTitle}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate flex-1">
                              {conversation.lastMessage.content}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="default" className="ml-2 flex-shrink-0">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {filteredConversations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma conversa encontrada</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {selectedConversation ? (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.otherUser.avatar || undefined} />
                      <AvatarFallback>
                        {selectedConversation.otherUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="font-semibold">{selectedConversation.otherUser.name}</h2>
                      {selectedConversation.otherUser.online && (
                        <p className="text-sm text-green-600">Online</p>
                      )}
                      {selectedConversation.projectTitle && (
                        <p className="text-sm text-muted-foreground">
                          {selectedConversation.projectTitle}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Encriptado
                    </Badge>
                  </div>

                  {selectedConversation.type === 'proposal' ? (
                    <ProposalChat
                      proposalId={selectedConversation.id}
                      currentUserId={currentProfileId}
                    />
                  ) : (
                    <NegotiationChat
                      negotiationId={selectedConversation.id}
                      isBusinessView={false}
                    />
                  )}
                </Card>
              ) : (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">Selecione uma conversa</p>
                    <p className="text-sm">
                      Escolha uma conversa da lista para começar a mensagem
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
