import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MoreVertical, Archive, Ban, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ProposalChatProps {
  proposalId: string;
  currentUserId: string;
}

export const ProposalChat = ({ proposalId, currentUserId }: ProposalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel(`proposal-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_messages',
          filter: `proposal_id=eq.${proposalId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, sender: profile || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('proposal_messages')
      .select(`
        *,
        sender:sender_id (
          full_name,
          avatar_url
        )
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('proposal_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: currentUserId,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBlockUser = async (shouldReport: boolean) => {
    setShowBlockDialog(false);
    
    try {
      // TODO: Implementar bloqueio de usuário
      toast({
        title: 'Usuário bloqueado',
        description: 'Você não receberá mais mensagens deste usuário',
      });
      
      if (shouldReport) {
        setShowReportDialog(true);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao bloquear',
        description: error.message,
      });
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um motivo para a denúncia',
      });
      return;
    }

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: currentUserId,
        content_type: 'proposal',
        content_id: proposalId,
        reason: reportReason,
        description: reportDescription,
      });

      if (error) throw error;

      toast({
        title: 'Denúncia enviada',
        description: 'Sua denúncia foi registrada e será analisada pela nossa equipe',
      });

      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar denúncia',
        description: error.message,
      });
    }
  };

  return (
    <>
      <div className="flex flex-col h-[500px] border rounded-lg">
        <div className="border-b p-3 flex items-center justify-between">
          <h3 className="font-semibold">Chat da Proposta</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar Conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Bloquear Usuário
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Denunciar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender_id === currentUserId ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.sender?.avatar_url || undefined} />
                <AvatarFallback>
                  {message.sender?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex flex-col gap-1 max-w-[70%] ${
                  message.sender_id === currentUserId ? 'items-end' : ''
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.sender_id === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Bloquear Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Você está prestes a bloquear este usuário.
              </p>
              <p>
                Após bloquear:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Você não receberá mais mensagens deste usuário</li>
                <li>Este usuário não poderá visualizar seu perfil</li>
                <li>Esta conversa será arquivada</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Deseja também denunciar este usuário?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleBlockUser(true)}
            >
              Bloquear e Denunciar
            </Button>
            <AlertDialogAction
              onClick={() => handleBlockUser(false)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Apenas Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Denunciar
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p>
                Você está denunciando este usuário. Escolha o motivo:
              </p>
              <div className="space-y-2">
                <label className="block">
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="">Selecione um motivo</option>
                    <option value="spam">Spam ou propaganda</option>
                    <option value="harassment">Assédio ou bullying</option>
                    <option value="inappropriate">Conteúdo inapropriado</option>
                    <option value="scam">Golpe ou fraude</option>
                    <option value="fake">Perfil falso</option>
                    <option value="other">Outro motivo</option>
                  </select>
                </label>
                <textarea
                  className="w-full p-2 border rounded-md bg-background min-h-[100px]"
                  placeholder="Descreva o problema (opcional)"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {reportDescription.length}/500 caracteres
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Sua denúncia será analisada pela nossa equipe em até 48 horas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReport}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Enviar Denúncia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
