import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock } from 'lucide-react';

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

interface PublicJobVacanciesProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicJobVacancies({ entityType, entityId }: PublicJobVacanciesProps) {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);

  useEffect(() => {
    loadVacancies();
  }, [entityId, entityType]);

  const loadVacancies = async () => {
    const tableName = entityType === 'user' ? 'user_job_vacancies' : 'business_job_vacancies';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, entityId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (data) {
      setVacancies(data as unknown as JobVacancy[]);
    }
  };

  if (vacancies.length === 0) return null;

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Hoje';
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
    return `${Math.floor(diffInDays / 30)} meses atrás`;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Vagas de Emprego
        </CardTitle>
        <CardDescription>Confira as oportunidades disponíveis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vacancies.map((vacancy) => (
            <Card key={vacancy.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
              <div>
                    <h4 className="font-semibold text-lg">{vacancy.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      {vacancy.area && (
                        <Badge variant="secondary">{vacancy.area}</Badge>
                      )}
                      {vacancy.work_mode && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {vacancy.work_mode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeAgo(vacancy.created_at)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {vacancy.description}
                </p>
                
                <div className="flex items-center justify-between">
                  {(vacancy.salary_min || vacancy.salary_max) && (
                    <span className="text-sm font-semibold text-primary">
                      {vacancy.salary_min && vacancy.salary_max
                        ? `R$ ${vacancy.salary_min.toLocaleString()} - R$ ${vacancy.salary_max.toLocaleString()}`
                        : vacancy.salary_min
                        ? `A partir de R$ ${vacancy.salary_min.toLocaleString()}`
                        : `Até R$ ${vacancy.salary_max?.toLocaleString()}`}
                    </span>
                  )}
                  <Button size="sm">Ver Detalhes</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
