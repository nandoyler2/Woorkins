import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Trash2, Edit } from "lucide-react";
import { MediaUpload } from "@/components/MediaUpload";

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  active: boolean;
}

interface BusinessCatalogManagerProps {
  businessId: string;
}

export function BusinessCatalogManager({ businessId }: BusinessCatalogManagerProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<CatalogItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, [businessId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_catalog_items")
        .select("*")
        .eq("target_profile_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar catálogo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem?.name || !editingItem?.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e preço são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingItem.id) {
        const { error } = await supabase
          .from("profile_catalog_items")
          .update({
            name: editingItem.name,
            description: editingItem.description,
            price: editingItem.price,
            image_url: editingItem.image_url,
            category: editingItem.category,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_catalog_items")
          .insert({
            target_profile_id: businessId,
            name: editingItem.name,
            description: editingItem.description,
            price: editingItem.price,
            image_url: editingItem.image_url,
            category: editingItem.category,
            active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Item salvo com sucesso!",
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
    try {
      const { error } = await supabase
        .from("profile_catalog_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Item removido com sucesso!",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Catálogo de Serviços/Produtos
          </CardTitle>
          <CardDescription>
            Gerencie seus serviços e produtos com preços e descrições
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingItem && (
            <Card className="p-4 border-primary">
              <div className="space-y-4">
                <div>
                  <Label>Imagem (opcional)</Label>
                  <MediaUpload
                    onUpload={(url) =>
                      setEditingItem({ ...editingItem, image_url: url })
                    }
                    accept="image/*"
                    maxSizeMB={5}
                    folder={businessId}
                  />
                </div>

                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={editingItem.name || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    placeholder="Nome do serviço/produto"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={editingItem.category || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value })
                    }
                    placeholder="Ex: Consultoria, Produto Digital"
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
                    placeholder="Descreva o serviço/produto"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.price || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveItem} disabled={loading}>
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingItem(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!editingItem && (
            <Button
              onClick={() => setEditingItem({ active: true })}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <Card key={item.id}>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-t"
                  />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.category && (
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary mt-2">
                    R$ {item.price.toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
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
