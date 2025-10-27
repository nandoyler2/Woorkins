import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  service_description: string;
  notes?: string;
  client_profile_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function BusinessAppointments() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    document.title = 'Agendamentos - Woorkins';
  }, []);

  useEffect(() => {
    if (slug) {
      loadBusinessAndAppointments();
    }
  }, [slug, user]);

  const loadBusinessAndAppointments = async () => {
    try {
      setLoading(true);
      
      // Get business by slug
      const { data: business, error: businessError } = await supabase
        .from("profiles")
        .select("id")
        .eq("slug", slug)
        .eq("profile_type", "business")
        .single();

      if (businessError) throw businessError;
      if (!business) {
        toast({
          title: "Empresa não encontrada",
          variant: "destructive",
        });
        navigate("/feed");
        return;
      }

      setBusinessId(business.id);

      // Check if user is owner
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile && profile.id === business.id) {
          setIsOwner(true);
        }
      }

      // Load appointments
      await loadAppointments(business.id);
    } catch (error: any) {
      console.error("Error loading:", error);
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (bizId: string) => {
    const { data, error } = await supabase
      .from("profile_appointments")
      .select(`
        *,
        profiles:client_profile_id (
          full_name,
          avatar_url
        )
      `)
      .eq("target_profile_id", bizId)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Error loading appointments:", error);
      return;
    }

    setAppointments(data || []);
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profile_appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
      });

      if (businessId) {
        await loadAppointments(businessId);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAppointments = selectedDate
    ? appointments.filter(
        (apt) => apt.appointment_date === format(selectedDate, "yyyy-MM-dd")
      )
    : appointments;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      confirmed: { label: "Confirmado", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusMap[status] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const appointmentDates = appointments.map((apt) => parseISO(apt.appointment_date));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    navigate(`/${slug}`);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/${slug}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Perfil
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Gerenciar Agendamentos
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className={cn("pointer-events-auto")}
                modifiers={{
                  booked: appointmentDates,
                }}
                modifiersStyles={{
                  booked: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? `Agendamentos - ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`
                  : "Todos os Agendamentos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum agendamento para esta data</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredAppointments.map((appointment) => (
                    <Card key={appointment.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {appointment.profiles?.full_name || "Cliente"}
                            </span>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {appointment.appointment_time.slice(0, 5)} ({appointment.duration_minutes} min)
                          </span>
                        </div>

                        {appointment.service_description && (
                          <p className="text-sm">{appointment.service_description}</p>
                        )}

                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Obs: {appointment.notes}
                          </p>
                        )}

                        {appointment.status === "pending" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(appointment.id, "confirmed")}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        )}

                        {appointment.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(appointment.id, "completed")}
                            className="w-full"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marcar como Concluído
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
