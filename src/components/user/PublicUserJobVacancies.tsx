import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Briefcase } from "lucide-react";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  area: string | null;
  work_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

interface PublicUserJobVacanciesProps {
  userId: string;
}

export function PublicUserJobVacancies({ userId }: PublicUserJobVacanciesProps) {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVacancies();
  }, [userId]);

  const loadVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from("user_job_vacancies")
        .select("*")
        .eq("profile_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacancies(data || []);
    } catch (error) {
      console.error("Error loading vacancies:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || vacancies.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Vagas Disponíveis</h2>
      {vacancies.map((vacancy) => (
        <Card key={vacancy.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold">{vacancy.title}</h3>
              {vacancy.area && (
                <Badge variant="secondary">{vacancy.area}</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {vacancy.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {vacancy.work_mode && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{vacancy.work_mode}</span>
                </div>
              )}
              
              {(vacancy.salary_min || vacancy.salary_max) && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {vacancy.salary_min && vacancy.salary_max
                      ? `R$ ${vacancy.salary_min.toLocaleString()} - R$ ${vacancy.salary_max.toLocaleString()}`
                      : vacancy.salary_min
                      ? `A partir de R$ ${vacancy.salary_min.toLocaleString()}`
                      : `Até R$ ${vacancy.salary_max?.toLocaleString()}`}
                  </span>
                </div>
              )}

              {vacancy.deadline && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    Até {new Date(vacancy.deadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>

            {vacancy.requirements && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-sm mb-2">Requisitos:</h4>
                <p className="text-sm text-muted-foreground">{vacancy.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
