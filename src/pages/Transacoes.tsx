import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/financeiro-sdk";
import NewTransactionModal from "@/components/NewTransactionModal";
import { QuickActions } from "@/components/QuickActions";
import { ActionableCard } from "@/components/ActionableCard";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { ConfirmTransactionModal } from "@/components/ConfirmTransactionModal";
import { parseDate } from "@/lib/date-utils";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { TransactionList } from "@/components/transactions/TransactionList";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import {
  Plus,
  Download,
  Trash2,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  Repeat,
  Pause
} from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useRecurrenceExpander } from "@/hooks/useRecurrenceExpander";

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

interface APITransaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: "credito" | "debito" | "transferencia";
  data_transacao: string;
  status: "previsto" | "liquidado";
  origem: string;
  referencia?: string;
  conta_id?: string;
  categoria_id?: string;
  conta_nome?: string;
  categoria_nome?: string;
  categoria_pai_nome?: string;
  categoria_pai_id?: string;
  parcela_id?: string;
}

// Transform API data to UI format
const transformAPITransaction = (
  apiTransaction: APITransaction,
  accounts: any[] = [],
  categories: any[] = []
): Transaction => {
  const typeMap = {
    "credito": "income" as const,
    "debito": "expense" as const,
    "transferencia": "transfer" as const,
  };

  const statusMap = {
    "previsto": "pending" as const,
    "liquidado": "completed" as const,
  };

  const valorNumerico = parseFloat(String(apiTransaction.valor));
  
  if (isNaN(valorNumerico)) {
    console.error('Transação com valor inválido:', apiTransaction);
  }

  // A API agora retorna categoria_nome e categoria_pai_nome diretamente
  const categoryDisplay = apiTransaction.categoria_pai_nome || apiTransaction.categoria_nome || "Sem categoria";
  const subcategoryDisplay = apiTransaction.categoria_pai_nome ? apiTransaction.categoria_nome : undefined;

  return {
    id: apiTransaction.id,
    description: apiTransaction.descricao,
    amount: apiTransaction.tipo === "debito" ? -valorNumerico : valorNumerico,
    type: typeMap[apiTransaction.tipo],
    category: categoryDisplay,
    subcategory: subcategoryDisplay || "",
    account: apiTransaction.conta_nome || "Sem conta",
    date: new Date(apiTransaction.data_transacao),
    status: statusMap[apiTransaction.status] || "pending",
    paymentMethod: apiTransaction.origem || "Não informado",
  };
};

