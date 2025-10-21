import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Trash2, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  active: boolean;
}

interface GenericCatalogManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericCatalogManager({ entityType, entityId }: GenericCatalogManagerProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<CatalogItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_catalog_items' : 'user_catalog_items';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';
  const storageBucket = entityType === 'business' ? 'business-media' : 'avatars';

  useEffect(() => {
    loadItems();
  }, [entityId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idColumn, entityId)
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
        title: "Erro",
        description: "Nome e preço são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        [idColumn]: entityId,
        name: editingItem.name,
        description: editingItem.description || null,
        price: editingItem.price,
        image_url: editingItem.image_url || null,
        category: editingItem.category || null,
        active: true,
      };

      if (editingItem.id) {
        const { error } = await supabase
          .from(tableName)
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(itemData);
        if (error) throw error;
      }

      toast({
        title: "Item salvo",
        description: "Item do catálogo atualizado com sucesso",
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
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Item removido",
        description: "Item removido do catálogo",
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
          <ShoppingBag className="h-5 w-5" />
          Catálogo de Serviços/Produtos
        </CardTitle>
        <CardDescription>
          Adicione serviços ou produtos que você oferece
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
                <Label>Imagem (opcional)</Label>
                <ImageUpload
                  currentImage={editingItem.image_url}
                  onImageUpload={(url) =>
                    setEditingItem({ ...editingItem, image_url: url })
                  }
                  bucket={storageBucket}
                  path={`${entityId}/catalog`}
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
                  placeholder="Ex: Design, Desenvolvimento, Consultoria"
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
                  value={editingItem.price || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
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
            <Card key={item.id} className="p-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}
              <h4 className="font-semibold">{item.name}</h4>
              {item.category && (
                <p className="text-sm text-muted-foreground">{item.category}</p>
              )}
              {item.description && (
                <p className="text-sm mt-2 line-clamp-2">{item.description}</p>
              )}
              <p className="text-lg font-bold mt-2">
                R$ {item.price.toFixed(2)}
              </p>
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
            </Card>
          ))}

          {items.length === 0 && !editingItem && (
            <p className="text-center text-muted-foreground py-8 col-span-2">
              Nenhum item no catálogo ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
