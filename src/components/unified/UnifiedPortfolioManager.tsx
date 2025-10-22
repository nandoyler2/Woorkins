import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  order_index: number;
  active: boolean;
}

interface UnifiedPortfolioManagerProps {
  profileId: string;
}

export function UnifiedPortfolioManager({ profileId }: UnifiedPortfolioManagerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, [profileId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('business_id', profileId)
        .order('order_index');

      if (error) throw error;
      setItems(data as any || []);
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
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        business_id: profileId,
        title: editingItem.title || '',
        description: editingItem.description,
        image_url: editingItem.image_url,
        project_url: editingItem.project_url,
        order_index: editingItem.order_index ?? items.length,
        active: true,
      };

      if (editingItem.id) {
        const { error } = await supabase
          .from('portfolio_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portfolio_items')
          .insert([itemData]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Item salvo com sucesso!",
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
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso!",
      });

      loadItems();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Portfólio</h3>

      {editingItem !== null ? (
        <div className="space-y-4 mb-6">
          <ImageUpload
            currentImageUrl={editingItem.image_url || null}
            onUpload={(url) => setEditingItem({ ...editingItem, image_url: url })}
            bucket="portfolio"
            folder="profile_portfolio"
          />

          <Input
            placeholder="Título do projeto"
            value={editingItem.title || ""}
            onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
          />

          <Textarea
            placeholder="Descrição do projeto"
            value={editingItem.description || ""}
            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
          />

          <Input
            placeholder="URL do projeto (opcional)"
            value={editingItem.project_url || ""}
            onChange={(e) => setEditingItem({ ...editingItem, project_url: e.target.value })}
          />

          <div className="flex gap-2">
            <Button onClick={handleSaveItem} disabled={loading}>
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setEditingItem({})}>
          Adicionar Item
        </Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover rounded mb-4"
              />
            )}
            <h4 className="font-semibold mb-2">{item.title}</h4>
            {item.description && (
              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
            )}
            {item.project_url && (
              <a
                href={item.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Ver projeto
              </a>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingItem(item)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {items.length === 0 && editingItem === null && (
        <p className="text-muted-foreground text-center mt-4">
          Nenhum item no portfólio ainda.
        </p>
      )}
    </Card>
  );
}
