import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Trash2, HelpCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UserHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function UserHistoryDialog({ open, onOpenChange, user }: UserHistoryDialogProps) {
  const [aiConversations, setAiConversations] = useState<any[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<any[]>([]);
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      loadHistories();
    }
  }, [open, user]);

  const loadHistories = async () => {
    setLoading(true);
    try {
      // Carregar conversas AI (arquivadas e ativas)
      const { data: aiData, error: aiError } = await supabase
        .from('ai_assistant_conversations')
        .select('*')
        .eq('profile_id', user.id)
        .order('updated_at', { ascending: false });

      if (aiError) throw aiError;
      setAiConversations(aiData || []);

      // Carregar mensagens excluídas de negociações
      const { data: deletedNegotiations, error: negError } = await supabase
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
        .eq('sender_id', user.id)
        .eq('is_deleted', true)
        .order('created_at', { ascending: false });

      if (negError) throw negError;

      // Carregar mensagens excluídas de propostas
      const { data: deletedProposals, error: propError } = await supabase
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
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (propError) throw propError;

      // Combinar mensagens excluídas
      const allDeletedMessages = [
        ...(deletedNegotiations || []).map(m => ({ ...m, type: 'negotiation' })),
        ...(deletedProposals || []).map(m => ({ ...m, type: 'proposal' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setDeletedMessages(allDeletedMessages);

      // Carregar conversas de suporte
      const { data: supportData, error: supportError } = await supabase
        .from('support_conversations')
        .select(`
          *,
          support_messages (*)
        `)
        .eq('profile_id', user.id)
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

  const filterConversations = (conversations: any[], query: string) => {
    if (!query) return conversations;
    return conversations.filter(conv => {
      const messagesText = JSON.stringify(conv.messages).toLowerCase();
      return messagesText.includes(query.toLowerCase());
    });
  };

  const filteredAiConversations = filterConversations(aiConversations, searchQuery);
  const filteredDeletedMessages = deletedMessages.filter(msg =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSupportConversations = supportConversations.filter(conv =>
    conv.support_messages?.some((m: any) => 
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Histórico Completo - {user?.full_name || user?.username}
          </DialogTitle>
        </DialogHeader>

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

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversas AI ({aiConversations.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Mensagens Excluídas ({deletedMessages.length})
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Suporte ({supportConversations.length})
            </TabsTrigger>
          </TabsList>

          {/* Conversas AI */}
          <TabsContent value="ai">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredAiConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                <div className="space-y-4">
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
                        <div className="space-y-3 max-h-96 overflow-y-auto">
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

          {/* Mensagens Excluídas */}
          <TabsContent value="deleted">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredDeletedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem excluída encontrada
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeletedMessages.map((msg) => (
                    <Card key={msg.id} className="p-4">
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
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredSupportConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa de suporte encontrada
                </div>
              ) : (
                <div className="space-y-4">
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
                      <div className="space-y-2 max-h-96 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}
