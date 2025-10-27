import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

interface GenericAppointmentsManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

const DAYS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function GenericAppointmentsManager({ entityType, entityId }: GenericAppointmentsManagerProps) {
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_availability' : 'user_availability';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';

  useEffect(() => {
    loadAvailability();
  }, [entityId]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(idColumn, entityId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAvailability((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar disponibilidade",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddSlot = async (dayOfWeek: number) => {
    setLoading(true);
    try {
      const slotData = entityType === 'business' 
        ? { business_id: entityId, day_of_week: dayOfWeek, start_time: "09:00", end_time: "18:00", active: true }
        : { profile_id: entityId, day_of_week: dayOfWeek, start_time: "09:00", end_time: "18:00", active: true };
      
      const { error } = await supabase.from(tableName).insert(slotData as any);

      if (error) throw error;

      toast({
        title: "Horário adicionado",
        description: "Horário de disponibilidade adicionado com sucesso",
      });

      loadAvailability();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar horário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Deseja realmente remover este horário?")) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Horário removido",
        description: "Horário de disponibilidade removido",
      });

      loadAvailability();
    } catch (error: any) {
      toast({
        title: "Erro ao remover horário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateSlot = async (
    id: string,
    field: "start_time" | "end_time",
    value: string
  ) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      loadAvailability();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar horário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const groupedByDay = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sistema de Agendamento
        </CardTitle>
        <CardDescription>
          Configure sua disponibilidade para receber agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map((dayName, dayIndex) => (
          <div key={dayIndex} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{dayName}</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddSlot(dayIndex)}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Horário
              </Button>
            </div>

            {groupedByDay[dayIndex]?.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 bg-muted/50 p-3 rounded"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Início</Label>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) =>
                        handleUpdateSlot(slot.id, "start_time", e.target.value)
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) =>
                        handleUpdateSlot(slot.id, "end_time", e.target.value)
                      }
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteSlot(slot.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {!groupedByDay[dayIndex]?.length && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum horário configurado
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
