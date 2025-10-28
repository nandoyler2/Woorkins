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
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(src as string);

  // Update imgSrc when src prop changes
  React.useEffect(() => {
    setImgSrc(src as string);
  }, [src]);

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
