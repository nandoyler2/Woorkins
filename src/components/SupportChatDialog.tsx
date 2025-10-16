import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, Loader2, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Função para formatar markdown simples (negrito)
const formatMarkdown = (text: string) => {
  // Substitui **texto** por <strong>texto</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

interface SupportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRejected?: boolean;
  profileId?: string;
  initialMessage?: string;
}

interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'agent';
  content: string;
  created_at: string;
  attachments?: any;
}

export function SupportChatDialog({ open, onOpenChange, documentRejected, profileId, initialMessage }: SupportChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [socialLink, setSocialLink] = useState('');
  const [askedForHelp, setAskedForHelp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [timeUntilClose, setTimeUntilClose] = useState<number>(600); // 10 minutos em segundos
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Carregar conversas ativas
  useEffect(() => {
    if (!open || !profileId) return;

    const loadActiveConversations = async () => {
      const { data } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      setActiveConversations(data || []);
    };

    loadActiveConversations();
  }, [open, profileId]);

  // Mensagem inicial automática
  useEffect(() => {
    if (open && documentRejected && !askedForHelp) {
      const initialMsg: Message = {
        id: 'initial',
        sender_type: 'ai',
        content: 'Estou vendo que seu documento foi rejeitado. Gostaria de ajuda com isso?',
        created_at: new Date().toISOString()
      };
      setMessages([initialMsg]);
      setAskedForHelp(true);
      setShowWelcome(false);
    } else if (open && initialMessage && messages.length === 0 && !conversationId) {
      // Enviar mensagem inicial automaticamente
      const timer = setTimeout(() => {
        handleSendMessage(initialMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, documentRejected, askedForHelp, initialMessage]);

  // Timer de inatividade e countdown
  useEffect(() => {
    if (!conversationId || showWelcome) return;

    // Resetar timer de inatividade
    const resetInactivityTimer = () => {
      setLastActivity(new Date());
      setTimeUntilClose(600);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        // Encerrar conversa após 10 minutos
        handleCloseConversation();
      }, 600000); // 10 minutos
    };

    // Countdown a cada segundo
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setTimeUntilClose(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          return 0;
        }
        return newTime;
      });
    }, 1000);

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [conversationId, showWelcome, messages.length]);

  const handleCloseConversation = async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('support_conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId);

      toast({
        title: 'Conversa encerrada',
        description: 'A conversa foi encerrada por inatividade.',
      });

      // Resetar para tela de boas-vindas
      setConversationId(null);
      setMessages([]);
      setShowWelcome(true);
      setTimeUntilClose(600);
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`support_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_type === 'agent') {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleSendMessage = async (customMessage?: string) => {
    const msgToSend = customMessage || message;
    if (!msgToSend.trim() && !showDocumentUpload) return;

    setIsSending(true);

    try {
      const currentProfileId = profileId || (await supabase.auth.getUser()).data.user?.id;
      if (!currentProfileId) throw new Error('Not authenticated');

      // Add user message to UI
      const userMsg: Message = {
        id: Date.now().toString(),
        sender_type: 'user',
        content: msgToSend,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);
      setMessage('');
      setShowWelcome(false);

      // Resetar timer de inatividade
      setLastActivity(new Date());

      let attachments = null;
      
      // Handle file uploads if present
      if (showDocumentUpload && frontFile && backFile && selfieFile) {
        const timestamp = Date.now();
        const userId = (await supabase.auth.getUser()).data.user?.id;

        // Upload files
        const uploads = await Promise.all([
          supabase.storage.from('identity-documents').upload(`${userId}/support_front_${timestamp}.jpg`, frontFile),
          supabase.storage.from('identity-documents').upload(`${userId}/support_back_${timestamp}.jpg`, backFile),
          supabase.storage.from('identity-documents').upload(`${userId}/support_selfie_${timestamp}.jpg`, selfieFile)
        ]);

        const [frontUpload, backUpload, selfieUpload] = uploads;
        
        if (!frontUpload.error && !backUpload.error && !selfieUpload.error) {
          const getUrl = (path: string) => supabase.storage.from('identity-documents').getPublicUrl(path).data.publicUrl;
          
          attachments = {
            front: getUrl(frontUpload.data.path),
            back: getUrl(backUpload.data.path),
            selfie: getUrl(selfieUpload.data.path),
            socialLink: socialLink || null
          };

          setShowDocumentUpload(false);
          setFrontFile(null);
          setBackFile(null);
          setSelfieFile(null);
          setSocialLink('');
        }
      }

      // Call AI support
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          message: msgToSend,
          conversationId,
          profileId: currentProfileId,
          attachments
        }
      });

      if (error) throw error;

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender_type: data.escalated ? 'agent' : 'ai',
        content: data.response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (data) {
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          sender_type: msg.sender_type as 'user' | 'ai' | 'agent',
          content: msg.content,
          created_at: msg.created_at,
          attachments: msg.attachments
        }));
        setMessages(formattedMessages);
        setConversationId(convId);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Assistente Virtual Woorkins
            </div>
            {!showWelcome && conversationId && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  Encerra em: {formatTime(timeUntilClose)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseConversation}
                  className="h-8 text-xs"
                >
                  Encerrar conversa
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {showWelcome ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Conversas ativas pendentes */}
            {activeConversations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversas de Suporte Ativas
                </h3>
                <div className="space-y-2">
                  {activeConversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">
                          {conv.reason || 'Conversa de suporte'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Última atualização: {new Date(conv.updated_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tela de boas-vindas */}
            <div className="space-y-4">
              <h3 className="font-semibold">Como podemos ajudar?</h3>
              <p className="text-sm text-muted-foreground">
                Escolha um tópico ou descreva sua dúvida:
              </p>
              
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleSendMessage('Preciso de ajuda com verificação de documentos')}
                  disabled={isSending}
                >
                  <div className="text-left">
                    <div className="font-medium">Verificação de Documentos</div>
                    <div className="text-xs text-muted-foreground">Problemas com a verificação de identidade</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleSendMessage('Tenho dúvidas sobre pagamentos')}
                  disabled={isSending}
                >
                  <div className="text-left">
                    <div className="font-medium">Pagamentos</div>
                    <div className="text-xs text-muted-foreground">Dúvidas sobre transações e reembolsos</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleSendMessage('Preciso de ajuda com minha conta')}
                  disabled={isSending}
                >
                  <div className="text-left">
                    <div className="font-medium">Minha Conta</div>
                    <div className="text-xs text-muted-foreground">Configurações e perfil</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => setShowWelcome(false)}
                  disabled={isSending}
                >
                  <div className="text-left">
                    <div className="font-medium">Outro Assunto</div>
                    <div className="text-xs text-muted-foreground">Descrever minha dúvida</div>
                  </div>
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                <p className="text-amber-800">
                  ⏱️ <strong>Importante:</strong> As conversas são encerradas automaticamente após 10 minutos de inatividade.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'agent'
                        ? 'bg-blue-500 text-white'
                        : 'bg-secondary'
                    }`}
                  >
                    {msg.sender_type === 'agent' && (
                      <div className="text-xs font-semibold mb-1">Atendente</div>
                    )}
                    <p 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                    {msg.attachments && (
                      <div className="text-xs mt-2 opacity-80">
                        📎 Documentos anexados
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>


            {showDocumentUpload && (
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold">Enviar Documentos</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocumentUpload(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="front-doc">Frente do Documento *</Label>
                  <Input
                    id="front-doc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setFrontFile)}
                  />
                  {frontFile && <p className="text-xs text-green-600">✓ {frontFile.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="back-doc">Verso do Documento *</Label>
                  <Input
                    id="back-doc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setBackFile)}
                  />
                  {backFile && <p className="text-xs text-green-600">✓ {backFile.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selfie-doc">Selfie *</Label>
                  <Input
                    id="selfie-doc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setSelfieFile)}
                  />
                  {selfieFile && <p className="text-xs text-green-600">✓ {selfieFile.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social-link">Rede Social (opcional)</Label>
                  <Input
                    id="social-link"
                    type="url"
                    placeholder="https://instagram.com/seu_usuario"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                className="resize-none flex-1"
                disabled={isSending}
              />

              <Button
                onClick={() => handleSendMessage()}
                disabled={isSending || (!message.trim() && !showDocumentUpload)}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {documentRejected && messages.length === 1 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSendMessage('Sim, preciso de ajuda')}
                  className="flex-1"
                  disabled={isSending}
                >
                  Sim, preciso de ajuda
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isSending}
                >
                  Não, obrigado
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
