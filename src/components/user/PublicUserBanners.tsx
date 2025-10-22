import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string;
  order_index: number;
}

interface PublicUserBannersProps {
  userId: string;
}

export function PublicUserBanners({ userId }: PublicUserBannersProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadBanners();
  }, [userId]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("user_banners")
        .select("*")
        .eq("profile_id", userId)
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setBanners(data);
      }
    } catch (error) {
      console.error("Error loading banners:", error);
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
    <div className="w-full h-48 md:h-60 lg:h-72 relative overflow-hidden bg-muted">
      {currentBanner.link_url ? (
        <a
          href={currentBanner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
        >
          <BannerContent />
        </a>
      ) : (
        <BannerContent />
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
