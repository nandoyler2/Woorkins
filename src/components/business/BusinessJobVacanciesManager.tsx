import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, Trash2, Edit, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  area?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  requirements?: string;
  deadline?: string;
  status: string;
  created_at: string;
}

interface BusinessJobVacanciesManagerProps {
  businessId: string;
}

export function BusinessJobVacanciesManager({ businessId }: BusinessJobVacanciesManagerProps) {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [editingVacancy, setEditingVacancy] = useState<Partial<JobVacancy> | null>(null);
  const [loading, setLoading] = useState(false);
  const [applicationsCount, setApplicationsCount] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadVacancies();
  }, [businessId]);

  const loadVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_job_vacancies")
        .select("*")
        .eq("target_profile_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacancies(data || []);

      // Load applications count for each vacancy
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        for (const vacancy of data) {
          const { count } = await supabase
            .from("profile_job_applications")
            .select("*", { count: "exact", head: true })
            .eq("vacancy_id", vacancy.id);
          counts[vacancy.id] = count || 0;
        }
        setApplicationsCount(counts);
      }
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
        title: "Campos obrigatórios",
        description: "Título e descrição são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingVacancy.id) {
        const { error } = await supabase
          .from("profile_job_vacancies")
          .update({
            title: editingVacancy.title,
            description: editingVacancy.description,
            area: editingVacancy.area,
            work_mode: editingVacancy.work_mode,
            salary_min: editingVacancy.salary_min,
            salary_max: editingVacancy.salary_max,
            requirements: editingVacancy.requirements,
            deadline: editingVacancy.deadline,
            status: editingVacancy.status || "open",
          })
          .eq("id", editingVacancy.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_job_vacancies")
          .insert({
            target_profile_id: businessId,
            title: editingVacancy.title,
            description: editingVacancy.description,
            area: editingVacancy.area,
            work_mode: editingVacancy.work_mode,
            salary_min: editingVacancy.salary_min,
            salary_max: editingVacancy.salary_max,
            requirements: editingVacancy.requirements,
            deadline: editingVacancy.deadline,
            status: "open",
          });

        if (error) throw error;
      }

      toast({
        title: "Vaga salva com sucesso!",
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
    try {
      const { error } = await supabase
        .from("profile_job_vacancies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Vaga removida com sucesso!",
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      open: "default",
      closed: "secondary",
      filled: "destructive",
    };

    const labels: Record<string, string> = {
      open: "Aberta",
      closed: "Fechada",
      filled: "Preenchida",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Vagas de Emprego
          </CardTitle>
          <CardDescription>
            Publique e gerencie vagas de emprego
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingVacancy && (
            <Card className="p-4 border-primary">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vac-title">Título *</Label>
                  <Input
                    id="vac-title"
                    value={editingVacancy.title || ""}
                    onChange={(e) =>
                      setEditingVacancy({ ...editingVacancy, title: e.target.value })
                    }
                    placeholder="Ex: Desenvolvedor Full Stack"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vac-area">Área</Label>
                    <Input
                      id="vac-area"
                      value={editingVacancy.area || ""}
                      onChange={(e) =>
                        setEditingVacancy({ ...editingVacancy, area: e.target.value })
                      }
                      placeholder="Ex: Tecnologia"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vac-mode">Modalidade</Label>
                    <Select
                      value={editingVacancy.work_mode || ""}
                      onValueChange={(value) =>
                        setEditingVacancy({ ...editingVacancy, work_mode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="remoto">Remoto</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vac-description">Descrição *</Label>
                  <Textarea
                    id="vac-description"
                    value={editingVacancy.description || ""}
                    onChange={(e) =>
                      setEditingVacancy({ ...editingVacancy, description: e.target.value })
                    }
                    placeholder="Descreva a vaga"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="vac-requirements">Requisitos</Label>
                  <Textarea
                    id="vac-requirements"
                    value={editingVacancy.requirements || ""}
                    onChange={(e) =>
                      setEditingVacancy({ ...editingVacancy, requirements: e.target.value })
                    }
                    placeholder="Liste os requisitos"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vac-salary-min">Salário Mínimo (R$)</Label>
                    <Input
                      id="vac-salary-min"
                      type="number"
                      step="0.01"
                      value={editingVacancy.salary_min || ""}
                      onChange={(e) =>
                        setEditingVacancy({
                          ...editingVacancy,
                          salary_min: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="vac-salary-max">Salário Máximo (R$)</Label>
                    <Input
                      id="vac-salary-max"
                      type="number"
                      step="0.01"
                      value={editingVacancy.salary_max || ""}
                      onChange={(e) =>
                        setEditingVacancy({
                          ...editingVacancy,
                          salary_max: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vac-deadline">Prazo de Inscrição</Label>
                  <Input
                    id="vac-deadline"
                    type="date"
                    value={editingVacancy.deadline || ""}
                    onChange={(e) =>
                      setEditingVacancy({ ...editingVacancy, deadline: e.target.value })
                    }
                  />
                </div>

                {editingVacancy.id && (
                  <div>
                    <Label htmlFor="vac-status">Status</Label>
                    <Select
                      value={editingVacancy.status || "open"}
                      onValueChange={(value) =>
                        setEditingVacancy({ ...editingVacancy, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberta</SelectItem>
                        <SelectItem value="closed">Fechada</SelectItem>
                        <SelectItem value="filled">Preenchida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSaveVacancy} disabled={loading}>
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingVacancy(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!editingVacancy && (
            <Button
              onClick={() => setEditingVacancy({ status: "open" })}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vaga
            </Button>
          )}

          <div className="space-y-4">
            {vacancies.map((vacancy) => (
              <Card key={vacancy.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{vacancy.title}</h3>
                      <div className="flex gap-2 mt-1">
                        {vacancy.area && (
                          <Badge variant="outline">{vacancy.area}</Badge>
                        )}
                        {vacancy.work_mode && (
                          <Badge variant="outline">{vacancy.work_mode}</Badge>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(vacancy.status)}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {vacancy.description}
                  </p>

                  {(vacancy.salary_min || vacancy.salary_max) && (
                    <p className="text-sm font-medium text-primary mb-2">
                      {vacancy.salary_min && `R$ ${vacancy.salary_min.toFixed(2)}`}
                      {vacancy.salary_min && vacancy.salary_max && " - "}
                      {vacancy.salary_max && `R$ ${vacancy.salary_max.toFixed(2)}`}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{applicationsCount[vacancy.id] || 0} candidatos</span>
                    </div>
                    {vacancy.deadline && (
                      <span>
                        Prazo: {new Date(vacancy.deadline).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingVacancy(vacancy)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteVacancy(vacancy.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
