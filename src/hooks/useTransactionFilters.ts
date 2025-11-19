import { useState, useMemo } from "react";
import { parseDate } from "@/lib/date-utils";
import { startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "@/components/DateRangeFilter";

// Re-export for convenience
export type { DateRange };

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

export function useTransactionFilters(transactions: Transaction[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  // ⚠️ REMOVIDO: Filtro de status padrão (o backend já faz isso por aba)
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // ✅ Default: Este mês
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.account.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = filterType === "all" || transaction.type === filterType;
      
      // Status filter (aplicado somente se diferente de "all")
      const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;

      // Date range filter
      const transDate = parseDate(transaction.date);
      const matchesDate = !dateRange || 
        (transDate >= dateRange.from && transDate <= dateRange.to);
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [transactions, searchTerm, filterType, dateRange]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      // DESC: mais recente primeiro
      return b.date.getTime() - a.date.getTime();
    });
  }, [filteredTransactions]);

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    dateRange,
    setDateRange,
    filteredTransactions,
    sortedTransactions
  };
}
