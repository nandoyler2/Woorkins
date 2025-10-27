import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, ExternalLink } from "lucide-react";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  image_url?: string | null;
  icon_name?: string | null;
  order_index: number;
}

interface PublicBusinessLinktreeProps {
  businessId: string;
}

export function PublicBusinessLinktree({ businessId }: PublicBusinessLinktreeProps) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [businessId]);

  const loadLinks = async () => {
    // Check if feature is active
    const { data: featureData } = await supabase
      .from("business_profile_features")
      .select("is_active")
      .eq("business_id", businessId)
      .eq("feature_key", "linktree")
      .maybeSingle();

    if (!featureData?.is_active) return;
    setIsActive(true);

    // Load custom links
    const { data } = await supabase
      .from("business_custom_links")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("order_index");

    setLinks(data || []);
  };

  if (!isActive || links.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <LinkIcon className="h-6 w-6" />
        Links Importantes
      </h2>
      <div className="space-y-3">
        {links.map((link) => (
          <Card key={link.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full h-auto p-0 justify-between hover:bg-transparent"
                onClick={() => window.open(link.url, '_blank')}
              >
                <div className="flex items-center gap-3">
                  {link.image_url && (
                    <img
                      src={link.image_url}
                      alt={link.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <span className="font-medium text-left">{link.title}</span>
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
