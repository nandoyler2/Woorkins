import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, FileText, DollarSign, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
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
  const [amount, setAmount] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        console.log('ProposalDialog: No user found');
        return;
      }
      
      console.log('ProposalDialog: Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('full_name, avatar_url, avatar_thumbnail_url, freelancer_level')
        .eq('user_id', user.id)
        .single();
      
      console.log('ProposalDialog: Profile data:', data);
      console.log('ProposalDialog: Profile error:', error);
      
      if (data) {
        setUserProfile(data);
      }
    };

    if (open) {
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

    if (!amount || !deliveryTime || !message) {
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
          budget: parseFloat(amount),
          delivery_days: parseInt(deliveryTime),
          message: message,
          status: 'pending',
        });

      if (error) throw error;

      setSuccess(true);
      setAmount("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 space-y-5 text-center bg-gradient-to-br from-accent/10 via-secondary/10 to-primary/10 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-full blur-xl opacity-30 animate-pulse"></div>
              <CheckCircle2 className="w-20 h-20 text-accent relative animate-scale-in" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Proposta enviada com sucesso!
              </h3>
              <p className="text-muted-foreground max-w-md">
                Agora é só aguardar a resposta do cliente.<br />
                Enquanto isso, que tal conferir outros projetos incríveis..
              </p>
            </div>
            <Button 
              onClick={() => onOpenChange(false)} 
              className="mt-4 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Explorar mais projetos
            </Button>
          </div>
        ) : (
          <>
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6 border-b">
              <DialogHeader className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <OptimizedAvatar
                    fullUrl={userProfile?.avatar_url}
                    thumbnailUrl={userProfile?.avatar_thumbnail_url}
                    fallback={getInitials(userProfile?.full_name)}
                    size="lg"
                    className="ring-2 ring-primary/20"
                  />
                  <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">
                      Enviando como {userProfile?.full_name || "Usuário"}
                    </p>
                    <Badge variant="secondary" className="mt-1 bg-gradient-to-r from-secondary/20 to-accent/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Freelancer nível {userProfile?.freelancer_level || 1}
                    </Badge>
                  </div>
                </div>

                {/* Project Info */}
                <div className="bg-gradient-to-br from-background to-muted/50 rounded-lg p-4 space-y-3 shadow-sm border">
                  <h3 className="font-bold text-lg leading-tight">{projectTitle}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{formatTimeAgo(projectCreatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full">
                      <FileText className="w-3.5 h-3.5 text-secondary" />
                      <span>{proposalsCount || 0} {proposalsCount === 1 ? 'proposta' : 'propostas'}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="w-4 h-4 text-accent" />
                    Valor da Proposta (R$) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="border-2 focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTime" className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="w-4 h-4 text-primary" />
                    Prazo de Entrega (dias) *
                  </Label>
                  <Input
                    id="deliveryTime"
                    type="number"
                    placeholder="Ex: 15"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    required
                    className="border-2 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="w-4 h-4 text-secondary" />
                  Mensagem / Descrição da Proposta *
                </Label>
                <Textarea
                  id="message"
                  placeholder="Descreva como você pretende realizar o projeto, sua experiência relevante e por que você é a melhor escolha..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                  className="border-2 focus:border-secondary transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
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
