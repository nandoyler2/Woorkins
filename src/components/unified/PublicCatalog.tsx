import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/components/ui/safe-image';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
}

interface PublicCatalogProps {
  entityType: 'user' | 'business';
  entityId: string;
  onNegotiateClick?: (item: CatalogItem) => void;
}

export function PublicCatalog({ entityType, entityId, onNegotiateClick }: PublicCatalogProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    loadCatalog();
  }, [entityId, entityType]);

  const loadCatalog = async () => {
    const tableName = entityType === 'user' ? 'user_catalog_items' : 'business_catalog_items';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, entityId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data as unknown as CatalogItem[]);
    }
  };

  if (items.length === 0) return null;

  return (
    <Card className="mb-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-green-500">💼</span>
          Catálogo de Serviços
        </CardTitle>
        <CardDescription>Conheça nossos produtos e serviços</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="border-2 border-green-500/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              {item.image_url && (
                <div className="aspect-video overflow-hidden">
                  <SafeImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">{item.name}</h4>
                {item.category && (
                  <Badge variant="secondary" className="mb-2 bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30">{item.category}</Badge>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                    R$ {item.price.toFixed(2)}
                  </span>
                  {onNegotiateClick && (
                    <Button size="sm" onClick={() => onNegotiateClick(item)} className="bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg transition-all">
                      Negociar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
