import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, Trash2, X, FileText } from "lucide-react";
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

interface GenericCertificationsManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericCertificationsManager({ entityType, entityId }: GenericCertificationsManagerProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [editingCert, setEditingCert] = useState<Partial<Certification> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_certifications' : 'user_certifications';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';
  const storageBucket = entityType === 'business' ? 'business-media' : 'portfolio';

  useEffect(() => {
    loadCertifications();
  }, [entityId]);

  const loadCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idColumn, entityId)
        .order("order_index", { ascending: true });

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
        title: "Erro",
        description: "Título e arquivo são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const certData = {
        [idColumn]: entityId,
        title: editingCert.title,
        description: editingCert.description || null,
        issued_by: editingCert.issued_by || null,
        issued_date: editingCert.issued_date || null,
        file_url: editingCert.file_url,
        file_type: editingCert.file_type || 'image',
        order_index: editingCert.order_index ?? certifications.length,
      };

      if (editingCert.id) {
        const { error } = await supabase
          .from(tableName)
          .update(certData)
          .eq("id", editingCert.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(certData as any);
        if (error) throw error;
      }

      toast({
        title: "Certificação salva",
        description: "Certificação atualizada com sucesso",
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
    if (!confirm("Deseja realmente remover esta certificação?")) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Certificação removida",
        description: "Certificação removida com sucesso",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certificações e Prêmios
        </CardTitle>
        <CardDescription>
          Adicione suas certificações, diplomas e prêmios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingCert && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingCert.id ? "Editar Certificação" : "Nova Certificação"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCert(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={editingCert.title || ""}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, title: e.target.value })
                  }
                  placeholder="Nome da certificação"
                />
              </div>

              <div>
                <Label htmlFor="issued-by">Emissor</Label>
                <Input
                  id="issued-by"
                  value={editingCert.issued_by || ""}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, issued_by: e.target.value })
                  }
                  placeholder="Instituição emissora"
                />
              </div>

              <div>
                <Label htmlFor="issued-date">Data de Emissão</Label>
                <Input
                  id="issued-date"
                  type="date"
                  value={editingCert.issued_date || ""}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, issued_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={editingCert.description || ""}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, description: e.target.value })
                  }
                  placeholder="Detalhes da certificação"
                  rows={3}
                />
              </div>

              <div>
                <Label>Arquivo (Imagem ou PDF) *</Label>
                <MediaUpload
                  currentMediaUrl={editingCert.file_url}
                  currentMediaType={editingCert.file_type}
                  onMediaUpload={(url, type) =>
                    setEditingCert({ ...editingCert, file_url: url, file_type: type })
                  }
                  bucket={storageBucket}
                  path={`${entityId}/certifications`}
                  acceptedTypes={["image/*", "application/pdf"]}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCertification} disabled={loading}>
                  Salvar Certificação
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingCert(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingCert && (
          <Button onClick={() => setEditingCert({})}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Certificação
          </Button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert) => (
            <Card key={cert.id} className="p-4">
              <div className="flex gap-3">
                {cert.file_type === 'image' ? (
                  <img
                    src={cert.file_url}
                    alt={cert.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-muted rounded">
                    <FileText className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{cert.title}</h4>
                  {cert.issued_by && (
                    <p className="text-sm text-muted-foreground">{cert.issued_by}</p>
                  )}
                  {cert.issued_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(cert.issued_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCert(cert)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCertification(cert.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {certifications.length === 0 && !editingCert && (
            <p className="text-center text-muted-foreground py-8 col-span-2">
              Nenhuma certificação adicionada ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
