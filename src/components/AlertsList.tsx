import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Calendar, CreditCard, TrendingDown, X, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useTransactions, useCreditCards, useInvoices } from "@/hooks/useFinancialData";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency } from "@/lib/utils";
import { ValueDisplay } from "@/components/ValueDisplay";

interface Alert {
  id: string;
  type: "bill_due" | "overdue" | "high_usage" | "low_balance";
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
}

const alertIcons = {
  bill_due: Calendar,
  overdue: AlertTriangle,
  high_usage: CreditCard,
  low_balance: TrendingDown
};

const alertColors = {
  high: "border-destructive/20 bg-destructive/5",
  medium: "border-warning/20 bg-warning/5",
  low: "border-primary/20 bg-primary/5"
};

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-primary text-primary-foreground"
};

export function AlertsList() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { transactions, loading: loadingTransactions } = useTransactions();
  const { activeCards, loading: loadingCards } = useCreditCards();
  const { invoices, loading: loadingInvoices } = useInvoices();
  const { activeAccounts, loading: loadingAccounts } = useAccounts();

  const alerts = useMemo(() => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    // Check for bills due soon (next 7 days)
    transactions
      .filter(t => t.tipo === 'debito' && t.status === 'previsto')
      .forEach(transaction => {
        const dueDate = new Date(transaction.data_transacao);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 7) {
          const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
          newAlerts.push({
            id: `bill-${transaction.id}`,
            type: "bill_due",
            title: transaction.descricao || "Conta a pagar",
            description: `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
            amount: Math.abs(valor || 0),
            dueDate: transaction.data_transacao,
            priority: diffDays <= 2 ? "high" : "medium",
            actionable: true
          });
        }
      });

    // Check for overdue bills
    transactions
      .filter(t => t.tipo === 'debito' && t.status === 'previsto')
      .forEach(transaction => {
        const dueDate = new Date(transaction.data_transacao);
        const diffTime = now.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
          newAlerts.push({
            id: `overdue-${transaction.id}`,
            type: "overdue",
            title: transaction.descricao || "Conta em atraso",
            description: `Vencimento era há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
            amount: Math.abs(valor || 0),
            priority: "high",
            actionable: true
          });
        }
      });

    // Check for high card usage
    activeCards.forEach(card => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentInvoice = invoices.find(inv => 
        inv.cartao_id === card.id && inv.competencia.startsWith(currentMonth)
      );
      
      if (currentInvoice) {
        const limite = typeof card.limite_total === 'string' ? parseFloat(card.limite_total) : card.limite_total;
        const used = typeof currentInvoice.valor_total === 'string' 
          ? parseFloat(currentInvoice.valor_total || '0')
          : (currentInvoice.valor_total || 0);
        const usagePercentage = limite > 0 ? (used / limite) * 100 : 0;
        
        if (usagePercentage >= 80) {
          newAlerts.push({
            id: `high-usage-${card.id}`,
            type: "high_usage",
            title: `Alto uso do cartão ${card.apelido}`,
            description: `Cartão está com ${Math.round(usagePercentage)}% do limite usado`,
            priority: usagePercentage >= 90 ? "high" : "medium",
            actionable: true
          });
        }
      }
    });

    // Check for low balance
    activeAccounts.forEach(account => {
      const balance = typeof account.saldo_inicial === 'string' 
        ? parseFloat(account.saldo_inicial) 
        : account.saldo_inicial;
      
      if (balance < 100 && balance >= 0) {
        newAlerts.push({
          id: `low-balance-${account.id}`,
          type: "low_balance",
          title: `Saldo baixo em ${account.nome}`,
          description: `Apenas R$ ${balance.toFixed(2)} disponível`,
          priority: balance < 50 ? "medium" : "low",
          actionable: false
        });
      }
    });

    // Sort by priority
    return newAlerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5); // Show max 5 alerts
  }, [transactions, activeCards, invoices, activeAccounts, dismissedAlerts]);

  const loading = loadingTransactions || loadingCards || loadingInvoices || loadingAccounts;

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const getAlertAction = (alert: Alert) => {
    switch (alert.type) {
      case "bill_due":
        return "Pagar Conta";
      case "overdue":
        return "Quitar Conta";
      case "high_usage":
        return "Ver Detalhes";
      default:
        return "Ver Mais";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum alerta no momento</p>
            <p className="text-sm text-muted-foreground mt-1">Tudo está em ordem! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas do Dia
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const IconComponent = alertIcons[alert.type];
          
          return (
            <div 
              key={alert.id}
              className={`p-4 rounded-lg border ${alertColors[alert.priority]} hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <IconComponent className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.title}</span>
                      <Badge variant="outline" className={priorityColors[alert.priority]}>
                        {alert.priority === "high" ? "Urgente" : 
                         alert.priority === "medium" ? "Médio" : "Baixo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    {alert.amount && (
                      <ValueDisplay value={alert.amount} size="lg" variant="default" className="text-primary" />
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {alert.actionable && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button size="sm" className="bg-gradient-primary">
                    {getAlertAction(alert)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    Lembrar Depois
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
