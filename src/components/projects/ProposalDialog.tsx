import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, FileText, DollarSign, Calendar, Sparkles, CheckCircle2, Bold, Italic, Paperclip, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  projectCreatedAt?: string;
  proposalsCount?: number;
}

export function ProposalDialog({ open, onOpenChange, projectId, projectTitle, projectCreatedAt, proposalsCount }: ProposalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amountFormatted, setAmountFormatted] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [platformFees, setPlatformFees] = useState<{ free: number; pro: number; premium: number }>({
    free: 5.0,
    pro: 3.0,
    premium: 2.0,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftKey = `proposalDraft:${user?.id || 'anon'}:${projectId}`;
  const maxChars = 3000;
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        console.log('ProposalDialog: No user found');
        return;
      }
      
      console.log('ProposalDialog: Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('full_name, username, avatar_url, avatar_thumbnail_url, freelancer_level, subscription_plan')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('ProposalDialog: Profile data received:', data);
      console.log('ProposalDialog: Profile error:', error);
      
      if (data) {
        setUserProfile(data);
      } else {
        // Fallback para dados do auth
        console.log('ProposalDialog: Using fallback data from auth user');
        setUserProfile({
          full_name: user.email?.split('@')[0] || 'Usuário',
          username: user.email?.split('@')[0] || 'usuario',
          freelancer_level: 1
        });
      }
    };

    const loadPlatformFees = async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['stripe_commission_free', 'stripe_commission_pro', 'stripe_commission_premium']);
      
      if (!error && data) {
        const fees: any = { free: 5.0, pro: 3.0, premium: 2.0 };
        data.forEach((setting) => {
          const plan = setting.setting_key.replace('stripe_commission_', '');
          const value = setting.setting_value as { percentage: number };
          fees[plan] = value.percentage || 5.0;
        });
        setPlatformFees(fees);
      }
    };

    if (open && user) {
      fetchUserProfile();
      loadPlatformFees();
      setSuccess(false);
    }
    
    // Limpa anexos quando fechar o diálogo
    if (!open) {
      setAttachments([]);
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer uma proposta",
        variant: "destructive",
      });
      return;
    }

    const budgetNumber = parseCurrencyToNumber(amountFormatted);

    if (!budgetNumber || !deliveryTime || !message.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Moderar conteúdo da proposta ANTES de enviar
      const moderationResponse = await supabase.functions.invoke('moderate-content', {
        body: { 
          content: message.trim(), 
          type: 'proposal' 
        }
      });

      if (!moderationResponse.data?.approved) {
        toast({
          title: 'Proposta não pode ser enviada',
          description: moderationResponse.data?.reason || 'Sua proposta contém informações de contato externo (WhatsApp, Instagram, telefone) ou conteúdo inapropriado. Por favor, remova essas informações e tente novamente.',
          variant: 'destructive',
          duration: 10000,
        });
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Perfil não encontrado");
      }

      const profileData = profile as any;

      // Check if there's an existing proposal from this freelancer for this project
      const { data: existingProposal } = await supabase
        .from('proposals' as any)
        .select('id')
        .eq('project_id', projectId)
        .eq('freelancer_id', profileData.id)
        .maybeSingle();

      // If there's an existing proposal, delete all its messages first
      if (existingProposal) {
        const existingId = (existingProposal as any).id;
        
        await supabase
          .from('proposal_messages' as any)
          .delete()
          .eq('proposal_id', existingId);

        await supabase
          .from('counter_proposals' as any)
          .delete()
          .eq('proposal_id', existingId);

        await supabase
          .from('proposal_status_history' as any)
          .delete()
          .eq('proposal_id', existingId);

        await supabase
          .from('proposals' as any)
          .delete()
          .eq('id', existingId);
      }

      // Create proposal
      const { data: proposalData, error } = await supabase
        .from('proposals' as any)
        .insert({
          project_id: projectId,
          freelancer_id: profileData.id,
          budget: budgetNumber,
          delivery_days: parseInt(deliveryTime),
          message: message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create first message in proposal_messages with proposal details
      if (proposalData) {
        const proposal = proposalData as any;
        const firstMessage = `${message}\n\nValor: R$ ${budgetNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nPrazo: ${deliveryTime} dias`;
        
        await supabase
          .from('proposal_messages' as any)
          .insert({
            proposal_id: proposal.id,
            sender_id: profileData.id,
            content: firstMessage,
            status: 'sent'
          });
      }

      setSuccess(true);
      localStorage.removeItem(draftKey);
      setAmountFormatted("");
      setDeliveryTime("");
      setMessage("");
      setAttachments([]);
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast({
        title: "Erro ao enviar proposta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "há alguns momentos";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch {
      return "há alguns momentos";
    }
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const number = parseInt(digits, 10) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyToNumber = (formatted: string) => {
    if (!formatted) return 0;
    const digits = formatted.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setAmountFormatted(formatted);
  };

  const handleMessageChange = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const text = el.innerText || '';
    if (text.length <= maxChars) {
      setMessage(text);
    } else {
      // Limita o texto se exceder
      el.innerText = text.slice(0, maxChars);
      setMessage(text.slice(0, maxChars));
      // Move cursor para o final
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const applyFormat = (command: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Força o foco no editor
    editor.focus();
    
    try {
      document.execCommand(command, false, undefined);
    } catch (error) {
      console.warn('Format command failed:', command, error);
    }
    
    // Atualiza o state após formatação
    setTimeout(() => {
      if (editorRef.current) {
        setMessage(editorRef.current.innerText || '');
      }
    }, 50);
  };

  const handleAttachmentClick = () => {
    const plan = userProfile?.subscription_plan || 'free';
    if (plan === 'free') {
      setShowPremiumDialog(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validar número de arquivos
    if (attachments.length + files.length > 3) {
      toast({
        title: "Limite de arquivos",
        description: "Você pode enviar no máximo 3 anexos por proposta",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho dos arquivos (5MB cada)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter(f => f.size > maxSize);
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "Cada arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setAttachments(prev => [...prev, ...files]);
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Carrega rascunho da mensagem ao abrir
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.message) {
          setMessage(draft.message);
          // Carrega o texto no editor também
          if (editorRef.current) {
            editorRef.current.innerText = draft.message;
          }
        }
      }
    } catch {}
  }, [open, draftKey]);

  // Salva apenas a mensagem em cache automaticamente
  useEffect(() => {
    if (!open || success) return;
    if (message.trim()) {
      const draft = { message };
      try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch {}
    }
  }, [message, open, success, draftKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col" hideClose>
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 px-6 space-y-4 text-center bg-gradient-to-br from-accent/10 via-secondary/10 to-primary/10 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-full blur-xl opacity-30 animate-pulse"></div>
              <CheckCircle2 className="w-16 h-16 text-accent relative animate-scale-in" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Proposta enviada com sucesso!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Agora é só aguardar a resposta do cliente.<br />
                Enquanto isso, que tal conferir outros projetos incríveis..
              </p>
            </div>
            <Button 
              onClick={() => onOpenChange(false)} 
              className="mt-2 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Explorar mais projetos
            </Button>
          </div>
        ) : (
          <>
            {/* Header simplificado */}
            <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-4 border-b shrink-0 relative">
              <DialogHeader>
                <div className="space-y-2">
                  <h3 className="font-bold text-base leading-tight text-white">{projectTitle}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 text-blue-100 bg-blue-950/50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(projectCreatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-100 bg-blue-950/50 px-2 py-1 rounded-full">
                      <FileText className="w-3 h-3" />
                      <span>{proposalsCount || 0} {proposalsCount === 1 ? 'proposta' : 'propostas'}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-3 top-3 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-full p-1.5"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-1 p-5 overflow-y-auto flex-1 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
              {/* Valores e Prazo - Grid compacto */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3 space-y-1.5">
                  <Label htmlFor="amount" className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
                    <DollarSign className="w-3.5 h-3.5" />
                    Valor da Proposta *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                    <Input
                      id="amount"
                      type="text"
                      placeholder="0,00"
                      value={amountFormatted}
                      onChange={handleAmountChange}
                      required
                      className={cn(
                        "h-9 border-blue-200 focus:border-blue-600 dark:border-blue-800 transition-colors pl-9 font-medium focus-visible:ring-0 focus-visible:ring-offset-0",
                        amountFormatted && parseCurrencyToNumber(amountFormatted) > 0 && parseCurrencyToNumber(amountFormatted) < 50 && "border-red-500 focus:border-red-600 dark:border-red-600"
                      )}
                    />
                  </div>
                  {amountFormatted && parseCurrencyToNumber(amountFormatted) > 0 && parseCurrencyToNumber(amountFormatted) < 50 && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold animate-pulse">
                      ⚠️ Valor mínimo para proposta é R$ 50,00
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="deliveryTime" className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
                    <Calendar className="w-3.5 h-3.5" />
                    Prazo (dias) *
                  </Label>
                  <Input
                    id="deliveryTime"
                    type="number"
                    placeholder="Ex: 15"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                    min="1"
                    className="h-9 border-blue-200 focus:border-blue-600 dark:border-blue-800 transition-colors font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Cálculo de taxas - apenas se valor >= 50 */}
              {amountFormatted && parseCurrencyToNumber(amountFormatted) >= 50 && (() => {
                    const plan = userProfile?.subscription_plan || 'free';
                    const feePercentage = plan === 'premium' ? platformFees.premium : plan === 'pro' ? platformFees.pro : platformFees.free;
                    const amount = parseCurrencyToNumber(amountFormatted);
                    const netAmount = amount * (1 - feePercentage / 100);
                    const netAmountPro = amount * (1 - platformFees.pro / 100);
                    const netAmountPremium = amount * (1 - platformFees.premium / 100);
                    
                    return (
                      <div className="grid grid-cols-5 gap-3">
                        {/* Valor que receberá - Lado esquerdo (3 colunas) */}
                        <div className="col-span-3 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-900 border border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Você receberá:</span>
                            <span className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                              R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                              <span className="font-bold">Plano {plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : 'Gratuito'}</span>
                            </p>
                            <p className="text-[9px] text-blue-600 dark:text-blue-400 leading-relaxed">
                              A taxa de <span className="font-semibold">{feePercentage.toFixed(1)}%</span> é referente a taxa de transação do Woorkins.
                            </p>
                            <p className="text-[9px] leading-relaxed pt-1 px-2 py-1.5 bg-green-100 dark:bg-green-950/40 rounded border border-green-300 dark:border-green-800 text-green-800 dark:text-green-200 font-medium">
                              💰 Após a confirmação do cliente, o pagamento é feito em até 24h após a solicitação de saque.
                            </p>
                          </div>
                        </div>
                        
                        {/* Comparação de planos - Lado direito (2 colunas) */}
                        {plan !== 'pro' && plan !== 'premium' && (
                          <div className="col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-2 flex flex-col h-full">
                            <p className="text-[10px] font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1 mb-2">
                              <Sparkles className="w-3 h-3" />
                              Ganhe mais com menos taxa:
                            </p>
                            <div className="space-y-0.5 flex-1 flex flex-col justify-center">
                              <div className="flex items-center justify-between p-1.5 bg-white/60 dark:bg-black/20 rounded text-xs">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Pro ({platformFees.pro.toFixed(1)}%)</span>
                                <span className="font-bold text-blue-700 dark:text-blue-400">
                                  R$ {netAmountPro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 bg-white/60 dark:bg-black/20 rounded text-xs">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Premium ({platformFees.premium.toFixed(1)}%)</span>
                                <span className="font-bold text-blue-700 dark:text-blue-400">
                                  R$ {netAmountPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full h-6 text-[10px] font-semibold bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 hover:from-blue-700 hover:via-teal-700 hover:to-blue-700 mt-2"
                              onClick={() => window.open('https://woorkins.com/planos', '_blank')}
                            >
                              Mudar de Plano
                            </Button>
                          </div>
                        )}
                        
                        {plan === 'pro' && (
                          <div className="col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-2 flex flex-col h-full">
                            <p className="text-[10px] font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1 mb-2">
                              <Sparkles className="w-3 h-3" />
                              Upgrade com menos taxa:
                            </p>
                            <div className="flex-1 flex items-center">
                              <div className="flex items-center justify-between p-1.5 bg-white/60 dark:bg-black/20 rounded text-xs w-full">
                                <span className="font-medium text-gray-600 dark:text-gray-400">Premium ({platformFees.premium.toFixed(1)}%)</span>
                                <span className="font-bold text-blue-700 dark:text-blue-400">
                                  R$ {netAmountPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full h-6 text-[10px] font-semibold bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 hover:from-blue-700 hover:via-teal-700 hover:to-blue-700 mt-2"
                              onClick={() => window.open('https://woorkins.com/planos', '_blank')}
                            >
                              Fazer Upgrade
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

              {/* Mensagem */}
              <div className="pt-4">
                <div className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-t-lg border border-blue-200 dark:border-blue-800 border-b-0">
                  <Label htmlFor="message" className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                    Mensagem / Descrição da Proposta *
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFormat('bold')}
                      className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                      title="Negrito"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFormat('italic')}
                      className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                      title="Itálico"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${message.length > maxChars * 0.9 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {message.length}/{maxChars}
                  </span>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleMessageChange}
                  className="border-x-2 border-blue-200 dark:border-blue-800 focus:border-blue-600 transition-all p-3 min-h-[140px] max-h-[220px] overflow-y-auto text-sm focus:outline-none bg-white dark:bg-slate-950"
                  style={{ whiteSpace: 'pre-wrap' }}
                  data-placeholder="Descreva sua experiência, metodologia e por que você é ideal para este projeto..."
                />
                
                {/* Seção de anexos e botões de ação na mesma linha */}
                <div className="border-2 border-t-0 border-blue-200 dark:border-blue-800 rounded-b-lg p-2 bg-blue-50/30 dark:bg-blue-950/20">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="grid grid-cols-3 gap-2 items-center">
                    {/* Coluna esquerda: botão de anexo e arquivos */}
                    <div className="flex items-center gap-2 col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAttachmentClick}
                        className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium"
                        title="Adicionar anexos (Pro/Premium)"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Envie seu portfólio ou anexo para destacar ({attachments.length}/3)
                      </Button>
                      
                      {attachments.length > 0 && (
                        <div className="flex gap-1 flex-1 overflow-x-auto">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 text-xs shrink-0">
                              <span className="max-w-[100px] truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Coluna direita: botões de ação */}
                    <div className="flex gap-2 justify-end">
                      <Button 
                        type="submit" 
                        disabled={loading || (amountFormatted && parseCurrencyToNumber(amountFormatted) < 50)}
                        size="sm"
                        className="bg-green-700 hover:bg-green-800 text-white shadow-lg hover:shadow-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            Enviar Proposta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>

      {/* Dialog para usuários free */}
      <AlertDialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Recurso Pro/Premium
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>O envio de anexos em propostas é um recurso exclusivo para usuários Pro e Premium.</p>
              <p className="font-semibold text-foreground">Com um plano premium você pode:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Enviar até 3 anexos por proposta</li>
                <li>Impressionar clientes com portfólio anexado</li>
                <li>Taxas de transação reduzidas e muito mais</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowPremiumDialog(false)}>
              Ver depois
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 hover:from-blue-700 hover:via-teal-700 hover:to-blue-700"
              onClick={() => {
                window.open('https://woorkins.com/planos', '_blank');
                setShowPremiumDialog(false);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
