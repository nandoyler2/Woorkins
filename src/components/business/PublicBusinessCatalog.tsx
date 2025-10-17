import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
}

interface PublicBusinessCatalogProps {
  businessId: string;
}

export function PublicBusinessCatalog({ businessId }: PublicBusinessCatalogProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadItems();
  }, [businessId]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("business_catalog_items")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    setItems(data || []);
  };

  const handleBuy = async (item: CatalogItem) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para comprar",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // TODO: Implementar fluxo de pagamento Mercado Pago
    toast({
      title: "Em breve!",
      description: "Sistema de pagamento será implementado em breve",
    });
  };

  const handleContact = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para entrar em contato",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // TODO: Abrir chat/negociação
    toast({
      title: "Em breve!",
      description: "Chat será implementado em breve",
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ShoppingBag className="h-6 w-6" />
        Catálogo
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
            )}
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                {item.category && (
                  <Badge variant="outline">{item.category}</Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}
              <p className="text-2xl font-bold text-primary mb-4">
                R$ {item.price.toFixed(2)}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleBuy(item)}
                  className="flex-1"
                >
                  Comprar
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={handleContact}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
