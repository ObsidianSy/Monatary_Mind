import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, AlertCircle } from "lucide-react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import type { DateRange } from "@/hooks/useTransactionFilters";

interface TransactionFiltersProps {
  activeTab: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function TransactionFilters({
  activeTab,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  dateRange,
  onDateRangeChange,
}: TransactionFiltersProps) {
  return (
    <>
      {/* Tab-specific message */}
      {activeTab === "payable" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-muted-foreground">
            Mostrando apenas <strong className="text-foreground">despesas pendentes</strong>
          </span>
        </div>
      )}
      {activeTab === "receivable" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-success" />
          <span className="text-muted-foreground">
            Mostrando apenas <strong className="text-foreground">receitas pendentes</strong>
          </span>
        </div>
      )}

      {/* Filter Card */}
      <Card className="border-primary/10">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Date Range Filter */}
            <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />

            {/* Search and Traditional Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por descrição, categoria..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Show type filter only on "all" and "completed" tabs */}
              {(activeTab === "all" || activeTab === "completed") && (
                <Select value={filterType} onValueChange={onFilterTypeChange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                    <SelectItem value="transfer">Transferências</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Show status filter only on "all" tab */}
              {activeTab === "all" && (
                <Select value={filterStatus} onValueChange={onFilterStatusChange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
