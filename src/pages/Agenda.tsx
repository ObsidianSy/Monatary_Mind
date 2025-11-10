// Página Agenda - substitui "A pagar/A receber"
// Mostra transações previstas organizadas por vencimento

import { useState, useMemo } from "react";
import { GlobalFilters, FilterState } from "@/components/GlobalFilters";
import { useTransactions, useAccounts, useCategories } from "@/hooks/useFinancialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format, isToday, isBefore, isAfter, addDays, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { ValueDisplay } from "@/components/ValueDisplay";

export default function Agenda() {
  const [filters, setFilters] = useState<FilterState>({
    periodo: "proximos30dias",
    status: "previsto",
  });

  const { transactions, updateTransaction } = useTransactions();
  const { activeAccounts } = useAccounts();
  const { categories } = useCategories();

  // Filtrar transações - Simplifcado para melhor performance
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => t.status === "previsto");

    // Aplicar filtros de período baseado em dataInicio e dataFim do GlobalFilters
    if (filters.dataInicio && filters.dataFim) {
      result = result.filter(t => {
        const dataVenc = new Date(t.data_vencimento || t.data_transacao);
        return dataVenc >= filters.dataInicio! && dataVenc <= filters.dataFim!;
      });
    }

    // Outros filtros
    if (filters.contaId && filters.contaId !== "all") {
      result = result.filter(t => t.conta_id === filters.contaId);
    }
    if (filters.tipo && filters.tipo !== "all") {
      result = result.filter(t => t.tipo === filters.tipo);
    }
    if (filters.busca) {
      const busca = filters.busca.toLowerCase();
      result = result.filter(t => t.descricao.toLowerCase().includes(busca));
    }

    return result;
  }, [transactions, filters]);

  // Agrupar por categorias
  const hoje = startOfDay(new Date());
  const vencemHoje = filteredTransactions.filter(t => {
    const dataVenc = t.data_vencimento ? new Date(t.data_vencimento) : new Date(t.data_transacao);
    return isToday(dataVenc);
  });
  const emAtraso = filteredTransactions.filter(t => {
    const dataVenc = t.data_vencimento ? new Date(t.data_vencimento) : new Date(t.data_transacao);
    return isBefore(dataVenc, hoje);
  });
  const proximos7dias = filteredTransactions.filter(t => {
    const dataVenc = t.data_vencimento ? new Date(t.data_vencimento) : new Date(t.data_transacao);
    return isAfter(dataVenc, hoje) && isBefore(dataVenc, addDays(hoje, 8));
  });
  const posteriores = filteredTransactions.filter(t => {
    const dataVenc = t.data_vencimento ? new Date(t.data_vencimento) : new Date(t.data_transacao);
    return isAfter(dataVenc, addDays(hoje, 7));
  });

  const getContaNome = (id: string) => {
    const conta = activeAccounts.find(c => c.id === id);
    return conta?.nome || "Sem conta";
  };

  const getCategoriaNome = (id?: string) => {
    if (!id) return "";
    const cat = categories.find(c => c.id === id);
    return cat?.nome || "";
  };

  const liquidar = async (transactionId: string) => {
    await updateTransaction(transactionId, { 
      status: "liquidado",
      data_transacao: format(new Date(), "yyyy-MM-dd")
    });
  };

  const TransactionRow = ({ transaction }: { transaction: any }) => {
    const dataVenc = transaction.data_vencimento ? new Date(transaction.data_vencimento) : new Date(transaction.data_transacao);
    const atrasado = isBefore(dataVenc, hoje);

    return (
      <div 
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50",
          atrasado && "border-destructive/50 bg-destructive/5"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{transaction.descricao}</p>
            {transaction.instrumento && (
              <Badge variant="outline" className="text-xs">
                {transaction.instrumento}
              </Badge>
            )}
            {transaction.origem?.startsWith("recorrencia") && (
              <Badge variant="secondary" className="text-xs">
                Recorrente
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{format(dataVenc, "dd/MM/yyyy")}</span>
            <span>•</span>
            <span>{getContaNome(transaction.conta_id)}</span>
            {transaction.categoria_id && (
              <>
                <span>•</span>
                <span>{getCategoriaNome(transaction.categoria_id)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-semibold text-lg",
              transaction.tipo === "credito" ? "text-success" : "text-destructive"
            )}>
              {transaction.tipo === "credito" ? "+" : "-"}
            </span>
            <ValueDisplay 
              value={transaction.valor} 
              size="lg" 
              variant={transaction.tipo === "credito" ? "success" : "destructive"}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => liquidar(transaction.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Liquidar
          </Button>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon, transactions, variant = "default" }: any) => {
    if (transactions.length === 0) return null;

    const total = transactions.reduce((sum: number, t: any) => {
      return sum + (t.tipo === "credito" ? t.valor : -t.valor);
    }, 0);

    return (
      <Card className={cn(variant === "destructive" && "border-destructive/50")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {icon}
              {title}
              <Badge variant="secondary">{transactions.length}</Badge>
            </CardTitle>
            <div className={cn(
              "text-lg font-semibold",
              total >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(Math.abs(total))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.map((t: any) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalFilters
        filters={filters}
        onChange={setFilters}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">
              Compromissos financeiros previstos
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vencemHoje.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(vencemHoje.reduce((sum, t) => sum + t.valor, 0))}
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive">Em Atraso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{emAtraso.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(emAtraso.reduce((sum, t) => sum + t.valor, 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Próximos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proximos7dias.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(proximos7dias.reduce((sum, t) => sum + t.valor, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seções de transações */}
        <div className="space-y-4">
          <Section
            title="Em Atraso"
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            transactions={emAtraso}
            variant="destructive"
          />
          <Section
            title="Vencem Hoje"
            icon={<Calendar className="h-5 w-5" />}
            transactions={vencemHoje}
          />
          <Section
            title="Próximos 7 Dias"
            icon={<Clock className="h-5 w-5" />}
            transactions={proximos7dias}
          />
          <Section
            title="Posteriores"
            icon={<Calendar className="h-5 w-5" />}
            transactions={posteriores}
          />
        </div>

        {filteredTransactions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Nenhum compromisso encontrado</p>
              <p className="text-sm text-muted-foreground">
                Ajuste os filtros ou adicione novas transações
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
