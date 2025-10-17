import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface Certification {
  id: string;
  title: string;
  description?: string;
  issued_by?: string;
  issued_date?: string;
  file_url: string;
  file_type?: string;
}

interface PublicBusinessCertificationsProps {
  businessId: string;
}

export function PublicBusinessCertifications({ businessId }: PublicBusinessCertificationsProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    loadCertifications();
  }, [businessId]);

  const loadCertifications = async () => {
    const { data } = await supabase
      .from("business_certifications")
      .select("*")
      .eq("business_id", businessId)
      .order("order_index");

    setCertifications(data || []);
  };

  if (certifications.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Award className="h-6 w-6" />
        Certificações e Prêmios
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {certifications.map((cert) => (
          <Dialog key={cert.id}>
            <DialogTrigger asChild>
              <div className="cursor-pointer hover:scale-105 transition-transform">
                {cert.file_type === 'pdf' ? (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border-2 hover:border-primary">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={cert.file_url}
                    alt={cert.title}
                    className="w-full aspect-square object-cover rounded-lg border-2 hover:border-primary"
                  />
                )}
                <p className="text-sm font-medium mt-2 text-center line-clamp-2">
                  {cert.title}
                </p>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{cert.title}</h3>
                  {cert.issued_by && (
                    <p className="text-muted-foreground">{cert.issued_by}</p>
                  )}
                  {cert.issued_date && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(cert.issued_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                {cert.description && (
                  <p className="text-sm">{cert.description}</p>
                )}
                {cert.file_type === 'pdf' ? (
                  <iframe
                    src={cert.file_url}
                    className="w-full h-[70vh] rounded"
                  />
                ) : (
                  <img
                    src={cert.file_url}
                    alt={cert.title}
                    className="w-full h-auto rounded"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
