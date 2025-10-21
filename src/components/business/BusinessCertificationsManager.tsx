import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, Trash2, FileText } from "lucide-react";
import { MediaUpload } from "@/components/MediaUpload";

interface Certification {
  id: string;
  title: string;
  description?: string;
  issued_by?: string;
  issued_date?: string;
  file_url: string;
  file_type?: string;
  order_index: number;
}

interface BusinessCertificationsManagerProps {
  businessId: string;
}

export function BusinessCertificationsManager({ businessId }: BusinessCertificationsManagerProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [editingCert, setEditingCert] = useState<Partial<Certification> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCertifications();
  }, [businessId]);

  const loadCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from("business_certifications")
        .select("*")
        .eq("business_id", businessId)
        .order("order_index");

      if (error) throw error;
      setCertifications(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar certificações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveCertification = async () => {
    if (!editingCert?.title || !editingCert?.file_url) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e arquivo são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingCert.id) {
        const { error } = await supabase
          .from("business_certifications")
          .update({
            title: editingCert.title,
            description: editingCert.description,
            issued_by: editingCert.issued_by,
            issued_date: editingCert.issued_date,
            file_url: editingCert.file_url,
            file_type: editingCert.file_type,
          })
          .eq("id", editingCert.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_certifications")
          .insert({
            business_id: businessId,
            title: editingCert.title,
            description: editingCert.description,
            issued_by: editingCert.issued_by,
            issued_date: editingCert.issued_date,
            file_url: editingCert.file_url,
            file_type: editingCert.file_type,
            order_index: certifications.length,
          });

        if (error) throw error;
      }

      toast({
        title: "Certificação salva com sucesso!",
      });
      setEditingCert(null);
      loadCertifications();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar certificação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("business_certifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Certificação removida com sucesso!",
      });
      loadCertifications();
    } catch (error: any) {
      toast({
        title: "Erro ao remover certificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificações e Prêmios
          </CardTitle>
          <CardDescription>
            Adicione certificados, diplomas e prêmios conquistados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingCert && (
            <Card className="p-4 border-primary">
              <div className="space-y-4">
                <div>
                  <Label>Arquivo (Imagem ou PDF) *</Label>
                  <MediaUpload
                    onUpload={(url, type) => {
                      const fileType = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
                      setEditingCert({ ...editingCert, file_url: url, file_type: fileType });
                    }}
                    accept="image/*,application/pdf"
                    maxSizeMB={10}
                    folder={businessId}
                  />
                </div>

                <div>
                  <Label htmlFor="cert-title">Título *</Label>
                  <Input
                    id="cert-title"
                    value={editingCert.title || ""}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, title: e.target.value })
                    }
                    placeholder="Nome do certificado"
                  />
                </div>

                <div>
                  <Label htmlFor="cert-issued-by">Emitido por</Label>
                  <Input
                    id="cert-issued-by"
                    value={editingCert.issued_by || ""}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, issued_by: e.target.value })
                    }
                    placeholder="Instituição emissora"
                  />
                </div>

                <div>
                  <Label htmlFor="cert-date">Data de emissão</Label>
                  <Input
                    id="cert-date"
                    type="date"
                    value={editingCert.issued_date || ""}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, issued_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="cert-description">Descrição</Label>
                  <Textarea
                    id="cert-description"
                    value={editingCert.description || ""}
                    onChange={(e) =>
                      setEditingCert({ ...editingCert, description: e.target.value })
                    }
                    placeholder="Descreva o certificado"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveCertification} disabled={loading}>
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingCert(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!editingCert && (
            <Button
              onClick={() => setEditingCert({})}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Certificação
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert) => (
              <Card key={cert.id} className="overflow-hidden">
                {cert.file_type === 'pdf' ? (
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={cert.file_url}
                    alt={cert.title}
                    className="w-full h-40 object-cover"
                  />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold">{cert.title}</h3>
                  {cert.issued_by && (
                    <p className="text-sm text-muted-foreground">{cert.issued_by}</p>
                  )}
                  {cert.issued_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(cert.issued_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCert(cert)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCertification(cert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
