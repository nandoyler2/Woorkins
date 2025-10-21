import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  area?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  deadline?: string;
  status: string;
}

interface GenericJobVacanciesManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericJobVacanciesManager({ entityType, entityId }: GenericJobVacanciesManagerProps) {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [editingVacancy, setEditingVacancy] = useState<Partial<JobVacancy> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_job_vacancies' : 'user_job_vacancies';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';

  useEffect(() => {
    loadVacancies();
  }, [entityId]);

  const loadVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idColumn, entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacancies(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vagas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveVacancy = async () => {
    if (!editingVacancy?.title || !editingVacancy?.description) {
      toast({
        title: "Erro",
        description: "Título e descrição são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const vacancyData = entityType === 'business'
        ? { business_id: entityId, title: editingVacancy.title, description: editingVacancy.description, requirements: editingVacancy.requirements || null, area: editingVacancy.area || null, work_mode: editingVacancy.work_mode || null, salary_min: editingVacancy.salary_min || null, salary_max: editingVacancy.salary_max || null, deadline: editingVacancy.deadline || null, status: editingVacancy.status || 'open' }
        : { profile_id: entityId, title: editingVacancy.title, description: editingVacancy.description, requirements: editingVacancy.requirements || null, area: editingVacancy.area || null, work_mode: editingVacancy.work_mode || null, salary_min: editingVacancy.salary_min || null, salary_max: editingVacancy.salary_max || null, deadline: editingVacancy.deadline || null, status: editingVacancy.status || 'open' };

      if (editingVacancy.id) {
        const { error } = await supabase
          .from(tableName)
          .update(vacancyData)
          .eq("id", editingVacancy.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(vacancyData as any);
        if (error) throw error;
      }

      toast({
        title: "Vaga salva",
        description: "Vaga atualizada com sucesso",
      });

      setEditingVacancy(null);
      loadVacancies();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar vaga",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!confirm("Deseja realmente remover esta vaga?")) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Vaga removida",
        description: "Vaga removida com sucesso",
      });

      loadVacancies();
    } catch (error: any) {
      toast({
        title: "Erro ao remover vaga",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Vagas de Emprego
        </CardTitle>
        <CardDescription>
          Publique vagas e gerencie candidaturas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingVacancy && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingVacancy.id ? "Editar Vaga" : "Nova Vaga"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingVacancy(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={editingVacancy.title || ""}
                  onChange={(e) =>
                    setEditingVacancy({ ...editingVacancy, title: e.target.value })
                  }
                  placeholder="Ex: Desenvolvedor Full Stack"
                />
              </div>

              <div>
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  value={editingVacancy.area || ""}
                  onChange={(e) =>
                    setEditingVacancy({ ...editingVacancy, area: e.target.value })
                  }
                  placeholder="Ex: Tecnologia"
                />
              </div>

              <div>
                <Label htmlFor="work_mode">Modelo de Trabalho</Label>
                <Select
                  value={editingVacancy.work_mode || ""}
                  onValueChange={(value) =>
                    setEditingVacancy({ ...editingVacancy, work_mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remoto</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                    <SelectItem value="on-site">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={editingVacancy.description || ""}
                  onChange={(e) =>
                    setEditingVacancy({
                      ...editingVacancy,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descreva a vaga"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requisitos</Label>
                <Textarea
                  id="requirements"
                  value={editingVacancy.requirements || ""}
                  onChange={(e) =>
                    setEditingVacancy({
                      ...editingVacancy,
                      requirements: e.target.value,
                    })
                  }
                  placeholder="Liste os requisitos"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary_min">Salário Mínimo (R$)</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={editingVacancy.salary_min || ""}
                    onChange={(e) =>
                      setEditingVacancy({
                        ...editingVacancy,
                        salary_min: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="salary_max">Salário Máximo (R$)</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={editingVacancy.salary_max || ""}
                    onChange={(e) =>
                      setEditingVacancy({
                        ...editingVacancy,
                        salary_max: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deadline">Prazo de Candidatura</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={editingVacancy.deadline || ""}
                  onChange={(e) =>
                    setEditingVacancy({
                      ...editingVacancy,
                      deadline: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveVacancy} disabled={loading}>
                  Salvar Vaga
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingVacancy(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingVacancy && (
          <Button onClick={() => setEditingVacancy({ status: 'open' })}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Vaga
          </Button>
        )}

        <div className="space-y-4">
          {vacancies.map((vacancy) => (
            <Card key={vacancy.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">{vacancy.title}</h4>
                  {vacancy.area && (
                    <p className="text-sm text-muted-foreground">{vacancy.area}</p>
                  )}
                  <p className="text-sm mt-2 line-clamp-2">{vacancy.description}</p>
                  {(vacancy.salary_min || vacancy.salary_max) && (
                    <p className="text-sm font-medium mt-2">
                      R$ {vacancy.salary_min?.toFixed(2) || "0.00"} - R${" "}
                      {vacancy.salary_max?.toFixed(2) || "0.00"}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingVacancy(vacancy)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteVacancy(vacancy.id)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {vacancies.length === 0 && !editingVacancy && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma vaga criada ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
