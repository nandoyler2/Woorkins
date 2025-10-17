import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Link as LinkIcon, Plus, Trash2, MoveUp, MoveDown, 
  Instagram, Facebook, Twitter, Linkedin, Youtube, 
  Globe, Mail, Phone, MapPin, Smartphone
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon_name?: string;
  order_index: number;
  active: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: any;
  placeholder: string;
}

interface LinktreeConfig {
  layout: string;
  bio?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonStyle?: string;
}

interface BusinessLinktreeManagerProps {
  businessId: string;
}

const LAYOUTS = [
  { id: 'minimal', name: 'Minimal', description: 'Limpo e elegante' },
  { id: 'corporate', name: 'Corporativo', description: 'Profissional e sério' },
  { id: 'gradient', name: 'Gradient', description: 'Gradiente moderno' },
  { id: 'glass', name: 'Glass', description: 'Efeito glassmorphism' },
  { id: 'neon', name: 'Neon', description: 'Vibrante e chamativo' },
  { id: 'elegant', name: 'Elegante', description: 'Sofisticado e refinado' },
  { id: 'tech', name: 'Tech', description: 'Tecnológico e futurista' },
  { id: 'creative', name: 'Criativo', description: 'Artístico e único' },
  { id: 'modern', name: 'Moderno', description: 'Contemporâneo e clean' },
  { id: 'bold', name: 'Bold', description: 'Ousado e impactante' },
];

const SOCIAL_PLATFORMS: SocialLink[] = [
  { platform: 'instagram', url: '', icon: Instagram, placeholder: 'https://instagram.com/seu_perfil' },
  { platform: 'facebook', url: '', icon: Facebook, placeholder: 'https://facebook.com/seu_perfil' },
  { platform: 'twitter', url: '', icon: Twitter, placeholder: 'https://twitter.com/seu_perfil' },
  { platform: 'linkedin', url: '', icon: Linkedin, placeholder: 'https://linkedin.com/in/seu_perfil' },
  { platform: 'youtube', url: '', icon: Youtube, placeholder: 'https://youtube.com/@seu_canal' },
  { platform: 'email', url: '', icon: Mail, placeholder: 'seu@email.com' },
  { platform: 'phone', url: '', icon: Phone, placeholder: '+55 (11) 99999-9999' },
  { platform: 'website', url: '', icon: Globe, placeholder: 'https://seusite.com' },
];

