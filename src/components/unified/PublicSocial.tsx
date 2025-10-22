import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Linkedin, Twitter, Globe, Phone } from 'lucide-react';

interface SocialLinks {
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  website_url: string | null;
}

interface PublicSocialProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicSocial({ entityType, entityId }: PublicSocialProps) {
  const [links, setLinks] = useState<SocialLinks | null>(null);

  useEffect(() => {
    loadLinks();
  }, [entityId, entityType]);

  const loadLinks = async () => {
    const tableName = entityType === 'user' ? 'profiles' : 'business_profiles';

    const { data } = await supabase
      .from(tableName as any)
      .select('facebook, instagram, twitter, linkedin, whatsapp, website_url')
      .eq('id', entityId)
      .maybeSingle();

    if (data) {
      setLinks(data as unknown as SocialLinks);
    }
  };

  if (!links) return null;

  const hasAnyLink = Object.values(links).some(link => link);
  if (!hasAnyLink) return null;

  const socialMedia = [
    { icon: Facebook, label: 'Facebook', url: links.facebook, color: 'text-blue-600' },
    { icon: Instagram, label: 'Instagram', url: links.instagram, color: 'text-pink-600' },
    { icon: Twitter, label: 'Twitter', url: links.twitter, color: 'text-sky-500' },
    { icon: Linkedin, label: 'LinkedIn', url: links.linkedin, color: 'text-blue-700' },
    { icon: Phone, label: 'WhatsApp', url: links.whatsapp ? `https://wa.me/${links.whatsapp}` : null, color: 'text-green-600' },
    { icon: Globe, label: 'Website', url: links.website_url, color: 'text-gray-600' },
  ].filter(item => item.url);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Redes Sociais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {socialMedia.map(({ icon: Icon, label, url, color }) => (
            <Button
              key={label}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              asChild
            >
              <a href={url!} target="_blank" rel="noopener noreferrer">
                <Icon className={`h-6 w-6 ${color}`} />
                <span className="text-xs">{label}</span>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
