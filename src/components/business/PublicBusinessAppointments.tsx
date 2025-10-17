import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface PublicBusinessAppointmentsProps {
  businessId: string;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function PublicBusinessAppointments({ businessId }: PublicBusinessAppointmentsProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isActive, setIsActive] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAvailability();
  }, [businessId]);

  const loadAvailability = async () => {
    // Check if feature is active
    const { data: featureData } = await supabase
      .from("business_profile_features")
      .select("is_active")
      .eq("business_id", businessId)
      .eq("feature_key", "appointments")
      .maybeSingle();

    if (!featureData?.is_active) return;
    setIsActive(true);

    // Load availability
    const { data } = await supabase
      .from("business_availability")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("day_of_week");

    setAvailability(data || []);
  };

  const handleSchedule = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para agendar",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // TODO: Implementar fluxo de agendamento
    toast({
      title: "Em breve!",
      description: "Sistema de agendamento será implementado em breve",
    });
  };

  if (!isActive) return null;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Agendamento
        </h2>
        
        {availability.length > 0 ? (
          <>
            <div className="mb-6 space-y-2">
              <h3 className="font-semibold mb-3">Horários Disponíveis:</h3>
              {availability.map((slot, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{dayNames[slot.day_of_week]}:</span>
                  <span className="text-muted-foreground">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
            <Button onClick={handleSchedule} className="w-full">
              Agendar Horário
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Entre em contato para agendar um horário
            </p>
            <Button onClick={handleSchedule}>
              Solicitar Agendamento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
