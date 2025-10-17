import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile, ExternalLink, Lock, Shield, AlertTriangle, Trash2, X, Download, FileText, File, MoreVertical, Archive, Ban, Eye, DollarSign } from 'lucide-react';
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
import { BlockedMessageCountdown } from './BlockedMessageCountdown';
import { ImageViewer } from './ImageViewer';
import { RequireProfilePhotoDialog } from './RequireProfilePhotoDialog';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { RequireDocumentVerificationDialog } from './RequireDocumentVerificationDialog';
import { useSpamBlock } from '@/hooks/useSpamBlock';
import { SpamBlockCountdown } from './SpamBlockCountdown';

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
  const [sendOnEnter, setSendOnEnter] = useState<boolean>(() => {
    const saved = localStorage.getItem('chat_send_on_enter');
    return saved === null ? true : saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [proposalData, setProposalData] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoadingProposal, setIsLoadingProposal] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [showPhotoRequiredDialog, setShowPhotoRequiredDialog] = useState(false);
  const [showDocVerificationDialog, setShowDocVerificationDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const { isVerified } = useDocumentVerification(profileId);

  const {
    messages,
    isLoading: _isLoading,
    isSending,
    otherUserTyping,
    isBlocked,
    blockedUntil,
    blockReason,
    sendMessage: sendMessageHook,
    handleTyping,
  } = useRealtimeMessaging({
    conversationId,
    conversationType,
    currentUserId: profileId,
    otherUserId: otherUser.id,
    proposalStatus: proposalData?.status,
  });

  // Check for system-level messaging blocks
  const [systemMessagingBlock, setSystemMessagingBlock] = useState<any>(null);
  
  // Check for spam blocks
  const spamContext = conversationType === 'negotiation' ? 'negotiation' : 'proposal';
  const { isBlocked: isSpamBlocked, remainingSeconds, spamBlock } = useSpamBlock(currentUserProfile?.id, spamContext as 'negotiation' | 'proposal');

  // Load current user profile to check for avatar
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .single();
      
      setCurrentUserProfile(data);
    };

    loadCurrentUserProfile();
  }, [user]);

  useEffect(() => {
    const checkSystemBlock = async () => {
      const { data } = await supabase
        .from('system_blocks')
        .select('*')
        .eq('profile_id', profileId)
        .eq('block_type', 'messaging')
        .maybeSingle();

      if (data) {
        // Check if block is still active
        if (data.is_permanent || (data.blocked_until && new Date(data.blocked_until) > new Date())) {
          setSystemMessagingBlock(data);
        } else {
          setSystemMessagingBlock(null);
        }
      } else {
        setSystemMessagingBlock(null);
      }
    };

    checkSystemBlock();
    const interval = setInterval(checkSystemBlock, 10000);
    return () => clearInterval(interval);
  }, [profileId]);

  // Determine final block status (system block and spam block take precedence)
  const finalIsBlocked = systemMessagingBlock ? true : (isSpamBlocked || isBlocked);
  const finalBlockedUntil = systemMessagingBlock?.blocked_until 
    ? new Date(systemMessagingBlock.blocked_until) 
    : blockedUntil;
  const finalBlockReason = systemMessagingBlock?.reason || blockReason;

  useEffect(() => {
    // Função de scroll otimizada
    const scrollToBottom = () => {
      // Tentar múltiplas estratégias para garantir scroll
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          // Método 1: scrollTop direto
          container.scrollTop = container.scrollHeight;
          
          // Método 2: scrollIntoView como fallback
          const lastMessage = container.lastElementChild;
          if (lastMessage) {
            lastMessage.scrollIntoView({ block: 'end', behavior: 'auto' });
          }
        }
        
        // Método 3: ref como último recurso
        messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
      });
    };

    // Scroll imediato
    scrollToBottom();

    // Múltiplos timeouts para garantir após renderização
    const timeouts = [
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 200),
      setTimeout(scrollToBottom, 400),
    ];

    // Scroll após imagens carregarem
    const container = messagesContainerRef.current;
    const handleImageLoad = () => scrollToBottom();
    
    if (container) {
      const images = Array.from(container.querySelectorAll('img'));
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', handleImageLoad);
        }
      });

      // Cleanup
      return () => {
        timeouts.forEach(clearTimeout);
        images.forEach(img => img.removeEventListener('load', handleImageLoad));
      };
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [messages, conversationId]);

  // Scroll adicional quando a conversa muda
  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
        messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
      });
    };

    scrollToBottom();
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);

    // Marcar mensagens como lidas
    if (messages.length > 0 && profileId) {
      markMessagesAsRead();
    }
  }, [conversationId]);

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

