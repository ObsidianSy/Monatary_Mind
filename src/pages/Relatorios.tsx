import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Download, FileText, TrendingUp, TrendingDown, Calendar, Target, Loader2 } from "lucide-react";
import { useFinanceiroClient, useFinanceiroRead } from "@/hooks/useFinanceiro";
import { useToast } from "@/hooks/use-toast";
import { parseDate, DATE_PRESETS } from "@/lib/date-utils";

// Custom chart theme using design system tokens
const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  warning: 'hsl(var(--warning))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted-foreground))',
};

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.destructive,
];

// Custom tooltip styling
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const Relatorios = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    status: "liquidado"
  });

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: transactions, loading, error } = useFinanceiroRead(
    client,
    "transacao",
    filters,
    [filters]
  );

  useEffect(() => {
    const now = new Date();
    let from: Date, to: Date;

    switch (selectedPeriod) {
      case "current-month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last-month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "current-year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case "last-year":
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
    }

    setFilters({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      status: "liquidado"
    });
  }, [selectedPeriod]);

  // Process transactions data for DRE
  const dreData = useMemo(() => {
    if (!transactions) return { 
      receitas: [], 
      despesas: [], 
      totalReceitas: 0, 
      totalDespesas: 0,
      dreTable: []
    };

    const receitas = new Map<string, number>();
    const despesas = new Map<string, number>();
    const categorias = new Set<string>();

    transactions.forEach(transaction => {
      const subcategoria = transaction.subcategoria_nome || transaction.categoria_nome || "Sem categoria";
      const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
      const valorAbs = Math.abs(valor || 0);
      
      categorias.add(subcategoria);

      if (transaction.tipo === "credito") {
        receitas.set(subcategoria, (receitas.get(subcategoria) || 0) + valorAbs);
      } else if (transaction.tipo === "debito") {
        despesas.set(subcategoria, (despesas.get(subcategoria) || 0) + valorAbs);
      }
    });

    const receitasArray = Array.from(receitas.entries()).map(([nome, valor]) => ({ nome, valor }));
    const despesasArray = Array.from(despesas.entries()).map(([nome, valor]) => ({ nome, valor }));

    // Create DRE table with all categories
    const dreTable = Array.from(categorias).map(categoria => ({
      categoria,
      receitas: receitas.get(categoria) || 0,
      despesas: despesas.get(categoria) || 0,
      liquido: (receitas.get(categoria) || 0) - (despesas.get(categoria) || 0)
    }));

    return {
      receitas: receitasArray,
      despesas: despesasArray,
      totalReceitas: receitasArray.reduce((sum, item) => sum + item.valor, 0),
      totalDespesas: despesasArray.reduce((sum, item) => sum + item.valor, 0),
      dreTable
    };
  }, [transactions]);

  // Process cash flow data
  const fluxoData = useMemo(() => {
    if (!transactions) return [];

    // Group by month
    const monthlyData = new Map<string, { previsto: number; realizado: number }>();
    
    transactions.forEach(transaction => {
      const month = parseDate(transaction.data_transacao).toLocaleDateString('pt-BR', { month: 'short' });
      const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
      const valorAbs = Math.abs(valor || 0);
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { previsto: 0, realizado: 0 });
      }

      const data = monthlyData.get(month)!;
      if (transaction.status === 'previsto') {
        data.previsto += valorAbs;
      } else if (transaction.status === 'liquidado') {
        data.realizado += valorAbs;
      }
    });

    return Array.from(monthlyData.entries()).map(([mes, data]) => ({
      mes,
      ...data
    }));
  }, [transactions]);

  // Process accounts payable
  const contasPagarData = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    const grupos = [
      { periodo: "Até 7 dias", valor: 0, quantidade: 0 },
      { periodo: "8-15 dias", valor: 0, quantidade: 0 },
      { periodo: "Mais de 15 dias", valor: 0, quantidade: 0 }
    ];

    transactions
      .filter(t => t.tipo === 'debito' && t.status === 'previsto')
      .forEach(transaction => {
        const dueDate = parseDate(transaction.data_transacao);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
        
        if (diffDays <= 7) {
          grupos[0].valor += Math.abs(valor || 0);
          grupos[0].quantidade++;
        } else if (diffDays <= 15) {
          grupos[1].valor += Math.abs(valor || 0);
          grupos[1].quantidade++;
        } else {
          grupos[2].valor += Math.abs(valor || 0);
          grupos[2].quantidade++;
        }
      });

    return grupos.filter(g => g.quantidade > 0);
  }, [transactions]);

  // Process card spending
  const gastosCartaoData = useMemo(() => {
    if (!transactions) return [];

    const gastosPorCategoria = new Map<string, number>();
    let total = 0;

    transactions
      .filter(t => t.tipo === 'debito')
      .forEach(transaction => {
        const categoria = transaction.subcategoria_nome || transaction.categoria_nome || "Outros";
        const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
        const valorAbs = Math.abs(valor || 0);
        
        gastosPorCategoria.set(categoria, (gastosPorCategoria.get(categoria) || 0) + valorAbs);
        total += valorAbs;
      });

    return Array.from(gastosPorCategoria.entries())
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: total > 0 ? Math.round((valor / total) * 100) : 0
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      toast({
        title: "Dados não disponíveis",
        description: "Não há dados para exportar no período selecionado.",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análises e insights das suas finanças</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Passado</SelectItem>
              <SelectItem value="current-year">Ano Atual</SelectItem>
              <SelectItem value="last-year">Ano Passado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receitas Totais</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(dreData.totalReceitas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Despesas Totais</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(dreData.totalDespesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resultado Líquido</p>
                  <p className={`text-2xl font-bold ${dreData.totalReceitas - dreData.totalDespesas >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(dreData.totalReceitas - dreData.totalDespesas)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transações</p>
                  <p className="text-2xl font-bold text-warning">{transactions?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="dre" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="contas">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="cartoes">Cartões</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dre">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Demonstrativo de Resultado (DRE)</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(dreData.dreTable, 'dre')}
                disabled={loading || !dreData.dreTable.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabela DRE */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Receitas vs Despesas por Categoria</h3>
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ) : dreData.dreTable.length > 0 ? (
                    <div className="space-y-2">
                      {dreData.dreTable.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div>
                            <p className="font-medium">{item.categoria}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="text-success">Receitas: {formatCurrency(item.receitas)}</span>
                              <span className="text-destructive">Despesas: {formatCurrency(item.despesas)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${item.liquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(Math.abs(item.liquido))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma transação no período</p>
                    </div>
                  )}
                </div>

                {/* Gráfico DRE - Enhanced */}
                <div>
                  <h3 className="font-semibold mb-4">Resultado por Categoria</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={dreData.dreTable}
                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="categoria" 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
                          cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '14px' }}
                          iconType="circle"
                        />
                        <Bar 
                          dataKey="receitas" 
                          fill={CHART_COLORS.success}
                          radius={[4, 4, 0, 0]}
                          name="Receitas"
                        />
                        <Bar 
                          dataKey="despesas" 
                          fill={CHART_COLORS.destructive}
                          radius={[4, 4, 0, 0]}
                          name="Despesas"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fluxo">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fluxo de Caixa - Previsto vs Realizado</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(fluxoData, 'fluxo-caixa')}
                disabled={loading || !fluxoData.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : fluxoData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={fluxoData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="mes" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '14px' }}
                        iconType="line"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="previsto" 
                        stroke={CHART_COLORS.primary}
                        strokeWidth={3}
                        name="Previsto"
                        dot={{ r: 4, fill: CHART_COLORS.primary }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="realizado" 
                        stroke={CHART_COLORS.success}
                        strokeWidth={3}
                        name="Realizado"
                        dot={{ r: 4, fill: CHART_COLORS.success }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado de fluxo de caixa no período</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contas a Pagar por Vencimento</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(contasPagarData, 'contas-pagar')}
                disabled={loading || !contasPagarData.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-20 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : contasPagarData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {contasPagarData.map((item, index) => (
                    <Card key={index} className="border-l-4" style={{ borderLeftColor: COLORS[index] }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{item.periodo}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-2xl font-bold">{formatCurrency(item.valor)}</p>
                            <p className="text-sm text-muted-foreground">{item.quantidade} contas</p>
                          </div>
                          <Badge variant={index === 0 ? "destructive" : index === 1 ? "default" : "secondary"}>
                            {index === 0 ? "Urgente" : index === 1 ? "Atenção" : "Programado"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conta a pagar no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cartoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ranking de Gastos por Cartão</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV(gastosCartaoData, 'gastos-cartao')}
                disabled={loading || !gastosCartaoData.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista de gastos */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Gastos por Subcategoria</h3>
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ) : gastosCartaoData.length > 0 ? (
                    <div className="space-y-2">
                      {gastosCartaoData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="font-medium">{item.categoria}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(item.valor)}</p>
                            <p className="text-sm text-muted-foreground">{item.percentual}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum gasto registrado no período</p>
                    </div>
                  )}
                </div>

                {/* Gráfico Pizza - Enhanced */}
                <div>
                  <h3 className="font-semibold mb-4">Distribuição dos Gastos</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gastosCartaoData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="valor"
                          label={({ categoria, percentual }) => `${percentual}%`}
                          labelLine={false}
                          paddingAngle={2}
                        >
                          {gastosCartaoData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;