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
  Globe, Mail, MessageCircle, MapPin, Smartphone, Upload, Image as ImageIcon, X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { z } from "zod";

// Schemas de validação
const urlSchema = z.string().url("URL inválida. Use o formato: https://exemplo.com").trim();
const bioSchema = z.string().max(80, "A bio deve ter no máximo 80 caracteres").trim();

interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon_name?: string;
  order_index: number;
  active: boolean;
  image_url?: string;
  youtube_url?: string;
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
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  logoUrl?: string;
}

interface UnifiedLinktreeManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
  entityLogo?: string;
}

interface EntityData {
  name: string;
  slug?: string;
  logo_url?: string;
}

const ICON_MAP: Record<string, any> = {
  link: LinkIcon,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  globe: Globe,
  mail: Mail,
  phone: Smartphone,
  whatsapp: MessageCircle,
  location: MapPin,
};

// Utilitário para definir cor de texto com contraste adequado ao fundo do botão
function getContrastColor(color: string): string {
  try {
    if (!color) return '#ffffff';
    let r = 0, g = 0, b = 0;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const full = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.substring(0, 6);
      r = parseInt(full.substring(0, 2), 16);
      g = parseInt(full.substring(2, 4), 16);
      b = parseInt(full.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
      const nums = color.match(/\d+/g);
      if (nums && nums.length >= 3) {
        r = parseInt(nums[0]);
        g = parseInt(nums[1]);
        b = parseInt(nums[2]);
      }
    } else {
      return '#ffffff';
    }
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 186 ? '#000000' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

const LAYOUTS = [
  { id: 'minimal', name: 'Minimal', description: 'Limpo e elegante', primaryColor: '#FFFFFF', secondaryColor: '#1A1A1A', textColor: '#1A1A1A' },
  { id: 'corporate', name: 'Corporativo', description: 'Profissional e sério', primaryColor: '#F8FAFC', secondaryColor: '#1E3A8A', textColor: '#0F172A' },
  { id: 'gradient', name: 'Gradient', description: 'Gradiente moderno', primaryColor: '#A855F7', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  { id: 'glass', name: 'Glass', description: 'Efeito glassmorphism', primaryColor: '#60A5FA', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  { id: 'neon', name: 'Neon', description: 'Vibrante e chamativo', primaryColor: '#111827', secondaryColor: '#22D3EE', textColor: '#22D3EE' },
  { id: 'elegant', name: 'Elegante', description: 'Sofisticado e refinado', primaryColor: '#FEF3C7', secondaryColor: '#78350F', textColor: '#78350F' },
  { id: 'tech', name: 'Tech', description: 'Tecnológico e futurista', primaryColor: '#000000', secondaryColor: '#10B981', textColor: '#10B981' },
  { id: 'creative', name: 'Criativo', description: 'Artístico e único', primaryColor: '#FB7185', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  { id: 'modern', name: 'Moderno', description: 'Contemporâneo e clean', primaryColor: '#F4F4F5', secondaryColor: '#18181B', textColor: '#18181B' },
  { id: 'bold', name: 'Bold', description: 'Ousado e impactante', primaryColor: '#DC2626', secondaryColor: '#FACC15', textColor: '#FFFFFF' },
];

const SOCIAL_PLATFORMS: SocialLink[] = [
  { platform: 'instagram', url: '', icon: Instagram, placeholder: 'https://instagram.com/seu_perfil' },
  { platform: 'facebook', url: '', icon: Facebook, placeholder: 'https://facebook.com/seu_perfil' },
  { platform: 'twitter', url: '', icon: Twitter, placeholder: 'https://twitter.com/seu_perfil' },
  { platform: 'linkedin', url: '', icon: Linkedin, placeholder: 'https://linkedin.com/in/seu_perfil' },
  { platform: 'youtube', url: '', icon: Youtube, placeholder: 'https://youtube.com/@seu_canal' },
  { platform: 'whatsapp', url: '', icon: MessageCircle, placeholder: '+5511999999999' },
  { platform: 'email', url: '', icon: Mail, placeholder: 'seu@email.com' },
  { platform: 'website', url: '', icon: Globe, placeholder: 'https://seusite.com' },
];

export function UnifiedLinktreeManager({ entityType, entityId, entityLogo }: UnifiedLinktreeManagerProps) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CustomLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [linktreeSlug, setLinktreeSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [entityData, setEntityData] = useState<EntityData>({ name: entityType === 'business' ? 'Seu Negócio' : 'Seu Perfil' });
  const [config, setConfig] = useState<LinktreeConfig>( 
    { 
      layout: 'minimal',
      primaryColor: '#FFFFFF',
      secondaryColor: '#1A1A1A',
      textColor: '#1A1A1A',
      logoUrl: entityLogo || ''
    }
  );
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Tabelas e colunas baseado no tipo
  const linksTable = entityType === 'business' ? 'business_custom_links' : 'user_custom_links';
  const configTable = entityType === 'business' ? 'business_profiles' : 'profiles';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';
  const storageBucket = entityType === 'business' ? 'business-logos' : 'avatars';

  useEffect(() => {
    loadLinks();
    loadConfig();
  }, [entityId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from(linksTable as any)
        .select("*")
        .eq(idColumn, entityId)
        .order("order_index");

      if (error) throw error;
      setLinks(data as any || []);
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
      const selectFields = entityType === 'business'
        ? "linktree_config, linktree_social_links, linktree_logo_url, logo_url, linktree_slug, company_name, slug"
        : "linktree_config, linktree_social_links, linktree_logo_url, avatar_url, linktree_slug, full_name, username";

      const { data: profile } = await supabase
        .from(configTable as any)
        .select(selectFields)
        .eq("id", entityId)
        .single();

      if (profile) {
        setEntityData({
          name: (profile as any).company_name || (profile as any).full_name || (entityType === 'business' ? 'Seu Negócio' : 'Seu Perfil'),
          slug: (profile as any).slug || (profile as any).username,
          logo_url: (profile as any).linktree_logo_url || (profile as any).logo_url || (profile as any).avatar_url
        });

        const defaultConfig = {
          layout: 'minimal',
          primaryColor: '#FFFFFF',
          secondaryColor: '#1A1A1A',
          textColor: '#1A1A1A',
          logoUrl: (profile as any).linktree_logo_url || (profile as any).logo_url || (profile as any).avatar_url || entityLogo || ''
        };
        
        if ((profile as any).linktree_slug) {
          setLinktreeSlug((profile as any).linktree_slug);
        }
        
        if ((profile as any).linktree_config && typeof (profile as any).linktree_config === 'object') {
          setConfig({ ...defaultConfig, ...((profile as any).linktree_config as unknown as LinktreeConfig) });
        } else {
          setConfig(defaultConfig);
        }
        
        if ((profile as any).linktree_social_links && typeof (profile as any).linktree_social_links === 'object') {
          setSocialLinks((profile as any).linktree_social_links as unknown as Record<string, string>);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar config:", error);
    }
  };

  const saveConfig = async (newConfig: Partial<LinktreeConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      const updateData: any = { linktree_config: updatedConfig };
      
      if (newConfig.logoUrl !== undefined) {
        updateData.linktree_logo_url = newConfig.logoUrl;
      }
      
      const { error } = await supabase
        .from(configTable as any)
        .update(updateData)
        .eq("id", entityId);

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

  const handleLayoutChange = (layoutId: string) => {
    const selectedLayout = LAYOUTS.find(l => l.id === layoutId);
    if (selectedLayout) {
      const newConfig = {
        ...config,
        layout: layoutId,
        primaryColor: selectedLayout.primaryColor,
        secondaryColor: selectedLayout.secondaryColor,
        textColor: selectedLayout.textColor
      };
      setConfig(newConfig);
      saveConfig(newConfig);
    }
  };

  const saveSocialLinks = async (newLinks: Record<string, string>) => {
    const validatedLinks: Record<string, string> = {};
    
    for (const [platform, url] of Object.entries(newLinks)) {
      if (!url || url.trim() === '') continue;
      
      const trimmedUrl = url.trim();
      
      if (platform === 'email') {
        if (!z.string().email().safeParse(trimmedUrl).success) {
          toast({
            title: "Email inválido",
            description: `O email para ${platform} não é válido`,
            variant: "destructive",
          });
          return;
        }
        validatedLinks[platform] = trimmedUrl;
      } else if (platform === 'phone' || platform === 'whatsapp') {
        const cleanNumber = trimmedUrl.replace(/[\s()-]/g, '');
        if (!/^\+?[\d]{10,15}$/.test(cleanNumber)) {
          toast({
            title: "Telefone inválido",
            description: `O número para ${platform} deve ter entre 10 e 15 dígitos`,
            variant: "destructive",
          });
          return;
        }
        validatedLinks[platform] = trimmedUrl;
      } else {
        let validUrl = trimmedUrl;
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
          validUrl = 'https://' + validUrl;
        }
        try {
          const parsed = new URL(validUrl);
          const hostname = parsed.hostname;
          if (!hostname.includes('.') || hostname.split('.').length < 2) {
            throw new Error('Domínio inválido');
          }
          const tld = hostname.split('.').pop()!.toLowerCase();
          const validTLDs = ['com','br','org','net','edu','gov','io','co','app','dev','ai','tech','store','site','online','info','me','tv','us','uk','de','fr','es','it','pt','jp','cn','ru'];
          if (!validTLDs.includes(tld)) {
            throw new Error('TLD inválido');
          }
          if (!urlSchema.safeParse(validUrl).success) {
            throw new Error('Formato inválido');
          }
        } catch {
          toast({
            title: "URL inválida",
            description: `A URL para ${platform} não é válida`,
            variant: "destructive",
          });
          return;
        }
        validatedLinks[platform] = validUrl;
      }
    }
    
    try {
      const { error } = await supabase
        .from(configTable as any)
        .update({ linktree_social_links: validatedLinks })
        .eq("id", entityId);

      if (error) throw error;
      setSocialLinks(validatedLinks);
      toast({ title: "Redes sociais salvas!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar redes sociais",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      setSlugAvailable(false);
      return;
    }

    setCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from(configTable as any)
        .select("id, linktree_slug")
        .eq("linktree_slug", slug)
        .maybeSingle();

      if (error) throw error;
      setSlugAvailable(!data || (data as any).id === entityId);
    } catch (error) {
      console.error("Erro ao verificar slug:", error);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const formattedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLinktreeSlug(formattedSlug);
    
    const timeoutId = setTimeout(() => {
      checkSlugAvailability(formattedSlug);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const saveSlug = async () => {
    if (!linktreeSlug.trim()) {
      toast({
        title: "Slug obrigatório",
        description: "Digite um nome para o seu LinkTree",
        variant: "destructive",
      });
      return;
    }

    if (slugAvailable === false) {
      toast({
        title: "Nome indisponível",
        description: "Este nome já está em uso, escolha outro",
        variant: "destructive",
      });
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(linktreeSlug)) {
      toast({
        title: "Formato inválido",
        description: "Use apenas letras minúsculas, números e hífens",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from(configTable as any)
        .update({ linktree_slug: linktreeSlug.toLowerCase() })
        .eq("id", entityId);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Slug já existe",
            description: "Este nome já está em uso, escolha outro",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Link salvo com sucesso!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar link",
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

    let validUrl = editingLink.url.trim();
    
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      const url = new URL(validUrl);
      const hostname = url.hostname;
      if (!hostname.includes('.') || hostname.split('.').length < 2) {
        throw new Error('Domínio inválido');
      }
      
      const parts = hostname.split('.');
      const tld = parts[parts.length - 1];
      const validTLDs = ['com', 'br', 'org', 'net', 'edu', 'gov', 'io', 'co', 'app', 'dev', 'ai', 'tech', 'store', 'site', 'online', 'info', 'me', 'tv', 'us', 'uk', 'de', 'fr', 'es', 'it', 'pt', 'jp', 'cn', 'ru'];
      
      if (!validTLDs.includes(tld.toLowerCase())) {
        throw new Error('Extensão de domínio inválida');
      }
      
      urlSchema.parse(validUrl);
    } catch (error) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida com um domínio real (ex: https://exemplo.com)",
        variant: "destructive",
      });
      return;
    }

    if (editingLink.youtube_url && editingLink.youtube_url.trim()) {
      const youtubeUrl = editingLink.youtube_url.trim();
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(youtubeUrl)) {
        toast({
          title: "URL do YouTube inválida",
          description: "Por favor, insira uma URL válida do YouTube",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const linkData: any = {
        title: editingLink.title.trim(),
        url: validUrl,
        icon_name: editingLink.icon_name,
        image_url: editingLink.image_url || null,
        youtube_url: editingLink.youtube_url?.trim() || null,
      };

      if (editingLink.id) {
        const { error } = await supabase
          .from(linksTable as any)
          .update(linkData)
          .eq("id", editingLink.id);

        if (error) throw error;
      } else {
        linkData[idColumn] = entityId;
        linkData.order_index = links.length;
        linkData.active = true;

        const { error } = await supabase
          .from(linksTable as any)
          .insert(linkData);

        if (error) throw error;
      }

      toast({ title: "Link salvo com sucesso!" });
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
        .from(linksTable as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Link removido com sucesso!" });
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
          .from(linksTable as any)
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
      minimal: { bg: 'bg-white', button: 'bg-gray-900 hover:bg-gray-800 text-white rounded-lg', text: 'text-gray-900' },
      corporate: { bg: 'bg-slate-50', button: 'bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow-sm', text: 'text-slate-900' },
      gradient: { bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500', button: 'bg-white hover:bg-gray-100 text-purple-900 rounded-xl backdrop-blur-sm shadow-md', text: 'text-white' },
      glass: { bg: 'bg-gradient-to-br from-blue-400 to-purple-500', button: 'bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md border border-white/30 shadow-lg', text: 'text-white' },
      neon: { bg: 'bg-gray-900', button: 'bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] font-bold', text: 'text-cyan-400' },
      elegant: { bg: 'bg-gradient-to-b from-amber-50 to-amber-100', button: 'bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-full shadow-md', text: 'text-amber-900' },
      tech: { bg: 'bg-black', button: 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-black rounded-md font-mono font-bold', text: 'text-green-400' },
      creative: { bg: 'bg-gradient-to-tr from-rose-400 via-fuchsia-500 to-indigo-500', button: 'bg-white hover:bg-yellow-300 text-purple-900 rounded-[2rem] transform hover:rotate-1 transition-transform font-bold shadow-lg', text: 'text-white' },
      modern: { bg: 'bg-zinc-100', button: 'bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border-l-4 border-blue-500 shadow-md', text: 'text-zinc-900' },
      bold: { bg: 'bg-red-600', button: 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg font-black uppercase tracking-wider shadow-lg', text: 'text-white' },
    };
    return styles[layoutId] || styles.minimal;
  };

  const renderPreview = () => {
    const styles = getLayoutStyles(config.layout);
    const customBg = config.primaryColor ? { backgroundColor: config.primaryColor } : {};
    const customText = config.textColor ? { color: config.textColor } : {};
    const buttonTextColor = config.secondaryColor ? getContrastColor(config.secondaryColor) : undefined;
    const customButton = config.secondaryColor ? { 
      backgroundColor: config.secondaryColor,
      color: buttonTextColor 
    } : {};
    
    return (
      <div className="sticky top-6">
        <p className="text-sm text-muted-foreground mb-4 text-center">Preview ao vivo</p>
        
        <div className="mx-auto" style={{ width: '280px' }}>
          <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
            
            <div 
              className={`relative rounded-[2rem] overflow-hidden h-[580px]`}
              style={{ 
                ...(config.primaryColor ? customBg : {}),
                background: !config.primaryColor ? styles.bg : undefined
              }}
            >
              <div className="overflow-y-auto h-full p-6 space-y-6 flex flex-col">
                <div className="text-center space-y-2">
                  <a 
                    href={entityData.slug ? `https://woorkins.com/${entityData.slug}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {entityData.logo_url ? (
                      <img 
                        src={entityData.logo_url} 
                        alt="Logo"
                        className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center border-2 border-white/30">
                        <Smartphone className={`w-10 h-10`} style={config.textColor ? customText : {}} />
                      </div>
                    )}
                  </a>
                  <h3 
                    className={`font-bold text-lg ${!config.textColor ? styles.text : ''}`}
                    style={config.textColor ? customText : {}}
                  >
                    {entityData.name}
                  </h3>
                  {entityData.slug && (
                    <a 
                      href={entityData.slug ? `https://woorkins.com/${entityData.slug}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs opacity-75 hover:opacity-100 transition-opacity ${!config.textColor ? styles.text : ''}`}
                      style={config.textColor ? customText : {}}
                    >
                      @{entityData.slug}
                    </a>
                  )}
                  {config.bio && (
                    <p 
                      className={`text-sm opacity-90 ${!config.textColor ? styles.text : ''}`}
                      style={config.textColor ? customText : {}}
                    >
                      {config.bio}
                    </p>
                  )}
                </div>

                {Object.keys(socialLinks).filter(k => socialLinks[k]).length > 0 && (
                  <div className="flex justify-center gap-4 flex-wrap">
                    {SOCIAL_PLATFORMS.filter(p => socialLinks[p.platform]).map((social) => {
                      const Icon = social.icon;
                      return (
                        <div
                          key={social.platform}
                          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${!config.secondaryColor ? styles.button : ''}`}
                          style={config.secondaryColor ? customButton : {}}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  {links.filter(l => l.active).map((link) => (
                    <div
                      key={link.id}
                      className={`w-full p-3 text-center font-medium transition-all ${!config.secondaryColor ? styles.button : 'rounded-lg'}`}
                      style={config.secondaryColor ? customButton : {}}
                    >
                      {link.title}
                    </div>
                  ))}
                  
                  {links.filter(l => l.active).length === 0 && (
                    <div 
                      className={`text-center text-sm opacity-60 ${!config.textColor ? styles.text : ''}`}
                      style={config.textColor ? customText : {}}
                    >
                      Adicione links para ver aqui
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t border-white/10">
                  <a 
                    href="https://woorkins.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[0.6rem] opacity-60 hover:opacity-100 transition-opacity ${!config.textColor ? styles.text : ''}`}
                    style={config.textColor ? customText : {}}
                  >
                    Gerado por Woorkins - Crie o seu
                  </a>
                </div>
              </div>
            </div>

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
            <Tabs defaultValue="links" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              {/* Tab: Links */}
              <TabsContent value="links" className="space-y-4">
                <div className="space-y-4 pb-4 border-b">
                  <div>
                    <Label className="mb-2">Logo do LinkTree</Label>
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 rounded-lg border-2 border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {config.logoUrl ? (
                          <img 
                            src={config.logoUrl} 
                            alt="Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      
                      <ImageUpload
                        currentImageUrl={config.logoUrl}
                        onUpload={async (url) => {
                          setConfig({ ...config, logoUrl: url });
                          await saveConfig({ logoUrl: url });
                        }}
                        bucket={storageBucket}
                        folder={entityId}
                        type="logo"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Bio</Label>
                      <span className="text-xs text-muted-foreground">
                        {(config.bio || '').length}/80
                      </span>
                    </div>
                    <Textarea
                      value={config.bio || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 80) {
                          setConfig({ ...config, bio: value });
                        }
                      }}
                      placeholder="Descreva seu perfil em poucas palavras..."
                      className="resize-none"
                      rows={3}
                      maxLength={80}
                    />
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={async () => {
                        try {
                          bioSchema.parse(config.bio || '');
                          await saveConfig({ bio: config.bio });
                        } catch (error) {
                          if (error instanceof z.ZodError) {
                            toast({
                              title: "Erro na bio",
                              description: error.errors[0].message,
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      Salvar Bio
                    </Button>
                  </div>
                </div>

                {/* Lista de Links */}
                {editingLink ? (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{editingLink.id ? 'Editar Link' : 'Novo Link'}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLink(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={editingLink.title || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })}
                        placeholder="Meu Site"
                      />
                    </div>

                    <div>
                      <Label>URL *</Label>
                      <Input
                        value={editingLink.url || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                        placeholder="https://exemplo.com"
                      />
                    </div>

                    <div>
                      <Label>URL do YouTube (opcional)</Label>
                      <Input
                        value={editingLink.youtube_url || ''}
                        onChange={(e) => setEditingLink({ ...editingLink, youtube_url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Imagem (opcional)</Label>
                      <ImageUpload
                        currentImageUrl={editingLink.image_url}
                        onUpload={(url) => setEditingLink({ ...editingLink, image_url: url })}
                        bucket={entityType === 'business' ? 'business-media' : 'user-media'}
                        folder={`${entityId}/linktree`}
                        type="logo"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveLink} disabled={loading} className="flex-1">
                        {loading ? 'Salvando...' : 'Salvar Link'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingLink(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => setEditingLink({ title: '', url: '', active: true, order_index: links.length })}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Link
                    </Button>

                    {links.map((link, index) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{link.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(link.id, 'up')}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(link.id, 'down')}
                            disabled={index === links.length - 1}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLink(link)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {links.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Nenhum link adicionado ainda
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Social */}
              <TabsContent value="social" className="space-y-4">
                <div className="space-y-4">
                  {SOCIAL_PLATFORMS.map((social) => {
                    const Icon = social.icon;
                    return (
                      <div key={social.platform}>
                        <Label className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4" />
                          {social.platform.charAt(0).toUpperCase() + social.platform.slice(1)}
                        </Label>
                        <Input
                          value={socialLinks[social.platform] || ''}
                          onChange={(e) => setSocialLinks({ ...socialLinks, [social.platform]: e.target.value })}
                          placeholder={social.placeholder}
                        />
                      </div>
                    );
                  })}
                  <Button onClick={() => saveSocialLinks(socialLinks)} className="w-full">
                    Salvar Redes Sociais
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Layout */}
              <TabsContent value="layout" className="space-y-4">
                <RadioGroup value={config.layout} onValueChange={handleLayoutChange}>
                  <div className="grid grid-cols-2 gap-4">
                    {LAYOUTS.map((layout) => (
                      <div key={layout.id} className="relative">
                        <RadioGroupItem
                          value={layout.id}
                          id={layout.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={layout.id}
                          className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <div
                            className="w-full h-16 rounded"
                            style={{ backgroundColor: layout.primaryColor }}
                          ></div>
                          <div className="text-center">
                            <p className="font-medium">{layout.name}</p>
                            <p className="text-xs text-muted-foreground">{layout.description}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-base font-medium">Cores do LinkTree</Label>
                    <p className="text-sm text-muted-foreground mb-4">Personalize as cores do seu linktree</p>
                  </div>

                  <div>
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2 items-center mt-2">
                      <Input
                        type="color"
                        value={config.primaryColor || '#FFFFFF'}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={config.primaryColor || '#FFFFFF'}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Cor dos Botões</Label>
                    <div className="flex gap-2 items-center mt-2">
                      <Input
                        type="color"
                        value={config.secondaryColor || '#1A1A1A'}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={config.secondaryColor || '#1A1A1A'}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        placeholder="#1A1A1A"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Cor do Texto</Label>
                    <div className="flex gap-2 items-center mt-2">
                      <Input
                        type="color"
                        value={config.textColor || '#1A1A1A'}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={config.textColor || '#1A1A1A'}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        placeholder="#1A1A1A"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <Button onClick={() => saveConfig(config)} className="w-full">
                    Salvar Cores
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Config */}
              <TabsContent value="config" className="space-y-4">
                <div>
                  <Label>Nome do seu LinkTree</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Este será seu link público: woorkins.com/l/seu-nome
                  </p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={linktreeSlug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="seu-nome-aqui"
                          className="lowercase"
                        />
                        {!checkingSlug && slugAvailable !== null && linktreeSlug.length >= 3 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {slugAvailable ? (
                              <span className="text-green-600 text-sm">✓ Disponível</span>
                            ) : (
                              <span className="text-red-600 text-sm">✗ Indisponível</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {slugAvailable === false && linktreeSlug.length >= 3 && (
                      <p className="text-sm text-destructive">Este nome já está em uso</p>
                    )}
                    {slugAvailable === true && linktreeSlug.length >= 3 && (
                      <p className="text-sm text-green-600">Este nome está disponível!</p>
                    )}
                  </div>
                  <Button onClick={saveSlug} disabled={slugAvailable === false || !linktreeSlug}>
                    Salvar Nome
                  </Button>
                </div>

                {linktreeSlug && slugAvailable !== false && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm mb-2">Seu link público:</Label>
                    <a
                      href={`https://woorkins.com/l/${linktreeSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-sm break-all"
                    >
                      https://woorkins.com/l/{linktreeSlug}
                    </a>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div>
        {renderPreview()}
      </div>
    </div>
  );
}
