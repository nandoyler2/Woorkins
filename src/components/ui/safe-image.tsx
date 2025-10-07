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
