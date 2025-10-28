import { LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AchievementItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  date: Date;
  iconColor: string;
}

export function AchievementItem({ icon: Icon, title, description, date, iconColor }: AchievementItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`rounded-full p-2 ${iconColor}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}
