import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, HelpCircle, Shield, Coins, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemBlock } from '@/hooks/useSystemBlock';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const helpTopics = [
  {
    icon: HelpCircle,
    title: 'Como funciona a plataforma',
    message: 'Olá! Gostaria de entender melhor como funciona a Woorkins.'
  },
  {
    icon: Shield,
    title: 'Problemas com bloqueio',
    message: 'Fui bloqueado e gostaria de entender o motivo.'
  },
  {
    icon: Coins,
    title: 'Questões sobre Woorkoins',
    message: 'Tenho uma dúvida sobre meu saldo de Woorkoins.'
  },
  {
    icon: AlertCircle,
    title: 'Reportar um problema',
    message: 'Estou com um problema na plataforma e preciso de ajuda.'
  }
];

export const AIAssistant = () => {
  const { isOpen: contextIsOpen, close, initialMessage } = useAIAssistant();
  const [internalOpen, setInternalOpen] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [hasRecentBlock, setHasRecentBlock] = useState(false);
  const [showBlockQuestion, setShowBlockQuestion] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { systemBlock, messagingBlock } = useSystemBlock(profileId || '');

  // Sincronizar isOpen do contexto com o estado interno
  const isOpen = contextIsOpen || internalOpen;

  // Carregar perfil e conversas persistidas
  useEffect(() => {
    const loadUserData = async () => {
      if (!session?.user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        const firstName = profile.full_name?.split(' ')[0] || '';
        setUserName(firstName);

        // Verificar bloqueios recentes (últimas 24 horas)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: recentBlocks } = await supabase
          .from('system_blocks')
          .select('*')
          .eq('profile_id', profile.id)
          .gte('created_at', oneDayAgo.toISOString())
          .limit(1);

        // Verificar bloqueios de moderação
        const { data: moderationViolation } = await supabase
          .from('moderation_violations')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        const hasModeratedBlock = moderationViolation?.blocked_until 
          ? new Date(moderationViolation.blocked_until) > new Date()
          : false;

        const hasBlock = !!(recentBlocks && recentBlocks.length > 0) || !!systemBlock || !!messagingBlock || hasModeratedBlock;
        setHasRecentBlock(hasBlock);

        // Carregar conversas anteriores
        const { data: conversation } = await supabase
          .from('ai_assistant_conversations')
          .select('messages')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (conversation?.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
          const existing = conversation.messages as unknown as Message[];
          if (hasBlock) {
            const blockMsg = { role: 'assistant' as const, content: `Olá, ${firstName}! 👋\n\nPercebi que você foi bloqueado recentemente. Gostaria de falar sobre isso?` };
            setMessages([blockMsg, ...existing]);
            setShowBlockQuestion(true);
            setShowTopics(false);
          } else {
            setMessages(existing);
            setShowTopics(false);
            setShowBlockQuestion(false);
          }
        } else {
          if (hasBlock) {
            const blockMsg = `Olá, ${firstName}! 👋\n\nPercebi que você foi bloqueado recentemente. Gostaria de falar sobre isso?`;
            setMessages([{ role: 'assistant', content: blockMsg }]);
            setShowBlockQuestion(true);
            setShowTopics(false);
          } else {
            // Primeira vez - mostrar mensagem de boas-vindas
            const welcomeMsg = firstName 
              ? `Olá, ${firstName}! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:`
              : 'Olá! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:';
            
            setMessages([{ role: 'assistant', content: welcomeMsg }]);
            setShowTopics(true);
          }
        }
      }
    };

    if (isOpen) {
      loadUserData();
    }
  }, [session, isOpen, systemBlock, messagingBlock]);

  // Enviar mensagem inicial quando fornecida
  const initialMessageSentRef = useRef(false);
  
  useEffect(() => {
    if (isOpen && initialMessage && profileId && !initialMessageSentRef.current) {
      // Limpar tópicos e enviar mensagem inicial
      setShowTopics(false);
      setShowBlockQuestion(false);
      
      // Aguardar um pouco para garantir que o perfil foi carregado
      setTimeout(() => {
        sendMessageInternal(initialMessage);
        initialMessageSentRef.current = true;
      }, 500);
    }
    
    // Reset quando fechar
    if (!isOpen) {
      initialMessageSentRef.current = false;
    }
  }, [isOpen, initialMessage, profileId]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTopicSelect = (topic: typeof helpTopics[0]) => {
    setShowTopics(false);
    setShowBlockQuestion(false);
    sendMessageInternal(topic.message);
  };

  const handleBlockAnswer = (answer: 'yes' | 'no') => {
    setShowBlockQuestion(false);
    if (answer === 'yes') {
      sendMessageInternal('Sim, gostaria de entender melhor o motivo do meu bloqueio e ver se é possível resolver isso.');
    } else {
      sendMessageInternal('Não, obrigado. Tenho outra dúvida.');
      setShowTopics(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setShowTopics(false);
    setShowBlockQuestion(false);
    const userMessage = input.trim();
    setInput('');
    sendMessageInternal(userMessage);
  };

  // Função auxiliar para converter **texto** em negrito
  const formatMessageContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Função para dividir mensagens longas em chunks
  const streamLongMessage = async (fullContent: string, updatedMessages: Message[]) => {
    const CHUNK_SIZE = 200;
    const TYPING_DELAY = 5000;

    // Se a mensagem for curta, mostrar tudo de uma vez
    if (fullContent.length <= CHUNK_SIZE) {
      const assistantMessage = { role: 'assistant' as const, content: fullContent };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      if (profileId) {
        await supabase
          .from('ai_assistant_conversations')
          .upsert({
            profile_id: profileId,
            messages: finalMessages as any
          });
      }
      return finalMessages;
    }

    // Dividir em chunks por sentenças ou parágrafos
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = fullContent.split(/([.!?]\s+|\n\n)/);
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Mostrar primeiro chunk
    setIsStreaming(true);
    let accumulatedContent = chunks[0];
    const assistantMessage = { role: 'assistant' as const, content: accumulatedContent };
    let currentMessages = [...updatedMessages, assistantMessage];
    setMessages(currentMessages);

    // Mostrar chunks restantes com delay
    for (let i = 1; i < chunks.length; i++) {
      setStreamingMessage(chunks[i]);
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, TYPING_DELAY));
      setIsTyping(false);
      
      accumulatedContent += '\n\n' + chunks[i];
      currentMessages = [
        ...updatedMessages,
        { role: 'assistant' as const, content: accumulatedContent }
      ];
      setMessages(currentMessages);
    }

    setIsStreaming(false);
    setStreamingMessage('');

    // Persistir conversa completa
    if (profileId) {
      await supabase
        .from('ai_assistant_conversations')
        .upsert({
          profile_id: profileId,
          messages: currentMessages as any
        });
    }

    return currentMessages;
  };

  const sendMessageInternal = async (messageText: string) => {
    const newUserMessage = { role: 'user' as const, content: messageText };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          message: messageText,
          conversationHistory: updatedMessages 
        }
      });

      if (error) throw error;

      // Usar streaming para mensagens longas
      const finalMessages = await streamLongMessage(data.response, updatedMessages);

      // Se foi desbloqueado, recarregar a página após 2 segundos
      if (data.actionExecuted) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem. Tente novamente.",
        variant: "destructive"
      });
      const errorMessage = { role: 'assistant' as const, content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const endConversation = async () => {
    try {
      if (profileId) {
        await supabase
          .from('ai_assistant_conversations')
          .delete()
          .eq('profile_id', profileId);
      }
    } catch (e) {
      console.error('Error ending AI conversation:', e);
    }

    const welcomeMsg = userName
      ? `Olá, ${userName}! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:`
      : 'Olá! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:';

    setMessages([{ role: 'assistant', content: welcomeMsg }]);
    setShowTopics(true);
    setShowBlockQuestion(false);
    toast({ title: 'Conversa encerrada', description: 'Voltei para os tópicos iniciais.' });
  };

  return (
    <>
      {/* Botão flutuante - menor */}
      {!isOpen && (
        <Button
          onClick={() => setInternalOpen(true)}
          className="fixed bottom-6 left-6 h-12 px-5 rounded-full shadow-2xl z-50 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white flex items-center gap-2 animate-fade-in hover-scale border border-white/20"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium text-sm">Precisa de Ajuda?</span>
        </Button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 w-96 h-[600px] bg-gradient-to-br from-background via-background to-background/95 border-2 border-primary/20 rounded-3xl shadow-2xl z-50 flex flex-col backdrop-blur-sm animate-scale-in">
          <div className="p-6 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Assistente Virtual Woorkins
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Estou aqui para ajudar você{userName && `, ${userName}`}!</p>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endConversation}
                    className="h-8"
                  >
                    Encerrar conversa
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    close();
                    setInternalOpen(false);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                        : 'bg-gradient-to-br from-muted to-muted/50 border border-primary/10'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{formatMessageContent(msg.content)}</p>
                  </div>
                </div>
                
                {/* Show topics after first assistant message */}
                {msg.role === 'assistant' && idx === 0 && showTopics && (
                  <div className="mt-4 grid grid-cols-2 gap-2 animate-fade-in">
                    {helpTopics.map((topic, topicIdx) => (
                      <button
                        key={topicIdx}
                        onClick={() => handleTopicSelect(topic)}
                        className="p-3 rounded-xl border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group hover-scale"
                      >
                        <topic.icon className="h-4 w-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">{topic.title}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show Yes/No buttons for block question */}
                {msg.role === 'assistant' && idx === 0 && showBlockQuestion && (
                  <div className="mt-4 flex gap-3 animate-fade-in">
                    <Button
                      onClick={() => handleBlockAnswer('yes')}
                      className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      Sim
                    </Button>
                    <Button
                      onClick={() => handleBlockAnswer('no')}
                      variant="outline"
                      className="flex-1 border-primary/30 hover:bg-primary/5"
                    >
                      Não
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {(loading || isTyping) && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl px-4 py-3 border border-primary/10">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-primary/10 bg-gradient-to-r from-transparent to-primary/5 rounded-b-3xl">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Digite sua dúvida ou selecione um tópico acima..."
                className="resize-none border-primary/20 focus:border-primary/40 bg-background/50"
                rows={2}
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                size="icon"
                className="shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};