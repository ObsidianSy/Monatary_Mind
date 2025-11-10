import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "./CircularProgress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { cn, censorValue } from "@/lib/utils";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface HealthScoreProps {
  score: number;
  factors: {
    label: string;
    status: "good" | "warning" | "critical";
    description: string;
  }[];
  className?: string;
}

export function HealthScore({ score, factors, className }: HealthScoreProps) {
  const { isValuesCensored } = usePrivacy();
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: "Excelente", color: "text-success" };
    if (score >= 60) return { label: "Bom", color: "text-primary" };
    if (score >= 40) return { label: "Atenção", color: "text-warning" };
    return { label: "Crítico", color: "text-destructive" };
  };

  const scoreInfo = getScoreLabel(score);

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Saúde Financeira
          <Badge variant={score >= 60 ? "default" : "destructive"} className="ml-2">
            {scoreInfo.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Análise geral baseada em múltiplos indicadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center mb-6">
          <CircularProgress value={score} max={100} size={140} strokeWidth={12} />
          <p className={cn("text-2xl font-bold mt-2", scoreInfo.color)}>
            {score}/100
          </p>
        </div>

        <div className="space-y-3">
          {factors.map((factor, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {factor.status === "good" ? (
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
              ) : factor.status === "warning" ? (
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">{factor.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {censorValue(factor.description, isValuesCensored)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