// Scroll quando conversa muda (sem dependência de messages para evitar loops)
useEffect(() => {
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    });
  };

  scrollToBottom();
  const timeout1 = setTimeout(scrollToBottom, 100);
  const timeout2 = setTimeout(scrollToBottom, 300);
  const timeout3 = setTimeout(scrollToBottom, 500);

  return () => {
    clearTimeout(timeout1);
    clearTimeout(timeout2);
    clearTimeout(timeout3);
  };
}, [conversationId]);

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
    
    // Check if user has document verified
    if (!isVerified) {
      setShowDocVerificationDialog(true);
      return;
    }
    
    // Check if user has profile photo
    if (!currentUserProfile?.avatar_url) {
      setShowPhotoRequiredDialog(true);
      return;
    }

    if ((!messageInput.trim() && selectedFiles.length === 0) || isSending) return;

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

    // Send message with first file only (for now, hook supports single attachment)
    const attachment = selectedFiles[0]
      ? { file: selectedFiles[0], url: URL.createObjectURL(selectedFiles[0]) }
      : undefined;

    await sendMessageHook(messageInput, attachment);
    setMessageInput('');
    setSelectedFiles([]);
    setFilePreviewUrl(null);
    
    // Restaurar foco no input após enviar
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total files limit (10 files max)
    const currentCount = selectedFiles.length;
    if (currentCount + files.length > 10) {
      toast({
        variant: 'destructive',
        title: 'Limite de arquivos',
        description: 'Você pode enviar no máximo 10 arquivos por vez',
        duration: 5000
      });
      return;
    }

    // Validate each file
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];
    const maxSizeMB = 49;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    files.forEach(file => {
      if (file.size > maxSizeBytes) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Arquivos muito grandes',
        description: `Os seguintes arquivos ultrapassam ${maxSizeMB}MB e não podem ser enviados:\n${invalidFiles.join('\n')}`,
        duration: 8000,
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return null;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleDownloadFile = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o arquivo',
      });
    }
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

  // Renderiza imediatamente sem loading
  // if (_isLoading || isLoadingProposal) {
  //   return (
  //     <div className="h-full flex items-center justify-center">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // Check if chat should be locked (proposal not unlocked, user is freelancer, and no messages yet)
  // Só bloqueia se realmente não há mensagens E já terminou de carregar
  const isChatLocked = conversationType === 'proposal' && 
    !isOwner && 
    !proposalData?.is_unlocked &&
    proposalData?.status === 'pending' &&
    messages.length === 0 &&
    !_isLoading; // Só mostra bloqueio se já terminou de carregar

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
        reporter_id: profileId,
        content_type: conversationType === 'proposal' ? 'proposal' : 'negotiation',
        content_id: conversationId,
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
    <div className="h-full flex flex-col bg-white relative">
      {/* Unified Header with Proposal Info - 3 Columns Layout */}
      {conversationType === 'proposal' && proposalData && (
        <div className="border-b bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
          <div className="px-4 py-3 grid grid-cols-[auto_1fr_auto] gap-4 items-center">
            {/* Coluna 1: Foto e Nome do Usuário */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarImage src={otherUser.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {otherUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {proposalData.payment_status === 'paid' ? otherUser.name : (() => {
                    const parts = otherUser.name.split(' ');
                    return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
                  })()}
                </h3>
                <div className="flex items-center gap-2">
                  {otherUserTyping ? (
                    <span className="text-xs text-primary animate-pulse font-medium">Digitando...</span>
                  ) : (
                    <>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <Badge variant="secondary" className="text-xs">
                        Proposta de Projeto
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna 2: Nome do Projeto e Valor - Centralizado */}
            <div className="min-w-0 flex flex-col items-center justify-center">
              <p className="text-sm font-semibold text-foreground truncate mb-2 text-center">{projectTitle}</p>
              <div className="inline-flex items-center gap-3 bg-white rounded-full px-4 py-1.5 shadow-sm border">
                <span className="text-sm font-bold text-primary">
                  R$ {proposalData.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="h-3 w-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  Prazo: {proposalData.delivery_days} dia{proposalData.delivery_days > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Coluna 3: Botão Refazer, Status e Menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Refazer Proposta
              </Button>
              
              <Badge variant={proposalData.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                {proposalData.status === 'pending' ? 'Pendente' : 
                 proposalData.status === 'accepted' ? 'Aceito' : 
                 proposalData.status === 'rejected' ? 'Rejeitado' : proposalData.status}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {projectId && (
                    <>
                      <DropdownMenuItem onClick={() => window.open(`/projetos/${projectId}`, '_blank')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar Projeto
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
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
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      const canDelete = await checkCanDelete();
                      if (canDelete) setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
      
      {/* Header for Negotiations */}
      {conversationType === 'negotiation' && (
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
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{otherUser.name}</h3>
            <div className="flex items-center gap-2">
              {otherUserTyping ? (
                <span className="text-xs text-primary animate-pulse font-medium">Digitando...</span>
              ) : (
                <>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="secondary" className="text-xs">
                    Negociação
                  </Badge>
                </>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {businessId && (
                <>
                  <DropdownMenuItem onClick={() => window.open(`/empresas/${businessId}`, '_blank')}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Perfil da Empresa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  const canDelete = await checkCanDelete();
                  if (canDelete) setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Messages - Scrollable Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4 pb-4">
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
              {/* Security warning as first message for pending proposals */}
              {conversationType === 'proposal' && proposalData?.status === 'pending' && (
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>Aviso de Segurança:</strong> Todas as conversas são monitoradas para garantir transações seguras. É proibido compartilhar informações de contato (telefone, email, redes sociais). Violações podem resultar em bloqueio permanente da conta.
                  </AlertDescription>
                </Alert>
              )}

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
                const isDeleted = message.is_deleted || false;
                
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
                           isDeleted
                             ? 'bg-destructive/10 border-destructive/20 border'
                             : isMine
                             ? 'bg-primary text-primary-foreground rounded-tr-sm'
                             : 'bg-card border rounded-tl-sm'
                         }`}
                       >
                         {message.media_url && message.media_type?.startsWith('image/') && (
                           <div 
                             className="mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                             onClick={() => setViewingImage({ url: message.media_url!, name: message.media_name || 'imagem.jpg' })}
                           >
                             <img 
                               src={message.media_url} 
                               alt={message.media_name || 'Imagem'}
                               className="max-w-[300px] max-h-[300px] rounded-lg object-cover"
                             />
                           </div>
                         )}
                         {message.media_url && !message.media_type?.startsWith('image/') && (
                           <div className="mb-2 flex items-center gap-2 p-2 bg-background/10 rounded-lg">
                             {getFileIcon(message.media_type || '')}
                             <span className="text-xs flex-1 truncate">{message.media_name}</span>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6"
                               onClick={() => handleDownloadFile(message.media_url!, message.media_name || 'arquivo')}
                             >
                               <Download className="h-3 w-3" />
                             </Button>
                           </div>
                         )}
                          {isDeleted ? (
                            <p className="text-sm italic text-destructive">
                              Apagado por violar as regras
                            </p>
                          ) : (
                            <>
                              {message.content && <p className="text-sm leading-relaxed break-words">{message.content}</p>}
                            </>
                          )}
                          {isMine && !isDeleted && (! (conversationType === 'proposal' && proposalData?.status === 'accepted')) && (
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

      {/* Input - Bottom area (not absolute) */}
      <div className="border-t bg-background">
        {isSpamBlocked ? (
          <div className="p-3">
            <SpamBlockCountdown remainingSeconds={remainingSeconds} reason={spamBlock?.reason} />
          </div>
        ) : finalIsBlocked && finalBlockedUntil ? (
          <div className="p-3">
            <BlockedMessageCountdown blockedUntil={finalBlockedUntil} reason={finalBlockReason} />
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-3 space-y-2">
            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Preview" 
                        className="h-12 w-12 object-cover rounded" 
                      />
                    ) : (
                      <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                className="flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                ref={messageInputRef}
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Digite sua mensagem..."
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
                type="submit" 
                disabled={isSending || (selectedFiles.length === 0 && !messageInput.trim())}
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
          </form>
        )}
      </div>

      {/* Image Viewer */}
      {viewingImage && (
        <ImageViewer
          imageUrl={viewingImage.url}
          imageName={viewingImage.name}
          onClose={() => setViewingImage(null)}
        />
      )}

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

      {/* Profile Photo Required Dialog */}
      <RequireProfilePhotoDialog
        open={showPhotoRequiredDialog}
        userName={currentUserProfile?.full_name || 'Usuário'}
        userId={user?.id || ''}
        onPhotoUploaded={() => {
          setShowPhotoRequiredDialog(false);
          // Reload current user profile
          if (user) {
            supabase
              .from('profiles')
              .select('avatar_url, full_name')
              .eq('user_id', user.id)
              .single()
              .then(({ data }) => setCurrentUserProfile(data));
          }
        }}
      />

      {/* Document Verification Required Dialog */}
      <RequireDocumentVerificationDialog
        open={showDocVerificationDialog}
        onOpenChange={setShowDocVerificationDialog}
        profileId={profileId}
        registeredName={currentUserProfile?.full_name || ''}
        registeredCPF={currentUserProfile?.cpf || ''}
        action="send_message"
      />

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
                Você está prestes a bloquear <strong>{otherUser.name}</strong>.
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
    </div>
  );
}