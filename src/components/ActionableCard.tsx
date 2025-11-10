import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, censorValue } from "@/lib/utils";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { ReactNode } from "react";

interface ActionableCardProps {
  title: string;
  description?: string;
  value?: string | number;
  status?: "success" | "warning" | "error" | "info" | "default";
  priority?: "high" | "medium" | "low";
  icon?: ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "secondary" | "outline" | "ghost";
    icon?: ReactNode;
    disabled?: boolean;
  }[];
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  isNew?: boolean;
}

const statusStyles = {
  success: "border-success/20 bg-gradient-to-r from-success/5 to-success/10",
  warning: "border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10",
  error: "border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10",
  info: "border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10",
  default: "border-border bg-card"
};

const statusTextColors = {
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-primary",
  default: "text-foreground"
};

const priorityStyles = {
  high: "border-l-4 border-l-destructive shadow-lg",
  medium: "border-l-4 border-l-warning",
  low: "border-l-4 border-l-muted-foreground/30"
};

export function ActionableCard({
  title,
  description,
  value,
  status = "default",
  priority,
  icon,
  badge,
  actions = [],
  onClick,
  children,
  className,
  compact = false,
  isNew = false
}: ActionableCardProps) {
  const { isValuesCensored } = usePrivacy();
  
  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      if (isNaN(val)) {
        console.warn('ActionableCard: valor NaN detectado');
        return 'R$ 0,00';
      }
      const formatted = formatCurrency(val);
      return censorValue(formatted, isValuesCensored);
    }
    return censorValue(val, isValuesCensored);
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md relative",
        statusStyles[status],
        priority && priorityStyles[priority],
        onClick && "cursor-pointer hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      {isNew && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="default" className="animate-pulse">Novo</Badge>
        </div>
      )}
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn(
                "p-2 rounded-lg bg-muted",
                statusTextColors[status]
              )}>
                {icon}
              </div>
            )}
            <div>
              <CardTitle className={cn(
                "text-sm font-medium text-muted-foreground",
                compact && "text-xs"
              )}>
                {title}
              </CardTitle>
              {description && (
                <p className={cn(
                  "text-xs text-muted-foreground mt-1",
                  compact && "text-[10px]"
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {badge && (
            <Badge variant={badge.variant || "outline"} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "space-y-2")}>
        {value && (
          <div className={cn(
            "text-2xl font-bold",
            statusTextColors[status],
            compact && "text-xl"
          )}>
            {formatValue(value)}
          </div>
        )}
        
        {children}
        
        {actions.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-2 pt-2",
            compact && "pt-1"
          )}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size={compact ? "sm" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                disabled={action.disabled}
                className="flex items-center gap-1"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}