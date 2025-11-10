import { usePrivacy } from "@/contexts/PrivacyContext";
import { formatCurrency, censorValue } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ValueDisplayProps {
  value: number | string;
  className?: string;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "success" | "destructive" | "muted";
}

const sizeStyles = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl font-bold"
};

const variantStyles = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  muted: "text-muted-foreground"
};

export function ValueDisplay({ 
  value, 
  className, 
  showTrend = false,
  size = "md",
  variant = "default"
}: ValueDisplayProps) {
  const { isValuesCensored } = usePrivacy();
  
  // Convert value to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Format the currency
  const formattedValue = formatCurrency(numValue);
  
  // Apply censorship if privacy is enabled
  const displayValue = censorValue(formattedValue, isValuesCensored);
  
  // Determine variant based on value if showTrend is true
  const trendVariant = showTrend 
    ? (numValue >= 0 ? "success" : "destructive")
    : variant;
  
  return (
    <span className={cn(
      sizeStyles[size],
      variantStyles[trendVariant],
      className
    )}>
      {displayValue}
    </span>
  );
}
