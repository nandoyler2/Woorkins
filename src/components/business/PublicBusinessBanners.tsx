import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Banner {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  order_index: number;
}

interface PublicBusinessBannersProps {
  businessId: string;
}

export function PublicBusinessBanners({ businessId }: PublicBusinessBannersProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadBanners();
  }, [businessId]);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const loadBanners = async () => {
    const { data } = await supabase
      .from("business_banners")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("order_index");

    setBanners(data || []);
  };

  if (banners.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <Carousel className="w-full">
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              {banner.link_url ? (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="w-full h-64 md:h-96 object-cover rounded-lg"
                  />
                  {banner.title && (
                    <p className="text-center mt-2 font-medium">{banner.title}</p>
                  )}
                </a>
              ) : (
                <>
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="w-full h-64 md:h-96 object-cover rounded-lg"
                  />
                  {banner.title && (
                    <p className="text-center mt-2 font-medium">{banner.title}</p>
                  )}
                </>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </div>
  );
}
