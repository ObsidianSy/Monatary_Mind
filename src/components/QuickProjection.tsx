import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useFinanceiroClient, useFinanceiroRead } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { ValueDisplay } from "@/components/ValueDisplay";

type ProjectionPeriod = 7 | 15 | 30;

export function QuickProjection() {
  const [selectedPeriod, setSelectedPeriod] = useState<ProjectionPeriod>(7);
  const navigate = useNavigate();
  
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: fluxoData, loading } = useFinanceiroRead(client, "fluxo_30d", {});
  const { data: saldoContas } = useFinanceiroRead(client, "saldo_conta", {});
  const { accounts } = useAccounts();

  const saldoAtual = saldoContas?.reduce((total: number, conta: any) => {
    const saldo = typeof conta.saldo_atual === 'string' ? parseFloat(conta.saldo_atual) : conta.saldo_atual;
    return total + (saldo || 0);
  }, 0) || accounts.reduce((sum, account) => {
    const balance = typeof account.saldo_inicial === 'string' ? parseFloat(account.saldo_inicial) : account.saldo_inicial;
    return sum + (balance || 0);
  }, 0);

  const projectionData = useMemo(() => {
    if (!fluxoData || fluxoData.length === 0) {
      return {
        income: 0,
        expenses: 0,
        balance: saldoAtual,
        previousBalance: saldoAtual
      };
    }

    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + selectedPeriod);

    const relevantData = fluxoData.filter((item: any) => {
      const itemDate = new Date(item.dia);
      return itemDate <= targetDate;
    });

    const income = relevantData.reduce((sum: number, item: any) => {
      const val = typeof item.entradas === 'string' ? parseFloat(item.entradas) : item.entradas;
      return sum + (val || 0);
    }, 0);

    const expenses = relevantData.reduce((sum: number, item: any) => {
      const val = typeof item.saidas === 'string' ? parseFloat(item.saidas) : item.saidas;
      return sum + (val || 0);
    }, 0);

    const projectedBalance = saldoAtual + income - expenses;

    return {
      income,
      expenses,
      balance: projectedBalance,
      previousBalance: saldoAtual
    };
  }, [fluxoData, selectedPeriod, saldoAtual]);

  const netFlow = projectionData.income - projectionData.expenses;
  const growth = projectionData.previousBalance > 0 
    ? ((projectionData.balance - projectionData.previousBalance) / projectionData.previousBalance) * 100 
    : 0;

  const periodLabels = {
    7: "7 dias",
    15: "15 dias",
    30: "30 dias"
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Projeção Rápida
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/projecao')}
          >
            Ver Detalhes
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {(Object.keys(periodLabels) as unknown as ProjectionPeriod[]).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={selectedPeriod === period ? "bg-gradient-primary" : ""}
            >
              {periodLabels[period]}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded-lg animate-pulse"></div>
            <div className="h-16 bg-muted rounded-lg animate-pulse"></div>
            <div className="h-16 bg-muted rounded-lg animate-pulse"></div>
            <div className="h-20 bg-muted rounded-lg animate-pulse"></div>
          </div>
        ) : (
          <>
            {/* Current Balance */}
            <div className="p-4 rounded-lg bg-gradient-card border">
              <div className="text-sm text-muted-foreground mb-1">Saldo Atual</div>
              <ValueDisplay value={saldoAtual} size="xl" variant="default" className="text-primary" />
            </div>

            {/* Projection Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Receitas</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-success">+</span>
                  <ValueDisplay value={projectionData.income} size="md" variant="success" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">Despesas</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-destructive">-</span>
                  <ValueDisplay value={projectionData.expenses} size="md" variant="destructive" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Fluxo Líquido</span>
                  <Badge variant={netFlow >= 0 ? "default" : "destructive"} className="text-xs">
                    {netFlow >= 0 ? "Positivo" : "Negativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className={netFlow >= 0 ? 'text-success' : 'text-destructive'}>
                    {netFlow >= 0 ? '+' : ''}
                  </span>
                  <ValueDisplay value={Math.abs(netFlow)} size="md" variant={netFlow >= 0 ? "success" : "destructive"} />
                </div>
              </div>
            </div>

            {/* Projected Balance */}
            <div className="p-4 rounded-lg bg-gradient-primary text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Saldo Projetado ({periodLabels[selectedPeriod]})</div>
                  <ValueDisplay value={projectionData.balance} size="xl" className="text-primary-foreground" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-75">Crescimento</div>
                  <div className="flex items-center gap-1">
                    {growth >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
