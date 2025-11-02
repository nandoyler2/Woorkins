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
import { Clock, FileText } from "lucide-react";

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

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles' as any)
        .select('full_name, avatar_url, avatar_thumbnail_url, freelancer_level')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    };

    if (open) {
      fetchUserProfile();
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

      toast({
        title: "Sucesso!",
        description: "Sua proposta foi enviada com sucesso",
      });

      onOpenChange(false);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <OptimizedAvatar
              fullUrl={userProfile?.avatar_url}
              thumbnailUrl={userProfile?.avatar_thumbnail_url}
              fallback={getInitials(userProfile?.full_name)}
              size="md"
            />
            <div>
              <p className="text-sm font-medium">
                Enviando como {userProfile?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground">
                Freelancer nível {userProfile?.freelancer_level || 1}
              </p>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-base">{projectTitle}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatTimeAgo(projectCreatedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{proposalsCount || 0} {proposalsCount === 1 ? 'proposta' : 'propostas'}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor da Proposta (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Ex: 1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Prazo de Entrega (dias) *</Label>
              <Input
                id="deliveryTime"
                type="number"
                placeholder="Ex: 15"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem / Descrição da Proposta *</Label>
            <Textarea
              id="message"
              placeholder="Descreva como você pretende realizar o projeto, sua experiência relevante e por que você é a melhor escolha..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Proposta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
