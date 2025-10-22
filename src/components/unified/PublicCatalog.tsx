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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Catálogo de Serviços</CardTitle>
        <CardDescription>Conheça nossos produtos e serviços</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
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
                  <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    R$ {item.price.toFixed(2)}
                  </span>
                  {onNegotiateClick && (
                    <Button size="sm" onClick={() => onNegotiateClick(item)}>
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
