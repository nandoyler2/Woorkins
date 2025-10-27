import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, Plus, Trash2, GripVertical, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon_name?: string;
  image_url?: string;
  youtube_url?: string;
  order_index: number;
  active: boolean;
}

interface GenericLinktreeManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericLinktreeManager({ entityType, entityId }: GenericLinktreeManagerProps) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CustomLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_custom_links' : 'user_custom_links';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';
  const storageBucket = entityType === 'business' ? 'business-media' : 'avatars';

  useEffect(() => {
    loadLinks();
  }, [entityId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(idColumn, entityId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLinks((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar links",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveLink = async () => {
    if (!editingLink?.title || !editingLink?.url) {
      toast({
        title: "Erro",
        description: "Título e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const linkData = entityType === 'business'
        ? { business_id: entityId, title: editingLink.title, url: editingLink.url, icon_name: editingLink.icon_name || null, image_url: editingLink.image_url || null, youtube_url: editingLink.youtube_url || null, order_index: editingLink.order_index ?? links.length, active: true }
        : { profile_id: entityId, title: editingLink.title, url: editingLink.url, icon_name: editingLink.icon_name || null, image_url: editingLink.image_url || null, youtube_url: editingLink.youtube_url || null, order_index: editingLink.order_index ?? links.length, active: true };

      if (editingLink.id) {
        const { error } = await supabase
          .from(tableName)
          .update(linkData)
          .eq("id", editingLink.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(linkData as any);
        if (error) throw error;
      }

      toast({
        title: "Link salvo",
        description: "Link atualizado com sucesso",
      });

      setEditingLink(null);
      loadLinks();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Deseja realmente remover este link?")) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Link removido",
        description: "Link removido com sucesso",
      });

      loadLinks();
    } catch (error: any) {
      toast({
        title: "Erro ao remover link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          LinkTree Personalizado
        </CardTitle>
        <CardDescription>
          Crie links personalizados para compartilhar conteúdo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingLink && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingLink.id ? "Editar Link" : "Novo Link"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingLink(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Imagem (opcional)</Label>
                <ImageUpload
                  currentImageUrl={editingLink.image_url || null}
                  onUpload={(url) =>
                    setEditingLink({ ...editingLink, image_url: url })
                  }
                  bucket={storageBucket}
                  folder={`${entityId}/linktree`}
                />
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={editingLink.title || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, title: e.target.value })
                  }
                  placeholder="Título do link"
                />
              </div>

              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={editingLink.url || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="youtube">URL do YouTube (opcional)</Label>
                <Input
                  id="youtube"
                  value={editingLink.youtube_url || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, youtube_url: e.target.value })
                  }
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveLink} disabled={loading}>
                  Salvar Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingLink(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingLink && (
          <Button onClick={() => setEditingLink({})}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Link
          </Button>
        )}

        <div className="space-y-2">
          {links.map((link) => (
            <Card key={link.id} className="p-3">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                {link.image_url && (
                  <img
                    src={link.image_url}
                    alt={link.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{link.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.url}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLink(link)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {links.length === 0 && !editingLink && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum link criado ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
