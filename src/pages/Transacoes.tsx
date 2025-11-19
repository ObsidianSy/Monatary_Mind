import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorMessages } from "@/lib/error-messages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { InvoicesSection } from "@/components/InvoicesSection";
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
  Pause,
  Edit
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
    // Derivar forma de exibição para origem/pagamento
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
    paymentMethod: (() => {
      let pm = apiTransaction.origem || "Não informado";

      if (apiTransaction.origem && apiTransaction.origem.startsWith('fatura_item')) {
        if (apiTransaction.referencia) {
          const match = String(apiTransaction.referencia).match(/Item fatura\s+(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})/i);
          if (match) {
            const cartaoApelido = match[1].trim();
            const dataCompraStr = match[2];
            try {
              const dt = new Date(dataCompraStr);
              const mmYY = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`;
              pm = `Cartão: ${cartaoApelido} ${mmYY}`;
            } catch (e) {
              pm = `Cartão: ${cartaoApelido}`;
            }
          } else {
            const ref = String(apiTransaction.referencia || '');
            pm = ref.replace(/^Item fatura\s*/i, 'Cartão: ') || 'Cartão - fatura';
          }
        } else {
          pm = 'Cartão - fatura';
        }
      }

      // If reference is a Fatura (A Pagar) reference like 'Fatura {card} - YYYY-MM', also format it
      if ((apiTransaction.origem && apiTransaction.origem.startsWith('fatura:')) || (apiTransaction.referencia && /^Fatura\s+/i.test(apiTransaction.referencia || ''))) {
        const ref = String(apiTransaction.referencia || '');
        const match = ref.match(/Fatura\s+(.+?)\s*-?\s*(\d{4}-\d{2}-\d{2}|\d{4}-\d{2})?/i);
        if (match) {
          const cartaoNome = match[1].trim();
          const dateStr = match[2];
          if (dateStr) {
            try {
              const dt = new Date(dateStr.length === 7 ? `${dateStr}-01` : dateStr);
              const mmYY = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`;
              pm = `Cartão: ${cartaoNome} ${mmYY}`;
            } catch (e) {
              pm = `Cartão: ${cartaoNome}`;
            }
          } else {
            pm = `Cartão: ${cartaoNome}`;
          }
        }
      }

      return pm;
    })(),
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
  const { categories: rawCategories, subcategoriesForSelect } = useCategories();

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
    deleteRecurrence,
    updateRecurrence,
    posting: postingRecurrence
  } = useRecurrences();

  // Estado para edição de recorrência
  const [isEditRecurrenceModalOpen, setIsEditRecurrenceModalOpen] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState<any | null>(null);

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

  // ✅ Para aba "A Pagar", inverter ordem (mais antigas primeiro)
  const displayTransactions = useMemo(() => {
    if (activeTab === 'payable') {
      // ASC: mais antiga primeiro (vencimentos próximos no topo)
      return [...sortedTransactions].reverse();
    }
    // Demais abas: DESC (mais recente primeiro)
    return sortedTransactions;
  }, [sortedTransactions, activeTab]);

  // Load transactions from API (useCallback para evitar loop infinito)
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        // Aumentar limite para evitar truncamento de totais
        limit: 10000,
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

      // 🔥 DEBUG: Calcular totais ANTES de transformar
      const creditos = apiTransactions.filter(t => t.tipo === 'credito');
      const totalCreditos = creditos.reduce((sum, t) => {
        const valor = typeof t.valor === 'string' ? parseFloat(t.valor) : t.valor;
        return sum + Math.abs(valor || 0);
      }, 0);

      // ✅ Debug log para identificar duplicatas
      console.debug("🔥 DEBUG TRANSAÇÕES - Carregadas da API:", {
        total: apiTransactions.length,
        creditos: creditos.length,
        totalCreditos: totalCreditos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        filtros: filters,
        tab: activeTab,
        duplicatas: apiTransactions.length - new Set(apiTransactions.map(t => t.id)).size,
        primeiros5Creditos: creditos.slice(0, 5).map(t => ({
          id: t.id,
          data: t.data_transacao,
          valor: t.valor,
          descricao: t.descricao,
          status: t.status,
          categoria: t.categoria_pai_nome || t.categoria_nome
        }))
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
      selectedTransactions.size === displayTransactions.length
        ? new Set()
        : new Set(displayTransactions.map(t => t.id))
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

  const handleBulkExcluir = async () => {
    if (!confirm(`Deseja realmente excluir ${selectedTransactions.size} transação(ões)?`)) {
      return;
    }

    try {
      // Excluir todas as transações selecionadas
      const promises = Array.from(selectedTransactions).map(id =>
        apiClient.postEvent("transacao.delete", { id })
      );

      await Promise.all(promises);

      toast({
        title: `${selectedTransactions.size} transações excluídas`,
        description: "As transações foram removidas com sucesso.",
      });

      setSelectedTransactions(new Set());
      await loadTransactions();
    } catch (error: any) {
      toast({
        title: ErrorMessages.transaction.delete.title,
        description: error.message || ErrorMessages.transaction.delete.description,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // Encontrar os dados originais da API para passar ao modal
    const apiTransaction = apiTransactions.find(t => t.id === transaction.id);

    if (!apiTransaction) {
      toast({
        title: ErrorMessages.generic.notFound.title,
        description: "A transação não foi encontrada ou já foi excluída.",
        variant: "destructive",
      });
      return;
    }

    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm(`Deseja realmente excluir a transação "${transaction.description}"?`)) {
      return;
    }

    try {
      await apiClient.postEvent("transacao.delete", { id: transaction.id });

      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso.",
      });

      // Recarregar transações
      await loadTransactions();
    } catch (error: any) {
      toast({
        title: ErrorMessages.transaction.delete.title,
        description: error.message || ErrorMessages.transaction.delete.description,
        variant: "destructive",
      });
    }
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

        {/* Tabs para Todas, Efetivadas e A Receber */}
        {["all", "completed", "receivable"].includes(activeTab) && (
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
              transactions={displayTransactions}
              onNewTransaction={() => setIsNewTransactionModalOpen(true)}
              onRefresh={loadTransactions}
            />

            {/* Transactions List */}
            <TransactionList
              transactions={displayTransactions}
              loading={loading}
              error={error}
              activeTab={activeTab}
              selectedTransactions={selectedTransactions}
              onSelectTransaction={handleSelectTransaction}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRegistrar={handleRegistrarTransacao}
              onRefresh={loadTransactions}
              onNewTransaction={() => setIsNewTransactionModalOpen(true)}
            />
          </TabsContent>
        )}

        {/* Tab A Pagar - Faturas de Cartões + Transações */}
        <TabsContent value="payable" className="space-y-6 mt-6">
          {/* Summary Cards - MOVIDO PARA CIMA */}
          <TransactionSummary
            activeTab={activeTab}
            transactions={displayTransactions}
            onNewTransaction={() => setIsNewTransactionModalOpen(true)}
            onRefresh={loadTransactions}
          />

          {/* Seção de Faturas de Cartões */}
          <InvoicesSection />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Outras Transações a Pagar
              </span>
            </div>
          </div>

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

          {/* Transactions List */}
          <TransactionList
            transactions={displayTransactions}
            loading={loading}
            error={error}
            activeTab={activeTab}
            selectedTransactions={selectedTransactions}
            onSelectTransaction={handleSelectTransaction}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRegistrar={handleRegistrarTransacao}
            onRefresh={loadTransactions}
            onNewTransaction={() => setIsNewTransactionModalOpen(true)}
          />
        </TabsContent>

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
                    
                    // ✅ Usar dados do JOIN do backend (mais confiável que buscar no array local)
                    // categoria_nome = nome da categoria/subcategoria
                    // categoria_pai_nome = nome da categoria pai (se for subcategoria)
                    const categoriaDisplay = recorrencia.categoria_pai_nome
                      ? `${recorrencia.categoria_pai_nome} → ${recorrencia.categoria_nome}`
                      : recorrencia.categoria_nome || "Sem categoria";
                    
                    const valor = typeof recorrencia.valor === 'string' ? parseFloat(recorrencia.valor) : recorrencia.valor;

                    const frequenciaLabel = {
                      mensal: "Mensal",
                      semanal: "Semanal",
                      anual: "Anual",
                      quinzenal: "Quinzenal",
                      diario: "Diário"
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
                              <span>{categoriaDisplay}</span>
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
                              onClick={() => {
                                setEditingRecurrence(recorrencia);
                                setIsEditRecurrenceModalOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
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

      {/* Modal de Edição de Recorrência */}
      {editingRecurrence && (
        <Dialog open={isEditRecurrenceModalOpen} onOpenChange={setIsEditRecurrenceModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Recorrência</DialogTitle>
              <DialogDescription>
                Atualize os dados da recorrência "{editingRecurrence.descricao}"
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              try {
                await updateRecurrence(editingRecurrence.id, {
                  descricao: formData.get('descricao') as string,
                  valor: parseFloat(formData.get('valor') as string),
                  conta_id: formData.get('conta_id') as string,
                  categoria_id: formData.get('categoria_id') as string,
                  tipo: formData.get('tipo') as any, // Campo obrigatório
                  data_inicio: formData.get('data_inicio') as string, // Campo obrigatório
                  frequencia: formData.get('frequencia') as any,
                  dia_vencimento: parseInt(formData.get('dia_vencimento') as string) || undefined,
                });
                
                toast({
                  title: "Recorrência atualizada",
                  description: "A recorrência foi atualizada com sucesso.",
                });
                
                setIsEditRecurrenceModalOpen(false);
                setEditingRecurrence(null);
                refreshRecurrences();
              } catch (error: any) {
                toast({
                  title: ErrorMessages.recurrence.update.title,
                  description: error.message || ErrorMessages.recurrence.update.description,
                  variant: "destructive",
                });
              }
            }}>
              <div className="grid gap-4 py-4">
                {/* Campos ocultos obrigatórios */}
                <input type="hidden" name="tipo" value={editingRecurrence?.tipo || 'debito'} />
                <input type="hidden" name="data_inicio" value={editingRecurrence?.data_inicio || new Date().toISOString().split('T')[0]} />

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    name="descricao"
                    defaultValue={editingRecurrence?.descricao || ''}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    name="valor"
                    type="number"
                    step="0.01"
                    defaultValue={editingRecurrence?.valor ? (typeof editingRecurrence.valor === 'string' ? editingRecurrence.valor : editingRecurrence.valor.toString()) : '0'}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="conta_id">Conta</Label>
                  <Select name="conta_id" defaultValue={editingRecurrence?.conta_id || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Categoria</Label>
                  <Select 
                    name="categoria_id" 
                    defaultValue={editingRecurrence?.subcategoria_id || editingRecurrence?.categoria_id || ''} 
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoriesForSelect.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="frequencia">Frequência</Label>
                  <Select name="frequencia" defaultValue={editingRecurrence?.frequencia || 'mensal'} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dia_vencimento">Dia do Vencimento (opcional)</Label>
                  <Input
                    id="dia_vencimento"
                    name="dia_vencimento"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={editingRecurrence?.dia_vencimento || ''}
                    placeholder="Ex: 10"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditRecurrenceModalOpen(false);
                    setEditingRecurrence(null);
                  }}
                  disabled={postingRecurrence}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={postingRecurrence}>
                  {postingRecurrence && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}