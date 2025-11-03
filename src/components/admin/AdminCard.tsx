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
    value: string;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
  gradient?: 'blue' | 'green' | 'orange' | 'purple';
  children?: ReactNode;
}

export function AdminCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  onClick,
  gradient,
  children,
}: AdminCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300 border-2 hover:shadow-xl',
        'border-blue-200 dark:border-blue-800',
        'bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-950/30',
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            gradient === 'blue' && 'bg-blue-100 dark:bg-blue-900',
            gradient === 'green' && 'bg-green-100 dark:bg-green-900',
            gradient === 'orange' && 'bg-orange-100 dark:bg-orange-900',
            gradient === 'purple' && 'bg-purple-100 dark:bg-purple-900',
            !gradient && 'bg-blue-100 dark:bg-blue-900'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              gradient === 'blue' && 'text-blue-700 dark:text-blue-300',
              gradient === 'green' && 'text-green-700 dark:text-green-300',
              gradient === 'orange' && 'text-orange-700 dark:text-orange-300',
              gradient === 'purple' && 'text-purple-700 dark:text-purple-300',
              !gradient && 'text-blue-700 dark:text-blue-300'
            )} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-teal-700 dark:from-blue-100 dark:to-teal-300 bg-clip-text text-transparent">
          {value}
        </div>
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            {description}
          </p>
        )}
        {trend && (
          <div className={cn(
            'text-xs mt-3 flex items-center gap-1 font-semibold',
            trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}