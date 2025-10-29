import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  fullUrl?: string | null;
  thumbnailUrl?: string | null;
  fallback: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  alt?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
};

/**
 * Avatar otimizado que usa thumbnails para tamanhos pequenos
 * e imagem completa apenas para visualizações grandes
 */
export const OptimizedAvatar = React.forwardRef<
  HTMLSpanElement,
  OptimizedAvatarProps
>(({ fullUrl, thumbnailUrl, fallback, size = 'md', className, alt }, ref) => {
  // Usa thumbnail para tamanhos pequenos e médios, full apenas para grandes
  const useThumbnail = size === 'xs' || size === 'sm' || size === 'md';
  const imageUrl = useThumbnail ? (thumbnailUrl || fullUrl) : (fullUrl || thumbnailUrl);

  return (
    <Avatar ref={ref} className={cn(sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={alt || fallback} />}
      <AvatarFallback className={cn(sizeClasses[size])}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
});

OptimizedAvatar.displayName = "OptimizedAvatar";
