import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Image, Trash2, Plus, MoveUp, MoveDown, Link as LinkIcon } from "lucide-react";
import { MediaUpload } from "@/components/MediaUpload";

interface Banner {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  order_index: number;
  active: boolean;
}

interface BusinessBannersManagerProps {
  businessId: string;
}

export function BusinessBannersManager({ businessId }: BusinessBannersManagerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBanners();
  }, [businessId]);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("business_banners")
        .select("*")
        .eq("business_id", businessId)
        .order("order_index");

      if (error) throw error;
      setBanners(data || []);
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
        title: "Imagem obrigatória",
        description: "Adicione uma imagem para o banner",
        variant: "destructive",
      });
      return;
    }

    if (banners.length >= 5 && !editingBanner.id) {
      toast({
        title: "Limite atingido",
        description: "Você pode adicionar até 5 banners",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingBanner.id) {
        const { error } = await supabase
          .from("business_banners")
          .update({
            image_url: editingBanner.image_url,
            title: editingBanner.title,
            link_url: editingBanner.link_url,
          })
          .eq("id", editingBanner.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_banners")
          .insert({
            business_id: businessId,
            image_url: editingBanner.image_url,
            title: editingBanner.title,
            link_url: editingBanner.link_url,
            order_index: banners.length,
            active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Banner salvo com sucesso!",
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
    try {
      const { error } = await supabase
        .from("business_banners")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Banner removido com sucesso!",
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

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = banners.findIndex(b => b.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === banners.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const reorderedBanners = [...banners];
    [reorderedBanners[currentIndex], reorderedBanners[newIndex]] = 
    [reorderedBanners[newIndex], reorderedBanners[currentIndex]];

    try {
      const updates = reorderedBanners.map((banner, index) => ({
        id: banner.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("business_banners")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      loadBanners();
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
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
            <Image className="h-5 w-5" />
            Banner Rotativo
          </CardTitle>
          <CardDescription>
            Adicione até 5 banners rotativos para o topo do seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingBanner && (
            <Card className="p-4 border-primary">
              <div className="space-y-4">
                <div>
                  <Label>Imagem do Banner *</Label>
                  <MediaUpload
                    onUpload={(url) => 
                      setEditingBanner({ ...editingBanner, image_url: url })
                    }
                    accept="image/*"
                    maxSizeMB={5}
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
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveBanner} disabled={loading}>
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingBanner(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!editingBanner && banners.length < 5 && (
            <Button
              onClick={() => setEditingBanner({ active: true })}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Banner
            </Button>
          )}

          <div className="space-y-2">
            {banners.map((banner) => (
              <Card key={banner.id} className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="w-24 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{banner.title || "Sem título"}</p>
                    {banner.link_url && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {banner.link_url}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleReorder(banner.id, "up")}
                      disabled={banner.order_index === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleReorder(banner.id, "down")}
                      disabled={banner.order_index === banners.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingBanner(banner)}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteBanner(banner.id)}
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
    </div>
  );
}
