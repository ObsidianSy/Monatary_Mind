import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "./MiniSparkline";
import { ValueDisplay } from "./ValueDisplay";

interface FinanceCardProps {
  title: string;
  description?: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  badge?: {
    label: string;
    variant?: "default" | "outline" | "secondary" | "destructive";
  };
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
  sparklineData?: number[];
  onClick?: () => void;
}

const variantStyles = {
  default: "border-border",
  success: "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
  warning: "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10", 
  destructive: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
};

const iconStyles = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive"
};

export function FinanceCard({ 
  title, 
  description, 
  value, 
  icon, 
  trend,
  badge, 
  variant = "default",
  className,
  sparklineData,
  onClick
}: FinanceCardProps) {
  const sparklineColor = variant === "default" ? "hsl(var(--primary))" : 
                         variant === "success" ? "hsl(var(--success))" :
                         variant === "warning" ? "hsl(var(--warning))" :
                         "hsl(var(--destructive))";

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-200 hover:scale-[1.02]", 
        variantStyles[variant], 
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {badge && (
            <Badge variant={badge.variant || "outline"} className="text-xs w-fit">
              {badge.label}
            </Badge>
          )}
        </div>
        <div className={cn("w-5 h-5", iconStyles[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {typeof value === "number" ? (
          <ValueDisplay 
            value={value} 
            size="xl" 
            variant={variant === "warning" ? "muted" : variant} 
          />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
        {trend && (
          <div className="flex items-center mt-2 text-xs">
            <span className={cn(
              "font-medium",
              trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 -mb-2">
            <MiniSparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}