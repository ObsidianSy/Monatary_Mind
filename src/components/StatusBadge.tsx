import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, Minus } from "lucide-react";

export type BadgeStatus = "success" | "pending" | "error" | "warning" | "info" | "default";
export type BadgeSize = "xs" | "sm" | "md";

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    variant: "default" as const,
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20"
  },
  pending: {
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
  },
  error: {
    variant: "destructive" as const,
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
  },
  warning: {
    variant: "outline" as const,
    icon: AlertCircle,
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
  },
  info: {
    variant: "outline" as const,
    icon: Minus,
    className: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
  },
  default: {
    variant: "outline" as const,
    icon: Minus,
    className: ""
  }
};

const sizeStyles = {
  xs: "text-[10px] px-1 py-0 h-4",
  sm: "text-xs px-2 py-0.5 h-5",
  md: "text-sm px-2.5 py-1 h-6"
};

export function StatusBadge({ 
  status, 
  label, 
  size = "sm",
  showIcon = false,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(
        config.className,
        sizeStyles[size],
        "inline-flex items-center gap-1",
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </Badge>
  );
}
