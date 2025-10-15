import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, Loader2, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRejected?: boolean;
  profileId?: string;
}

interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'agent';
  content: string;
  created_at: string;
  attachments?: any;
}

export function SupportChatDialog({ open, onOpenChange, documentRejected, profileId }: SupportChatDialogProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && documentRejected && !askedForHelp) {
      // Mensagem inicial automática
      const initialMsg: Message = {
        id: 'initial',
        sender_type: 'ai',
        content: 'Estou vendo que seu documento foi rejeitado. Gostaria de ajuda com isso?',
        created_at: new Date().toISOString()
      };
      setMessages([initialMsg]);
      setAskedForHelp(true);
    }
  }, [open, documentRejected, askedForHelp]);

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
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Suporte
          </DialogTitle>
        </DialogHeader>

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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
      </DialogContent>
    </Dialog>
  );
}
