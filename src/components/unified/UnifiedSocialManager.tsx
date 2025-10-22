import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  website_url?: string;
}

interface UnifiedSocialManagerProps {
  profileId: string;
}

export function UnifiedSocialManager({ profileId }: UnifiedSocialManagerProps) {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSocialLinks();
  }, [profileId]);

  const loadSocialLinks = async () => {
    try {
      const { data, error} = await supabase
        .from('profiles')
        .select('facebook, instagram, twitter, linkedin, whatsapp, website_url')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      setSocialLinks({
        facebook: data.facebook || "",
        instagram: data.instagram || "",
        twitter: data.twitter || "",
        linkedin: data.linkedin || "",
        whatsapp: data.whatsapp || "",
        website_url: data.website_url || "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar redes sociais",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(socialLinks)
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Redes sociais atualizadas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Facebook</label>
          <Input
            placeholder="https://facebook.com/seu-perfil"
            value={socialLinks.facebook || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Instagram</label>
          <Input
            placeholder="https://instagram.com/seu-perfil"
            value={socialLinks.instagram || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Twitter</label>
          <Input
            placeholder="https://twitter.com/seu-perfil"
            value={socialLinks.twitter || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">LinkedIn</label>
          <Input
            placeholder="https://linkedin.com/in/seu-perfil"
            value={socialLinks.linkedin || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">WhatsApp</label>
          <Input
            placeholder="5511999999999"
            value={socialLinks.whatsapp || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Website</label>
          <Input
            placeholder="https://seu-site.com"
            value={socialLinks.website_url || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, website_url: e.target.value })}
          />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          Salvar Redes Sociais
        </Button>
      </div>
    </Card>
  );
}
