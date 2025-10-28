import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';

interface Certification {
  id: string;
  title: string;
  issued_by: string | null;
  issued_date: string | null;
  file_url: string;
  file_type: string | null;
}

interface PublicCertificationsProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicCertifications({ entityType, entityId }: PublicCertificationsProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    loadCertifications();
  }, [entityId, entityType]);

  const loadCertifications = async () => {
    const tableName = entityType === 'user' ? 'user_certifications' : 'business_certifications';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, entityId)
      .order('created_at', { ascending: false });

    if (data) {
      setCertifications(data as unknown as Certification[]);
    }
  };

  if (certifications.length === 0) return null;

  return (
    <Card className="mb-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-l-4 border-l-yellow-500 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" />
          Certificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="flex items-start gap-3 p-4 rounded-lg border-l-2 border-l-yellow-500 bg-gradient-to-r from-yellow-500/5 to-transparent hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
            >
              <Award className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
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
                variant="outline"
                onClick={() => window.open(cert.file_url, '_blank')}
                className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30 hover:bg-yellow-500/20"
              >
                Ver
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
