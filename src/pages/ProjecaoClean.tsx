import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Wallet, DollarSign, Loader2, ArrowUpCircle, ArrowDownCircle, Activity, PiggyBank, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useFinanceiroClient, useFinanceiroRead } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { apiClient } from "@/lib/financeiro-sdk";
import { ValueDisplay } from "@/components/ValueDisplay";
import { parseDate } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

const Projecao: React.FC = () => {
  const { accounts } = useAccounts();
  const { toast } = useToast();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [projecao, setProjecao] = useState<any | null>(null);

  const fetchProjecao = async () => {
    setLoading(true);
    try {
      const url = `/projecao?months=${months}${accountId ? `&account_id=${accountId}` : ""}`;
      const result = await apiClient.http(url, { method: "GET" });
      setProjecao(result);
    } catch (err: any) {
      toast({ title: "Erro ao gerar projeção", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjecao(); }, []);

  // Preparar dados para o gráfico
  const chartData = projecao?.consolidated?.months?.map((m: any, idx: number) => ({
    mes: m.month,
    entradas: m.entradas || 0,
    saidas: m.saidas || 0,
    saldo: m.saldo_final || 0,
    saldo_inicial: m.saldo_inicial || 0,
  })) || [];

  // Calcular totais consolidados
  const totais = projecao?.consolidated?.months?.reduce((acc: any, m: any) => ({
    entradas: acc.entradas + (m.entradas || 0),
    saidas: acc.saidas + (m.saidas || 0),
  }), { entradas: 0, saidas: 0 }) || { entradas: 0, saidas: 0 };

  const saldoFinal = chartData[chartData.length - 1]?.saldo || 0;
  const saldoInicial = chartData[0]?.saldo_inicial || 0;
  const variacao = saldoFinal - saldoInicial;
  const variacaoPercent = saldoInicial !== 0 ? ((variacao / saldoInicial) * 100).toFixed(1) : "0.0";

  // Calcular médias
  const mediaEntradas = totais.entradas / months;
  const mediaSaidas = totais.saidas / months;
  const saldoMedio = (totais.entradas - totais.saidas) / months;

  // Identificar melhor e pior mês
  const mesesComVariacao = chartData.map((m: any) => ({
    ...m,
    saldo_variacao: (m.entradas || 0) - (m.saidas || 0)
  }));
  const melhorMes = mesesComVariacao.reduce((max: any, m: any) => 
    m.saldo_variacao > max.saldo_variacao ? m : max, mesesComVariacao[0] || {});
  const piorMes = mesesComVariacao.reduce((min: any, m: any) => 
    m.saldo_variacao < min.saldo_variacao ? m : min, mesesComVariacao[0] || {});

  // Identificar meses com saldo negativo
  const mesesNegativos = chartData.filter((m: any) => m.saldo < 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        {/* Header Premium com Gradiente */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Projeção de Caixa
                </h1>
              </div>
              <p className="text-muted-foreground">
                Análise detalhada da projeção financeira para os próximos <span className="font-semibold text-foreground">{months} meses</span>
              </p>
            </div>
            <Badge variant="outline" className="h-10 px-4 border-primary/30 bg-primary/5">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">{months} meses</span>
            </Badge>
          </div>
        </div>

        {/* Filtros Premium */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Configuração da Projeção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Conta</label>
                <Select onValueChange={v => setAccountId(v === 'all' ? null : v)} value={accountId || 'all'}>
                  <SelectTrigger className="w-full h-11 border-2">
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2 py-1">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Wallet className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">Todas as contas</span>
                      </div>
                    </SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 rounded-full bg-primary/60" />
                          {a.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Período</label>
                <Select onValueChange={v => setMonths(Number(v))} value={String(months)}>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses (trimestral)</SelectItem>
                    <SelectItem value="6">6 meses (semestral)</SelectItem>
                    <SelectItem value="12">12 meses (anual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={fetchProjecao} 
                disabled={loading}
                size="lg"
                className="h-11 px-6 sm:mt-7 bg-primary hover:bg-primary/90 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Gerar Projeção
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-2 shadow-lg">
            <CardContent className="py-24 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
                <Loader2 className="w-20 h-20 text-primary animate-spin absolute top-0 left-0" />
              </div>
              <p className="text-muted-foreground mt-6 text-lg">Calculando sua projeção financeira...</p>
              <p className="text-sm text-muted-foreground/60 mt-2">Analisando transações, recorrências e faturas</p>
            </CardContent>
          </Card>
        ) : projecao ? (
          <>
            {/* Cards de Resumo Premium */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Saldo Inicial */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Inicial</CardTitle>
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Wallet className="h-5 w-5 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold mb-1">
                    <ValueDisplay value={saldoInicial} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Posição atual confirmada
                  </p>
                </CardContent>
              </Card>

              {/* Total Entradas */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-500/5 to-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Entradas</CardTitle>
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                    <ValueDisplay value={totais.entradas} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média: <span className="font-semibold text-green-600">
                      <ValueDisplay value={mediaEntradas} size="sm" />
                    </span>/mês
                  </p>
                </CardContent>
              </Card>

              {/* Total Saídas */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-500/5 to-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Saídas</CardTitle>
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1">
                    <ValueDisplay value={totais.saidas} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média: <span className="font-semibold text-red-600">
                      <ValueDisplay value={mediaSaidas} size="sm" />
                    </span>/mês
                  </p>
                </CardContent>
              </Card>

              {/* Saldo Projetado */}
              <Card className={`border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${variacao >= 0 ? 'bg-gradient-to-br from-green-500/5 to-card border-green-500/20' : 'bg-gradient-to-br from-red-500/5 to-card border-red-500/20'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Final Projetado</CardTitle>
                  <div className={`p-2.5 rounded-xl ${variacao >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {variacao >= 0 ? 
                      <TrendingUp className="h-5 w-5 text-green-500" /> : 
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    }
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl sm:text-3xl font-bold mb-1 ${variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <ValueDisplay value={saldoFinal} size="lg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={variacao >= 0 ? "default" : "destructive"} className="text-xs">
                      {variacao >= 0 ? '+' : ''}{variacaoPercent}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs. atual</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertas e Insights */}
            {(mesesNegativos.length > 0 || melhorMes || piorMes) && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mesesNegativos.length > 0 && (
                  <Card className="border-2 border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Atenção: Saldo Negativo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-amber-600">{mesesNegativos.length}</span> {mesesNegativos.length === 1 ? 'mês' : 'meses'} com saldo negativo detectado
                      </p>
                    </CardContent>
                  </Card>
                )}

                {melhorMes && (
                  <Card className="border-2 border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        Melhor Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">{melhorMes.mes}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: <span className="font-semibold text-green-600">
                          <ValueDisplay value={melhorMes.saldo_variacao} size="sm" />
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                )}

                {piorMes && (
                  <Card className="border-2 border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        Mês Crítico
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">{piorMes.mes}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: <span className="font-semibold text-red-600">
                          <ValueDisplay value={piorMes.saldo_variacao} size="sm" />
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tabs Premium com Gráficos e Tabela */}
            <Tabs defaultValue="grafico" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 h-12 p-1 bg-muted/50">
                <TabsTrigger value="grafico" className="data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Activity className="w-4 h-4 mr-2" />
                  Análise Gráfica
                </TabsTrigger>
                <TabsTrigger value="tabela" className="data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Detalhamento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grafico" className="space-y-6 mt-6">
                {/* Gráfico Combinado - Evolução Completa */}
                <Card className="border-2 shadow-xl">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Activity className="w-5 h-5 text-primary" />
                          </div>
                          Evolução Completa do Fluxo de Caixa
                        </CardTitle>
                        <CardDescription className="mt-2">
                          Visualização integrada de saldo, entradas e saídas ao longo do período
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <defs>
                            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                          <XAxis 
                            dataKey="mes" 
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => {
                              const [ano, mes] = value.split('-');
                              const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                              return `${meses[parseInt(mes) - 1]}`;
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => 
                              new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL',
                                notation: 'compact',
                                maximumFractionDigits: 0
                              }).format(value)
                            }
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value: any) => 
                              new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(value)
                            }
                            labelFormatter={(label) => {
                              const [ano, mes] = label.split('-');
                              const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                              return `${meses[parseInt(mes) - 1]}/${ano}`;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                          />
                          <Bar dataKey="entradas" fill="#10b981" name="Entradas" radius={[6, 6, 0, 0]} opacity={0.8} />
                          <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[6, 6, 0, 0]} opacity={0.8} />
                          <Area 
                            type="monotone" 
                            dataKey="saldo" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            fill="url(#colorSaldo)"
                            name="Saldo Acumulado"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Gráfico de Área - Evolução do Saldo */}
                  <Card className="border-2 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Tendência do Saldo
                      </CardTitle>
                      <CardDescription>Projeção do saldo ao longo dos meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                            <XAxis 
                              dataKey="mes" 
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => {
                                const [, mes] = value.split('-');
                                return `M${mes}`;
                              }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11 }}
                              width={80}
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL',
                                  notation: 'compact',
                                  maximumFractionDigits: 0
                                }).format(value)
                              }
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                              }}
                              formatter={(value: any) => 
                                new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(value)
                              }
                            />
                            <Area 
                              type="monotone" 
                              dataKey="saldo" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                              fill="url(#gradientSaldo)"
                              name="Saldo"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Barras - Comparativo */}
                  <Card className="border-2 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Receitas vs. Despesas
                      </CardTitle>
                      <CardDescription>Comparativo mensal de movimentações</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                            <XAxis 
                              dataKey="mes" 
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => {
                                const [, mes] = value.split('-');
                                return `M${mes}`;
                              }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11 }}
                              width={80}
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL',
                                  notation: 'compact',
                                  maximumFractionDigits: 0
                                }).format(value)
                              }
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                              }}
                              formatter={(value: any) => 
                                new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(value)
                              }
                            />
                            <Bar dataKey="entradas" fill="#10b981" name="Receitas" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="saidas" fill="#ef4444" name="Despesas" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tabela" className="mt-6">
                <Card className="border-2 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="w-5 h-5" />
                      Detalhamento Mensal da Projeção
                    </CardTitle>
                    <CardDescription>
                      Análise detalhada mês a mês com saldos, movimentações e variações
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="rounded-lg overflow-hidden border-t">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                            <TableRow className="hover:bg-muted">
                              <TableHead className="font-bold">Mês</TableHead>
                              <TableHead className="font-bold text-right">Saldo Inicial</TableHead>
                              <TableHead className="font-bold text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <ArrowUpCircle className="w-4 h-4 text-green-500" />
                                  Entradas
                                </div>
                              </TableHead>
                              <TableHead className="font-bold text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <ArrowDownCircle className="w-4 h-4 text-red-500" />
                                  Saídas
                                </div>
                              </TableHead>
                              <TableHead className="font-bold text-right">Saldo Final</TableHead>
                              <TableHead className="font-bold text-right">Resultado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projecao.consolidated.months.map((m: any, idx: number) => {
                              const variacao = (m.entradas || 0) - (m.saidas || 0);
                              const isNegativeSaldo = (m.saldo_final || 0) < 0;
                              return (
                                <TableRow 
                                  key={m.month} 
                                  className={`hover:bg-muted/50 transition-colors ${isNegativeSaldo ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                                >
                                  <TableCell className="font-semibold">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {idx + 1}
                                      </div>
                                      <div>
                                        <div className="font-medium">
                                          {new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'long' })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {new Date(m.month + '-01').getFullYear()}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    <ValueDisplay value={m.saldo_inicial || 0} size="sm" />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10">
                                      <ValueDisplay value={m.entradas || 0} size="sm" className="text-green-600 font-semibold" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10">
                                      <ValueDisplay value={m.saidas || 0} size="sm" className="text-red-600 font-semibold" />
                                    </div>
                                  </TableCell>
                                  <TableCell className={`text-right font-bold ${isNegativeSaldo ? 'text-red-600' : 'text-foreground'}`}>
                                    <div className="flex items-center justify-end gap-2">
                                      {isNegativeSaldo && <AlertCircle className="w-4 h-4 text-red-500" />}
                                      <ValueDisplay value={m.saldo_final || 0} size="sm" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge 
                                      variant={variacao >= 0 ? "default" : "destructive"}
                                      className="font-semibold px-3 py-1"
                                    >
                                      {variacao >= 0 ? '+' : ''}
                                      <ValueDisplay value={variacao} size="sm" />
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="border-2 shadow-lg">
            <CardContent className="py-24 flex flex-col items-center justify-center text-muted-foreground">
              <div className="p-6 rounded-2xl bg-muted/30 mb-6">
                <Activity className="w-16 h-16 opacity-30" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma projeção disponível</h3>
              <p className="text-sm">Clique em "Gerar Projeção" para visualizar sua análise financeira</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Projecao;
