import { useState, useMemo } from "react";
import { StatCard } from "@/components/StatCard";
import { InsightCard } from "@/components/InsightCard";
import { HealthScore } from "@/components/HealthScore";
import { CashFlowChart } from "@/components/CashFlowChart";
import { AccountBalance } from "@/components/AccountBalance";
import { CreditCardUsage } from "@/components/CreditCardUsage";
import { QuickProjection } from "@/components/QuickProjection";
import { AlertsList } from "@/components/AlertsList";
import { QuickActions } from "@/components/QuickActions";
import NewTransactionModal from "@/components/NewTransactionModal";
import { GlobalFilters, FilterState } from "@/components/GlobalFilters";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useFinancialData";
import { useRecurrences } from "@/hooks/useRecurrences";
import { parseDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { 
  Wallet,
  TrendingUp, 
  TrendingDown, 
  Calendar,
  PiggyBank,
  CreditCard as CreditCardIcon,
  Target,
  Activity
} from "lucide-react";

const Index = () => {
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    periodo: "mesAtual"
  });
  
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { activeRecurrences } = useRecurrences();

  // Calculate real totals from data
  const totalBalance = accounts.reduce((sum, account) => {
    const balance = typeof account.saldo_inicial === 'string' ? 
      parseFloat(account.saldo_inicial) : account.saldo_inicial;
    return sum + (balance || 0);
  }, 0);

  // Filter transactions based on GlobalFilters
  const filteredTransactions = useMemo(() => {
    if (!filters.dataInicio || !filters.dataFim) {
      // Fallback para mês atual
      const currentMonth = new Date().toISOString().slice(0, 7);
      return transactions.filter(t => t.data_transacao?.startsWith(currentMonth));
    }
    
    return transactions.filter(t => {
      const date = parseDate(t.data_transacao);
      return date >= filters.dataInicio! && date <= filters.dataFim!;
    });
  }, [transactions, filters]);

  const monthlyIncome = filteredTransactions
    .filter(t => t.tipo === 'credito')
    .reduce((sum, t) => {
      const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
      return sum + (value || 0);
    }, 0);

  const monthlyExpenses = filteredTransactions
    .filter(t => t.tipo === 'debito')
    .reduce((sum, t) => {
      const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
      return sum + (value || 0);
    }, 0);

  // Generate last 30 days balance data for sparkline
  const last30DaysData = useMemo(() => {
    const data: number[] = [];
    let runningBalance = totalBalance;
    
    for (let i = 29; i >= 0; i--) {
      const dayTransactions = transactions.filter(t => {
        if (!t.data_transacao) return false;
        const transactionDate = new Date(t.data_transacao);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        return transactionDate.toDateString() === targetDate.toDateString();
      });
      
      const dayChange = dayTransactions.reduce((sum, t) => {
        const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
        return sum + (t.tipo === 'credito' ? value : -value);
      }, 0);
      
      runningBalance -= dayChange;
      data.push(runningBalance);
    }
    
    return data.reverse();
  }, [transactions, totalBalance]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Calculate previous month for comparison
  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthStr = previousMonth.toISOString().slice(0, 7);
  
  const previousMonthTransactions = transactions.filter(t => 
    t.data_transacao?.startsWith(previousMonthStr)
  );
  
  const previousMonthIncome = previousMonthTransactions
    .filter(t => t.tipo === 'credito')
    .reduce((sum, t) => {
      const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
      return sum + (value || 0);
    }, 0);
    
  const previousMonthExpenses = previousMonthTransactions
    .filter(t => t.tipo === 'debito')
    .reduce((sum, t) => {
      const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
      return sum + (value || 0);
    }, 0);

  const incomeTrend = calculateTrend(monthlyIncome, previousMonthIncome);
  const expensesTrend = calculateTrend(monthlyExpenses, previousMonthExpenses);

  // Calcular recorrências mensais
  const monthlyRecurrentIncome = activeRecurrences
    .filter(r => r.tipo === 'credito' && r.frequencia === 'mensal')
    .reduce((sum, r) => sum + parseFloat(String(r.valor)), 0);

  const monthlyRecurrentExpenses = activeRecurrences
    .filter(r => r.tipo === 'debito' && r.frequencia === 'mensal')
    .reduce((sum, r) => sum + parseFloat(String(r.valor)), 0);

  // Calculate last 6 months data for cash flow chart
  const cashFlowData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      const monthTransactions = transactions.filter(t => 
        t.data_transacao?.startsWith(monthStr)
      );
      
      const receitas = monthTransactions
        .filter(t => t.tipo === 'credito')
        .reduce((sum, t) => {
          const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
          return sum + (value || 0);
        }, 0);
      
      const despesas = monthTransactions
        .filter(t => t.tipo === 'debito')
        .reduce((sum, t) => {
          const value = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
          return sum + (value || 0);
        }, 0);
      
      data.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        receitas,
        despesas,
        saldo: receitas - despesas
      });
    }
    return data;
  }, [transactions]);

  // Calculate financial health score
  const healthScore = useMemo(() => {
    let score = 50; // Base score
    const monthlyBalance = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;
    
    // Positive balance adds points
    if (monthlyBalance > 0) score += 20;
    
    // Good savings rate (>20%) adds points
    if (savingsRate > 20) score += 15;
    else if (savingsRate > 10) score += 10;
    
    // Low debt ratio adds points
    if (totalBalance > 0) score += 15;
    
    return Math.min(Math.max(score, 0), 100);
  }, [monthlyIncome, monthlyExpenses, totalBalance]);

  const healthFactors = useMemo(() => {
    const monthlyBalance = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;
    
    return [
      {
        label: "Fluxo de Caixa",
        status: monthlyBalance > 0 ? "good" : "critical",
        description: monthlyBalance > 0 
          ? `Saldo positivo de ${formatCurrency(monthlyBalance)}`
          : `Déficit de ${formatCurrency(Math.abs(monthlyBalance))}`
      } as const,
      {
        label: "Taxa de Poupança",
        status: savingsRate > 20 ? "good" : savingsRate > 10 ? "warning" : "critical",
        description: `${savingsRate.toFixed(1)}% da renda está sendo poupada`
      } as const,
      {
        label: "Saldo Total",
        status: totalBalance > 0 ? "good" : "critical",
        description: totalBalance > 0
          ? `Capital positivo de ${formatCurrency(totalBalance)}`
          : "Capital negativo - atenção necessária"
      } as const,
    ];
  }, [monthlyIncome, monthlyExpenses, totalBalance]);

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão estratégica das suas finanças em tempo real
        </p>
      </div>

      {/* Filtros Globais */}
      <GlobalFilters
        filters={filters}
        onChange={setFilters}
        onNovo={() => setIsNewTransactionModalOpen(true)}
      />

      {/* 1️⃣ KPIs PRINCIPAIS - Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          subtitle="Patrimônio líquido"
          icon={Wallet}
          variant="primary"
          trend={{
            value: calculateTrend(totalBalance, totalBalance - (monthlyIncome - monthlyExpenses)),
            label: "vs mês anterior"
          }}
        />
        
        <StatCard
          title="Receitas"
          value={formatCurrency(monthlyIncome)}
          subtitle="Mês atual"
          icon={TrendingUp}
          variant="success"
          trend={{
            value: incomeTrend,
            label: "vs mês anterior",
            isPositive: true
          }}
        />
        
        <StatCard
          title="Despesas"
          value={formatCurrency(monthlyExpenses)}
          subtitle="Mês atual"
          icon={TrendingDown}
          variant="destructive"
          trend={{
            value: expensesTrend,
            label: "vs mês anterior",
            isPositive: false
          }}
        />
        
        <StatCard
          title="Economia"
          value={formatCurrency(monthlyIncome - monthlyExpenses)}
          subtitle="Saldo mensal"
          icon={PiggyBank}
          variant={monthlyIncome - monthlyExpenses >= 0 ? "success" : "warning"}
          trend={{
            value: calculateTrend(
              monthlyIncome - monthlyExpenses,
              previousMonthIncome - previousMonthExpenses
            ),
            label: "vs mês anterior"
          }}
        />
      </div>

      {/* 2️⃣ ANÁLISES E INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlowData} />
        </div>
        
        <HealthScore
          score={healthScore}
          factors={healthFactors}
        />
      </div>

      {/* 3️⃣ INSIGHTS DETALHADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard
          title="Análise Mensal"
          insights={[
            {
              label: "Receita Total",
              value: formatCurrency(monthlyIncome),
              trend: incomeTrend,
              icon: TrendingUp
            },
            {
              label: "Despesa Total",
              value: formatCurrency(monthlyExpenses),
              trend: expensesTrend,
              icon: TrendingDown
            },
            {
              label: "Taxa de Economia",
              value: monthlyIncome > 0 
                ? `${((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1)}%`
                : "0%",
              icon: Target
            }
          ]}
        />
        
        <InsightCard
          title="Recorrências"
          insights={[
            {
              label: "Receitas Recorrentes",
              value: formatCurrency(monthlyRecurrentIncome),
              icon: Activity
            },
            {
              label: "Despesas Recorrentes",
              value: formatCurrency(monthlyRecurrentExpenses),
              icon: Activity
            },
            {
              label: "Balanço Recorrente",
              value: formatCurrency(monthlyRecurrentIncome - monthlyRecurrentExpenses),
              icon: Calendar
            }
          ]}
        />
      </div>

      {/* 4️⃣ INFORMAÇÕES COMPLEMENTARES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <AccountBalance />
          <QuickProjection />
        </div>
        
        <div className="space-y-4">
          <AlertsList />
          <CreditCardUsage />
        </div>
      </div>

      <QuickActions 
        context="dashboard" 
        onRefresh={() => {
          // Refresh can be implemented when needed
        }} 
      />

      <NewTransactionModal
        open={isNewTransactionModalOpen}
        onOpenChange={setIsNewTransactionModalOpen}
        onSuccess={() => {
          setIsNewTransactionModalOpen(false);
        }}
      />
    </div>
  );
};

export default Index;
