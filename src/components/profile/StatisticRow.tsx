import { LucideIcon } from 'lucide-react';

interface StatisticRowProps {
  icon: LucideIcon;
  label: string;
  value: number;
  iconColor: string;
}

export function StatisticRow({ icon: Icon, label, value, iconColor }: StatisticRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconColor}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
