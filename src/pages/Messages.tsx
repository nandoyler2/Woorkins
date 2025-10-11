import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Briefcase, Loader2 } from 'lucide-react';
import { UnifiedChat } from '@/components/UnifiedChat';

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
        return 'bg-green-500';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Mensagens</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Lista de Conversas */}
          <Card className="lg:col-span-1 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Conversas</h2>
            
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Button
                    key={`${conv.type}-${conv.id}`}
                    variant={selectedConversation?.id === conv.id ? "secondary" : "ghost"}
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={conv.otherUser.avatar} />
                        <AvatarFallback>
                          {conv.otherUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          {conv.type === 'negotiation' ? (
                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <MessageCircle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="font-medium truncate text-sm">
                            {conv.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.otherUser.name}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conv.lastMessage}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(conv.status)}`}
                          >
                            {conv.status}
                          </Badge>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </Card>

          {/* Área de Chat */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            {selectedConversation ? (
              <UnifiedChat
                conversationId={selectedConversation.id}
                conversationType={selectedConversation.type}
                otherUser={selectedConversation.otherUser}
                profileId={profileId}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione uma conversa para começar</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
