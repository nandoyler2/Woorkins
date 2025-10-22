import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Image, Plus, Trash2, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media_url: string;
  media_type: string;
  external_link?: string;
  order_index: number;
  category?: string;
  tags?: string[];
}

interface GenericPortfolioManagerProps {
  entityId: string;
}

export function GenericPortfolioManager({ entityId }: GenericPortfolioManagerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, [entityId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("business_id", entityId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar portfólio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem?.title) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        business_id: entityId,
        title: editingItem.title,
        description: editingItem.description || null,
        media_url: editingItem.media_url || '',
        media_type: editingItem.media_type || 'image',
        external_link: editingItem.external_link || null,
        order_index: editingItem.order_index ?? items.length,
        category: editingItem.category || null,
        tags: editingItem.tags || null
      };

      if (editingItem.id) {
        const { error } = await supabase
          .from("portfolio_items")
          .update(itemData)
          .eq("id", editingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_items")
          .insert(itemData);
        
        if (error) throw error;
      }

      toast({
        title: "Item salvo",
        description: "Item do portfólio atualizado com sucesso",
      });

      setEditingItem(null);
      loadItems();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Deseja realmente remover este item?")) return;

    try {
      const { error } = await supabase
        .from("portfolio_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Item removido",
        description: "Item removido do portfólio",
      });

      loadItems();
    } catch (error: any) {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Portfólio
        </CardTitle>
        <CardDescription>
          Mostre seus melhores trabalhos e projetos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingItem && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingItem.id ? "Editar Item" : "Novo Item"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Imagem do Projeto</Label>
                <ImageUpload
                  currentImageUrl={editingItem.media_url || null}
                  onUpload={(url) =>
                    setEditingItem({ ...editingItem, media_url: url, media_type: 'image' })
                  }
                  bucket="profile-photos"
                  folder={`${entityId}/portfolio`}
                  type="cover"
                />
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={editingItem.title || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  placeholder="Nome do projeto"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={editingItem.description || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  placeholder="Descreva o projeto"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="external_link">URL do Projeto (opcional)</Label>
                <Input
                  id="external_link"
                  value={editingItem.external_link || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, external_link: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveItem} disabled={loading}>
                  Salvar Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingItem && (
          <Button onClick={() => setEditingItem({})}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.media_url && (
                <img
                  src={item.media_url}
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h4 className="font-semibold">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.external_link && (
                  <a
                    href={item.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    Ver projeto
                  </a>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {items.length === 0 && !editingItem && (
            <p className="text-center text-muted-foreground py-8 col-span-2">
              Nenhum item no portfólio ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
