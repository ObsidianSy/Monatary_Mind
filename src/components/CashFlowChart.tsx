import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn, formatCurrency, censorValue } from "@/lib/utils";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface CashFlowChartProps {
  data: {
    month: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }[];
  className?: string;
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  const { isValuesCensored } = usePrivacy();
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {censorValue(formatCurrency(entry.value), isValuesCensored)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader>
        <CardTitle>Fluxo de Caixa</CardTitle>
        <CardDescription>Receitas vs Despesas nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => censorValue(formatCurrency(value), isValuesCensored)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar 
              dataKey="receitas" 
              name="Receitas"
              fill="hsl(var(--success))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="despesas" 
              name="Despesas"
              fill="hsl(var(--destructive))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
