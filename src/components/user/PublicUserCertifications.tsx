import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Certification {
  id: string;
  title: string;
  issued_by: string | null;
  issued_date: string | null;
  file_url: string;
  file_type: string | null;
}

interface PublicUserCertificationsProps {
  userId: string;
}

export function PublicUserCertifications({ userId }: PublicUserCertificationsProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    loadCertifications();
  }, [userId]);

  const loadCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from("user_certifications")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setCertifications(data);
      }
    } catch (error) {
      console.error("Error loading certifications:", error);
    }
  };

  if (certifications.length === 0) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Certificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{cert.title}</h4>
                {cert.issued_by && (
                  <p className="text-xs text-muted-foreground mb-1">{cert.issued_by}</p>
                )}
                {cert.issued_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(cert.issued_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(cert.file_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
