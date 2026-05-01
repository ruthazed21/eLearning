import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

interface ProgressCardProps {
  title: string;
  value: number;
  total: number;
  icon: LucideIcon;
  color?: string;
}

export function ProgressCard({ 
  title, 
  value, 
  total, 
  icon: Icon,
  color = 'blue'
}: ProgressCardProps) {
  const percentage = Math.round((value / total) * 100);
  
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  }[color] || 'bg-blue-100 text-blue-700';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{value}</span>
          <span className="text-gray-500">/ {total}</span>
        </div>
        <div className="space-y-1">
          <Progress value={percentage} aria-label={`${title}: ${percentage}%`} />
          <p className="text-xs text-gray-500 text-right">{percentage}% Complete</p>
        </div>
      </CardContent>
    </Card>
  );
}
