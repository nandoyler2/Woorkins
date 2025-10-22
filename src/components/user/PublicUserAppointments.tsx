import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useAuthAction } from "@/contexts/AuthActionContext";

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
  const navigate = useNavigate();
  const { requireAuth } = useAuthAction();

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
    requireAuth(() => {
      navigate(`/${username}/agendamento`);
    });
  };

  if (!isActive || availability.length === 0) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-2 border-primary/20 shadow-elegant hover:shadow-glow transition-all duration-300">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-2 animate-pulse-subtle">
            <Calendar className="w-7 h-7 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Agende um Horário
          </h3>
          <p className="text-xs text-muted-foreground">
            Disponível nos seguintes horários
          </p>
        </div>

        {/* Availability Grid */}
        <div className="space-y-2.5">
          {availability.map((slot, idx) => (
            <div 
              key={idx} 
              className="group relative flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/30 hover:bg-background/80 transition-all duration-200"
            >
              <div className="flex-shrink-0 w-1 h-10 bg-gradient-to-b from-primary to-secondary rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">
                  {dayNames[slot.day_of_week]}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                </div>
              </div>
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleBooking}
          className="w-full relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
        >
          <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
            <Calendar className="w-4 h-4" />
            Agendar Agora
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Button>
      </CardContent>
    </Card>
  );
}
