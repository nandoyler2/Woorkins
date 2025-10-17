import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, HelpCircle, Shield, Coins, AlertCircle, History, GripVertical, Paperclip, FileText, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemBlock } from '@/hooks/useSystemBlock';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useLocation } from 'react-router-dom';
import { useSpamBlock } from '@/hooks/useSpamBlock';
import { SpamBlockCountdown } from './SpamBlockCountdown';

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

type ViewMode = 'welcome' | 'chat' | 'history';

interface ArchivedConversation {
  id: string;
  messages: Message[];
  archived_at: string;
  created_at: string;
}

export const AIAssistant = () => {
  const { isOpen: contextIsOpen, close, initialMessage } = useAIAssistant();
  const { user } = useAuth();
  const [userProfileId, setUserProfileId] = useState<string | undefined>();
  
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => setUserProfileId(data?.id));
    }
  }, [user]);
  
  const { isBlocked: isSpamBlocked, remainingSeconds, spamBlock } = useSpamBlock(userProfileId, 'ai_assistant');
  const [internalOpen, setInternalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('welcome');
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
  const [archivedConversations, setArchivedConversations] = useState<ArchivedConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ArchivedConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<ArchivedConversation | null>(null);
  const [buttonPosition, setButtonPosition] = useState({ x: 24, y: window.innerHeight - 50 }); // Posição padrão mais embaixo
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const conversationsPerPage = 10;
  const { toast } = useToast();
  const { session } = useAuth();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { systemBlock, messagingBlock } = useSystemBlock(profileId || '');

  // Verificar se está na área admin
  const isAdminArea = location.pathname.startsWith('/admin');

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
        // Garantir que apenas a primeira letra seja maiúscula
        const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        setUserName(formattedName);

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

        // Carregar conversas não arquivadas
        const { data: conversation } = await supabase
          .from('ai_assistant_conversations')
          .select('messages')
          .eq('profile_id', profile.id)
          .eq('archived', false)
          .maybeSingle();

        if (conversation?.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
          const existing = conversation.messages as unknown as Message[];
          if (hasBlock) {
            const blockMsg = { role: 'assistant' as const, content: `Olá, ${formattedName}! 👋\n\nPercebi que você foi bloqueado recentemente. Gostaria de falar sobre isso?` };
            setMessages([blockMsg, ...existing]);
            setShowBlockQuestion(true);
            setShowTopics(false);
          } else {
            setMessages(existing);
            setShowTopics(false);
            setShowBlockQuestion(false);
            setViewMode('chat');
          }
        } else {
          if (hasBlock) {
            const blockMsg = `Olá, ${formattedName}! 👋\n\nPercebi que você foi bloqueado recentemente. Gostaria de falar sobre isso?`;
            setMessages([{ role: 'assistant', content: blockMsg }]);
            setShowBlockQuestion(true);
            setShowTopics(false);
            setViewMode('chat');
          } else {
            // Primeira vez - mostrar mensagem de boas-vindas
            const welcomeMsg = firstName 
              ? `Olá, ${firstName}! 👋\n\nEm que podemos lhe ajudar? Selecione um dos tópicos abaixo ou digite o que precisa:`
              : 'Olá! 👋\n\nEm que podemos lhe ajudar? Selecione um dos tópicos abaixo ou digite o que precisa:';
            
            setMessages([{ role: 'assistant', content: welcomeMsg }]);
            setShowTopics(true);
            setViewMode('welcome');
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
    setViewMode('chat');
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
    if ((!input.trim() && !selectedFile) || loading) return;
    setShowTopics(false);
    setShowBlockQuestion(false);
    const userMessage = input.trim();
    const fileToSend = selectedFile;
    const filePreview = filePreviewUrl;
    setInput('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    sendMessageInternal(userMessage, fileToSend, filePreview);
    
    // Restaurar foco no input após enviar
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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

  const sendMessageInternal = async (messageText: string, file?: File | null, filePreview?: string | null) => {
    const newUserMessage = { role: 'user' as const, content: messageText };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Upload file if present
      let fileUrl: string | undefined;
      if (file) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${profileId}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(fileName);

          fileUrl = publicUrl;
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast({
            variant: 'destructive',
            title: 'Erro ao enviar anexo',
            description: 'Não foi possível fazer upload do arquivo.',
          });
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          message: messageText,
          conversationHistory: updatedMessages,
          fileUrl: fileUrl
        }
      });

      if (error) throw error;

      // Usar streaming para mensagens longas
      const finalMessages = await streamLongMessage(data.response, updatedMessages);

      // Se transferido para atendente humano
      if (data.escalatedToHuman) {
        toast({
          title: 'Transferido para atendente',
          description: 'Aguarde enquanto um atendente irá te responder...',
          duration: 5000
        });
      }

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
        // Arquivar conversa ao invés de deletar
        await supabase
          .from('ai_assistant_conversations')
          .update({ 
            archived: true, 
            archived_at: new Date().toISOString() 
          })
          .eq('profile_id', profileId)
          .eq('archived', false);
      }
    } catch (e) {
      console.error('Error archiving AI conversation:', e);
    }

    const welcomeMsg = userName
      ? `Olá, ${userName}! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:`
      : 'Olá! 👋\n\nSou o assistente virtual da Woorkins e estou aqui para ajudá-lo(a) no que precisar.\n\nSelecione um dos tópicos abaixo ou digite sua dúvida diretamente:';

    setMessages([{ role: 'assistant', content: welcomeMsg }]);
    setShowTopics(true);
    setShowBlockQuestion(false);
    setViewMode('welcome');
    toast({ title: 'Conversa arquivada', description: 'Você pode acessá-la no histórico.' });
  };

  const loadArchivedConversations = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('ai_assistant_conversations')
        .select('*')
        .eq('profile_id', profileId)
        .eq('archived', true)
        .order('archived_at', { ascending: false });

      if (error) throw error;

      const conversations = (data || []).map(conv => ({
        ...conv,
        messages: conv.messages as unknown as Message[]
      }));

      setArchivedConversations(conversations);
      setFilteredConversations(conversations);
    } catch (e) {
      console.error('Error loading archived conversations:', e);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico.',
        variant: 'destructive'
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);

    if (!query.trim()) {
      setFilteredConversations(archivedConversations);
      return;
    }

    const filtered = archivedConversations.filter(conv => {
      const messagesText = conv.messages.map(m => m.content).join(' ').toLowerCase();
      return messagesText.includes(query.toLowerCase());
    });

    setFilteredConversations(filtered);
  };

  const showHistoryView = () => {
    setViewMode('history');
    setSelectedConversation(null);
    setSearchQuery('');
    setCurrentPage(1);
    loadArchivedConversations();
  };

  const backToWelcome = () => {
    setViewMode('welcome');
    setSelectedConversation(null);
    setSearchQuery('');
    setCurrentPage(1);
    // Restaurar foco no input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit for support)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Paginação
  const indexOfLastConv = currentPage * conversationsPerPage;
  const indexOfFirstConv = indexOfLastConv - conversationsPerPage;
  const currentConversations = filteredConversations.slice(indexOfFirstConv, indexOfLastConv);
  const totalPages = Math.ceil(filteredConversations.length / conversationsPerPage);

  // Funções de arrastar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - buttonPosition.x,
      y: e.clientY - buttonPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Limitar posição dentro da tela
    const maxX = window.innerWidth - 200; // largura aproximada do botão
    const maxY = window.innerHeight - 50; // altura do botão
    
    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging) {
      // Calcular se houve movimento significativo (mais de 5px)
      const moved = Math.abs(e.clientX - dragStartPos.x) > 5 || Math.abs(e.clientY - dragStartPos.y) > 5;
      
      // Só abrir se não houve movimento (foi um clique)
      if (!moved) {
        setInternalOpen(true);
      }
    }
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <>
      {/* Botão flutuante - 30% menor - oculto na área admin */}
      {!isOpen && !isAdminArea && (
        <div
          style={{
            position: 'fixed',
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          className="z-50 group"
        >
          <Button
            onMouseDown={handleMouseDown}
            className="h-8 px-3 rounded-full shadow-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white flex items-center gap-1.5 animate-fade-in hover-scale border border-white/20 transition-all"
          >
            <GripVertical className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="font-medium text-xs">Precisa de Ajuda?</span>
          </Button>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-2 left-6 w-96 h-[600px] bg-gradient-to-br from-background via-background to-background/95 border-2 border-primary/20 rounded-3xl shadow-2xl z-50 flex flex-col backdrop-blur-sm animate-scale-in">
          <div className="p-6 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent rounded-t-3xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Central de Ajuda
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {viewMode === 'welcome' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showHistoryView}
                    className="h-8 whitespace-nowrap"
                  >
                    Histórico
                  </Button>
                )}
                {viewMode === 'chat' && messages.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endConversation}
                    className="h-8 whitespace-nowrap"
                  >
                    Encerrar
                  </Button>
                )}
                {viewMode === 'history' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={backToWelcome}
                    className="h-8 whitespace-nowrap"
                  >
                    Voltar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    close();
                    setInternalOpen(false);
                  }}
                  className="h-8 w-8 flex-shrink-0"
                  aria-label="Fechar assistente"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* History View */}
          {viewMode === 'history' && !selectedConversation && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar nas conversas..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-primary/20 rounded-xl focus:outline-none focus:border-primary/40 bg-background"
                />
              </div>

              {currentConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa arquivada ainda.'}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {currentConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full text-left p-4 border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {new Date(conv.archived_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(conv.archived_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {conv.messages[1]?.content || 'Conversa vazia'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Selected Conversation View */}
          {viewMode === 'history' && selectedConversation && (
            <div className="flex-1 overflow-y-auto p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="mb-4"
              >
                ← Voltar para lista
              </Button>

              <div className="space-y-4">
                {selectedConversation.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {viewMode !== 'history' && (
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
          )}

          {/* Input */}
          {viewMode !== 'history' && (
            <div className="p-4 border-t border-primary/10 bg-gradient-to-r from-transparent to-primary/5 rounded-b-3xl">
            {/* Spam block alert */}
            {isSpamBlocked && (
              <div className="mb-3">
                <SpamBlockCountdown 
                  remainingSeconds={remainingSeconds}
                  reason="Por favor, aguarde alguns minutos antes de enviar mais mensagens."
                />
              </div>
            )}
            
            {/* File preview */}
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
                {filePreviewUrl && selectedFile.type.startsWith('image/') ? (
                  <img src={filePreviewUrl} alt="Preview" className="h-12 w-12 object-cover rounded" />
                ) : (
                  <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
                    {getFileIcon(selectedFile.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isSpamBlocked) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={isSpamBlocked ? "Aguarde o desbloqueio..." : "Digite sua dúvida ou selecione um tópico acima..."}
                className="resize-none border-primary/20 focus:border-primary/40 bg-background/50"
                rows={2}
                disabled={isSpamBlocked}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSpamBlocked}
                  size="icon"
                  className="shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSpamBlocked}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </>
  );
};