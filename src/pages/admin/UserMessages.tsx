import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Trash2, HelpCircle, Search, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function UserMessages() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [aiConversations, setAiConversations] = useState<any[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<any[]>([]);
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  useEffect(() => {
    if (user) {
      loadHistories();
    }
  }, [user]);

  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Destacar brevemente a mensagem
      const element = messageRefs.current[scrollToMessageId];
      if (element) {
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }
  }, [scrollToMessageId, selectedConversation]);

  const loadUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const loadHistories = async () => {
    setLoading(true);
    try {
      // Carregar negociações do usuário
      const { data: negotiationsData, error: negError } = await supabase
        .from('negotiations')
        .select(`
          *,
          business_profiles (
            company_name,
            logo_url,
            profile_id,
            profiles (
              full_name,
              avatar_url
            )
          ),
          negotiation_messages (
            id,
            content,
            sender_id,
            sender_type,
            created_at,
            moderation_status,
            is_deleted
          )
        `)
        .eq('user_id', user?.user_id)
        .order('updated_at', { ascending: false });

      if (negError) throw negError;
      setNegotiations(negotiationsData || []);

      // Carregar propostas do usuário (como freelancer)
      const { data: proposalsData, error: propError } = await supabase
        .from('proposals')
        .select(`
          *,
          projects (
            title,
            profile_id,
            profiles (
              full_name,
              avatar_url,
              id
            )
          ),
          profiles:freelancer_id (
            full_name,
            avatar_url,
            id
          ),
          proposal_messages (
            id,
            content,
            sender_id,
            created_at,
            moderation_status
          )
        `)
        .eq('freelancer_id', userId)
        .order('updated_at', { ascending: false });

      if (propError) throw propError;
      setProposals(proposalsData || []);

      // Carregar conversas AI
      const { data: aiData, error: aiError } = await supabase
        .from('ai_assistant_conversations')
        .select('*')
        .eq('profile_id', userId)
        .order('updated_at', { ascending: false });

      if (aiError) throw aiError;
      setAiConversations(aiData || []);

      // Carregar bloqueios e restrições
      const { data: systemBlocks, error: blocksError } = await supabase
        .from('system_blocks')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (blocksError) throw blocksError;

      const { data: violations, error: violationsError } = await supabase
        .from('moderation_violations')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (violationsError) throw violationsError;

      const allBlocks = [
        ...(systemBlocks || []).map(b => ({ ...b, type: 'system' })),
        ...(violations ? [{ ...violations, type: 'moderation' }] : [])
      ];
      setBlocks(allBlocks);

      // Carregar mensagens excluídas
      const { data: deletedNegotiations, error: deletedNegError } = await supabase
        .from('negotiation_messages')
        .select(`
          *,
          negotiations (
            id,
            service_description,
            user_id,
            business_id
          )
        `)
        .eq('sender_id', userId)
        .eq('is_deleted', true)
        .order('created_at', { ascending: false });

      if (deletedNegError) throw deletedNegError;

      const { data: deletedProposals, error: deletedPropError } = await supabase
        .from('proposal_messages')
        .select(`
          *,
          proposals (
            id,
            project_id,
            projects (
              title
            )
          )
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (deletedPropError) throw deletedPropError;

      const allDeletedMessages = [
        ...(deletedNegotiations || []).map(m => ({ ...m, type: 'negotiation' })),
        ...(deletedProposals || []).map(m => ({ ...m, type: 'proposal' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setDeletedMessages(allDeletedMessages);

      // Carregar mensagens sinalizadas (moderation_status != 'approved')
      const { data: flaggedNegotiations, error: flaggedNegError } = await supabase
        .from('negotiation_messages')
        .select(`
          *,
          negotiations (
            id,
            service_description,
            user_id,
            business_id
          )
        `)
        .eq('sender_id', userId)
        .neq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (flaggedNegError) throw flaggedNegError;

      const { data: flaggedProposals, error: flaggedPropError } = await supabase
        .from('proposal_messages')
        .select(`
          *,
          proposals (
            id,
            project_id,
            projects (
              title
            )
          )
        `)
        .eq('sender_id', userId)
        .neq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (flaggedPropError) throw flaggedPropError;

      const allFlaggedMessages = [
        ...(flaggedNegotiations || []).map(m => ({ ...m, type: 'negotiation' })),
        ...(flaggedProposals || []).map(m => ({ ...m, type: 'proposal' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFlaggedMessages(allFlaggedMessages);

      // Carregar conversas de suporte
      const { data: supportData, error: supportError } = await supabase
        .from('support_conversations')
        .select(`
          *,
          support_messages (*)
        `)
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (supportError) throw supportError;
      setSupportConversations(supportData || []);

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMessageContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleFlaggedMessageClick = (message: any) => {
    const conversationId = message.type === 'negotiation' ? message.negotiation_id : message.proposal_id;
    setSelectedConversation(conversationId);
    setScrollToMessageId(message.id);
  };

  const filterConversations = (conversations: any[], query: string) => {
    if (!query) return conversations;
    return conversations.filter(conv => {
      const messagesText = JSON.stringify(conv.messages).toLowerCase();
      return messagesText.includes(query.toLowerCase());
    });
  };

  const filteredNegotiations = negotiations.filter(neg => {
    if (!searchQuery) return true;
    const messagesText = neg.negotiation_messages?.map((m: any) => m.content).join(' ').toLowerCase();
    return messagesText?.includes(searchQuery.toLowerCase()) || 
           neg.business_profiles?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredProposals = proposals.filter(prop => {
    if (!searchQuery) return true;
    const messagesText = prop.proposal_messages?.map((m: any) => m.content).join(' ').toLowerCase();
    return messagesText?.includes(searchQuery.toLowerCase()) || 
           prop.projects?.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredAiConversations = filterConversations(aiConversations, searchQuery);
  const filteredDeletedMessages = deletedMessages.filter(msg =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSupportConversations = supportConversations.filter(conv =>
    conv.support_messages?.some((m: any) => 
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  const filteredFlaggedMessages = flaggedMessages.filter(msg =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/users')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Histórico de Mensagens</h1>
            <p className="text-muted-foreground">
              {user?.full_name || user?.username}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar no histórico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Mensagens ({negotiations.length + proposals.length})
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversas AI ({aiConversations.length})
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sinalizadas ({flaggedMessages.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluídas ({deletedMessages.length})
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Suporte ({supportConversations.length})
            </TabsTrigger>
          </TabsList>

          {/* Mensagens Normais */}
          <TabsContent value="messages">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredNegotiations.length === 0 && filteredProposals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem encontrada
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {/* Negociações */}
                  {filteredNegotiations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Negociações ({filteredNegotiations.length})</h3>
                      {filteredNegotiations.map((neg) => (
                        <Card key={neg.id} className="p-4 mb-3">
                          {neg.service_description && (
                            <p className="text-sm text-muted-foreground mb-3 pb-3 border-b">
                              <span className="font-medium">Serviço:</span> {neg.service_description}
                            </p>
                          )}
                          
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {neg.negotiation_messages?.map((msg: any) => {
                              const isUser = msg.sender_type === 'user';
                              const senderAvatar = isUser ? user?.avatar_url : neg.business_profiles?.logo_url;
                              const senderName = isUser ? user?.full_name : neg.business_profiles?.company_name;
                              const senderProfileId = isUser ? user?.id : neg.business_profiles?.profile_id;
                              
                              return (
                                <div
                                  key={msg.id}
                                  ref={(el) => messageRefs.current[msg.id] = el}
                                  className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                  <a
                                    href={`/admin/users/${senderProfileId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                  >
                                    <img 
                                      src={senderAvatar || '/placeholder.svg'} 
                                      alt={senderName}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  </a>
                                  
                                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                    <a
                                      href={`/admin/users/${senderProfileId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-medium mb-1 hover:underline"
                                    >
                                      {senderName}
                                    </a>
                                    <div
                                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                        msg.is_deleted 
                                          ? 'bg-muted/50 opacity-50 line-through'
                                          : msg.moderation_status !== 'approved'
                                          ? 'bg-destructive/20 border border-destructive'
                                          : isUser
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <div className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                      </div>
                                      <div className="text-xs opacity-70 mt-1">
                                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                                        {msg.is_deleted && ' (Excluída)'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Propostas */}
                  {filteredProposals.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Propostas ({filteredProposals.length})</h3>
                      {filteredProposals.map((prop) => (
                        <Card key={prop.id} className="p-4 mb-3">
                          <div className="mb-3 pb-3 border-b">
                            <h4 className="font-medium">{prop.projects?.title}</h4>
                            <Badge variant={prop.status === 'pending' ? 'default' : 'secondary'} className="mt-2">
                              {prop.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {prop.proposal_messages?.map((msg: any) => {
                              const isFreelancer = msg.sender_id === userId;
                              const senderAvatar = isFreelancer ? prop.profiles?.avatar_url : prop.projects?.profiles?.avatar_url;
                              const senderName = isFreelancer ? prop.profiles?.full_name : prop.projects?.profiles?.full_name;
                              const senderProfileId = isFreelancer ? prop.profiles?.id : prop.projects?.profiles?.id;
                              
                              return (
                                <div
                                  key={msg.id}
                                  ref={(el) => messageRefs.current[msg.id] = el}
                                  className={`flex gap-2 ${isFreelancer ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                  <a
                                    href={`/admin/users/${senderProfileId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                  >
                                    <img 
                                      src={senderAvatar || '/placeholder.svg'} 
                                      alt={senderName}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  </a>
                                  
                                  <div className={`flex flex-col ${isFreelancer ? 'items-end' : 'items-start'}`}>
                                    <a
                                      href={`/admin/users/${senderProfileId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-medium mb-1 hover:underline"
                                    >
                                      {senderName}
                                    </a>
                                    <div
                                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                        msg.moderation_status !== 'approved'
                                          ? 'bg-destructive/20 border border-destructive'
                                          : isFreelancer
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <div className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                      </div>
                                      <div className="text-xs opacity-70 mt-1">
                                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Conversas AI */}
          <TabsContent value="ai">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredAiConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {filteredAiConversations.map((conv) => {
                    const messages = conv.messages as unknown as Message[];
                    return (
                      <Card key={conv.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={conv.archived ? 'secondary' : 'default'}>
                              {conv.archived ? 'Arquivada' : 'Ativa'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="whitespace-pre-wrap break-words">
                                  {formatMessageContent(msg.content)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Mensagens Sinalizadas */}
          <TabsContent value="flagged">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {/* Bloqueios e Restrições */}
              {blocks.length > 0 && (
                <Card className="p-4 mb-4 border-destructive bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive mb-2">
                        Bloqueios e Restrições ({blocks.length})
                      </h3>
                      <div className="space-y-2">
                        {blocks.map((block, idx) => (
                          <div key={idx} className="text-sm bg-background rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="destructive">
                                {block.type === 'system' ? 'Bloqueio Sistema' : 'Violação Moderação'}
                              </Badge>
                              {block.is_permanent && (
                                <Badge variant="outline">Permanente</Badge>
                              )}
                              {block.blocked_until && (
                                <span className="text-xs text-muted-foreground">
                                  Até: {new Date(block.blocked_until).toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              {block.reason || `${block.violation_count} violações`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(block.created_at || block.last_violation_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredFlaggedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem sinalizada encontrada
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {filteredFlaggedMessages.map((msg) => (
                    <Card 
                      key={msg.id} 
                      className="p-4 border-destructive bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                      onClick={() => handleFlaggedMessageClick(msg)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            Sinalizada
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {msg.type === 'negotiation' ? 'Negociação' : 'Proposta'}
                          </Badge>
                          {msg.moderation_status && msg.moderation_status !== 'approved' && (
                            <Badge variant="outline" className="text-xs">
                              {msg.moderation_status}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      {msg.moderation_reason && (
                        <div className="text-xs text-destructive mb-2 font-medium">
                          Motivo: {msg.moderation_reason}
                        </div>
                      )}
                      {msg.type === 'negotiation' && msg.negotiations && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Negociação: {msg.negotiations.service_description || 'Sem descrição'}
                        </div>
                      )}
                      {msg.type === 'proposal' && msg.proposals?.projects && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Projeto: {msg.proposals.projects.title}
                        </div>
                      )}
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                        <p className="whitespace-pre-wrap break-words font-medium">{msg.content}</p>
                        {msg.media_url && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              Anexo: {msg.media_type}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Clique para ver na conversa completa
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Mensagens Excluídas */}
          <TabsContent value="deleted">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredDeletedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem excluída encontrada
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {filteredDeletedMessages.map((msg) => (
                    <Card 
                      key={msg.id} 
                      className="p-4"
                      ref={(el) => messageRefs.current[msg.id] = el}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            Excluída
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {msg.type === 'negotiation' ? 'Negociação' : 'Proposta'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      {msg.type === 'negotiation' && msg.negotiations && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Negociação: {msg.negotiations.service_description || 'Sem descrição'}
                        </div>
                      )}
                      {msg.type === 'proposal' && msg.proposals?.projects && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Projeto: {msg.proposals.projects.title}
                        </div>
                      )}
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.media_url && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              Anexo: {msg.media_type}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Conversas de Suporte */}
          <TabsContent value="support">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredSupportConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa de suporte encontrada
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {filteredSupportConversations.map((conv) => (
                    <Card key={conv.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                            {conv.status === 'active' ? 'Ativa' : 'Resolvida'}
                          </Badge>
                          {conv.reason && (
                            <span className="text-sm text-muted-foreground">
                              Motivo: {conv.reason}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {conv.support_messages?.map((msg: any) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                msg.sender_type === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words">
                                {msg.content}
                              </div>
                              <div className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}