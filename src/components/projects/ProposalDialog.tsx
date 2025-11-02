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
import { Clock, FileText, DollarSign, Calendar, Sparkles, CheckCircle2, Bold, Italic, List, ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const editorRef = useRef<HTMLDivElement>(null);
  const draftKey = `proposalDraft:${user?.id || 'anon'}:${projectId}`;
  const maxChars = 3000;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        console.log('ProposalDialog: No user found');
        return;
      }
      
      console.log('ProposalDialog: Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('full_name, username, avatar_url, avatar_thumbnail_url, freelancer_level')
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

    if (open && user) {
      fetchUserProfile();
      setSuccess(false);
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

      // Create proposal
      const { error } = await supabase
        .from('proposals' as any)
        .insert({
          project_id: projectId,
          freelancer_id: profileData.id,
          budget: budgetNumber,
          delivery_days: parseInt(deliveryTime),
          message: message,
          status: 'pending',
        });

      if (error) throw error;

      setSuccess(true);
      localStorage.removeItem(draftKey);
      setAmountFormatted("");
      setDeliveryTime("");
      setMessage("");
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
    document.execCommand(command, false);
    editorRef.current?.focus();
    // Atualiza o state após formatação
    setTimeout(() => {
      if (editorRef.current) {
        setMessage(editorRef.current.innerText || '');
      }
    }, 0);
  };

  // Carrega rascunho ao abrir
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.amountFormatted) setAmountFormatted(draft.amountFormatted);
        if (draft.deliveryTime) setDeliveryTime(draft.deliveryTime);
        if (draft.message) {
          setMessage(draft.message);
          // Carrega o texto no editor também
          if (editorRef.current) {
            editorRef.current.innerText = draft.message;
          }
        }
      }
    } catch {}
  }, [open]);

  // Salva rascunho automaticamente
  useEffect(() => {
    if (!open || success) return;
    const draft = { amountFormatted, deliveryTime, message };
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch {}
  }, [amountFormatted, deliveryTime, message, open, success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
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
            {/* Header compacto */}
            <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-4 border-b shrink-0">
              <DialogHeader className="space-y-3">
                {/* User Info */}
                <div className="flex items-center gap-2.5 bg-background/80 backdrop-blur-sm rounded-lg p-2.5 shadow-sm">
                  <OptimizedAvatar
                    fullUrl={userProfile?.avatar_url}
                    thumbnailUrl={userProfile?.avatar_thumbnail_url}
                    fallback={getInitials(userProfile?.full_name || userProfile?.username)}
                    size="md"
                    className="ring-2 ring-primary/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      Enviando como {userProfile?.full_name || userProfile?.username || "Usuário"}
                    </p>
                    <Badge variant="secondary" className="mt-0.5 bg-gradient-to-r from-secondary/20 to-accent/20 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Freelancer nível {userProfile?.freelancer_level || 1}
                    </Badge>
                  </div>
                </div>

                {/* Project Info */}
                <div className="bg-gradient-to-br from-background to-muted/50 rounded-lg p-3 space-y-2 shadow-sm border">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2">{projectTitle}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground bg-background/50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{formatTimeAgo(projectCreatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground bg-background/50 px-2 py-1 rounded-full">
                      <FileText className="w-3 h-3 text-secondary" />
                      <span>{proposalsCount || 0} {proposalsCount === 1 ? 'proposta' : 'propostas'}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="flex items-center gap-1.5 text-xs font-semibold">
                    <DollarSign className="w-3.5 h-3.5 text-accent" />
                    Valor da Proposta (R$) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      id="amount"
                      type="text"
                      placeholder="0,00"
                      value={amountFormatted}
                      onChange={handleAmountChange}
                      required
                      className="border-2 focus:border-accent transition-colors pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deliveryTime" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Prazo de Entrega (dias) *
                  </Label>
                  <Input
                    id="deliveryTime"
                    type="number"
                    placeholder="Ex: 15"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                    min="1"
                    className="border-2 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message" className="flex items-center gap-1.5 text-xs font-semibold">
                    <FileText className="w-3.5 h-3.5 text-secondary" />
                    Mensagem / Descrição da Proposta *
                  </Label>
                  <span className={`text-xs ${message.length > maxChars * 0.9 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {message.length}/{maxChars}
                  </span>
                </div>
                <div className="flex gap-1 mb-2 p-2 bg-muted/50 rounded-lg border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormat('bold')}
                    className="h-7 w-7 p-0"
                    title="Negrito"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormat('italic')}
                    className="h-7 w-7 p-0"
                    title="Itálico"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormat('insertUnorderedList')}
                    className="h-7 w-7 p-0"
                    title="Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormat('insertOrderedList')}
                    className="h-7 w-7 p-0"
                    title="Lista numerada"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleMessageChange}
                  className="border-2 focus:border-secondary transition-colors rounded-md p-3 min-h-[120px] max-h-[200px] overflow-y-auto text-sm focus:outline-none bg-background"
                  style={{ whiteSpace: 'pre-wrap' }}
                  data-placeholder="Descreva como você pretende realizar o projeto, sua experiência relevante e por que você é a melhor escolha..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all"
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
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
