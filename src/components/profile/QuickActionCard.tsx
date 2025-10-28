import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
}

export function QuickActionCard({ title, description, icon: Icon, gradient, onClick }: QuickActionCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-0 ${gradient}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-white">
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs opacity-90">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
