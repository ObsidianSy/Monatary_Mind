import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isToday, isPast } from "date-fns";
import { ValueDisplay } from "@/components/ValueDisplay";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  CheckCircle,
  Loader2
} from "lucide-react";

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

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  activeTab: string;
  selectedTransactions: Set<string>;
  onSelectTransaction: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (transaction: Transaction) => void;
  onRegistrar: (transaction: Transaction) => void;
  onRefresh: () => void;
  onNewTransaction: () => void;
}

const typeIcons = {
  income: TrendingUp,
  expense: TrendingDown,
  transfer: ArrowRightLeft
};

const typeColors = {
  income: "text-success",
  expense: "text-destructive", 
  transfer: "text-primary"
};

const typeLabels = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência"
};

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20"
};

const statusLabels = {
  pending: "Pendente",
  completed: "Concluída",
  cancelled: "Cancelada"
};

export function TransactionList({
  transactions,
  loading,
  error,
  activeTab,
  selectedTransactions,
  onSelectTransaction,
  onSelectAll,
  onEdit,
  onRegistrar,
  onRefresh,
  onNewTransaction
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Paginação
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const getOverdueStatus = (date: Date) => {
    if (isToday(date)) return "today";
    if (isPast(date)) return "overdue";
    return "upcoming";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lista de Transações</CardTitle>
        <div className="text-sm text-muted-foreground">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando transações...
            </div>
          ) : error ? (
            <span className="text-destructive">Erro ao carregar dados</span>
          ) : (
            `${transactions.length} transações encontradas`
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={onRefresh} variant="outline">
              <Loader2 className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando transações...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma transação encontrada</p>
            <Button className="bg-gradient-primary" onClick={onNewTransaction}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar primeira transação
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {paginatedTransactions.map((transaction, index) => {
              const TypeIcon = typeIcons[transaction.type];
              
              return (
                <div 
                  key={transaction.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    index !== paginatedTransactions.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={selectedTransactions.has(transaction.id)}
                        onCheckedChange={() => onSelectTransaction(transaction.id)}
                      />
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${typeColors[transaction.type]}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{transaction.description}</h3>
                          <Badge variant="outline" className={statusColors[transaction.status]}>
                            {statusLabels[transaction.status]}
                          </Badge>
                          
                          {/* Overdue badges */}
                          {(activeTab === "receivable" || activeTab === "payable") && transaction.status === "pending" && (
                            <>
                              {getOverdueStatus(transaction.date) === "overdue" && (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                  Vencida
                                </Badge>
                              )}
                              {getOverdueStatus(transaction.date) === "today" && (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                  Vence Hoje
                                </Badge>
                              )}
                            </>
                          )}
                          
                          {transaction.installments && transaction.installments > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.currentInstallment}/{transaction.installments}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>{transaction.category} • {transaction.subcategory}</span>
                          <span>•</span>
                          <span>{transaction.account}</span>
                          <span>•</span>
                          <span>{transaction.paymentMethod}</span>
                          <span>•</span>
                          <span>{format(transaction.date, "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        
                        {transaction.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{transaction.notes}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className={`text-lg font-bold ${typeColors[transaction.type]}`}>
                            {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                          </span>
                          <ValueDisplay 
                            value={transaction.amount} 
                            size="lg"
                            variant={transaction.type === "income" ? "success" : transaction.type === "expense" ? "destructive" : "default"}
                          />
                        </div>
                        {(activeTab === "all" || activeTab === "completed") && (
                          <div className="text-xs text-muted-foreground">
                            {typeLabels[transaction.type]}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        {transaction.status === "pending" && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-success hover:bg-success/90 text-white"
                            onClick={() => onRegistrar(transaction)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Registrar
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEdit(transaction)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, transactions.length)} de {transactions.length} transações
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
