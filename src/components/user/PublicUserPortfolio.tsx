import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeImage } from "@/components/ui/safe-image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
}

interface PublicUserPortfolioProps {
  userId: string;
}

export function PublicUserPortfolio({ userId }: PublicUserPortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from("user_portfolio_items")
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setPortfolio(data);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
    }
  };

  if (portfolio.length === 0) return null;

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Portfólio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
              >
                {item.image_url && (
                  <SafeImage
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm font-semibold px-2 text-center">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">{selectedItem.title}</h2>
              
              {selectedItem.image_url && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <SafeImage 
                    src={selectedItem.image_url} 
                    alt={selectedItem.title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}

              {selectedItem.description && (
                <p className="text-muted-foreground">{selectedItem.description}</p>
              )}

              {selectedItem.project_url && (
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedItem.project_url!, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Projeto Completo
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
