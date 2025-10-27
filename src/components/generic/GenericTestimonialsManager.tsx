import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, Star, Plus, Trash2, Edit2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface Testimonial {
  id: string;
  client_name: string;
  client_photo_url?: string;
  content: string;
  rating?: number;
  active?: boolean;
  order_index?: number;
  created_at: string;
}

interface GenericTestimonialsManagerProps {
  profileId: string;
}

export function GenericTestimonialsManager({ profileId }: GenericTestimonialsManagerProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<Testimonial> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTestimonials();
  }, [profileId]);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_testimonials')
        .select("*")
        .eq('target_profile_id', profileId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setTestimonials((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar depoimentos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show crop dialog
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedAreaPixels: any) => {
    if (!imageToCrop || !selectedFile) return;

    try {
      setUploading(true);
      setCropDialogOpen(false);

      // Create canvas and crop image
      const image = new Image();
      image.src = imageToCrop;
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.9);
      });

      // Upload to Supabase
      const fileExt = 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profileId}/testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      setEditingItem({ ...editingItem, client_photo_url: publicUrl });

      toast({
        title: "Foto enviada",
        description: "Foto do cliente enviada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setImageToCrop(null);
      setSelectedFile(null);
    }
  };

  const handleSave = async () => {
    if (!editingItem?.client_name || !editingItem?.content || !editingItem?.rating) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, depoimento e avaliação",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemData = {
        target_profile_id: profileId,
        client_name: editingItem.client_name,
        client_photo_url: editingItem.client_photo_url || null,
        content: editingItem.content,
        rating: editingItem.rating,
        active: true,
        order_index: editingItem.order_index ?? testimonials.length,
      };

      if (editingItem.id) {
        const { error } = await supabase
          .from('profile_testimonials')
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_testimonials')
          .insert(itemData);

        if (error) throw error;
      }

      toast({
        title: "Depoimento salvo",
        description: "Depoimento salvo com sucesso",
      });

      setDialogOpen(false);
      setEditingItem(null);
      loadTestimonials();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este depoimento?")) return;

    try {
      const { error } = await supabase
        .from('profile_testimonials')
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Depoimento removido",
        description: "Depoimento removido com sucesso",
      });

      loadTestimonials();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const averageRating = testimonials
    .filter(t => t.rating)
    .reduce((acc, t) => acc + (t.rating || 0), 0) / 
    testimonials.filter(t => t.rating).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5" />
              Depoimentos
            </CardTitle>
            <CardDescription>
              Adicione depoimentos de clientes ao seu perfil
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingItem({}); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.id ? "Editar Depoimento" : "Novo Depoimento"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={editingItem?.client_photo_url} />
                    <AvatarFallback>
                      {editingItem?.client_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <Label htmlFor="photo" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Enviando..." : "Adicionar foto do cliente"}
                    </div>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cliente *</Label>
                  <Input
                    id="name"
                    value={editingItem?.client_name || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, client_name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Depoimento *</Label>
                  <Textarea
                    id="content"
                    value={editingItem?.content || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    placeholder="Digite o depoimento do cliente..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Avaliação *</Label>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-8 w-8 cursor-pointer transition-colors ${
                          i < (editingItem?.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                        onClick={() => setEditingItem({ ...editingItem, rating: i + 1 })}
                      />
                    ))}
                    {editingItem?.rating && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {editingItem.rating} estrela{editingItem.rating > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingItem(null); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {averageRating > 0 && (
          <div className="flex items-center gap-2 text-sm mt-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({testimonials.length} avaliações)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {testimonials.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum depoimento adicionado ainda
          </p>
        ) : (
          <div className="space-y-4">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={testimonial.client_photo_url} />
                    <AvatarFallback>
                      {testimonial.client_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{testimonial.client_name}</p>
                        {testimonial.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < testimonial.rating!
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingItem(testimonial);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(testimonial.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{testimonial.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Crop Dialog */}
      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageSrc={imageToCrop}
          onClose={() => {
            setCropDialogOpen(false);
            setImageToCrop(null);
            setSelectedFile(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={1}
        />
      )}
    </Card>
  );
}