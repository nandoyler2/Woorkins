import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SafeImage } from '@/components/ui/safe-image';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  project_url: string | null;
}

interface PublicPortfolioProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicPortfolio({ entityType, entityId }: PublicPortfolioProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, [entityId, entityType]);

  const loadPortfolio = async () => {
    const tableName = entityType === 'user' ? 'user_portfolio_items' : 'business_portfolio_items';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, entityId)
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (data) {
      setItems(data as unknown as PortfolioItem[]);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Portfólio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedImage(item.image_url)}>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <SafeImage
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="mt-2">
                  <h4 className="font-semibold">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <SafeImage src={selectedImage} alt="Portfolio item" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
