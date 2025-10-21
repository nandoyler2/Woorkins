import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Image, Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface Banner {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  order_index: number;
  active: boolean;
}

interface GenericBannersManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericBannersManager({ entityType, entityId }: GenericBannersManagerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_banners' : 'user_banners';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';
  const storageBucket = entityType === 'business' ? 'business-media' : 'avatars';

  useEffect(() => {
    loadBanners();
  }, [entityId]);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(idColumn, entityId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setBanners((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar banners",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveBanner = async () => {
    if (!editingBanner?.image_url) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma imagem ao banner",
        variant: "destructive",
      });
      return;
    }

    if (banners.length >= 5 && !editingBanner.id) {
      toast({
        title: "Limite atingido",
        description: "Você pode ter no máximo 5 banners",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const bannerData = {
        [idColumn]: entityId,
        image_url: editingBanner.image_url,
        title: editingBanner.title || null,
        link_url: editingBanner.link_url || null,
        order_index: editingBanner.order_index ?? banners.length,
        active: true,
      };

      if (editingBanner.id) {
        const { error } = await supabase
          .from(tableName)
          .update(bannerData)
          .eq("id", editingBanner.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(bannerData as any);
        if (error) throw error;
      }

      toast({
        title: "Banner salvo",
        description: "Banner atualizado com sucesso",
      });

      setEditingBanner(null);
      loadBanners();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar banner",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Deseja realmente remover este banner?")) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Banner removido",
        description: "Banner removido com sucesso",
      });

      loadBanners();
    } catch (error: any) {
      toast({
        title: "Erro ao remover banner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    const newBanners = [...banners];
    [newBanners[currentIndex], newBanners[newIndex]] = [newBanners[newIndex], newBanners[currentIndex]];

    try {
      const updates = newBanners.map((banner, index) => 
        supabase
          .from(tableName)
          .update({ order_index: index })
          .eq("id", banner.id)
      );

      await Promise.all(updates);
      setBanners(newBanners);

      toast({
        title: "Ordem atualizada",
        description: "A ordem dos banners foi atualizada",
      });
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
          <Image className="h-5 w-5" />
          Banners Rotativos
        </CardTitle>
        <CardDescription>
          Adicione até 5 banners rotativos (recomendado: 1200x400px)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingBanner && (
          <Card className="p-4 border-primary">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingBanner.id ? "Editar Banner" : "Novo Banner"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingBanner(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label>Imagem do Banner *</Label>
                <ImageUpload
                  currentImageUrl={editingBanner.image_url || null}
                  onUpload={(url) =>
                    setEditingBanner({ ...editingBanner, image_url: url })
                  }
                  bucket={storageBucket}
                  folder={`${entityId}/banners`}
                  type="cover"
                />
              </div>

              <div>
                <Label htmlFor="title">Título (opcional)</Label>
                <Input
                  id="title"
                  value={editingBanner.title || ""}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, title: e.target.value })
                  }
                  placeholder="Título do banner"
                />
              </div>

              <div>
                <Label htmlFor="link">Link (opcional)</Label>
                <Input
                  id="link"
                  value={editingBanner.link_url || ""}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, link_url: e.target.value })
                  }
                  placeholder="https://exemplo.com"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveBanner} disabled={loading}>
                  Salvar Banner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingBanner(null)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!editingBanner && banners.length < 5 && (
          <Button onClick={() => setEditingBanner({})}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Banner
          </Button>
        )}

        <div className="space-y-4">
          {banners.map((banner, index) => (
            <Card key={banner.id} className="p-4">
              <div className="flex gap-4">
                <img
                  src={banner.image_url}
                  alt={banner.title || "Banner"}
                  className="w-32 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{banner.title || "Sem título"}</h4>
                  {banner.link_url && (
                    <p className="text-sm text-muted-foreground truncate">
                      {banner.link_url}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReorder(banner.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReorder(banner.id, 'down')}
                    disabled={index === banners.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingBanner(banner)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBanner(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {banners.length === 0 && !editingBanner && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum banner adicionado ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
