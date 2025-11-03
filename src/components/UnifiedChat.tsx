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
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile, ExternalLink, Lock, Shield, AlertTriangle, Trash2, X, Download, FileText, File, MoreVertical, Archive, Ban, Eye, DollarSign, ArrowLeftRight, Info, CheckCircle } from 'lucide-react';
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
import { ProposalChatHeader } from './projects/ProposalChatHeader';
import { ProposalCounterDialog } from './projects/ProposalCounterDialog';
import { ProposalHistoryDialog } from './projects/ProposalHistoryDialog';
import { ProposalPaymentDialog } from './projects/ProposalPaymentDialog';
import { ProposalCompletionDialog } from './projects/ProposalCompletionDialog';
import { FreelancerCompletionDialog } from './projects/FreelancerCompletionDialog';
import { ProposalDisputeDialog } from './projects/ProposalDisputeDialog';
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
  suppressToasts?: boolean;
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
  suppressToasts = false,
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
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showFreelancerCompletionDialog, setShowFreelancerCompletionDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [visibleTimestamps, setVisibleTimestamps] = useState<Record<string, boolean>>({});
  const [hideOnInit, setHideOnInit] = useState(false);
  const isHydratingRef = useRef(false);

  const { isVerified } = useDocumentVerification(profileId);

  // Auto-close verification dialog when document is verified
  useEffect(() => {
    if (isVerified && showDocVerificationDialog) {
      setShowDocVerificationDialog(false);
    }
  }, [isVerified, showDocVerificationDialog]);

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
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  } = useRealtimeMessaging({
    conversationId,
    conversationType,
    currentUserId: profileId,
    otherUserId: otherUser.id,
    proposalStatus: proposalData?.status,
    suppressToasts,
  });

  // Check for system-level messaging blocks
  const [systemMessagingBlock, setSystemMessagingBlock] = useState<any>(null);
  
  // Check for spam blocks
  const spamContext = conversationType === 'negotiation' ? 'negotiation' : 'proposal';
  const { isBlocked: isSpamBlocked, remainingSeconds, spamBlock } = useSpamBlock(currentUserProfile?.id, spamContext as 'negotiation' | 'proposal');

  // Load current user profile to check for avatar
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      if (!profileId) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', profileId)
        .single();
      
      setCurrentUserProfile(data);
    };

    loadCurrentUserProfile();
  }, [profileId]);

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

  // Ref para rastrear número anterior de mensagens
  const prevMessageCountRef = useRef(0);
  
  // Ao trocar de conversa - pré-posicionar ANTES de carregar
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Pré-posicionar no fundo IMEDIATAMENTE
      container.style.scrollBehavior = 'auto';
      container.scrollTop = container.scrollHeight;
    }
    
    isHydratingRef.current = true;
    setHideOnInit(true);
    prevMessageCountRef.current = 0;
  }, [conversationId]);
  
  // Revelar container após posicionamento instantâneo
  useLayoutEffect(() => {
    if (!isHydratingRef.current) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Forçar scroll instantâneo no fundo
    container.style.scrollBehavior = 'auto';
    container.scrollTop = container.scrollHeight;
    
    // Usar requestAnimationFrame para garantir DOM pintado
    requestAnimationFrame(() => {
      // Reforçar posição (caso scrollHeight tenha mudado)
      container.scrollTop = container.scrollHeight;
      
      // Revelar container (já está no lugar certo)
      isHydratingRef.current = false;
      setHideOnInit(false);
      prevMessageCountRef.current = messages.length;
    });
  }, [conversationId]);
  
  // Scroll suave APENAS para novas mensagens (após a abertura inicial)
  useEffect(() => {
    if (isHydratingRef.current) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    if (messages.length > prevMessageCountRef.current) {
      container.style.scrollBehavior = 'smooth';
      container.scrollTop = container.scrollHeight;
    }
    
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Detectar scroll para cima e carregar mais mensagens (infinite scroll reverso)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    let isLoadingMoreRef = false;
    let scrollPositionRef = 0;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight } = container;
      
      // Se usuário rolou até próximo ao topo (margem de 150px)
      if (scrollTop < 150 && hasMoreMessages && !isLoadingMoreRef) {
        isLoadingMoreRef = true;
        
        // Salvar posição atual relativa
        scrollPositionRef = scrollHeight - scrollTop;
        
        // Carregar mais mensagens antigas
        loadMoreMessages().then(() => {
          // Restaurar posição do scroll após carregar
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - scrollPositionRef;
            }
            isLoadingMoreRef = false;
          });
        });
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMoreMessages, hasMoreMessages]);

  // Marcar mensagens como lidas quando a conversa muda
  useEffect(() => {
    if (messages.length > 0 && profileId) {
      markMessagesAsRead();
    }
  }, [conversationId, messages.length]);

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

  // Load proposal data if it's a proposal conversation (background)
  useEffect(() => {
    if (conversationType === 'proposal') {
      loadProposalData();
      loadActivities();
    }
  }, [conversationId, conversationType]);

  useEffect(() => {
    // Reload proposal data when messages change to update unlock status
    if (conversationType === 'proposal' && messages.length > 0) {
      loadProposalData();
    }
}, [messages.length, conversationType]);

  // Listener de realtime para mudanças na proposta e atividades
  useEffect(() => {
    if (conversationType !== 'proposal') return;
    
    const channel = supabase
      .channel(`proposal-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Proposta atualizada:', payload);
          // Recarregar dados da proposta instantaneamente
          loadProposalData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'counter_proposals',
          filter: `proposal_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Nova contra-proposta:', payload);
          // Recarregar dados da proposta instantaneamente
          loadProposalData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_status_history',
          filter: `proposal_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Nova atividade:', payload);
          // Recarregar atividades instantaneamente
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, conversationType]);


  const loadProposalData = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          owner_confirmation_deadline,
          project:projects!inner(
            id,
            title,
            profile_id,
            profiles:profiles!projects_profile_id_fkey(
              id,
              full_name,
              company_name,
              avatar_url,
              logo_url
            )
          ),
          freelancer:profiles!proposals_freelancer_id_fkey(
            id,
            full_name,
            company_name,
            avatar_url
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      console.log('📥 Proposal Data Loaded:', {
        awaiting_acceptance_from: data.awaiting_acceptance_from,
        current_proposal_by: data.current_proposal_by,
        freelancer_id: data.freelancer_id,
        project_profile_id: data.project.profile_id,
        status: data.status,
      });

      setProposalData(data);
      setIsOwner(data.project.profile_id === profileId);
    } catch (error) {
      console.error('Error loading proposal data:', error);
    }
  };

  const loadActivities = async () => {
    if (conversationType !== 'proposal') return;
    
    try {
      const { data, error } = await supabase
        .from('proposal_status_history')
        .select(`
          *,
          changed_by_profile:profiles!proposal_status_history_changed_by_fkey(
            id,
            full_name,
            company_name,
            avatar_url,
            logo_url
          )
        `)
        .eq('proposal_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setActivities(data);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  // Payment handler - Opens Stripe checkout
  const handlePay = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('create-project-payment', {
        body: { proposal_id: conversationId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        if (!suppressToasts) {
          toast({
            title: 'Redirecionando para pagamento',
            description: 'Você será redirecionado para o Stripe para completar o pagamento',
          });
        }
      }
    } catch (error: any) {
      if (!suppressToasts) {
        toast({
          title: 'Erro ao processar pagamento',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Owner confirms work completion and releases payment
  const handleConfirmCompletion = () => {
    // Abrir diálogo de confirmação
    setShowCompletionDialog(true);
  };

  const handleFinalConfirmCompletion = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('release-proposal-payment', {
        body: { 
          proposal_id: conversationId,
          action: 'approve'
        }
      });
      
      if (error) throw error;
      
      // Verificar se o pagamento já foi processado anteriormente
      if (data?.already_processed) {
        setShowCompletionDialog(false);
        if (!suppressToasts) {
          toast({
            title: 'Pagamento já liberado',
            description: 'O pagamento já foi liberado anteriormente para esta proposta',
            variant: 'default',
          });
        }
        await loadProposalData();
        return;
      }
      
      setShowCompletionDialog(false);
      
      if (!suppressToasts) {
        toast({
          title: 'Trabalho concluído!',
          description: 'O pagamento foi liberado para o freelancer',
        });
      }
      
      await loadProposalData();
      await loadActivities();
    } catch (error: any) {
      if (!suppressToasts) {
        toast({
          title: 'Erro ao confirmar conclusão',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Freelancer marks work as completed - opens dialog first
  const handleMarkCompleted = () => {
    setShowFreelancerCompletionDialog(true);
  };

  // Confirm freelancer completion (after dialog confirmation)
  const handleConfirmFreelancerCompletion = async () => {
    try {
      setIsLoading(true);
      
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 72); // 72 horas = 3 dias

      const { error } = await supabase
        .from('proposals')
        .update({
          work_status: 'freelancer_completed',
          completion_requested_at: new Date().toISOString(),
          owner_confirmation_deadline: deadline.toISOString(),
        })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Create status history record
      await supabase.from('proposal_status_history').insert({
        proposal_id: conversationId,
        status_type: 'freelancer_completed',
        changed_by: profileId,
        new_value: { work_status: 'freelancer_completed' },
        message: 'Freelancer marcou o trabalho como concluído. Cliente tem 72h para confirmar.',
      });
      
      setShowFreelancerCompletionDialog(false);
      
      if (!suppressToasts) {
        toast({
          title: 'Trabalho marcado como concluído!',
          description: 'O cliente tem 72h para confirmar. Após esse prazo, o pagamento será liberado automaticamente.',
        });
      }
      
      await loadProposalData();
    } catch (error: any) {
      if (!suppressToasts) {
        toast({
          title: 'Erro ao marcar como concluído',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Open counter proposal dialog
  const handleMakeCounterProposal = () => {
    setShowCounterDialog(true);
  };

  // Submit counter proposal
  const handleSubmitCounterProposal = async (amount: number, message: string) => {
    try {
      setIsLoading(true);
      
      // Determine who is making the counter-proposal
      const fromProfileId = profileId;
      const toProfileId = isOwner ? proposalData.freelancer_id : proposalData.project.profile_id;
      
      console.log('📤 Sending Counter Proposal:', {
        fromProfileId,
        toProfileId,
        amount,
        isOwner,
        freelancer_id: proposalData.freelancer_id,
        project_profile_id: proposalData.project.profile_id,
      });
      
      // Insert into counter_proposals table
      const { error: counterError } = await supabase
        .from('counter_proposals')
        .insert({
          proposal_id: conversationId,
          from_profile_id: fromProfileId,
          to_profile_id: toProfileId,
          amount,
          message,
          status: 'pending',
        });
      
      if (counterError) throw counterError;
      
      // Update proposal with new amount and who should accept
      const { data: updateData, error: updateError } = await supabase
        .from('proposals')
        .update({
          current_proposal_amount: amount,
          current_proposal_by: fromProfileId,
          awaiting_acceptance_from: toProfileId,
          status: 'pending', // Back to pending until acceptance
        })
        .eq('id', conversationId)
        .select();
      
      console.log('✅ Proposal Updated:', {
        updateData,
        toProfileId,
        fromProfileId,
      });
      
      if (updateError) {
        console.error('❌ Update Error:', updateError);
        throw updateError;
      }
      
      // Create status history record
      await supabase.from('proposal_status_history').insert({
        proposal_id: conversationId,
        status_type: 'counter_proposal',
        changed_by: fromProfileId,
        old_value: { amount: proposalData.current_proposal_amount || proposalData.budget },
        new_value: { amount, message },
        message: `${isOwner ? 'Cliente' : 'Freelancer'} fez uma contra-proposta`,
      });
      
      toast({
        title: 'Contra-proposta enviada!',
        description: 'Aguarde a resposta da outra parte',
      });
      
      await loadProposalData();
      setShowCounterDialog(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar contra-proposta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open dispute (placeholder)
  const handleOpenDispute = () => {
    toast({
      title: 'Em desenvolvimento',
      description: 'A funcionalidade de disputa será implementada em breve',
    });
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
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Limite de arquivos',
          description: 'Você pode enviar no máximo 10 arquivos por vez',
          duration: 5000
        });
      }
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
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Arquivos muito grandes',
          description: `Os seguintes arquivos ultrapassam ${maxSizeMB}MB e não podem ser enviados:\n${invalidFiles.join('\n')}`,
          duration: 8000,
        });
      }
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

  const showTimestamp = (id: string) => {
    setVisibleTimestamps(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setVisibleTimestamps(prev => ({ ...prev, [id]: false }));
    }, 2500);
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

  // Componente para renderizar atividades
  const ActivityMessage = ({ activity, isLatestCounterProposal }: { activity: any; isLatestCounterProposal?: boolean }) => {
    const { status_type, new_value, old_value, message, created_at, changed_by_profile, changed_by } = activity;
    
    // Determinar se a atividade é "minha" (eu fiz a ação)
    const isMine = changed_by === profileId;
    
    const getActivityIcon = () => {
      switch (status_type) {
        case 'counter_proposal':
          return <ArrowLeftRight className="h-4 w-4" />;
        case 'accepted':
          return <CheckCircle className="h-4 w-4" />;
        case 'payment_made':
          return <DollarSign className="h-4 w-4" />;
        case 'freelancer_completed':
          return <CheckCircle className="h-4 w-4" />;
        case 'completed':
          return <CheckCircle className="h-4 w-4" />;
        default:
          return <Info className="h-4 w-4" />;
      }
    };
    
    const getActivityMessage = () => {
      const userName = changed_by_profile?.company_name || changed_by_profile?.full_name || 'Usuário';
      
      switch (status_type) {
        case 'counter_proposal':
          const newAmount = new_value?.amount;
          const counterMessage = new_value?.message;
          return (
            <div>
              <p className="font-semibold mb-1">
                {isMine ? 'Você enviou' : `${userName} enviou`} uma contra-proposta
              </p>
              <p className="text-sm">
                Novo valor: <span className="font-bold">R$ {newAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              {counterMessage && (
                <p className="text-sm mt-1 italic">"{counterMessage}"</p>
              )}
            </div>
          );
        
        case 'accepted':
          return (
            <p>
              <span className="font-semibold">{isMine ? 'Você aceitou' : `${userName} aceitou`}</span> a proposta de{' '}
              <span className="font-bold">R$ {new_value?.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          );
        
        case 'payment_made':
          return (
            <p>
              <span className="font-semibold">Pagamento realizado!</span> Valor em garantia até conclusão do trabalho.
            </p>
          );
        
        case 'freelancer_completed':
          return (
            <p>
              <span className="font-semibold">{isMine ? 'Você marcou' : `${userName} marcou`}</span> o trabalho como concluído e aguarda confirmação
            </p>
          );
        
        case 'completed':
          const releasedAmount = proposalData?.current_proposal_amount || new_value?.amount || 0;
          
          // Freelancer vê a mensagem completa com valor e link
          if (!isOwner) {
            return (
              <div className="font-semibold">
                <p className="mb-2">✅ Projeto concluído! Pagamento liberado.</p>
                <p className="text-sm font-normal mb-2">
                  O valor de <span className="font-bold text-white">R$ {releasedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> já está disponível para você solicitar o saque.
                </p>
                <button
                  onClick={() => window.location.href = '/financeiro'}
                  className="text-sm text-blue-600 hover:text-blue-700 underline font-medium cursor-pointer"
                >
                  Clique aqui para solicitar saque
                </button>
              </div>
            );
          }
          
          // Dono do projeto vê apenas a mensagem simples
          return (
            <p className="font-semibold">
              ✅ Projeto concluído! Pagamento liberado.
            </p>
          );
        
        default:
          return <p>{message}</p>;
      }
    };
    
    const needsAction = status_type === 'counter_proposal' &&
      !isMine && // Only show action buttons to the person who RECEIVED the counter-proposal
      proposalData?.status === 'pending' &&
      isLatestCounterProposal; // Only show on the latest counter-proposal
    
    const needsOwnerConfirmation = status_type === 'freelancer_completed' &&
      !isMine && // Não mostrar para quem marcou como concluído
      isOwner && // Apenas para o owner
      proposalData?.work_status === 'freelancer_completed'; // Ainda aguardando confirmação
    
    // Debug logs
    if (status_type === 'counter_proposal') {
      console.log('🔍 Counter Proposal Debug:', {
        status_type,
        awaiting_acceptance_from: proposalData?.awaiting_acceptance_from,
        profileId,
        needsAction,
        proposalStatus: proposalData?.status,
        isMine,
      });
    }
    
    return (
      <div
        className={`flex gap-2 mb-1 group ${
          isMine ? 'flex-row-reverse' : 'flex-row'
        }`}
        onClick={() => showTimestamp(`activity-${activity.id}`)}
      >
        {!isMine && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={changed_by_profile?.avatar_url || changed_by_profile?.logo_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {(changed_by_profile?.company_name || changed_by_profile?.full_name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
              isMine
                ? 'bg-accent/90 text-slate-800 dark:text-slate-900 rounded-tr-sm border border-accent'
                : 'bg-accent/70 text-slate-800 dark:text-slate-900 border border-accent rounded-tl-sm'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {getActivityIcon()}
              </div>
              <div className="flex-1 text-sm">
                {getActivityMessage()}
              </div>
            </div>
            
            {needsAction && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-accent">
                <Button
                  size="sm"
                  onClick={async () => {
                    await supabase
                      .from('proposals')
                      .update({
                        status: 'accepted',
                        accepted_amount: new_value?.amount,
                        awaiting_acceptance_from: null,
                      })
                      .eq('id', conversationId);
                    
                    await loadProposalData();
                    
                    toast({
                      title: 'Contra-proposta aceita!',
                      description: isOwner ? 'Agora você pode pagar para iniciar o trabalho' : 'O cliente foi notificado',
                    });
                    
                    // Só abre o diálogo de pagamento se for o criador do projeto
                    if (isOwner) {
                      setShowPaymentDialog(true);
                    }
                  }}
                  className="bg-white hover:bg-slate-50 text-green-700 border-2 border-green-700 font-semibold shadow-md"
                >
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCounterDialog(true);
                  }}
                >
                  Fazer Nova Contra-Proposta
                </Button>
              </div>
            )}
            
            {needsOwnerConfirmation && (
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-accent">
                {proposalData?.owner_confirmation_deadline && (
                  <div className="text-xs bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                    ⏰ Confirme em até 72h ou será liberado automaticamente
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowCompletionDialog(true)}
                    className="bg-white hover:bg-slate-50 text-green-700 border-2 border-green-700 font-semibold shadow-md"
                  >
                    ✅ Confirmar Conclusão
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setShowDisputeDialog(true);
                    }}
                  >
                    ⚠️ Abrir Disputa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Timestamp fora da caixa - só no hover */}
        <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse mr-2' : 'ml-2'} ${visibleTimestamps[`activity-${activity.id}`] ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-200`}>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {(() => {
              const messageDate = new Date(created_at);
              const now = new Date();
              const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
              
              // Após 24h, mostra data e hora exata
              if (diffInHours > 24) {
                return messageDate.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
              
              // Antes de 24h, mostra tempo relativo
              return formatDistanceToNow(messageDate, {
                addSuffix: true,
                locale: ptBR,
              });
            })()}
          </span>
        </div>
      </div>
    );
  };

  // Removido completamente - renderiza instantaneamente

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
      
      if (!suppressToasts) {
        toast({
          title: 'Conversa excluída',
          description: 'A conversa foi excluída com sucesso para ambas as partes.',
        });
      }
      
      // Call parent callback to refresh conversations list
      if (onConversationDeleted) {
        onConversationDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: error.message || 'Não foi possível excluir a conversa. Tente novamente.',
        });
      }
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
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro ao bloquear',
          description: error.message,
        });
      }
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Selecione um motivo para a denúncia',
        });
      }
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

      if (!suppressToasts) {
        toast({
          title: 'Denúncia enviada',
          description: 'Sua denúncia foi registrada e será analisada pela nossa equipe',
        });
      }

      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar denúncia',
          description: error.message,
        });
      }
    }
  };

  const handleArchiveConversation = async () => {
    try {
      const tableName = conversationType === 'negotiation' ? 'negotiations' : 'proposals';
      
      const { error } = await supabase
        .from(tableName as any)
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;

      if (!suppressToasts) {
        toast({
          title: 'Conversa arquivada',
          description: 'A conversa foi arquivada com sucesso',
        });
      }

      if (onConversationDeleted) {
        onConversationDeleted();
      }
    } catch (error: any) {
      console.error('Error archiving conversation:', error);
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro ao arquivar',
          description: error.message,
        });
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header with Proposal Chat Header */}
      {conversationType === 'proposal' && proposalData && (
        <ProposalChatHeader
          proposal={{
            id: conversationId,
            status: proposalData.status,
            payment_status: proposalData.payment_status,
            work_status: proposalData.work_status,
            current_proposal_amount: proposalData.current_proposal_amount || proposalData.budget,
            is_unlocked: proposalData.is_unlocked,
            awaiting_acceptance_from: proposalData.awaiting_acceptance_from,
            owner_confirmation_deadline: proposalData.owner_confirmation_deadline,
          }}
          projectData={proposalData.project ? {
            id: proposalData.project.id,
            title: proposalData.project.title,
            ownerName: proposalData.project.profiles?.company_name || proposalData.project.profiles?.full_name || 'Dono do Projeto',
            freelancerName: proposalData.freelancer?.company_name || proposalData.freelancer?.full_name || 'Freelancer',
          } : undefined}
          currentProfileId={profileId}
          isOwner={isOwner}
          onAccept={async () => {
            setIsLoading(true);
            try {
              await supabase
                .from('proposals')
                .update({
                  status: 'accepted',
                  accepted_amount: proposalData.current_proposal_amount || proposalData.budget,
                  awaiting_acceptance_from: null,
                })
                .eq('id', conversationId);
              
              await loadProposalData();
              
              toast({
                title: 'Proposta aceita!',
                description: 'Agora você pode pagar para iniciar o trabalho',
              });
              
              // Abrir diálogo de pagamento
              setShowPaymentDialog(true);
            } finally {
              setIsLoading(false);
            }
          }}
          onPay={handlePay}
          onConfirmCompletion={handleFinalConfirmCompletion}
          onMarkCompleted={handleMarkCompleted}
          onMakeCounterProposal={handleMakeCounterProposal}
          onViewHistory={() => setShowHistoryDialog(true)}
          onOpenDispute={handleOpenDispute}
        />
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
              <DropdownMenuItem onClick={handleArchiveConversation}>
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
      <div ref={messagesContainerRef} className={`flex-1 min-h-0 ${hideOnInit ? 'overflow-hidden opacity-0' : 'overflow-y-auto'}`}>
        <div className="p-3 space-y-1 pb-3">
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
              {conversationType === 'proposal' && proposalData && (() => {
                const isMyProposal = proposalData.freelancer_id === profileId;
                return (
                  <div className={`flex gap-3 animate-in slide-in-from-bottom-2 ${isMyProposal ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMyProposal && (
                      <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20">
                        <AvatarImage src={proposalData.freelancer?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {(proposalData.freelancer?.full_name?.charAt(0) || proposalData.freelancer?.company_name?.charAt(0) || 'F').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col max-w-[80%] ${isMyProposal ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-5 py-4 shadow-md bg-accent text-accent-foreground ${isMyProposal ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                        <div className="flex items-baseline gap-2 mb-3">
                          <p className="text-sm font-bold">Proposta Inicial</p>
                          <span className="text-xs opacity-80">
                            {new Date(proposalData.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-base leading-relaxed break-words mb-3">{proposalData.message}</p>
                        <div className="mt-3 pt-3 border-t border-primary-foreground/20 space-y-2">
                          <p className="text-sm">
                            <span className="font-bold">Valor:</span> R$ {proposalData.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm">
                            <span className="font-bold">Prazo:</span> {proposalData.delivery_days} dias
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {messages.length === 0 && conversationType !== 'proposal' && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                    <Send className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">Envie a primeira mensagem!</p>
                </div>
              )}
              
              {/* Mesclar mensagens e atividades */}
              {(() => {
                const combinedItems = [
                  ...messages.map(m => ({ type: 'message' as const, data: m, created_at: m.created_at })),
                  ...activities.map(a => ({ type: 'activity' as const, data: a, created_at: a.created_at }))
                ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                // Find the latest counter_proposal activity
                const counterProposals = activities.filter(a => a.status_type === 'counter_proposal');
                const latestCounterProposalId = counterProposals.length > 0 
                  ? counterProposals[counterProposals.length - 1].id 
                  : null;

                return combinedItems.map((item) => {
                  if (item.type === 'activity') {
                    const isLatestCounterProposal = item.data.status_type === 'counter_proposal' && 
                                                     item.data.id === latestCounterProposalId;
                    
                    return (
                      <ActivityMessage 
                        key={`activity-${item.data.id}`}
                        activity={item.data}
                        isLatestCounterProposal={isLatestCounterProposal}
                      />
                    );
                  }
                  
                  const message = item.data;
                  const isMine = isMyMessage(message.sender_id);
                  const isDeleted = message.is_deleted || false;
                  
                  return (
                    <div
                      key={(message as any).client_key || message.id}
                      className={`flex gap-2 mb-1 group ${(((message as any).client_key || '').toString().startsWith('temp-')) ? 'animate-in slide-in-from-bottom-2' : ''} ${
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
                       
                        <div className={`flex flex-col max-w-[75%] group ${isMine ? 'items-end' : 'items-start'}`} onClick={() => showTimestamp(message.id)}>
                          {/* Rejected message */}
                          {message.status === 'rejected' && isMine ? (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-800 rounded-2xl px-4 py-3 shadow-sm max-w-md">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-semibold text-red-900 dark:text-red-100 text-sm mb-1">
                                    ❌ Mensagem não entregue
                                  </p>
                                  {message.content && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-through opacity-60 mb-2">
                                      {message.content}
                                    </p>
                                  )}
                                  {message.media_url && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">
                                      📎 Arquivo: {message.media_name || 'anexo'}
                                    </p>
                                  )}
                                  <p className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                    🚫 {message.rejection_reason || 'Violação das regras da plataforma'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Normal message */
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
                                  {/* moderating indicator hidden during send */}
                                </>
                              )}
                              {isMine && !isDeleted && (! (conversationType === 'proposal' && proposalData?.status === 'accepted')) && message.status !== 'rejected' && (
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
                          )}
                        </div>
                        
                        {/* Timestamp fora da caixa - só no hover */}
                        <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse mr-2' : 'ml-2'} ${visibleTimestamps[message.id] ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-200`}>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {(() => {
                              const messageDate = new Date(message.created_at);
                              const now = new Date();
                              const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
                              
                              // Após 24h, mostra data e hora exata
                              if (diffInHours > 24) {
                                return messageDate.toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              }
                              
                              // Antes de 24h, mostra tempo relativo
                              return formatDistanceToNow(messageDate, {
                                addSuffix: true,
                                locale: ptBR,
                              });
                            })()}
                          </span>
                          {isMine && message.status !== 'rejected' && (
                            <span>
                              {getMessageStatusIcon(message.status)}
                            </span>
                          )}
                        </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
          
          {/* Indicador de carregamento de mensagens antigas */}
          {isLoadingMore && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando mensagens anteriores...
              </div>
            </div>
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

      {/* Counter Proposal Dialog */}
      <ProposalCounterDialog
        open={showCounterDialog}
        onOpenChange={setShowCounterDialog}
        currentAmount={proposalData?.current_proposal_amount || proposalData?.budget || 0}
        onSubmit={handleSubmitCounterProposal}
        isOwner={isOwner}
      />

      {/* Proposal History Dialog */}
      <ProposalHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        proposalId={conversationId}
      />

      {/* Proposal Payment Dialog */}
      <ProposalPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        proposalId={conversationId}
        amount={proposalData?.accepted_amount || proposalData?.current_proposal_amount || proposalData?.budget || 0}
        projectTitle={projectTitle || ''}
      />

      {/* Freelancer Completion Dialog */}
      <FreelancerCompletionDialog
        open={showFreelancerCompletionDialog}
        onOpenChange={setShowFreelancerCompletionDialog}
        onConfirm={handleConfirmFreelancerCompletion}
        isLoading={isLoading}
      />

      {/* Proposal Completion Dialog */}
      <ProposalCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        freelancerAmount={proposalData?.freelancer_amount || 0}
        freelancerName={otherUser.name}
        onConfirm={handleFinalConfirmCompletion}
        isLoading={isLoading}
      />

      {/* Proposal Dispute Dialog */}
      <ProposalDisputeDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        proposalId={conversationId}
        freelancerId={proposalData?.freelancer_id || ''}
        ownerId={proposalData?.project?.profile_id || ''}
        currentProfileId={profileId}
      />
    </div>
  );
}