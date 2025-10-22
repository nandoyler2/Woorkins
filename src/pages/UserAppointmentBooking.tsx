import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function UserAppointmentBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileAndAvailability();
  }, [slug]);

  useEffect(() => {
    if (selectedDate && availability.length > 0) {
      generateAvailableTimes();
    }
  }, [selectedDate, availability]);

  const loadProfileAndAvailability = async () => {
    if (!slug) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('username', slug)
        .single();

      if (!profileData) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setProfile(profileData);

      const { data: availabilityData } = await supabase
        .from("user_availability")
        .select("*")
        .eq("profile_id", profileData.id)
        .eq("active", true)
        .order("day_of_week", { ascending: true });

      if (availabilityData) {
        setAvailability(availabilityData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar informações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableTimes = () => {
    if (!selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

    if (!dayAvailability) {
      setAvailableTimes([]);
      return;
    }

    const times: string[] = [];
    const [startHour, startMinute] = dayAvailability.start_time.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.end_time.split(':').map(Number);

    let currentTime = setMinutes(setHours(selectedDate, startHour), startMinute);
    const endTime = setMinutes(setHours(selectedDate, endHour), endMinute);

    while (currentTime < endTime) {
      times.push(format(currentTime, 'HH:mm'));
      currentTime = addDays(currentTime, 0);
      currentTime = setMinutes(currentTime, currentTime.getMinutes() + 30);
    }

    setAvailableTimes(times);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({
        title: "Erro",
        description: "Selecione uma data e horário",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Em breve",
      description: "Sistema de agendamento em desenvolvimento. Em breve você poderá finalizar seu agendamento!",
    });
  };

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.some(a => a.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/${slug}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao perfil
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-primary" />
              Agendar Horário com {profile.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Disponibilidade */}
            <div>
              <h3 className="font-semibold mb-3">Dias e Horários Disponíveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availability.map((slot, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <div className="flex-shrink-0 w-1 h-10 bg-gradient-to-b from-primary to-secondary rounded-full" />
                    <div>
                      <div className="font-semibold text-sm">
                        {dayNames[slot.day_of_week]}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendário */}
            <div>
              <h3 className="font-semibold mb-3">Selecione uma Data</h3>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || !isDateAvailable(date)}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>
            </div>

            {/* Horários Disponíveis */}
            {selectedDate && (
              <div>
                <h3 className="font-semibold mb-3">
                  Horários Disponíveis para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {availableTimes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum horário disponível para esta data
                  </p>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => setSelectedTime(time)}
                        className="w-full"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botão de Confirmação */}
            {selectedDate && selectedTime && (
              <div className="pt-4 border-t">
                <div className="bg-primary/5 p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-1">Resumo do Agendamento:</p>
                  <p className="text-sm">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                  </p>
                </div>
                <Button onClick={handleBooking} className="w-full" size="lg">
                  Confirmar Agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
