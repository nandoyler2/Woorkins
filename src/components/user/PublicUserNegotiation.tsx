import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
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

  const startNegotiation = async () => {
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
      const { data: existing } = await supabase
        .from('user_negotiations')
        .select('id')
        .eq('client_profile_id', userProfile.id)
        .eq('professional_profile_id', userId)
        .in('status', ['open', 'accepted', 'paid'])
        .maybeSingle();

      if (existing) {
        navigate(`/messages?type=user_negotiation&id=${existing.id}`);
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
        title: "Negociação iniciada!",
        description: `Comece a conversar com ${username}`,
      });

      navigate(`/messages?type=user_negotiation&id=${newNegotiation.id}`);
    } catch (error) {
      console.error("Error starting negotiation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a negociação",
        variant: "destructive",
      });
    }
  };

  if (!isActive) return null;

  return (
    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/20">
      <CardContent className="p-6">
        <h2 className="font-bold mb-2">Negociação Disponível</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Este profissional aceita negociações diretas na plataforma
        </p>
        <Button 
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={startNegotiation}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Iniciar Conversa
        </Button>
      </CardContent>
    </Card>
  );
}
