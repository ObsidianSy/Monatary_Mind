import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, TrendingUp, TrendingDown, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ValueDisplay } from "@/components/ValueDisplay";

export function RecurrencesSummary() {
  const navigate = useNavigate();
  const { activeRecurrences, loading } = useRecurrences();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // Calcular totais mensais
  const totalIncome = activeRecurrences
    .filter((r) => r.tipo === "credito" && r.frequencia === "mensal")
    .reduce((sum, r) => sum + parseFloat(String(r.valor)), 0);

  const totalExpenses = activeRecurrences
    .filter((r) => r.tipo === "debito" && r.frequencia === "mensal")
    .reduce((sum, r) => sum + parseFloat(String(r.valor)), 0);

  const netRecurrent = totalIncome - totalExpenses;

  // Próximas 5 recorrências ordenadas por data
  const upcomingRecurrences = [...activeRecurrences]
    .sort(
      (a, b) =>
        new Date(a.proxima_ocorrencia).getTime() -
        new Date(b.proxima_ocorrencia).getTime()
    )
    .slice(0, 5);

  const getDaysUntil = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    return differenceInDays(date, today);
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      mensal: "Mensal",
      semanal: "Semanal",
      anual: "Anual",
    };
    return labels[freq] || freq;
  };

  const getAccountName = (contaId: string) => {
    const account = accounts.find((a) => a.id === contaId);
    return account?.nome || "Conta";
  };

  const getCategoryName = (categoriaId: string) => {
    const category = categories.find((c) => c.id === categoriaId);
    return category?.nome || "Categoria";
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-32 mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeRecurrences.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              Recorrências Ativas
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/recorrencias")}
            >
              Criar Recorrência
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma recorrência ativa. Crie uma para automatizar suas finanças.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Recorrências Ativas
            <Badge variant="outline" className="ml-2">
              {activeRecurrences.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recorrencias")}
          >
            Ver Todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Receitas Recorrentes */}
          <Card className="border-success/20 bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Receitas Mensais
                  </p>
                  <ValueDisplay value={totalIncome} size="lg" variant="success" className="mt-1" />
                </div>
                <TrendingUp className="w-8 h-8 text-success opacity-60" />
              </div>
            </CardContent>
          </Card>

          {/* Despesas Recorrentes */}
          <Card className="border-destructive/20 bg-gradient-to-br from-destructive/10 to-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Despesas Mensais
                  </p>
                  <ValueDisplay value={totalExpenses} size="lg" variant="destructive" className="mt-1" />
                </div>
                <TrendingDown className="w-8 h-8 text-destructive opacity-60" />
              </div>
            </CardContent>
          </Card>

          {/* Saldo Líquido */}
          <Card
            className={
              netRecurrent >= 0
                ? "border-success/20 bg-gradient-to-br from-success/10 to-success/5"
                : "border-destructive/20 bg-gradient-to-br from-destructive/10 to-destructive/5"
            }
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Saldo Líquido
                  </p>
                  <ValueDisplay 
                    value={netRecurrent} 
                    size="lg" 
                    variant={netRecurrent >= 0 ? "success" : "destructive"} 
                    className="mt-1" 
                  />
                </div>
                <Repeat
                  className={`w-8 h-8 opacity-60 ${
                    netRecurrent >= 0 ? "text-success" : "text-destructive"
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Próximas Recorrências */}
        {upcomingRecurrences.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              Próximas Ocorrências
            </h4>
            <div className="space-y-2">
              {upcomingRecurrences.map((rec) => {
                const daysUntil = getDaysUntil(rec.proxima_ocorrencia);
                const isCredito = rec.tipo === "credito";

                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isCredito
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {isCredito ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {rec.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAccountName(rec.conta_id)} •{" "}
                          {getCategoryName(rec.categoria_id)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <ValueDisplay 
                          value={parseFloat(String(rec.valor))} 
                          size="sm" 
                          variant={isCredito ? "success" : "destructive"}
                        />
                        <p className="text-xs text-muted-foreground">
                          {daysUntil === 0
                            ? "Hoje"
                            : daysUntil === 1
                            ? "Amanhã"
                            : daysUntil < 0
                            ? `${Math.abs(daysUntil)}d atrás`
                            : `${daysUntil}d`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getFrequencyLabel(rec.frequencia)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
