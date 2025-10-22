import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PublicUserNegotiationProps {
  userId: string;
  username: string;
}

export function PublicUserNegotiation({ 
  userId, 
  username 
}: PublicUserNegotiationProps) {
  const [isActive, setIsActive] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkNegotiationFeature();
  }, [userId]);

  const checkNegotiationFeature = async () => {
    try {
      const { data: featureData } = await supabase
        .from("user_profile_features")
        .select("is_active")
        .eq("profile_id", userId)
        .eq("feature_key", "negotiation")
        .maybeSingle();

      setIsActive(featureData?.is_active || false);
    } catch (error) {
      console.error("Error checking negotiation feature:", error);
    }
  };

  const handleStartNegotiation = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para iniciar uma negociação",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      // Buscar o profile_id do usuário logado
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado",
          variant: "destructive",
        });
        return;
      }

      // Verificar se já existe uma negociação ativa
      const { data: existingNegotiation } = await supabase
        .from('user_negotiations')
        .select('id')
        .eq('client_profile_id', userProfile.id)
        .eq('professional_profile_id', userId)
        .eq('status', 'open')
        .maybeSingle();

      if (existingNegotiation) {
        navigate(`/messages?type=user_negotiation&id=${existingNegotiation.id}`);
        return;
      }

      // Criar nova negociação
      const { data: newNegotiation, error } = await supabase
        .from('user_negotiations')
        .insert({
          client_profile_id: userProfile.id,
          professional_profile_id: userId,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Negociação iniciada!",
      });

      navigate(`/messages?type=user_negotiation&id=${newNegotiation.id}`);
    } catch (error) {
      console.error("Error starting negotiation:", error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar negociação",
        variant: "destructive",
      });
    }
  };

  if (!isActive) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-secondary/5 border-2 border-accent/20 shadow-elegant hover:shadow-glow transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent/80 shadow-lg mb-2">
            <MessageSquare className="w-7 h-7 text-accent-foreground" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
            Iniciar Negociação
          </h3>
          <p className="text-xs text-muted-foreground">
            Converse diretamente com {username}
          </p>
        </div>

        <Button 
          onClick={handleStartNegotiation}
          className="w-full relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
        >
          <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
            <MessageSquare className="w-4 h-4" />
            Negociar Agora
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Button>
      </CardContent>
    </Card>
  );
}
