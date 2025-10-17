import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Instagram, Facebook, Twitter, Linkedin, Youtube, 
  Globe, Mail, Phone, Smartphone, ArrowLeft, MessageCircle,
  Link as LinkIcon, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from 'qrcode.react';

interface CustomLink {
  id: string;
  title: string;
  url: string;
  order_index: number;
  active: boolean;
  image_url?: string;
  youtube_url?: string;
  icon_name?: string;
}

interface LinktreeConfig {
  layout: string;
  bio?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  logoUrl?: string;
}

interface BusinessProfile {
  company_name: string;
  slug?: string;
  logo_url?: string;
  linktree_config?: LinktreeConfig;
  linktree_social_links?: Record<string, string>;
  linktree_logo_url?: string;
}

const SOCIAL_PLATFORMS = [
  { platform: 'instagram', icon: Instagram },
  { platform: 'facebook', icon: Facebook },
  { platform: 'twitter', icon: Twitter },
  { platform: 'linkedin', icon: Linkedin },
  { platform: 'youtube', icon: Youtube },
  { platform: 'whatsapp', icon: MessageCircle },
  { platform: 'email', icon: Mail },
  { platform: 'phone', icon: Phone },
  { platform: 'website', icon: Globe },
];

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

// Utilitário para cor de texto com alto contraste sobre o fundo do botão
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

