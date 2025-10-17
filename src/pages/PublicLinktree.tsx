import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Instagram, Facebook, Twitter, Linkedin, Youtube, 
  Globe, Mail, Phone, Smartphone, ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  order_index: number;
  active: boolean;
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
  { platform: 'email', icon: Mail },
  { platform: 'phone', icon: Phone },
  { platform: 'website', icon: Globe },
];

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
  
  const customBg = config.primaryColor ? { backgroundColor: config.primaryColor } : {};
  const customText = config.textColor ? { color: config.textColor } : {};
  const customButton = config.secondaryColor ? { 
    backgroundColor: config.secondaryColor,
    color: config.textColor 
  } : {};

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 ${!config.primaryColor ? styles.bg : ''}`}
      style={config.primaryColor ? customBg : {}}
    >
      <div className="w-full max-w-2xl space-y-8 py-8">
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

              // Formatar URLs especiais
              if (social.platform === 'email') {
                href = `mailto:${url}`;
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

            return (
              <a
                key={link.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full p-4 text-center font-semibold text-lg transition-all hover:scale-[1.02] ${!config.secondaryColor ? styles.button : 'rounded-lg'}`}
                style={config.secondaryColor ? customButton : {}}
              >
                {link.title}
              </a>
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
  );
}
