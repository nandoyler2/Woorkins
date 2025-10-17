import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Globe, Facebook, Instagram, Linkedin, Twitter, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface BusinessSocialProps {
  businessId: string;
}

interface SocialData {
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
}

export function PublicBusinessSocial({ businessId }: BusinessSocialProps) {
  const [social, setSocial] = useState<SocialData | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadSocialData();
  }, [businessId]);

  const loadSocialData = async () => {
    // Check if feature is active
    const { data: featureData } = await supabase
      .from("business_profile_features")
      .select("is_active")
      .eq("business_id", businessId)
      .eq("feature_key", "social")
      .maybeSingle();

    if (!featureData?.is_active) return;
    setIsActive(true);

    // Load social data
    const { data } = await supabase
      .from("business_profiles")
      .select("whatsapp, facebook, instagram, linkedin, twitter, website_url, phone, email")
      .eq("id", businessId)
      .single();

    if (data) {
      setSocial(data);
    }
  };

  if (!isActive || !social) return null;

  const hasSocialLinks = social.whatsapp || social.facebook || social.instagram || 
                         social.linkedin || social.twitter || social.website_url ||
                         social.phone || social.email;

  if (!hasSocialLinks) return null;

  return (
    <Card className="bg-card border shadow-sm">
      <CardContent className="p-6">
        <h2 className="font-bold mb-4">Redes Sociais e Contatos</h2>
        <div className="flex flex-wrap gap-2">
          {social.whatsapp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://wa.me/${social.whatsapp}`, '_blank')}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          )}
          {social.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${social.phone}`, '_blank')}
              className="gap-2"
            >
              <Phone className="w-4 h-4" />
              Telefone
            </Button>
          )}
          {social.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`mailto:${social.email}`, '_blank')}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              E-mail
            </Button>
          )}
          {social.website_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(social.website_url!, '_blank')}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              Website
            </Button>
          )}
          {social.facebook && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(social.facebook!, '_blank')}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
          )}
          {social.instagram && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(social.instagram!, '_blank')}
              className="gap-2"
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </Button>
          )}
          {social.linkedin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(social.linkedin!, '_blank')}
              className="gap-2"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
          )}
          {social.twitter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(social.twitter!, '_blank')}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
