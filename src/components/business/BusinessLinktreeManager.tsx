import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Plus, Trash2, MoveUp, MoveDown } from "lucide-react";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon_name?: string;
  order_index: number;
  active: boolean;
}

interface BusinessLinktreeManagerProps {
  businessId: string;
}

export function BusinessLinktreeManager({ businessId }: BusinessLinktreeManagerProps) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CustomLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLinks();
  }, [businessId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("business_custom_links")
        .select("*")
        .eq("business_id", businessId)
        .order("order_index");

      if (error) throw error;
      setLinks(data || []);
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
        title: "Campos obrigatórios",
        description: "Título e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingLink.id) {
        const { error } = await supabase
          .from("business_custom_links")
          .update({
            title: editingLink.title,
            url: editingLink.url,
            icon_name: editingLink.icon_name,
          })
          .eq("id", editingLink.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_custom_links")
          .insert({
            business_id: businessId,
            title: editingLink.title,
            url: editingLink.url,
            icon_name: editingLink.icon_name,
            order_index: links.length,
            active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Link salvo com sucesso!",
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
    try {
      const { error } = await supabase
        .from("business_custom_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Link removido com sucesso!",
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

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = links.findIndex(l => l.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === links.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const reorderedLinks = [...links];
    [reorderedLinks[currentIndex], reorderedLinks[newIndex]] = 
    [reorderedLinks[newIndex], reorderedLinks[currentIndex]];

    try {
      const updates = reorderedLinks.map((link, index) => ({
        id: link.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("business_custom_links")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      loadLinks();
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          LinkTree Personalizado
        </CardTitle>
        <CardDescription>
          Adicione múltiplos links externos para seu perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingLink && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div>
                <Label htmlFor="link-title">Título *</Label>
                <Input
                  id="link-title"
                  value={editingLink.title || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, title: e.target.value })
                  }
                  placeholder="Ex: Meu Site, Instagram, WhatsApp"
                />
              </div>

              <div>
                <Label htmlFor="link-url">URL *</Label>
                <Input
                  id="link-url"
                  value={editingLink.url || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="link-icon">Ícone (opcional)</Label>
                <Input
                  id="link-icon"
                  value={editingLink.icon_name || ""}
                  onChange={(e) =>
                    setEditingLink({ ...editingLink, icon_name: e.target.value })
                  }
                  placeholder="Ex: Globe, Instagram, Phone"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nome do ícone Lucide (opcional)
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveLink} disabled={loading}>
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingLink(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingLink && (
          <Button
            onClick={() => setEditingLink({ active: true })}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Link
          </Button>
        )}

        <div className="space-y-2">
          {links.map((link) => (
            <Card key={link.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{link.title}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {link.url}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleReorder(link.id, "up")}
                    disabled={link.order_index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleReorder(link.id, "down")}
                    disabled={link.order_index === links.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingLink(link)}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