export default function Transacoes() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apiTransactions, setApiTransactions] = useState<APITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmTransactionData, setConfirmTransactionData] = useState<{
    id?: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category?: string;
    account?: string;
    date?: Date;
    notes?: string;
  } | null>(null);
  const [recorrenciaExtraData, setRecorrenciaExtraData] = useState<{
    conta_id: string;
    categoria_id: string;
    tipo: string;
  } | null>(null);
  const { toast } = useToast();
  
  // Buscar contas e categorias para JOINs manuais
  const { accounts: rawAccounts } = useAccounts();
  const { categories: rawCategories } = useCategories();
  
  // ✅ Memoizar arrays para evitar re-renders desnecessários
  const accounts = useMemo(() => rawAccounts, [rawAccounts.length]);
  const categories = useMemo(() => rawCategories, [rawCategories.length]);
  
  // Buscar recorrências
  const { 
    recurrences, 
    activeRecurrences, 
    loading: loadingRecurrences,
    refresh: refreshRecurrences,
    pauseRecurrence, 
    resumeRecurrence, 
    deleteRecurrence 
  } = useRecurrences();

  // Hook para gerar contas do mês
  const { generateMonthFromRecurrences } = useRecurrenceExpander();

  // Use transaction filters hook
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    dateRange,
    setDateRange,
    sortedTransactions
  } = useTransactionFilters(transactions);

  // Load transactions from API (useCallback para evitar loop infinito)
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        limit: 100,
        offset: 0,
        // ✅ Usar dateRange do filtro (padrão: Este mês)
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
      };

      // Apply tab-specific filters
      if (activeTab === "completed") {
        filters.status = "liquidado";
      } else if (activeTab === "receivable") {
        filters.tipo = "credito";
        filters.status = "previsto";
      } else if (activeTab === "payable") {
        filters.tipo = "debito";
        filters.status = "previsto";
      }

      // Add status filter only if not on a tab with fixed status
      if (filterStatus !== "all" && activeTab === "all") {
        const statusMap = {
          "pending": "previsto",
          "completed": "liquidado",
        };
        filters.status = statusMap[filterStatus as keyof typeof statusMap] || filterStatus;
      }

      const apiTransactions = await apiClient.getTransactions(filters);
      
      // ✅ Debug log para identificar duplicatas
      console.debug("DEBUG Transações - Carregadas da API:", {
        total: apiTransactions.length,
        filtros: filters,
        tab: activeTab,
        duplicatas: apiTransactions.length - new Set(apiTransactions.map(t => t.id)).size
      });
      
      setApiTransactions(apiTransactions);
      
      // ✅ Deduplica transações por ID para evitar duplicatas da API
      const uniqueApiTransactions = Array.from(
        new Map(apiTransactions.map(t => [t.id, t])).values()
      );
      
      const transformedTransactions = uniqueApiTransactions.map(t => 
        transformAPITransaction(t, accounts, categories)
      );
      setTransactions(transformedTransactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar transações";
      setError(errorMessage);
      toast({
        title: "Erro ao carregar transações",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus, dateRange, accounts, categories, toast]); // ✅ Deps corretas

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [loadTransactions]); // ✅ Agora loadTransactions é estável

  const handleGenerateMonth = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      const year = hoje.getFullYear();
      const month = hoje.getMonth() + 1; // getMonth() retorna 0-11
      
      // Buscar transações existentes para verificar duplicatas
      const existingTransactions = await apiClient.getTransactions({
        limit: 1000,
        from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
        to: format(endOfMonth(hoje), 'yyyy-MM-dd')
      });
      
      const created = await generateMonthFromRecurrences(
        year, 
        month, 
        activeRecurrences,
        existingTransactions
      );
      
      toast({
        title: "Contas geradas",
        description: `${created} conta(s) criada(s) para ${format(hoje, "MMMM/yyyy", { locale: ptBR })}`,
      });
      
      handleRefreshAll();
    } catch (error) {
      toast({
        title: "Erro ao gerar contas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = () => {
    loadTransactions();
    refreshRecurrences();
  };

  const handleSelectTransaction = (id: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTransactions(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedTransactions(
      selectedTransactions.size === sortedTransactions.length 
        ? new Set() 
        : new Set(sortedTransactions.map(t => t.id))
    );
  };

  const handleBulkLiquidar = () => {
    toast({
      title: `${selectedTransactions.size} transações liquidadas`,
      description: "As transações foram marcadas como liquidadas.",
    });
    setSelectedTransactions(new Set());
  };

  const handleBulkCancelar = () => {
    toast({
      title: `${selectedTransactions.size} transações canceladas`,
      description: "As transações foram canceladas.",
    });
    setSelectedTransactions(new Set());
  };

  const handleBulkAdiar = () => {
    toast({
      title: `${selectedTransactions.size} transações adiadas`,
      description: "As transações foram adiadas.",
    });
    setSelectedTransactions(new Set());
  };

  const handleBulkExcluir = () => {
    toast({
      title: `${selectedTransactions.size} transações excluídas`,
      description: "As transações foram removidas.",
      variant: "destructive",
    });
    setSelectedTransactions(new Set());
  };

  const handleEdit = (transaction: Transaction) => {
    // Encontrar os dados originais da API para passar ao modal
    const apiTransaction = apiTransactions.find(t => t.id === transaction.id);
    
    if (!apiTransaction) {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar os dados da transação.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleRegistrarTransacao = async (transaction: Transaction) => {
    const conta = accounts.find(a => a.nome === transaction.account);
    const categoria = categories.find(c => c.nome === transaction.category);
    
    setConfirmTransactionData({
      id: transaction.id,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      type: transaction.type as "income" | "expense",
      category: transaction.category,
      account: transaction.account,
      date: transaction.date,
      notes: transaction.notes
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTransaction = async (data: { valor: number; descricao: string; observacoes?: string }) => {
    try {
      if (!confirmTransactionData?.id) {
        throw new Error("ID da transação não encontrado");
      }

      // Buscar a transação original para obter conta_id e categoria_id
      const transacaoOriginal = apiTransactions.find(t => t.id === confirmTransactionData.id);
      if (!transacaoOriginal) {
        throw new Error("Transação original não encontrada");
      }

      await apiClient.postEvent("transacao.upsert", {
        id: confirmTransactionData.id,
        tipo: transacaoOriginal.tipo,
        conta_id: transacaoOriginal.conta_id,
        categoria_id: transacaoOriginal.categoria_id,
        descricao: data.descricao,
        valor: data.valor,
        data_transacao: format(new Date(), "yyyy-MM-dd"),
        referencia: data.observacoes || transacaoOriginal.referencia || "",
        status: "liquidado"
      });
      
      toast({
        title: "Transação registrada",
        description: "A transação foi marcada como concluída.",
      });
      
      setIsConfirmModalOpen(false);
      handleRefreshAll();
    } catch (error) {
      toast({
        title: "Erro ao registrar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleRegistrarRecorrencia = async (recorrencia: any) => {
    const conta = accounts.find(a => a.id === recorrencia.conta_id);
    const categoria = categories.find(c => c.id === recorrencia.categoria_id);
    const valor = typeof recorrencia.valor === 'string' ? parseFloat(recorrencia.valor) : recorrencia.valor;
    
    setConfirmTransactionData({
      id: undefined, // Recorrência não tem ID ainda
      description: recorrencia.descricao,
      amount: valor,
      type: recorrencia.tipo === 'credito' ? 'income' : 'expense',
      category: categoria?.nome,
      account: conta?.nome,
      date: new Date(recorrencia.proxima_ocorrencia),
      notes: undefined
    });
    
    // Salvar dados extras da recorrência em estado separado
    setRecorrenciaExtraData({
      conta_id: recorrencia.conta_id,
      categoria_id: recorrencia.categoria_id,
      tipo: recorrencia.tipo
    });
    
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRecurrence = async (data: { valor: number; descricao: string; observacoes?: string }) => {
    try {
      if (!recorrenciaExtraData) {
        throw new Error("Dados da recorrência não encontrados");
      }

      await apiClient.postEvent("transacao.upsert", {
        conta_id: recorrenciaExtraData.conta_id,
        categoria_id: recorrenciaExtraData.categoria_id,
        tipo: recorrenciaExtraData.tipo,
        descricao: data.descricao,
        valor: data.valor,
        observacoes: data.observacoes,
        data: format(new Date(), "yyyy-MM-dd"),
        status: "liquidado",
        data_liquidacao: format(new Date(), "yyyy-MM-dd"),
        origem: "manual"
      });
      
      toast({
        title: "Recorrência registrada",
        description: "A transação foi criada e efetivada com sucesso.",
      });
      
      handleRefreshAll();
      setRecorrenciaExtraData(null);
    } catch (err) {
      toast({
        title: "Erro ao registrar recorrência",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // ✅ FASE 6: Função de limpeza de transações futuras inválidas
  const cleanupFutureTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar TODAS as transações sem filtro de data
      const allTransactions = await apiClient.getTransactions({
        limit: 1000,
        status: "previsto" // Apenas previstas, não deletar liquidadas
      });
      
      // Definir data máxima (3 meses no futuro)
      const maxDate = addMonths(new Date(), 3);
      
      // Filtrar transações além de 3 meses
      const futureTransactions = allTransactions.filter(t => {
        const transDate = parseDate(t.data_transacao);
        return transDate > maxDate;
      });
      
      if (futureTransactions.length === 0) {
        toast({
          title: "Nenhuma transação inválida encontrada",
          description: "Todas as transações estão dentro do período válido.",
        });
        setLoading(false);
        return;
      }
      
      // Pedir confirmação
      const confirmed = window.confirm(
        `Foram encontradas ${futureTransactions.length} transações futuras inválidas (além de 3 meses).\n\n` +
        `Deseja remover essas transações?\n\n` +
        `Esta ação não pode ser desfeita.`
      );
      
      if (!confirmed) {
        setLoading(false);
        return;
      }
      
      // Deletar transações
      let deletedCount = 0;
      for (const transaction of futureTransactions) {
        try {
          await apiClient.postEvent("transacao.delete", { 
            id: transaction.id 
          });
          deletedCount++;
        } catch (err) {
          console.error(`Erro ao deletar transação ${transaction.id}:`, err);
        }
      }
      
      toast({
        title: "Limpeza concluída",
        description: `${deletedCount} de ${futureTransactions.length} transações futuras foram removidas.`,
      });
      
      // Recarregar transações
      await loadTransactions();
      
    } catch (err) {
      toast({
        title: "Erro ao limpar transações",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas movimentações financeiras
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateMonth} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Repeat className="w-4 h-4 mr-2" />
            )}
            Gerar Contas do Mês
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={cleanupFutureTransactions} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Futuras
          </Button>
          <Button className="bg-gradient-primary" onClick={() => setIsNewTransactionModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="completed">Efetivadas</TabsTrigger>
          <TabsTrigger value="receivable">A Receber</TabsTrigger>
          <TabsTrigger value="payable">A Pagar</TabsTrigger>
          <TabsTrigger value="recurring">Recorrências</TabsTrigger>
        </TabsList>

        {/* Tabs para Todas, Efetivadas, A Receber e A Pagar */}
        {["all", "completed", "receivable", "payable"].includes(activeTab) && (
        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Filters */}
          <TransactionFilters
            activeTab={activeTab}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          {/* Summary Cards */}
          <TransactionSummary
            activeTab={activeTab}
            transactions={sortedTransactions}
            onNewTransaction={() => setIsNewTransactionModalOpen(true)}
            onRefresh={loadTransactions}
          />

          {/* Transactions List */}
          <TransactionList
            transactions={sortedTransactions}
            loading={loading}
            error={error}
            activeTab={activeTab}
            selectedTransactions={selectedTransactions}
            onSelectTransaction={handleSelectTransaction}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onRegistrar={handleRegistrarTransacao}
            onRefresh={loadTransactions}
            onNewTransaction={() => setIsNewTransactionModalOpen(true)}
          />
        </TabsContent>
        )}

        {/* Recorrências Tab */}
        <TabsContent value="recurring" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionableCard
              title="Receitas Recorrentes"
              value={`R$ ${activeRecurrences
                .filter(r => r.tipo === 'credito')
                .reduce((sum, r) => sum + (typeof r.valor === 'string' ? parseFloat(r.valor) : r.valor), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-5 h-5" />}
              status="success"
              actions={[
                {
                  label: "Nova Recorrência",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setIsNewTransactionModalOpen(true),
                  variant: "outline"
                }
              ]}
            />
            
            <ActionableCard
              title="Despesas Recorrentes"
              value={`R$ ${activeRecurrences
                .filter(r => r.tipo === 'debito')
                .reduce((sum, r) => sum + (typeof r.valor === 'string' ? parseFloat(r.valor) : r.valor), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingDown className="w-5 h-5" />}
              status="error"
            />
            
            <ActionableCard
              title="Total Ativas"
              value={activeRecurrences.length.toString()}
              icon={<Repeat className="w-5 h-5" />}
              status="info"
            />
          </div>

          {/* Recorrências List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                Recorrências Cadastradas
              </CardTitle>
              <CardDescription>
                {activeRecurrences.length} recorrência(s) ativa(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecurrences ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Carregando recorrências...</p>
                </div>
              ) : activeRecurrences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Repeat className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhuma recorrência ativa</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie recorrências para automatizar suas transações
                  </p>
                  <Button onClick={() => setIsNewTransactionModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Recorrência
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRecurrences.map((recorrencia) => {
                    const conta = accounts.find(a => a.id === recorrencia.conta_id);
                    const categoria = categories.find(c => c.id === recorrencia.categoria_id);
                    const valor = typeof recorrencia.valor === 'string' ? parseFloat(recorrencia.valor) : recorrencia.valor;
                    
                    const frequenciaLabel = {
                      mensal: "Mensal",
                      semanal: "Semanal",
                      anual: "Anual"
                    }[recorrencia.frequencia] || recorrencia.frequencia;

                    return (
                      <div
                        key={recorrencia.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full",
                            recorrencia.tipo === 'credito' ? "bg-success/10" : "bg-destructive/10"
                          )}>
                            {recorrencia.tipo === 'credito' ? (
                              <TrendingUp className="w-5 h-5 text-success" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold">{recorrencia.descricao}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span>{conta?.nome || "Sem conta"}</span>
                              <span>•</span>
                              <span>{categoria?.nome || "Sem categoria"}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {frequenciaLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={cn(
                              "text-lg font-bold",
                              recorrencia.tipo === 'credito' ? "text-success" : "text-destructive"
                            )}>
                              {recorrencia.tipo === 'credito' ? '+' : '-'}R$ {valor.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Próx: {format(new Date(recorrencia.proxima_ocorrencia), "dd/MM/yyyy")}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-success hover:bg-success/90 text-white"
                              onClick={() => handleRegistrarRecorrencia(recorrencia)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Registrar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await pauseRecurrence(recorrencia.id);
                                toast({
                                  title: "Recorrência pausada",
                                  description: "A recorrência foi pausada.",
                                });
                              }}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (confirm(`Deseja realmente excluir a recorrência "${recorrencia.descricao}"?`)) {
                                  await deleteRecurrence(recorrencia.id);
                                  toast({
                                    title: "Recorrência excluída",
                                    description: "A recorrência foi excluída com sucesso.",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BulkActionsBar
        selectedCount={selectedTransactions.size}
        onLiquidar={handleBulkLiquidar}
        onCancelar={handleBulkCancelar}
        onAdiar={handleBulkAdiar}
        onExcluir={handleBulkExcluir}
        onClearSelection={() => setSelectedTransactions(new Set())}
      />

      <QuickActions context="transactions" onRefresh={handleRefreshAll} />

      <NewTransactionModal
        open={isNewTransactionModalOpen}
        onOpenChange={setIsNewTransactionModalOpen}
        onSuccess={handleRefreshAll}
      />

      <NewTransactionModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleRefreshAll}
        mode="edit"
        initial={editingTransaction ? {
          id: editingTransaction.id,
          tipo: editingTransaction.type === "income" ? "credito" : editingTransaction.type === "expense" ? "debito" : "transferencia",
          valor: Math.abs(editingTransaction.amount),
          descricao: editingTransaction.description,
          data_transacao: editingTransaction.date,
          conta_id: apiTransactions.find(t => t.id === editingTransaction.id)?.conta_id || "",
          categoria_id: apiTransactions.find(t => t.id === editingTransaction.id)?.categoria_id || "",
          status: editingTransaction.status === "completed" ? "liquidado" : "previsto",
          observacoes: editingTransaction.notes
        } : undefined}
      />

      <ConfirmTransactionModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        transaction={confirmTransactionData}
        onConfirm={confirmTransactionData?.id ? handleConfirmTransaction : handleConfirmRecurrence}
      />
    </div>
  );
}