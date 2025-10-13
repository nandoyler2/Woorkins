import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile, ExternalLink, Lock, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging';
import { ProposalNegotiationPanel } from './ProposalNegotiationPanel';

interface UnifiedChatProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  profileId: string;
  projectId?: string;
  projectTitle?: string;
  businessName?: string;
  businessId?: string;
  onConversationDeleted?: () => void;
}

export function UnifiedChat({ 
  conversationId, 
  conversationType, 
  otherUser, 
  profileId,
  projectId,
  projectTitle,
  businessName,
  businessId,
  onConversationDeleted
}: UnifiedChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [proposalData, setProposalData] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoadingProposal, setIsLoadingProposal] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    messages,
    isLoading,
    isSending,
    otherUserTyping,
    sendMessage: sendMessageHook,
    handleTyping,
  } = useRealtimeMessaging({
    conversationId,
    conversationType,
    currentUserId: profileId,
    otherUserId: otherUser.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark messages as read when opening the chat
    if (messages.length > 0 && profileId) {
      markMessagesAsRead();
    }
  }, [messages, conversationId, profileId]);

  const markMessagesAsRead = async () => {
    try {
      const tableName = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      const idColumn = conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id';
      
      // Update message status to 'read'
      await supabase
        .from(tableName as any)
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq(idColumn, conversationId)
        .neq('sender_id', profileId)
        .in('status', ['sent', 'delivered']);
      
      // Persist unread count = 0 using upsert on composite key
      await supabase
        .from('message_unread_counts')
        .upsert(
          {
            user_id: profileId,
            conversation_id: conversationId,
            conversation_type: conversationType,
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,conversation_id,conversation_type' }
        );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Load proposal data if it's a proposal conversation
  useEffect(() => {
    if (conversationType === 'proposal') {
      loadProposalData();
    } else {
      setIsLoadingProposal(false);
    }
  }, [conversationId, conversationType]);

  useEffect(() => {
    // Reload proposal data when messages change to update unlock status
    if (conversationType === 'proposal' && messages.length > 0) {
      loadProposalData();
    }
  }, [messages.length, conversationType]);

  const loadProposalData = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          project:projects!inner(
            profile_id
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      setProposalData(data);
      setIsOwner(data.project.profile_id === profileId);
    } catch (error) {
      console.error('Error loading proposal data:', error);
    } finally {
      setIsLoadingProposal(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;

    // If it's a proposal and owner sends first message, unlock it
    if (conversationType === 'proposal' && isOwner && !proposalData?.is_unlocked) {
      await supabase
        .from('proposals')
        .update({
          is_unlocked: true,
          owner_has_messaged: true,
        })
        .eq('id', conversationId);
    }

    await sendMessageHook(messageInput);
    setMessageInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping();
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'sending':
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
      default:
        return null;
    }
  };

  const isMyMessage = (senderId: string) => senderId === profileId;

  if (isLoading || isLoadingProposal) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if chat should be locked (proposal not unlocked, user is freelancer, and no messages yet)
  const isChatLocked = conversationType === 'proposal' && 
    !isOwner && 
    !proposalData?.is_unlocked &&
    proposalData?.status === 'pending' &&
    messages.length === 0;

  const checkCanDelete = async () => {
    // Verificar se há proposta aceita
    if (conversationType === 'proposal' && proposalData?.status === 'accepted') {
      toast({
        variant: 'destructive',
        title: 'Não é possível excluir',
        description: 'Conversas com propostas aceitas não podem ser excluídas. Entre em contato com o suporte se necessário.',
      });
      return false;
    }
    
    if (conversationType === 'negotiation') {
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select('status')
        .eq('id', conversationId)
        .single();
      
      if (negotiation?.status === 'accepted' || negotiation?.status === 'paid') {
        toast({
          variant: 'destructive',
          title: 'Não é possível excluir',
          description: 'Negociações aceitas ou pagas não podem ser excluídas. Entre em contato com o suporte se necessário.',
        });
        return false;
      }
    }
    
    return true;
  };

  const handleDeleteConversation = async () => {
    setShowDeleteDialog(false);
    
    try {
      // Delete messages first
      const tableName = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      const idColumn = conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id';
      
      const { error: messagesError } = await supabase
        .from(tableName as any)
        .delete()
        .eq(idColumn, conversationId);

      if (messagesError) throw messagesError;
      
      // Delete the conversation
      if (conversationType === 'proposal') {
        const { error: propError } = await supabase.from('proposals').delete().eq('id', conversationId);
        if (propError) throw propError;
      } else {
        const { error: negError } = await supabase.from('negotiations').delete().eq('id', conversationId);
        if (negError) throw negError;
      }
      
      // Clean up unread counts
      await supabase
        .from('message_unread_counts')
        .delete()
        .eq('conversation_id', conversationId);
      
      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi excluída com sucesso para ambas as partes.',
      });
      
      // Call parent callback to refresh conversations list
      if (onConversationDeleted) {
        onConversationDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir a conversa. Tente novamente.',
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Security Warning Banner */}
      <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200 flex-shrink-0">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900">
          <strong>Aviso de Segurança:</strong> Todas as conversas são monitoradas para garantir transações seguras. 
          É proibido compartilhar informações de contato (telefone, email, redes sociais). 
          Violações podem resultar em bloqueio permanente da conta.
        </AlertDescription>
      </Alert>

      {/* Proposal Negotiation Panel */}
      {conversationType === 'proposal' && proposalData && (
        <div className="border-b p-3 bg-slate-50 flex-shrink-0">
          <ProposalNegotiationPanel
            proposalId={conversationId}
            proposalData={proposalData}
            isOwner={isOwner}
            currentProfileId={profileId}
            freelancerId={proposalData.freelancer_id}
            onStatusChange={loadProposalData}
            onDelete={handleDeleteConversation}
          />
        </div>
      )}

      {/* Info Header */}
      {(projectId || businessId) && (
        <div className="border-b p-3 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">
                {conversationType === 'proposal' ? 'Projeto' : 'Negociação com'}
              </p>
              <p className="text-sm font-semibold">
                {conversationType === 'proposal' ? projectTitle : businessName}
              </p>
            </div>
            {projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/projetos/${projectId}`, '_blank')}
                className="text-xs flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Ver Projeto
              </Button>
            )}
            {businessId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const slug = businessName?.toLowerCase().normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9\s-]/g, '')
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-');
                  window.open(`/${slug}`, '_blank');
                }}
                className="text-xs flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Ver Perfil
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="border-b p-3 flex items-center gap-3 bg-white flex-shrink-0">
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={otherUser.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{otherUser.name}</h3>
          <div className="flex items-center gap-2">
            {otherUserTyping ? (
              <span className="text-xs text-primary animate-pulse font-medium">Digitando...</span>
            ) : (
              <>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                <span className="text-xs text-muted-foreground">•</span>
                <Badge variant="secondary" className="text-xs">
                  {conversationType === 'negotiation' ? 'Negociação' : 'Proposta de Projeto'}
                </Badge>
              </>
            )}
          </div>
        </div>
        {conversationType === 'negotiation' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const canDelete = await checkCanDelete();
              if (canDelete) setShowDeleteDialog(true);
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        )}
      </div>

      {/* Messages - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4 pb-24">
          {isChatLocked ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 mb-4">
                <Lock className="h-10 w-10 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Proposta Aguardando Análise</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Você conseguirá visualizar e participar desta conversa apenas se o criador do projeto aceitar sua proposta ou responder sua mensagem.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde a resposta do criador do projeto.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-xs text-muted-foreground mt-2">
                Envie a primeira mensagem para iniciar a conversa
              </p>
            </div>
          ) : (
            <>
              {/* Show proposal message as first message if it's a proposal chat */}
              {conversationType === 'proposal' && proposalData && (
                <div className="flex gap-2 animate-in slide-in-from-bottom-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={isOwner ? otherUser.avatar : undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {isOwner ? otherUser.name.charAt(0).toUpperCase() : 'V'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col max-w-[75%]">
                    <div className="rounded-2xl px-4 py-2.5 shadow-sm bg-card border rounded-tl-sm">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">Proposta Inicial</p>
                      <p className="text-sm leading-relaxed break-words">{proposalData.message}</p>
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">Valor:</span> R$ {proposalData.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">Prazo:</span> {proposalData.delivery_days} dias
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(proposalData.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {messages.length === 0 && conversationType !== 'proposal' && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                    <Send className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">Envie a primeira mensagem!</p>
                </div>
              )}
              
              {messages.map((message) => {
                const isMine = isMyMessage(message.sender_id);
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 animate-in slide-in-from-bottom-2 ${
                      isMine ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {!isMine && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={message.sender_avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {message.sender_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`group rounded-2xl px-4 py-2.5 shadow-sm relative ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-card border rounded-tl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">{message.content}</p>
                        {isMine && (! (conversationType === 'proposal' && proposalData?.status === 'accepted')) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
                              await supabase.from(table).delete().eq('id', message.id);
                            }}
                            className={`absolute -top-2 ${isMine ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 py-0.5 rounded bg-destructive text-destructive-foreground`}
                            title="Apagar mensagem"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {isMine && getMessageStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Floating Sticky Bottom */}
      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="p-3">
        {isChatLocked ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              Chat bloqueado até o criador aceitar sua proposta
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              value={messageInput}
              onChange={handleInputChange}
              placeholder="Digite sua mensagem..."
              disabled={isSending}
              className="flex-1 bg-background/50"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0"
            >
              <Smile className="h-5 h-5" />
            </Button>
            <Button 
              type="submit" 
              disabled={isSending || !messageInput.trim()}
              size="icon"
              className="flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-semibold text-foreground">
                ⚠️ Esta ação NÃO pode ser desfeita!
              </p>
              <p>
                Ao confirmar, esta conversa será <strong>PERMANENTEMENTE EXCLUÍDA para AMBAS as partes</strong>.
              </p>
              <p>
                {conversationType === 'proposal' 
                  ? '📋 A proposta também será excluída.' 
                  : '💼 A negociação também será excluída.'}
              </p>
              <p className="text-muted-foreground text-sm">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}