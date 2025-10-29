import React from "react";
import { cn } from "@/lib/utils";

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder.svg",
  ...props
}) => {
  // Use fallback immediately if src is empty, null, or undefined
  const initialSrc = src && src.toString().trim() !== '' ? src as string : fallbackSrc;
  const [imgSrc, setImgSrc] = React.useState<string>(initialSrc);

  // Update imgSrc when src prop changes
  React.useEffect(() => {
    const newSrc = src && src.toString().trim() !== '' ? src as string : fallbackSrc;
    setImgSrc(newSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setImgSrc(fallbackSrc)}
      className={cn("object-contain", className)}
      {...props}
    />
  );
};

export default SafeImage;
