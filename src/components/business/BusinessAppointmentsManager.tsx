import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, Clock, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

interface BusinessAppointmentsManagerProps {
  businessId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function BusinessAppointmentsManager({ businessId }: BusinessAppointmentsManagerProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [businessSlug, setBusinessSlug] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAvailabilities();
    loadBusinessSlug();
  }, [businessId]);

  const loadBusinessSlug = async () => {
    const { data } = await supabase
      .from("business_profiles")
      .select("slug")
      .eq("id", businessId)
      .single();
    
    if (data) {
      setBusinessSlug(data.slug);
    }
  };

  const loadAvailabilities = async () => {
    try {
      const { data, error } = await supabase
        .from("business_availability")
        .select("*")
        .eq("business_id", businessId)
        .order("day_of_week");

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar disponibilidade",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveAvailability = async () => {
    if (editingDay === null) return;

    setLoading(true);
    try {
      const existing = availabilities.find(a => a.day_of_week === editingDay);

      if (existing) {
        const { error } = await supabase
          .from("business_availability")
          .update({
            start_time: startTime,
            end_time: endTime,
            active: true,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_availability")
          .insert({
            business_id: businessId,
            day_of_week: editingDay,
            start_time: startTime,
            end_time: endTime,
            active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Horário salvo com sucesso!",
      });
      setEditingDay(null);
      loadAvailabilities();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar horário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("business_availability")
        .update({ active: !active })
        .eq("id", id);

      if (error) throw error;
      loadAvailabilities();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from("business_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Horário removido com sucesso!",
      });
      loadAvailabilities();
    } catch (error: any) {
      toast({
        title: "Erro ao remover horário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamento
            </CardTitle>
            <CardDescription>
              Configure sua disponibilidade para agendamentos
            </CardDescription>
          </div>
          {businessSlug && (
            <Button
              variant="outline"
              onClick={() => navigate(`/${businessSlug}/agendamentos`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Ver Agendamentos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingDay !== null && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <h3 className="font-semibold">
                {DAYS_OF_WEEK.find(d => d.value === editingDay)?.label}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Início</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="end-time">Fim</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveAvailability} disabled={loading}>
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingDay(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const availability = availabilities.find(a => a.day_of_week === day.value);
            
            return (
              <Card key={day.value} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium min-w-[100px]">{day.label}</span>
                    {availability ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {availability.start_time} - {availability.end_time}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Indisponível
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {availability && (
                      <Switch
                        checked={availability.active}
                        onCheckedChange={() =>
                          handleToggleDay(availability.id, availability.active)
                        }
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDay(day.value);
                        if (availability) {
                          setStartTime(availability.start_time);
                          setEndTime(availability.end_time);
                        } else {
                          setStartTime("09:00");
                          setEndTime("18:00");
                        }
                      }}
                    >
                      {availability ? "Editar" : <Plus className="h-4 w-4" />}
                    </Button>
                    {availability && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAvailability(availability.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
