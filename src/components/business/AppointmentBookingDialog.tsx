import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function AppointmentBookingDialog({
  open,
  onOpenChange,
  businessId,
}: AppointmentBookingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAvailability();
      loadClientProfile();
    }
  }, [open, businessId]);

  const loadClientProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setClientProfileId(data.id);
    }
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("business_availability")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("day_of_week");

    setAvailability(data || []);
  };

  const getAvailableTimesForDate = (selectedDate: Date) => {
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.find((a) => a.day_of_week === dayOfWeek);

    if (!dayAvailability) return [];

    const times: string[] = [];
    const [startHour, startMinute] = dayAvailability.start_time.split(":").map(Number);
    const [endHour, endMinute] = dayAvailability.end_time.split(":").map(Number);

    let current = setMinutes(setHours(selectedDate, startHour), startMinute);
    const end = setMinutes(setHours(selectedDate, endHour), endMinute);

    while (isBefore(current, end)) {
      times.push(format(current, "HH:mm"));
      current = addDays(current, 0);
      current = setMinutes(current, current.getMinutes() + 60); // 1 hour slots
    }

    return times;
  };

  const isDayAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return false;

    const dayOfWeek = date.getDay();
    return availability.some((a) => a.day_of_week === dayOfWeek);
  };

  const handleSubmit = async () => {
    if (!date || !selectedTime || !serviceDescription || !clientProfileId) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("business_appointments").insert({
        business_id: businessId,
        client_profile_id: clientProfileId,
        appointment_date: format(date, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        duration_minutes: 60,
        service_description: serviceDescription,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Agendamento solicitado!",
        description: "Aguarde a confirmação da empresa",
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setSelectedTime("");
    setServiceDescription("");
    setNotes("");
  };

  const availableTimes = date ? getAvailableTimesForDate(date) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Agendar Horário
          </DialogTitle>
          <DialogDescription>
            Selecione a data e horário desejados para seu agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ptBR}
              disabled={(date) => !isDayAvailable(date)}
              className={cn("pointer-events-auto border rounded-md")}
            />
          </div>

          {/* Time Selection */}
          {date && availableTimes.length > 0 && (
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                Horário Disponível
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => setSelectedTime(time)}
                    size="sm"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {date && availableTimes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum horário disponível para esta data
            </div>
          )}

          {/* Service Description */}
          <div>
            <Label htmlFor="service">Serviço Desejado *</Label>
            <Textarea
              id="service"
              placeholder="Descreva o serviço que você deseja agendar..."
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!date || !selectedTime || !serviceDescription || loading}
              className="flex-1"
            >
              {loading ? "Enviando..." : "Solicitar Agendamento"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
