import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";
import { 
  ExternalLink, Tag, Folder, X, ChevronLeft, ChevronRight,
  Play, ImageIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PortfolioItem {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  external_link: string | null;
  created_at: string;
}

interface PublicBusinessPortfolioProps {
  businessId: string;
}

export function PublicBusinessPortfolio({ businessId }: PublicBusinessPortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [filteredPortfolio, setFilteredPortfolio] = useState<PortfolioItem[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadPortfolio();
  }, [businessId]);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredPortfolio(portfolio);
    } else {
      setFilteredPortfolio(
        portfolio.filter(item => item.category === selectedCategory)
      );
    }
  }, [selectedCategory, portfolio]);

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

    if (data) {
      const items = data as unknown as PortfolioItem[];
      setPortfolio(items);
      setFilteredPortfolio(items);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(items.filter(item => item.category).map(item => item.category))
      ) as string[];
      setCategories(uniqueCategories);
    }
  };

  const openLightbox = (item: PortfolioItem, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedItem(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (selectedIndex - 1 + filteredPortfolio.length) % filteredPortfolio.length
      : (selectedIndex + 1) % filteredPortfolio.length;
    
    setSelectedIndex(newIndex);
    setSelectedItem(filteredPortfolio[newIndex]);
  };

  if (!isActive || portfolio.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Portfólio</h2>
        
        {categories.length > 0 && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPortfolio.map((item, index) => (
          <div 
            key={item.id} 
            className="group cursor-pointer"
            onClick={() => openLightbox(item, index)}
          >
            <div className="relative overflow-hidden rounded-lg border shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative aspect-[4/3]">
                <SafeImage
                  src={item.media_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm opacity-90 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
                
                {item.media_type?.startsWith('video') && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-4">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}

                {item.category && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                      <Folder className="h-3 w-3 mr-1" />
                      {item.category}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          {selectedItem && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedItem.title}</DialogTitle>
                    {selectedItem.category && (
                      <Badge variant="secondary" className="mb-2">
                        <Folder className="h-3 w-3 mr-1" />
                        {selectedItem.category}
                      </Badge>
                    )}
                  </div>
                  {selectedItem.external_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={selectedItem.external_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Projeto
                      </a>
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="relative flex-1 bg-muted/30">
                {selectedItem.media_type?.startsWith('image') ? (
                  <div className="h-full flex items-center justify-center p-6">
                    <SafeImage
                      src={selectedItem.media_url}
                      alt={selectedItem.title}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-6">
                    <video
                      src={selectedItem.media_url}
                      className="max-h-full max-w-full rounded-lg"
                      controls
                      autoPlay
                    />
                  </div>
                )}

                {/* Navigation Arrows */}
                {filteredPortfolio.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox('prev');
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox('next');
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="p-6 pt-4 space-y-4">
                {selectedItem.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}

                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
