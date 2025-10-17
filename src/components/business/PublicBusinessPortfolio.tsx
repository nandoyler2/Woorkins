import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageIcon } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  description: string | null;
}

interface PublicBusinessPortfolioProps {
  businessId: string;
}

export function PublicBusinessPortfolio({ businessId }: PublicBusinessPortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, [businessId]);

  const loadPortfolio = async () => {
    // Check if feature is active
    const { data: featureData } = await supabase
      .from("business_profile_features")
      .select("is_active")
      .eq("business_id", businessId)
      .eq("feature_key", "portfolio")
      .maybeSingle();

    if (!featureData?.is_active) return;
    setIsActive(true);

    // Load portfolio items
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("business_id", businessId)
      .order("order_index", { ascending: true });

    setPortfolio(data || []);
  };

  if (!isActive || portfolio.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6">Portfólio</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {portfolio.map((item) => (
          <div key={item.id} className="group space-y-2">
            <div className="relative overflow-hidden rounded-lg border shadow-sm hover:shadow-md transition-all">
              <SafeImage
                src={item.media_url}
                alt={item.title}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
