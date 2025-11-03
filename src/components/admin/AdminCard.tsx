import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AdminCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  gradient?: string;
  children?: ReactNode;
}

export function AdminCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  onClick,
  gradient = 'from-primary/10 via-accent/10 to-secondary/10',
  children,
}: AdminCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-lg border-0 overflow-hidden',
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold">{value}</div>
            {trend && (
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          
          {children}
        </div>
      </CardContent>
    </Card>
  );
}