import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, censorValue } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface InsightCardProps {
  title: string;
  insights: {
    label: string;
    value: string;
    trend?: number;
    icon?: LucideIcon;
  }[];
  className?: string;
}

export function InsightCard({ title, insights, className }: InsightCardProps) {
  const { isValuesCensored } = usePrivacy();
  
  const getTrendIcon = (trend?: number) => {
    if (!trend) return Minus;
    if (trend > 0) return TrendingUp;
    return TrendingDown;
  };

  const getTrendColor = (trend?: number) => {
    if (!trend || Math.abs(trend) < 0.1) return "text-muted-foreground";
    if (trend > 0) return "text-success";
    return "text-destructive";
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const TrendIcon = getTrendIcon(insight.trend);
          const Icon = insight.icon;
          
          return (
            <div key={index} className="flex items-center justify-between pb-4 last:pb-0 border-b last:border-0">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{insight.label}</p>
                  <p className="text-lg font-bold mt-1">{censorValue(insight.value, isValuesCensored)}</p>
                </div>
              </div>
              {insight.trend !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <TrendIcon className={cn("w-3 h-3", getTrendColor(insight.trend))} />
                  <span className={getTrendColor(insight.trend)}>
                    {Math.abs(insight.trend).toFixed(1)}%
                  </span>
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
