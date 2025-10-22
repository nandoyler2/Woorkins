import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeImage } from "@/components/ui/safe-image";
import { ShoppingBag } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
}

interface PublicUserCatalogProps {
  userId: string;
}

export function PublicUserCatalog({ userId }: PublicUserCatalogProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    loadCatalog();
  }, [userId]);

  const loadCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from("user_catalog_items")
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setItems(data as CatalogItem[]);
      }
    } catch (error) {
      console.error("Error loading catalog:", error);
    }
  };

  if (items.length === 0) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Catálogo de Serviços
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex gap-4 p-4">
                {item.image_url && (
                  <SafeImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}
                  {item.price !== null && (
                    <p className="text-sm font-bold text-primary">
                      R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