export function BusinessLinktreeManager({ businessId }: BusinessLinktreeManagerProps) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CustomLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<LinktreeConfig>({ layout: 'minimal' });
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadLinks();
    loadConfig();
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

  const loadConfig = async () => {
    try {
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("linktree_config, linktree_social_links")
        .eq("id", businessId)
        .single();

      if (profile) {
        if (profile.linktree_config) {
          setConfig(profile.linktree_config);
        }
        if (profile.linktree_social_links) {
          setSocialLinks(profile.linktree_social_links);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar config:", error);
    }
  };

  const saveConfig = async (newConfig: Partial<LinktreeConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      const { error } = await supabase
        .from("business_profiles")
        .update({ linktree_config: updatedConfig })
        .eq("id", businessId);

      if (error) throw error;
      setConfig(updatedConfig);
      toast({ title: "Configuração salva!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveSocialLinks = async (newLinks: Record<string, string>) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ linktree_social_links: newLinks })
        .eq("id", businessId);

      if (error) throw error;
      setSocialLinks(newLinks);
      toast({ title: "Redes sociais salvas!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar redes sociais",
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

  const getLayoutStyles = (layoutId: string) => {
    const styles: Record<string, any> = {
      minimal: {
        bg: 'bg-white',
        button: 'bg-gray-900 hover:bg-gray-800 text-white rounded-lg',
        text: 'text-gray-900'
      },
      corporate: {
        bg: 'bg-slate-50',
        button: 'bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow-sm',
        text: 'text-slate-900'
      },
      gradient: {
        bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
        button: 'bg-white/90 hover:bg-white text-purple-900 rounded-xl backdrop-blur-sm',
        text: 'text-white'
      },
      glass: {
        bg: 'bg-gradient-to-br from-blue-400 to-purple-500',
        button: 'bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md border border-white/30',
        text: 'text-white'
      },
      neon: {
        bg: 'bg-gray-900',
        button: 'bg-transparent hover:bg-cyan-500/20 text-cyan-400 rounded-lg border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
        text: 'text-cyan-400'
      },
      elegant: {
        bg: 'bg-gradient-to-b from-amber-50 to-amber-100',
        button: 'bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-full shadow-md',
        text: 'text-amber-900'
      },
      tech: {
        bg: 'bg-black',
        button: 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white rounded-md font-mono',
        text: 'text-green-400'
      },
      creative: {
        bg: 'bg-gradient-to-tr from-rose-400 via-fuchsia-500 to-indigo-500',
        button: 'bg-white hover:bg-yellow-300 text-purple-900 rounded-[2rem] transform hover:rotate-1 transition-transform font-bold',
        text: 'text-white'
      },
      modern: {
        bg: 'bg-zinc-100',
        button: 'bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border-l-4 border-blue-500',
        text: 'text-zinc-900'
      },
      bold: {
        bg: 'bg-red-600',
        button: 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg font-black uppercase tracking-wider shadow-lg',
        text: 'text-white'
      },
    };
    return styles[layoutId] || styles.minimal;
  };

  const renderPreview = () => {
    const styles = getLayoutStyles(config.layout);
    
    return (
      <div className="sticky top-6">
        <p className="text-sm text-muted-foreground mb-4 text-center">Preview ao vivo</p>
        
        {/* Moldura do celular */}
        <div className="mx-auto" style={{ width: '280px' }}>
          <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
            
            {/* Tela */}
            <div className={`relative rounded-[2rem] overflow-hidden ${styles.bg} h-[580px]`}>
              <div className="overflow-y-auto h-full p-6 space-y-6">
                {/* Avatar e nome */}
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                    <Smartphone className={`w-10 h-10 ${styles.text}`} />
                  </div>
                  <h3 className={`font-bold text-lg ${styles.text}`}>Seu Negócio</h3>
                  {config.bio && (
                    <p className={`text-sm ${styles.text} opacity-90`}>
                      {config.bio}
                    </p>
                  )}
                </div>

                {/* Redes sociais */}
                {Object.keys(socialLinks).filter(k => socialLinks[k]).length > 0 && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    {SOCIAL_PLATFORMS.filter(p => socialLinks[p.platform]).map((social) => {
                      const Icon = social.icon;
                      return (
                        <div
                          key={social.platform}
                          className={`w-10 h-10 rounded-full ${styles.button} flex items-center justify-center`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Links */}
                <div className="space-y-3">
                  {links.filter(l => l.active).map((link) => (
                    <div
                      key={link.id}
                      className={`w-full p-3 ${styles.button} text-center font-medium transition-all`}
                    >
                      {link.title}
                    </div>
                  ))}
                  
                  {links.filter(l => l.active).length === 0 && (
                    <div className={`text-center text-sm ${styles.text} opacity-60`}>
                      Adicione links para ver aqui
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botão home */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              LinkTree Personalizado
            </CardTitle>
            <CardDescription>
              Configure seu perfil de links personalizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="layout" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>

              {/* Tab: Layout */}
              <TabsContent value="layout" className="space-y-4">
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={config.bio || ''}
                    onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                    placeholder="Descreva seu negócio em poucas palavras..."
                    className="resize-none"
                    rows={3}
                  />
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => saveConfig({ bio: config.bio })}
                  >
                    Salvar Bio
                  </Button>
                </div>

                <div>
                  <Label className="mb-3 block">Escolha o Layout</Label>
                  <RadioGroup
                    value={config.layout}
                    onValueChange={(value) => saveConfig({ layout: value })}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {LAYOUTS.map((layout) => (
                        <div key={layout.id} className="relative">
                          <RadioGroupItem
                            value={layout.id}
                            id={layout.id}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={layout.id}
                            className="flex flex-col p-4 rounded-lg border-2 border-muted cursor-pointer hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                          >
                            <span className="font-semibold">{layout.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {layout.description}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>

              {/* Tab: Social */}
              <TabsContent value="social" className="space-y-4">
                <div className="space-y-3">
                  {SOCIAL_PLATFORMS.map((social) => {
                    const Icon = social.icon;
                    return (
                      <div key={social.platform}>
                        <Label className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" />
                          {social.platform.charAt(0).toUpperCase() + social.platform.slice(1)}
                        </Label>
                        <Input
                          value={socialLinks[social.platform] || ''}
                          onChange={(e) => 
                            setSocialLinks({ ...socialLinks, [social.platform]: e.target.value })
                          }
                          placeholder={social.placeholder}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button onClick={() => saveSocialLinks(socialLinks)} className="w-full">
                  Salvar Redes Sociais
                </Button>
              </TabsContent>

              {/* Tab: Links */}
              <TabsContent value="links" className="space-y-4">
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
                    <Card key={link.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{link.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {link.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleReorder(link.id, "up")}
                            disabled={link.order_index === 0}
                          >
                            <MoveUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleReorder(link.id, "down")}
                            disabled={link.order_index === links.length - 1}
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingLink(link)}
                          >
                            <LinkIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="lg:block hidden">
        {renderPreview()}
      </div>
    </div>
  );
}
