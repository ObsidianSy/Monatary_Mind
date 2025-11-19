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
  // Padrão: mês atual, para bater com Transações e Dashboard
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
    // Removido status fixo para buscar tanto liquidado quanto previsto
  });

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  
  // Buscar transações
  const { data: transactions, loading, error } = useFinanceiroRead(
    client,
    "transacao",
    { ...filters, limit: 10000 },
    [filters]
  );

  // 🔥 DEBUG: Log quando transações mudarem
  useEffect(() => {
    if (transactions) {
      const liquidadas = transactions.filter(t => t.status === 'liquidado');
      const creditos = liquidadas.filter(t => t.tipo === 'credito');
      const totalCreditos = creditos.reduce((sum, t) => {
        const valor = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
        return sum + Math.abs(valor || 0);
      }, 0);

      console.log('🔥 DEBUG RELATÓRIOS - Transações carregadas:', {
        total: transactions.length,
        liquidadas: liquidadas.length,
        creditos: creditos.length,
        totalCreditos: totalCreditos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        periodo: filters,
        primeiros5Creditos: creditos.slice(0, 5).map(t => ({
          id: t.id,
          data: t.data_transacao,
          valor: t.valor,
          descricao: t.descricao,
          categoria: t.categoria_pai_nome || t.categoria_nome
        }))
      });
    }
  }, [transactions, filters]);

  // Buscar recorrências ativas para calcular valores futuros
  const { data: recorrencias } = useFinanceiroRead(
    client,
    "recorrencia",
    { is_paused: false, limit: 1000 },
    []
  );

  // Aplicar período selecionado aos filtros (mês/ano)
  useEffect(() => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (selectedPeriod) {
      case 'current-month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current-year':
        from = new Date(selectedYear, 0, 1);
        to = new Date(selectedYear, 11, 31);
        break;
      case 'last-year':
        from = new Date(selectedYear - 1, 0, 1);
        to = new Date(selectedYear - 1, 11, 31);
        break;
      default:
        from = new Date(selectedYear, 0, 1);
        to = new Date(selectedYear, 11, 31);
    }

    setFilters({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
      // Sem filtro de status - buscar todos (filtramos por status nos cálculos específicos)
    });

    // Ajustar selectedYear quando mudar período anual
    if (selectedPeriod === 'current-year') {
      // mantém selectedYear
    } else if (selectedPeriod === 'last-year') {
      // espelha selectedYear para anterior caso o usuário troque manualmente para acompanhar
      // (opcional; não altera UI se já estiver no ano desejado)
    } else {
      // Para períodos mensais, manter o label do demonstrativo no ano corrente
      // ou baseado no 'from'
      setSelectedYear(from.getFullYear());
    }
  }, [selectedPeriod, selectedYear]);
  
  // Processar dados mensais estilo planilha (apenas liquidado)
  const monthlyData = useMemo(() => {
    if (!transactions) return [];

    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const categorias = new Map<string, { tipo: string, valores: number[] }>();

  // ⚠️ IMPORTANTE: Agrupar APENAS por categoria PRINCIPAL (pai)
  // Se a transação tiver categoria_pai_nome, usa ela; senão usa categoria_nome
  // Isso garante consistência com o DRE e evita discrepâncias
  // Agrupar por categoria e mês (apenas liquidado)
  
  // 🔥 FILTRAR POR PERÍODO SELECIONADO
  const filterFrom = new Date(filters.from);
  const filterTo = new Date(filters.to);
  
  const transacoesLiquidadas = transactions.filter(t => {
    if (t.status !== 'liquidado') return false;
    const dataTransacao = new Date(t.data_transacao);
    return dataTransacao >= filterFrom && dataTransacao <= filterTo;
  });

  // 🔥 DEBUG: Verificar se entrou alguma prevista
  const previstasQuePassaram = transacoesLiquidadas.filter(t => t.status !== 'liquidado');
  if (previstasQuePassaram.length > 0) {
    console.error('❌ ERRO: Transações previstas passaram pelo filtro!', previstasQuePassaram);
  }
  
  console.log('🔍 DEBUG Demonstrativo Mensal:', {
    totalTransacoes: transactions?.length,
    liquidadas: transacoesLiquidadas.length,
    periodo: `${filters.from} até ${filters.to}`,
    amostra: transacoesLiquidadas.slice(0, 3).map(t => ({
      data: t.data_transacao,
      tipo: t.tipo,
      valor: t.valor,
      categoria: t.categoria_pai_nome || t.categoria_nome
    }))
  });

  // 🔥 DEBUG: Verificar TODAS as transações de crédito em novembro
  const creditosNovembro = transacoesLiquidadas.filter(t => {
    const mes = new Date(t.data_transacao).getMonth();
    return mes === 10 && t.tipo === 'credito'; // Novembro = índice 10
  });

  const totalCreditosNovembro = creditosNovembro.reduce((sum, t) => {
    const valor = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor || 0;
    return sum + Math.abs(valor);
  }, 0);

  console.log('🔥 DEBUG CRÉDITOS NOVEMBRO - TODAS AS TRANSAÇÕES:', {
    quantidade: creditosNovembro.length,
    total: totalCreditosNovembro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    transacoes: creditosNovembro.map(t => ({
      id: t.id,
      data: t.data_transacao,
      valor: t.valor,
      descricao: t.descricao,
      categoria: t.categoria_pai_nome || t.categoria_nome,
      status: t.status
    }))
  });

  transacoesLiquidadas
    .forEach(t => {
      const mes = new Date(t.data_transacao).getMonth();
      // Usar categoria principal: se tiver pai, usa o pai; senão usa a própria categoria
      const categoria = t.categoria_pai_nome || t.categoria_nome || 'Sem categoria';
      const valor = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor || 0;
      
      // 🔥 CRIAR CHAVE ÚNICA: categoria + tipo para evitar misturar crédito/débito
      const chave = `${categoria}__${t.tipo}`;
      
      if (!categorias.has(chave)) {
        categorias.set(chave, { tipo: t.tipo, valores: Array(12).fill(0), nomeOriginal: categoria });
      }

      const cat = categorias.get(chave)!;
      cat.valores[mes] += Math.abs(valor);
    });

    // Separar receitas e despesas
    const receitas: any[] = [];
    const despesas: any[] = [];

    categorias.forEach((dados, chave) => {
      // Recuperar nome original da categoria (sem o sufixo __tipo)
      const nome = dados.nomeOriginal || chave.split('__')[0];
      const linha = { categoria: nome, valores: dados.valores };
      if (dados.tipo === 'credito') {
        receitas.push(linha);
      } else if (dados.tipo === 'debito') {
        despesas.push(linha);
      }
    });

    // Calcular totais mensais
    const totaisReceitas = Array(12).fill(0);
    const totaisDespesas = Array(12).fill(0);

    receitas.forEach(r => r.valores.forEach((v: number, i: number) => totaisReceitas[i] += v));
    despesas.forEach(d => d.valores.forEach((v: number, i: number) => totaisDespesas[i] += v));

    const resultadoMensal = totaisReceitas.map((r, i) => r - totaisDespesas[i]);
    const resultadoAcumulado = resultadoMensal.reduce((acc: number[], val) => {
      acc.push((acc[acc.length - 1] || 0) + val);
      return acc;
    }, []);

    // 🔥 DEBUG: Verificar totais após agregação
    console.log('🔍 DEBUG Demonstrativo Mensal - PÓS-AGREGAÇÃO:', {
      totaisReceitas,
      totalReceitasNov: totaisReceitas[10], // Novembro = índice 10
      receitasCategoriasCount: receitas.length,
      receitas: receitas.map(r => ({
        categoria: r.categoria,
        novembro: r.valores[10],
        tipo: categorias.get(r.categoria)?.tipo
      })),
      // Somar manualmente para confirmar
      somaManualNov: receitas.reduce((sum, r) => sum + (r.valores[10] || 0), 0),
      // ⚠️ DIFERENÇA vs transações créditas diretas
      diferencaVsCreditos: totaisReceitas[10] - totalCreditosNovembro
    });

    return {
      meses,
      receitas,
      despesas,
      totaisReceitas,
      totaisDespesas,
      resultadoMensal,
      resultadoAcumulado
    };
  }, [transactions, filters]);

  // Calcular A Receber e A Pagar Acumulado (transações previstas)
  const valoresFuturos = useMemo(() => {
    if (!transactions) return { aReceber: 0, aPagar: 0 };

    let aReceber = 0;
    let aPagar = 0;
    let countPrevistos = 0;

    // ⚠️ CORRIGIDO: Somar TODAS as transações previstas (não apenas futuras)
    // Se estiver vendo o ano inteiro, deve mostrar todas as previstas do ano
    transactions.forEach(transaction => {
      if (transaction.status !== 'previsto') return;

      countPrevistos++;
      const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
      const valorAbs = Math.abs(valor || 0);

      if (transaction.tipo === 'credito') {
        aReceber += valorAbs;
      } else if (transaction.tipo === 'debito') {
        aPagar += valorAbs;
      }
    });

    // Somar recorrências ativas (próximas 3 ocorrências) - apenas futuras
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let countRecorrencias = 0;

    if (recorrencias && recorrencias.length > 0) {
      recorrencias.forEach(recorrencia => {
        if (recorrencia.is_paused || recorrencia.is_deleted) return;

        const proximaOcorrencia = parseDate(recorrencia.proxima_ocorrencia);
        if (proximaOcorrencia <= hoje) return;

        countRecorrencias++;
        const valor = typeof recorrencia.valor === 'string' ? parseFloat(recorrencia.valor) : recorrencia.valor;
        const valorAbs = Math.abs(valor || 0);

        // Considerar próximas 3 ocorrências (simplificado)
        const valorProjetado = valorAbs * 3;

        if (recorrencia.tipo === 'credito') {
          aReceber += valorProjetado;
        } else if (recorrencia.tipo === 'debito') {
          aPagar += valorProjetado;
        }
      });
    }

    console.log('🔍 DEBUG A Receber/Pagar:', {
      totalTransacoes: transactions?.length,
      previstos: countPrevistos,
      recorrenciasAtivas: countRecorrencias,
      hoje: hoje.toISOString().split('T')[0],
      aReceber,
      aPagar
    });

    return { aReceber, aPagar };
  }, [transactions, recorrencias]);

  // Process transactions data for DRE (apenas liquidado)
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

    // ⚠️ IMPORTANTE: Usar MESMA lógica de agrupamento do Demonstrativo Mensal
    // Categoria principal (pai) para garantir consistência entre relatórios
    // Filtrar apenas transações liquidadas para o DRE + respeitar período
    const filterFrom = new Date(filters.from);
    const filterTo = new Date(filters.to);
    
    transactions
      .filter(t => {
        if (t.status !== 'liquidado') return false;
        const dataTransacao = new Date(t.data_transacao);
        return dataTransacao >= filterFrom && dataTransacao <= filterTo;
      })
      .forEach(transaction => {
        // Usar categoria principal: se tiver pai, usa o pai; senão usa a própria categoria
        const categoria = transaction.categoria_pai_nome || transaction.categoria_nome || "Sem categoria";
        const valor = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;
        const valorAbs = Math.abs(valor || 0);
        
        categorias.add(categoria);

        if (transaction.tipo === "credito") {
          receitas.set(categoria, (receitas.get(categoria) || 0) + valorAbs);
        } else if (transaction.tipo === "debito") {
          despesas.set(categoria, (despesas.get(categoria) || 0) + valorAbs);
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
  }, [transactions, filters]);

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
  }, [transactions, filters]);

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
  }, [transactions, filters]);

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
  }, [transactions, filters]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Receitas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(dreData.totalReceitas)}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Liquidado
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Despesas</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(dreData.totalDespesas)}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Liquidado
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${dreData.totalReceitas - dreData.totalDespesas >= 0 ? 'border-l-primary' : 'border-l-destructive'}`}>
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Resultado</p>
                <p className={`text-2xl font-bold ${dreData.totalReceitas - dreData.totalDespesas >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(dreData.totalReceitas - dreData.totalDespesas)}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Target className="h-3 w-3 mr-1" />
                  Líquido
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">A Receber</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(valoresFuturos.aReceber)}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Previsto
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">A Pagar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(valoresFuturos.aPagar)}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Previsto
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Transações</p>
                <p className="text-2xl font-bold text-warning">{transactions?.length || 0}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  Total
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="mensal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mensal">Demonstrativo Mensal</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="contas">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="cartoes">Cartões</TabsTrigger>
        </TabsList>

        {/* NOVA ABA: Demonstrativo Mensal estilo planilha */}
        <TabsContent value="mensal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Demonstrativo Mensal {selectedYear}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Receitas, despesas e resultado por mês</p>
              </div>
              <div className="flex gap-2">
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(ano => (
                      <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const data = monthlyData.receitas.concat(monthlyData.despesas);
                    exportToCSV(data.map(d => ({
                      categoria: d.categoria,
                      ...Object.fromEntries(monthlyData.meses.map((m, i) => [m, d.valores[i]]))
                    })), `demonstrativo_${selectedYear}`);
                  }}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-2 font-semibold sticky left-0 bg-background z-10">Categoria</th>
                        {monthlyData.meses.map(mes => (
                          <th key={mes} className="text-right p-2 font-semibold min-w-[90px]">{mes}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* RECEITAS */}
                      <tr className="bg-success/5">
                        <td className="p-2 font-bold sticky left-0 bg-success/5 z-10">RECEITAS</td>
                        <td colSpan={12}></td>
                      </tr>
                      {monthlyData.receitas.map((linha, idx) => (
                        <tr key={`rec-${idx}`} className="border-b border-border hover:bg-muted/30">
                          <td className="p-2 sticky left-0 bg-background z-10">{linha.categoria}</td>
                          {linha.valores.map((val: number, i: number) => (
                            <td key={i} className="text-right p-2 text-success font-medium">
                              {val > 0 ? formatCurrency(val) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-success/10 font-bold border-t-2 border-success">
                        <td className="p-2 sticky left-0 bg-success/10 z-10">TOTAL RECEITAS</td>
                        {monthlyData.totaisReceitas.map((val: number, i: number) => (
                          <td key={i} className="text-right p-2 text-success">{formatCurrency(val)}</td>
                        ))}
                      </tr>

                      {/* DESPESAS */}
                      <tr className="bg-destructive/5 border-t-2">
                        <td className="p-2 font-bold sticky left-0 bg-destructive/5 z-10">DESPESAS</td>
                        <td colSpan={12}></td>
                      </tr>
                      {monthlyData.despesas.map((linha, idx) => (
                        <tr key={`desp-${idx}`} className="border-b border-border hover:bg-muted/30">
                          <td className="p-2 sticky left-0 bg-background z-10">{linha.categoria}</td>
                          {linha.valores.map((val: number, i: number) => (
                            <td key={i} className="text-right p-2 text-destructive font-medium">
                              {val > 0 ? formatCurrency(val) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-destructive/10 font-bold border-t-2 border-destructive">
                        <td className="p-2 sticky left-0 bg-destructive/10 z-10">TOTAL DESPESAS</td>
                        {monthlyData.totaisDespesas.map((val: number, i: number) => (
                          <td key={i} className="text-right p-2 text-destructive">{formatCurrency(val)}</td>
                        ))}
                      </tr>

                      {/* RESULTADO MENSAL */}
                      <tr className="bg-primary/10 font-bold border-t-2 border-primary">
                        <td className="p-2 sticky left-0 bg-primary/10 z-10">RESULTADO MENSAL</td>
                        {monthlyData.resultadoMensal.map((val: number, i: number) => (
                          <td key={i} className={`text-right p-2 ${val >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(val)}
                          </td>
                        ))}
                      </tr>

                      {/* RESULTADO ACUMULADO */}
                      <tr className="bg-accent/10 font-bold border-t-2 border-accent">
                        <td className="p-2 sticky left-0 bg-accent/10 z-10">RESULTADO ACUMULADO</td>
                        {monthlyData.resultadoAcumulado.map((val: number, i: number) => (
                          <td key={i} className={`text-right p-2 ${val >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(val)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
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