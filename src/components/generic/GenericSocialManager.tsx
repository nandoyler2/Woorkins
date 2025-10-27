import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  website_url?: string;
}

interface GenericSocialManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericSocialManager({ entityType, entityId }: GenericSocialManagerProps) {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_profiles' : 'profiles';

  useEffect(() => {
    loadSocialLinks();
  }, [entityId]);

  const loadSocialLinks = async () => {
    try {
      const selectQuery = entityType === 'business'
        ? supabase.from('business_profiles').select("facebook, instagram, twitter, linkedin, whatsapp, website_url").eq("id", entityId).single()
        : supabase.from('profiles').select("facebook, instagram, twitter, linkedin, whatsapp, website_url").eq("id", entityId).single();
      
      const { data, error } = await selectQuery;

      if (error) throw error;

      setSocialLinks({
        facebook: (data as any).facebook || "",
        instagram: (data as any).instagram || "",
        twitter: (data as any).twitter || "",
        linkedin: (data as any).linkedin || "",
        whatsapp: (data as any).whatsapp || "",
        website_url: (data as any).website_url || "",
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
      const updateData = {
        facebook: socialLinks.facebook || null,
        instagram: socialLinks.instagram || null,
        twitter: socialLinks.twitter || null,
        linkedin: socialLinks.linkedin || null,
        whatsapp: socialLinks.whatsapp || null,
        website_url: socialLinks.website_url || null,
      };

      const { error } = await supabase
        .from(tableName as any)
        .update(updateData as any)
        .eq("id", entityId);

      if (error) throw error;

      toast({
        title: "Redes sociais atualizadas",
        description: "Suas redes sociais foram atualizadas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Redes Sociais
        </CardTitle>
        <CardDescription>
          Adicione links para suas redes sociais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="facebook">Facebook</Label>
          <Input
            id="facebook"
            value={socialLinks.facebook || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, facebook: e.target.value })
            }
            placeholder="https://facebook.com/..."
          />
        </div>

        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={socialLinks.instagram || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, instagram: e.target.value })
            }
            placeholder="https://instagram.com/..."
          />
        </div>

        <div>
          <Label htmlFor="twitter">Twitter / X</Label>
          <Input
            id="twitter"
            value={socialLinks.twitter || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, twitter: e.target.value })
            }
            placeholder="https://twitter.com/..."
          />
        </div>

        <div>
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            value={socialLinks.linkedin || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, linkedin: e.target.value })
            }
            placeholder="https://linkedin.com/..."
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            value={socialLinks.whatsapp || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, whatsapp: e.target.value })
            }
            placeholder="+55 11 99999-9999"
          />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={socialLinks.website_url || ""}
            onChange={(e) =>
              setSocialLinks({ ...socialLinks, website_url: e.target.value })
            }
            placeholder="https://..."
          />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          Salvar Redes Sociais
        </Button>
      </CardContent>
    </Card>
  );
}
