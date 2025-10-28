import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SafeImage } from '@/components/ui/safe-image';
import { Briefcase } from 'lucide-react';

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
      <Card className="mb-6 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-l-4 border-l-indigo-500 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-500" />
            Portfólio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="group relative cursor-pointer border-2 border-indigo-500/20 rounded-lg overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300" onClick={() => setSelectedImage(item.image_url)}>
                <div className="aspect-video relative overflow-hidden">
                  <SafeImage
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500/5 to-transparent">
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
