import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
}

interface PublicBusinessJobVacanciesProps {
  businessId: string;
}

export function PublicBusinessJobVacancies({ businessId }: PublicBusinessJobVacanciesProps) {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadVacancies();
  }, [businessId]);

  const loadVacancies = async () => {
    const { data } = await supabase
      .from("business_job_vacancies")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    setVacancies(data || []);
  };

  const handleApply = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para se candidatar",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!selectedVacancy) return;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      toast({
        title: "Erro",
        description: "Perfil não encontrado",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      const { error } = await supabase
        .from("business_job_applications")
        .insert({
          vacancy_id: selectedVacancy.id,
          applicant_profile_id: profile.id,
          cover_letter: coverLetter || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Candidatura enviada!",
        description: "Você receberá uma notificação quando houver resposta",
      });
      setSelectedVacancy(null);
      setCoverLetter("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar candidatura",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  if (vacancies.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Briefcase className="h-6 w-6" />
        Vagas de Emprego
      </h2>
      <div className="space-y-4">
        {vacancies.map((vacancy) => (
          <Card key={vacancy.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold">{vacancy.title}</h3>
                  <div className="flex gap-2 mt-2">
                    {vacancy.area && (
                      <Badge variant="outline">{vacancy.area}</Badge>
                    )}
                    {vacancy.work_mode && (
                      <Badge variant="outline">{vacancy.work_mode}</Badge>
                    )}
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedVacancy(vacancy)}>
                      Candidatar-se
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Candidatar-se para {vacancy.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="cover-letter">Carta de Apresentação (opcional)</Label>
                        <Textarea
                          id="cover-letter"
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          placeholder="Conte por que você é o candidato ideal..."
                          rows={5}
                        />
                      </div>
                      <Button 
                        onClick={handleApply} 
                        disabled={applying}
                        className="w-full"
                      >
                        {applying ? "Enviando..." : "Enviar Candidatura"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <p className="text-muted-foreground mb-4 line-clamp-3">
                {vacancy.description}
              </p>

              {(vacancy.salary_min || vacancy.salary_max) && (
                <p className="text-lg font-semibold text-primary mb-2">
                  {vacancy.salary_min && `R$ ${vacancy.salary_min.toFixed(2)}`}
                  {vacancy.salary_min && vacancy.salary_max && " - "}
                  {vacancy.salary_max && `R$ ${vacancy.salary_max.toFixed(2)}`}
                </p>
              )}

              {vacancy.deadline && (
                <p className="text-sm text-muted-foreground">
                  Prazo: {new Date(vacancy.deadline).toLocaleDateString("pt-BR")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
