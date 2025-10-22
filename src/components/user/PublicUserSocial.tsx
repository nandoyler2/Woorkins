import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram, Linkedin, Twitter, Phone, Mail, Globe } from "lucide-react";

interface SocialData {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
}

interface PublicUserSocialProps {
  userId: string;
}

export function PublicUserSocial({ userId }: PublicUserSocialProps) {
  const [social, setSocial] = useState<SocialData | null>(null);

  useEffect(() => {
    loadSocial();
  }, [userId]);

  const loadSocial = async () => {
    try {
      // Dados sociais estão na tabela profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("website, facebook, instagram, linkedin, twitter, whatsapp, website_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSocial({
          facebook: data.facebook,
          instagram: data.instagram,
          linkedin: data.linkedin,
          twitter: data.twitter,
          website: data.website || data.website_url,
          phone: data.whatsapp,
          email: null,
        });
      }
    } catch (error) {
      console.error("Error loading social:", error);
    }
  };

  if (!social) return null;

  const hasAnySocial = social.facebook || social.instagram || social.linkedin || 
                       social.twitter || social.website || social.phone || social.email;

  if (!hasAnySocial) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Redes Sociais & Contato</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {social.facebook && (
            <a
              href={social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </a>
          )}
          {social.instagram && (
            <a
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </a>
          )}
          {social.linkedin && (
            <a
              href={social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              <span>LinkedIn</span>
            </a>
          )}
          {social.twitter && (
            <a
              href={social.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span>Twitter</span>
            </a>
          )}
          {social.website && (
            <a
              href={social.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Website</span>
            </a>
          )}
          {social.phone && (
            <a
              href={`tel:${social.phone}`}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{social.phone}</span>
            </a>
          )}
          {social.email && (
            <a
              href={`mailto:${social.email}`}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="break-all">{social.email}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
