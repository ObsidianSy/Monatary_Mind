import { useMemo } from "react";
import { ActionableCard } from "@/components/ActionableCard";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Check, 
  AlertCircle, 
  Calendar, 
  Plus, 
  Download 
} from "lucide-react";
import { isToday, isPast } from "date-fns";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  subcategory: string;
  account: string;
  date: Date;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: string;
  installments?: number;
  currentInstallment?: number;
  notes?: string;
}

interface TransactionSummaryProps {
  activeTab: string;
  transactions: Transaction[];
  onNewTransaction: () => void;
  onRefresh: () => void;
}

export function TransactionSummary({
  activeTab,
  transactions,
  onNewTransaction,
  onRefresh
}: TransactionSummaryProps) {
  const summary = useMemo(() => {
    switch (activeTab) {
      case "all": {
        const totalIncome = transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const totalExpenses = transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const netFlowValue = totalIncome - totalExpenses;
        type StatusType = "success" | "error" | "warning" | "info";
        const netStatus: StatusType = netFlowValue >= 0 ? "success" : "error";
        return {
          card1: { title: "Receitas Totais", value: totalIncome, icon: TrendingUp, status: "success" as const },
          card2: { title: "Total Despesas", value: totalExpenses, icon: TrendingDown, status: "error" as const },
          card3: { title: "Saldo Líquido", value: netFlowValue, icon: ArrowRightLeft, status: netStatus }
        };
      }
      
      case "completed": {
        const completedIncome = transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const completedExpenses = transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const completedFlowValue = completedIncome - completedExpenses;
        type StatusType = "success" | "error" | "warning" | "info";
        const completedStatus: StatusType = completedFlowValue >= 0 ? "success" : "error";
        return {
          card1: { title: "Receitas Efetivadas", value: completedIncome, icon: TrendingUp, status: "success" as const },
          card2: { title: "Despesas Efetivadas", value: completedExpenses, icon: TrendingDown, status: "error" as const },
          card3: { title: "Saldo Real", value: completedFlowValue, icon: Check, status: completedStatus }
        };
      }
      
      case "receivable":
        const totalReceivable = transactions.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const overdueReceivable = transactions
          .filter(t => isPast(t.date) && !isToday(t.date))
          .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const todayReceivable = transactions
          .filter(t => isToday(t.date))
          .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        return {
          card1: { title: "Total a Receber", value: totalReceivable, icon: TrendingUp, status: "success" as const },
          card2: { title: "Vencidas", value: overdueReceivable, icon: AlertCircle, status: "error" as const },
          card3: { title: "Vence Hoje", value: todayReceivable, icon: Calendar, status: "warning" as const }
        };
      
      case "payable":
        const totalPayable = transactions.reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const overduePayable = transactions
          .filter(t => isPast(t.date) && !isToday(t.date))
          .reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        const todayPayable = transactions
          .filter(t => isToday(t.date))
          .reduce((sum, t) => sum + Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount))), 0);
        return {
          card1: { title: "Total a Pagar", value: totalPayable, icon: TrendingDown, status: "error" as const },
          card2: { title: "Vencidas", value: overduePayable, icon: AlertCircle, status: "error" as const },
          card3: { title: "Vence Hoje", value: todayPayable, icon: Calendar, status: "warning" as const }
        };
      
      default:
        return {
          card1: { title: "Total", value: 0, icon: ArrowRightLeft, status: "info" as const },
          card2: { title: "Total", value: 0, icon: ArrowRightLeft, status: "info" as const },
          card3: { title: "Total", value: 0, icon: ArrowRightLeft, status: "info" as const }
        };
    }
  }, [activeTab, transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ActionableCard
        title={summary.card1.title}
        value={summary.card1.value}
        icon={<summary.card1.icon className="w-5 h-5" />}
        status={summary.card1.status}
        actions={[
          {
            label: "Nova Transação",
            icon: <Plus className="w-4 h-4" />,
            onClick: onNewTransaction,
            variant: "outline"
          }
        ]}
      />
      
      <ActionableCard
        title={summary.card2.title}
        value={summary.card2.value}
        icon={<summary.card2.icon className="w-5 h-5" />}
        status={summary.card2.status}
        actions={[
          {
            label: "Atualizar",
            icon: <Download className="w-4 h-4" />,
            onClick: onRefresh,
            variant: "outline"
          }
        ]}
      />
      
      <ActionableCard
        title={summary.card3.title}
        value={summary.card3.value}
        icon={<summary.card3.icon className="w-5 h-5" />}
        status={summary.card3.status}
        actions={[
          {
            label: "Ver Relatório",
            icon: <Download className="w-4 h-4" />,
            onClick: () => {},
            variant: "outline"
          }
        ]}
      />
    </div>
  );
}
