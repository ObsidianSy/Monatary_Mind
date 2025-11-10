import { Card, CardContent } from "@/components/ui/card";
import { cn, censorValue } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "destructive" | "primary";
  className?: string;
}

const variantStyles = {
  default: "bg-gradient-to-br from-card via-card to-muted/20 border-border",
  primary: "bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20",
  success: "bg-gradient-to-br from-success/10 via-success/5 to-background border-success/20",
  warning: "bg-gradient-to-br from-warning/10 via-warning/5 to-background border-warning/20",
  destructive: "bg-gradient-to-br from-destructive/10 via-destructive/5 to-background border-destructive/20",
};

const iconContainerStyles = {
  default: "bg-muted/50",
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
};

const iconStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const { isValuesCensored } = usePrivacy();
  const displayValue = censorValue(value, isValuesCensored);
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight mb-1">{displayValue}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-3">
                <div
                  className={cn(
                    "text-xs font-semibold px-2 py-1 rounded-full",
                    trend.isPositive !== false
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {trend.value > 0 ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </div>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-xl",
              iconContainerStyles[variant]
            )}
          >
            <Icon className={cn("w-6 h-6", iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-background/50 to-transparent rounded-full blur-3xl -mr-16 -mt-16" />
    </Card>
  );
}
