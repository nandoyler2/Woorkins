import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/MediaUpload";
import { SafeImage } from "@/components/ui/safe-image";
import { 
  Plus, Trash2, Edit, X, ExternalLink, GripVertical, 
  Image as ImageIcon, Video, Tag, Folder
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  media_url: string;
  media_type: string;
  external_link: string | null;
  order_index: number;
  created_at: string;
}

interface BusinessPortfolioManagerProps {
  businessId: string;
}

const CATEGORIES = [
  "Design Gráfico",
  "UI/UX",
  "Fotografia",
  "Ilustração",
  "Branding",
  "Web Design",
  "Motion Graphics",
  "Arquitetura",
  "Produto",
  "Outro"
];

export function BusinessPortfolioManager({ businessId }: BusinessPortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    media_url: "",
    media_type: "",
    external_link: "",
  });

  useEffect(() => {
    loadPortfolio();
  }, [businessId]);

  const loadPortfolio = async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("business_id", businessId)
      .order("order_index", { ascending: true });

    setPortfolio((data || []) as unknown as PortfolioItem[]);
  };

  const handleOpenDialog = (item?: PortfolioItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || "",
        category: item.category || "",
        tags: item.tags?.join(", ") || "",
        media_url: item.media_url,
        media_type: item.media_type,
        external_link: item.external_link || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        description: "",
        category: "",
        tags: "",
        media_url: "",
        media_type: "",
        external_link: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      tags: "",
      media_url: "",
      media_type: "",
      external_link: "",
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.media_url) {
      toast({
        title: "Erro",
        description: "Título e mídia são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const tagsArray = formData.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const itemData = {
      business_id: businessId,
      title: formData.title,
      description: formData.description || null,
      category: formData.category || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      media_url: formData.media_url,
      media_type: formData.media_type,
      external_link: formData.external_link || null,
      order_index: editingItem ? editingItem.order_index : portfolio.length,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("portfolio_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar item",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Item atualizado com sucesso",
        });
        loadPortfolio();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase
        .from("portfolio_items")
        .insert(itemData);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao adicionar item",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Item adicionado com sucesso",
        });
        loadPortfolio();
        handleCloseDialog();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este item?")) return;

    const { error } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso",
      });
      loadPortfolio();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Gerenciar Portfólio
              </CardTitle>
              <CardDescription>
                Mostre seus melhores projetos e trabalhos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Projeto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {portfolio.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Nenhum projeto adicionado ainda</p>
              <p className="text-sm">Comece adicionando seu primeiro projeto</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((item) => (
                <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-all">
                  <div className="relative aspect-video">
                    <SafeImage
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.category && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-muted px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Projeto" : "Adicionar Projeto"}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes do projeto para seu portfólio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Projeto *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Website Corporativo para Empresa X"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o projeto, objetivos, desafios e resultados..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="React, TypeScript, Design System (separadas por vírgula)"
              />
              <p className="text-xs text-muted-foreground">
                Separe as tags com vírgula
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mídia do Projeto *</Label>
              {!formData.media_url ? (
                <MediaUpload
                  onUpload={(url, type) => {
                    setFormData({
                      ...formData,
                      media_url: url,
                      media_type: type,
                    });
                  }}
                  accept="image/*,video/*"
                />
              ) : (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  {formData.media_type?.startsWith("image") ? (
                    <SafeImage
                      src={formData.media_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={formData.media_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, media_url: "", media_type: "" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_link">Link Externo</Label>
              <Input
                id="external_link"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                placeholder="https://..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Link para o projeto ao vivo ou case completo
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : editingItem ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
