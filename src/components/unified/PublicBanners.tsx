import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SafeImage } from '@/components/ui/safe-image';

interface Banner {
  id: string;
  image_url: string;
  title?: string;
  link_url?: string;
  order_index: number;
}

interface PublicBannersProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicBanners({ entityType, entityId }: PublicBannersProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadBanners();
  }, [entityId, entityType]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const loadBanners = async () => {
    const tableName = entityType === 'user' ? 'user_banners' : 'business_banners';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, entityId)
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (data && data.length > 0) {
      setBanners(data as unknown as Banner[]);
    }
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const BannerContent = () => (
    <SafeImage
      src={currentBanner.image_url}
      alt="Banner"
      className="w-full h-full object-cover"
    />
  );

  return (
    <div className="w-full h-48 md:h-60 lg:h-72 relative overflow-hidden bg-muted rounded-lg mb-6 border-4 border-primary/20 shadow-2xl hover:scale-[1.01] transition-all duration-300">
      {currentBanner.link_url ? (
        <a
          href={currentBanner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
        >
          <BannerContent />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </a>
      ) : (
        <>
          <BannerContent />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-3 rounded-full transition-all shadow-lg ${
                idx === currentIndex
                  ? "bg-white w-10 shadow-white/50"
                  : "bg-white/50 hover:bg-white/75 w-3"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