export default function PublicLinktree() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadLinktree();
  }, [slug]);

  const loadLinktree = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("business_profiles")
        .select("company_name, slug, logo_url, linktree_config, linktree_social_links, linktree_logo_url, id")
        .eq("linktree_slug", slug)
        .eq("active", true)
        .single();

      if (profileError || !profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBusiness(profile as unknown as BusinessProfile);

      const { data: linksData } = await supabase
        .from("business_custom_links")
        .select("*")
        .eq("business_id", profile.id)
        .eq("active", true)
        .order("order_index");

      setLinks(linksData || []);
    } catch (error) {
      console.error("Erro ao carregar linktree:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getLayoutStyles = (layoutId: string = 'minimal') => {
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
        button: 'bg-white hover:bg-gray-100 text-purple-900 rounded-xl backdrop-blur-sm shadow-md',
        text: 'text-white'
      },
      glass: {
        bg: 'bg-gradient-to-br from-blue-400 to-purple-500',
        button: 'bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md border border-white/30 shadow-lg',
        text: 'text-white'
      },
      neon: {
        bg: 'bg-gray-900',
        button: 'bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] font-bold',
        text: 'text-cyan-400'
      },
      elegant: {
        bg: 'bg-gradient-to-b from-amber-50 to-amber-100',
        button: 'bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-full shadow-md',
        text: 'text-amber-900'
      },
      tech: {
        bg: 'bg-black',
        button: 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-black rounded-md font-mono font-bold',
        text: 'text-green-400'
      },
      creative: {
        bg: 'bg-gradient-to-tr from-rose-400 via-fuchsia-500 to-indigo-500',
        button: 'bg-white hover:bg-yellow-300 text-purple-900 rounded-[2rem] transform hover:rotate-1 transition-transform font-bold shadow-lg',
        text: 'text-white'
      },
      modern: {
        bg: 'bg-zinc-100',
        button: 'bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border-l-4 border-blue-500 shadow-md',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">404</h1>
          <p className="text-xl text-gray-600">LinkTree não encontrado</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = business.linktree_config || { layout: 'minimal' };
  const socialLinks = business.linktree_social_links || {};
  const styles = getLayoutStyles(config.layout);
  const currentUrl = window.location.href;
  
  const customBg = config.primaryColor ? { backgroundColor: config.primaryColor } : {};
  const customText = config.textColor ? { color: config.textColor } : {};
const buttonTextColor = config.secondaryColor ? getContrastColor(config.secondaryColor) : undefined;
  const customButton = config.secondaryColor ? { 
    backgroundColor: config.secondaryColor,
    color: buttonTextColor 
  } : {};

  return (
    <>
      {/* View Desktop - Mockup de celular com QR Code */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 relative">
        <div className="flex items-center justify-center min-h-screen py-12">
          {/* Moldura do celular */}
          <div className="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl" style={{ width: '400px', height: '820px' }}>
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>
            
            {/* Tela com scroll */}
            <div 
              className={`relative rounded-[2.5rem] overflow-y-auto h-full scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent ${!config.primaryColor ? styles.bg : ''}`}
              style={config.primaryColor ? customBg : {}}
            >
              <div className="w-full space-y-8 py-12 px-6">
                {/* Logo, Nome e @ */}
                <div className="text-center space-y-3">
                  <a 
                    href={business.slug ? `https://woorkins.com/${business.slug}` : 'https://woorkins.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    {(business.linktree_logo_url || business.logo_url) ? (
                      <img 
                        src={business.linktree_logo_url || business.logo_url} 
                        alt={business.company_name}
                        className="w-24 h-24 rounded-full mx-auto object-cover shadow-lg hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        <Smartphone className="w-12 h-12" style={config.textColor ? customText : {}} />
                      </div>
                    )}
                  </a>
                  <h1 
                    className={`text-2xl font-bold ${!config.textColor ? styles.text : ''}`}
                    style={config.textColor ? customText : {}}
                  >
                    {business.company_name}
                  </h1>
                  {business.slug && (
                    <a 
                      href={business.slug ? `https://woorkins.com/${business.slug}` : 'https://woorkins.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm opacity-75 hover:opacity-100 transition-opacity ${!config.textColor ? styles.text : ''}`}
                      style={config.textColor ? customText : {}}
                    >
                      @{business.slug}
                    </a>
                  )}
                  {config.bio && (
                    <p 
                      className={`text-base ${!config.textColor ? styles.text : ''}`}
                      style={config.textColor ? customText : {}}
                    >
                      {config.bio}
                    </p>
                  )}
                </div>

                {/* Redes Sociais em Destaque */}
                {Object.keys(socialLinks).filter(k => socialLinks[k]).length > 0 && (
                  <div className="flex justify-center gap-4 flex-wrap">
                    {SOCIAL_PLATFORMS.filter(p => socialLinks[p.platform]).map((social) => {
                      const Icon = social.icon;
                      const url = socialLinks[social.platform];
                      let href = url;

                      if (social.platform === 'email') {
                        href = `mailto:${url}`;
                      } else if (social.platform === 'whatsapp') {
                        // Formatar número do WhatsApp removendo caracteres especiais
                        const cleanNumber = url.replace(/\D/g, '');
                        href = `https://wa.me/${cleanNumber}`;
                      } else if (social.platform === 'phone') {
                        href = `tel:${url.replace(/\D/g, '')}`;
                      } else if (!url.startsWith('http')) {
                        href = `https://${url}`;
                      }

                      return (
                        <a
                          key={social.platform}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg ${!config.secondaryColor ? styles.button : ''}`}
                          style={config.secondaryColor ? customButton : {}}
                        >
                          <Icon className="w-6 h-6" />
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Links Customizados */}
                <div className="space-y-3">
                  {links.map((link) => {
                    let href = link.url;
                    if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                      href = `https://${href}`;
                    }

                    // Extrair ID do vídeo do YouTube
                    let youtubeId = '';
                    if (link.youtube_url) {
                      const match = link.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                      if (match) youtubeId = match[1];
                    }

                    return (
                      <div key={link.id} className="space-y-2">
                        {/* Imagem Banner */}
                        {link.image_url && (
                          <div className="rounded-lg overflow-hidden">
                            <img 
                              src={link.image_url} 
                              alt={link.title}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}

                        {/* Vídeo do YouTube */}
                        {youtubeId && (
                          <div className="rounded-lg overflow-hidden aspect-video">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${youtubeId}`}
                              title={link.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Botão do Link */}
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 w-full p-4 text-center font-semibold text-base transition-all hover:scale-[1.02] ${!config.secondaryColor ? styles.button : 'rounded-lg'}`}
                          style={config.secondaryColor ? customButton : {}}
                        >
                          {link.icon_name && ICON_MAP[link.icon_name] && (
                            (() => {
                              const IconComponent = ICON_MAP[link.icon_name];
                              return <IconComponent className="w-5 h-5" />;
                            })()
                          )}
                          <span>{link.title}</span>
                        </a>
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé */}
                <div className="text-center pt-6 border-t border-current/10">
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

            {/* Botão home */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
          </div>
        </div>

        {/* QR Code no canto inferior direito */}
        <div className="fixed bottom-8 right-8 bg-white rounded-2xl p-6 shadow-2xl">
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-gray-900">Ver no celular</p>
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG 
                value={currentUrl}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-gray-600">woorkins.com/l/{slug}</p>
          </div>
        </div>
      </div>

      {/* View Mobile - Tela cheia */}
      <div 
        className={`md:hidden min-h-screen flex items-center justify-center p-4 ${!config.primaryColor ? styles.bg : ''}`}
        style={config.primaryColor ? customBg : {}}
      >
        <div className="w-full space-y-8 py-8">
          {/* Logo, Nome e @ */}
          <div className="text-center space-y-3">
            <a 
              href={business.slug ? `https://woorkins.com/${business.slug}` : 'https://woorkins.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {(business.linktree_logo_url || business.logo_url) ? (
                <img 
                  src={business.linktree_logo_url || business.logo_url} 
                  alt={business.company_name}
                  className="w-28 h-28 rounded-full mx-auto object-cover shadow-lg hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-white/20 mx-auto flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <Smartphone className="w-14 h-14" style={config.textColor ? customText : {}} />
                </div>
              )}
            </a>
            <h1 
              className={`text-3xl font-bold ${!config.textColor ? styles.text : ''}`}
              style={config.textColor ? customText : {}}
            >
              {business.company_name}
            </h1>
            {business.slug && (
              <a 
                href={business.slug ? `https://woorkins.com/${business.slug}` : 'https://woorkins.com'}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm opacity-75 hover:opacity-100 transition-opacity ${!config.textColor ? styles.text : ''}`}
                style={config.textColor ? customText : {}}
              >
                @{business.slug}
              </a>
            )}
            {config.bio && (
              <p 
                className={`text-lg max-w-lg mx-auto ${!config.textColor ? styles.text : ''}`}
                style={config.textColor ? customText : {}}
              >
                {config.bio}
              </p>
            )}
          </div>

          {/* Redes Sociais em Destaque */}
          {Object.keys(socialLinks).filter(k => socialLinks[k]).length > 0 && (
            <div className="flex justify-center gap-5 flex-wrap">
              {SOCIAL_PLATFORMS.filter(p => socialLinks[p.platform]).map((social) => {
                const Icon = social.icon;
                const url = socialLinks[social.platform];
                let href = url;

                if (social.platform === 'email') {
                  href = `mailto:${url}`;
                } else if (social.platform === 'whatsapp') {
                  // Formatar número do WhatsApp removendo caracteres especiais
                  const cleanNumber = url.replace(/\D/g, '');
                  href = `https://wa.me/${cleanNumber}`;
                } else if (social.platform === 'phone') {
                  href = `tel:${url.replace(/\D/g, '')}`;
                } else if (!url.startsWith('http')) {
                  href = `https://${url}`;
                }

                return (
                  <a
                    key={social.platform}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg ${!config.secondaryColor ? styles.button : ''}`}
                    style={config.secondaryColor ? customButton : {}}
                  >
                    <Icon className="w-7 h-7" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Links Customizados */}
          <div className="space-y-4 max-w-xl mx-auto">
            {links.map((link) => {
              let href = link.url;
              if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                href = `https://${href}`;
              }

              // Extrair ID do vídeo do YouTube
              let youtubeId = '';
              if (link.youtube_url) {
                const match = link.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (match) youtubeId = match[1];
              }

              return (
                <div key={link.id} className="space-y-3">
                  {/* Imagem Banner */}
                  {link.image_url && (
                    <div className="rounded-xl overflow-hidden">
                      <img 
                        src={link.image_url} 
                        alt={link.title}
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  )}

                  {/* Vídeo do YouTube */}
                  {youtubeId && (
                    <div className="rounded-xl overflow-hidden aspect-video">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title={link.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* Botão do Link */}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-3 w-full p-4 text-center font-semibold text-lg transition-all hover:scale-[1.02] ${!config.secondaryColor ? styles.button : 'rounded-lg'}`}
                    style={config.secondaryColor ? customButton : {}}
                  >
                    {link.icon_name && ICON_MAP[link.icon_name] && (
                      (() => {
                        const IconComponent = ICON_MAP[link.icon_name];
                        return <IconComponent className="w-6 h-6" />;
                      })()
                    )}
                    <span>{link.title}</span>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="text-center pt-8 border-t border-current/10">
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
    </>
  );
}
