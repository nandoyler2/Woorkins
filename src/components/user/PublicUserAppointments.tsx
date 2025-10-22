import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface PublicUserAppointmentsProps {
  userId: string;
  username: string;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function PublicUserAppointments({ userId, username }: PublicUserAppointmentsProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isActive, setIsActive] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailability();
  }, [userId]);

  const loadAvailability = async () => {
    try {
      // Check if feature is active
      const { data: featureData } = await supabase
        .from("user_profile_features")
        .select("is_active")
        .eq("profile_id", userId)
        .eq("feature_key", "appointments")
        .maybeSingle();

      if (!featureData?.is_active) return;
      
      setIsActive(true);

      const { data, error } = await supabase
        .from("user_availability")
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true)
        .order("day_of_week", { ascending: true });

      if (error) throw error;
      if (data) setAvailability(data);
    } catch (error) {
      console.error("Error loading availability:", error);
    }
  };

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para agendar um horário",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Em breve",
      description: "Sistema de agendamento em desenvolvimento",
    });
  };

  if (!isActive || availability.length === 0) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Agende um Horário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {availability.map((slot, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div className="font-medium w-20">{dayNames[slot.day_of_week]}</div>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-muted-foreground">
                {slot.start_time} - {slot.end_time}
              </div>
            </div>
          ))}
        </div>
        <Button 
          onClick={handleBooking}
          className="w-full"
        >
          Agendar Horário
        </Button>
      </CardContent>
    </Card>
  );
}
