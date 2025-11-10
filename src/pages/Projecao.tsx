import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Loader2 } from "lucide-react";
import { useFinanceiroClient, useFinanceiroRead } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { parseDate } from "@/lib/date-utils";

interface FluxoItem {
  dia: string;
  entradas: string | number;
  saidas: string | number;
  saldo_previsto?: number;
  eventos?: {
    tipo: "receita" | "despesa" | "recorrencia" | "parcela";
    descricao: string;
    valor: number;
    categoria: string;
  }[];
}

// Removed mock data - using real API data from fluxo_30d endpoint

const Projecao = () => {
  const [periodo, setPeriodo] = useState("30");
  const [contaFiltro, setContaFiltro] = useState("all");
  
  // Hooks do SDK
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: fluxoData, loading } = useFinanceiroRead(client, "fluxo_30d", {});
  const { data: saldoContas, loading: loadingSaldo } = useFinanceiroRead(client, "saldo_conta", {});
  const { accounts } = useAccounts();

  // Calculate real current balance from accounts
  const saldoAtual = saldoContas?.reduce((total: number, conta: any) => {
    const saldo = typeof conta.saldo_atual === 'string' ? parseFloat(conta.saldo_atual) : conta.saldo_atual;
    return total + (saldo || 0);
  }, 0) || accounts.reduce((sum, account) => {
    const balance = typeof account.saldo_inicial === 'string' ? parseFloat(account.saldo_inicial) : account.saldo_inicial;
    return sum + (balance || 0);
  }, 0);

  const chartData = fluxoData ? fluxoData.map((item, index) => {
    const entradas = Number(item.entradas) || 0;
    const saidas = Number(item.saidas) || 0;
    const previousBalance = index === 0 ? saldoAtual : (fluxoData[index - 1]?.saldo_previsto ?? saldoAtual);
    const currentBalance = previousBalance + entradas - saidas;
    
    // Update the item with calculated balance (mutable operation)
    item.saldo_previsto = currentBalance;
    
    return {
      data: parseDate(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      saldo: currentBalance,
      entradas,
      saidas
    };
  }) : [];

  const getEventoIcon = (tipo: string) => {
    const icons = {
      receita: <TrendingUp className="h-4 w-4 text-success" />,
      despesa: <TrendingDown className="h-4 w-4 text-destructive" />,
      recorrencia: <Calendar className="h-4 w-4 text-primary" />,
      parcela: <DollarSign className="h-4 w-4 text-warning" />
    };
    return icons[tipo as keyof typeof icons];
  };

  const getEventoBadge = (tipo: string) => {
    const variants = {
      receita: "default",
      despesa: "destructive", 
      recorrencia: "default",
      parcela: "secondary"
    } as const;
    
    const labels = {
      receita: "Receita",
      despesa: "Despesa",
      recorrencia: "Recorrência", 
      parcela: "Parcela"
    };

    return (
      <Badge variant={variants[tipo as keyof typeof variants]}>
        {labels[tipo as keyof typeof labels]}
      </Badge>
    );
  };

  const totalEntradas = fluxoData ? fluxoData.reduce((acc, item) => acc + (Number(item.entradas) || 0), 0) : 0;
  const totalSaidas = fluxoData ? fluxoData.reduce((acc, item) => acc + (Number(item.saidas) || 0), 0) : 0;
  const saldoFinal = fluxoData && fluxoData.length > 0 ? (fluxoData[fluxoData.length - 1]?.saldo_previsto ?? saldoAtual) : saldoAtual;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projeção de Caixa</h1>
          <p className="text-muted-foreground">Visualize seu fluxo de caixa futuro</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 dias</SelectItem>
              <SelectItem value="15">Próximos 15 dias</SelectItem>
              <SelectItem value="30">Próximos 30 dias</SelectItem>
              <SelectItem value="90">Próximos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
           <Select value={contaFiltro} onValueChange={setContaFiltro}>
             <SelectTrigger className="w-[160px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todas as contas</SelectItem>
               {accounts.map((account) => (
                 <SelectItem key={account.id} value={account.id}>
                   {account.nome}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold">R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas Previstas</p>
                <p className="text-2xl font-bold text-success">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saídas Previstas</p>
                <p className="text-2xl font-bold text-destructive">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-4 w-4 ${saldoFinal > saldoAtual ? 'text-success' : 'text-warning'}`} />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Projetado</p>
                <p className={`text-2xl font-bold ${saldoFinal > saldoAtual ? 'text-success' : 'text-warning'}`}>
                  R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Timeline */}
      <Tabs defaultValue="grafico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grafico">Gráfico</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grafico">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value || 0).toLocaleString('pt-BR')}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Eventos por Data</CardTitle>
            </CardHeader>
             <CardContent>
               <div className="space-y-6">
                 {loading ? (
                   <div className="text-center py-8">
                     <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                     <p>Carregando projeção...</p>
                   </div>
                  ) : fluxoData && fluxoData.length > 0 ? (
                    fluxoData.filter(item => Number(item.entradas) > 0 || Number(item.saidas) > 0).length > 0 ? (
                      fluxoData.filter(item => Number(item.entradas) > 0 || Number(item.saidas) > 0).map((item, index) => (
                        <div key={index} className="border-l-2 border-primary pl-4 relative">
                          <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-2"></div>
                          
                          <div className="pb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">
                                {parseDate(item.dia).toLocaleDateString('pt-BR', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h4>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                                <p className="font-bold">R$ {(item.saldo_previsto || saldoAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {Number(item.entradas) > 0 && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                                  <div className="flex items-center space-x-3">
                                    <TrendingUp className="h-4 w-4 text-success" />
                                    <div>
                                      <p className="font-medium">Entradas do dia</p>
                                      <p className="text-sm text-muted-foreground">Receitas</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="default">Receita</Badge>
                                    <span className="font-bold text-success">
                                      +R$ {Number(item.entradas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {Number(item.saidas) > 0 && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                                  <div className="flex items-center space-x-3">
                                    <TrendingDown className="h-4 w-4 text-destructive" />
                                    <div>
                                      <p className="font-medium">Saídas do dia</p>
                                      <p className="text-sm text-muted-foreground">Despesas</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="destructive">Despesa</Badge>
                                    <span className="font-bold text-destructive">
                                      -R$ {Number(item.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum movimento financeiro encontrado para o período</p>
                      </div>
                    )
                 ) : (
                   <div className="text-center py-8">
                     <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                     <p className="text-muted-foreground">Nenhum evento encontrado para o período selecionado</p>
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Projecao;