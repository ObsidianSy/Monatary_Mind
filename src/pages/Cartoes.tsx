import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  CreditCard as CreditCardIcon,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Receipt,
  Settings,
  ChevronLeft,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Save,
  Edit,
  Trash2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreditCards, useInvoices, useInvoiceItems } from "@/hooks/useFinancialData";
import type { CreditCard } from "@/types/financial";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { usePrivacy } from "@/contexts/PrivacyContext";
import NewCardModal from "@/components/NewCardModal";
import PayInvoiceModal from "@/components/PayInvoiceModal";
import AddPurchaseModal from "@/components/AddPurchaseModal";
import InvoiceActionsModal from "@/components/InvoiceActionsModal";
import { ActionableCard } from "@/components/ActionableCard";
import { CircularProgress } from "@/components/CircularProgress";
import { InvoiceHistoryItem } from "@/components/InvoiceHistoryItem";
import { InvoiceListItem } from "@/components/InvoiceListItem";
import { ValueDisplay } from "@/components/ValueDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { CreditCardDisplay } from "@/components/CreditCardDisplay";
import { CompactTable, CompactTableHeader, CompactTableRow, TableBody, TableCell, TableHead } from "@/components/CompactTable";
import { TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCompetencia, parseDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { formatDateYmdToBr, parseDateLocal } from "@/lib/date"; // ✅ Helpers TZ-safe

export default function CartoesPage() {
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [isInvoiceActionsModalOpen, setIsInvoiceActionsModalOpen] = useState(false);
  const [invoiceToPayId, setInvoiceToPayId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreditCard>>({});
  const [extractPeriodFilter, setExtractPeriodFilter] = useState<string>("all"); // all, 3m, 6m, 12m, year

  const { activeCards, loading, refresh, updateCard, deleteCard } = useCreditCards();
  const { invoices } = useInvoices(selectedCard?.id);
  const { activeAccounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useToast();
  const { isValuesCensored } = usePrivacy();
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [editInvoiceForm, setEditInvoiceForm] = useState<any>({});
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);

  // Estados para editar/excluir compras individuais
  const [isEditPurchaseModalOpen, setIsEditPurchaseModalOpen] = useState(false);
  const [isDeletePurchaseModalOpen, setIsDeletePurchaseModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  // Estados para excluir cartão
  const [isDeleteCardModalOpen, setIsDeleteCardModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // 🆕 Hook para buscar TODAS as compras do cartão (extrato completo)
  const { items: allCardPurchases, loading: loadingAllPurchases } = useInvoiceItems(undefined, {
    cartao_id: selectedCard?.id,
    order: "data_compra.desc",
    limit: 1000
  });

  // Itens de fatura do mês atual para TODOS os cartões (para montar o 'Usado' no grid)
  // ✅ CORRIGIDO: Backend espera competencia no formato YYYY-MM-DD completo
  const monthCompetenciaAll = format(new Date(), 'yyyy-MM-01');

  // Buscar itens do mês atual para exibir na fatura
  const { items: allItemsThisMonth } = useInvoiceItems(undefined, {
    competencia: monthCompetenciaAll, // Apenas mês atual
    order: "data_compra.desc",
    limit: 500
  });

  // ✅ NOVO: Buscar TODOS os itens (de todos os meses) para calcular limite usado
  const { items: allItemsAllMonths } = useInvoiceItems(undefined, {
    order: "data_compra.desc",
    limit: 1000 // Sem filtro de competência = busca tudo
  });

  const usageByCard = useMemo(() => {
    const map: Record<string, number> = {};
    const processedCompras = new Set<string>(); // Rastrear compras já processadas

    // ✅ CORRIGIDO: Usar TODOS os itens (não só do mês atual)
    (allItemsAllMonths || []).forEach((i) => {
      const v = typeof i.valor === 'string' ? parseFloat(i.valor) : (i.valor || 0);
      if (!i.cartao_id) return;
      
      // ✅ Usar descrição base (sem número de parcela) + data_compra como chave única
      const descricaoBase = i.descricao.replace(/\s*\(\d+\/\d+\)$/, ''); // Remove " (1/3)"
      const chaveUnica = `${i.cartao_id}-${descricaoBase}-${i.data_compra}`;
      
      // Se já processamos esta compra, pular
      if (processedCompras.has(chaveUnica)) {
        return;
      }
      
      // Marcar como processada
      processedCompras.add(chaveUnica);
      
      // Calcular valor total da compra (parcela × total_parcelas)
      const parcelaTotal = i.parcela_total || 1;
      const valorTotalCompra = v * parcelaTotal;
      
      map[i.cartao_id] = (map[i.cartao_id] || 0) + valorTotalCompra;
    });

    return map;
  }, [allItemsAllMonths]);

  const getUsagePercentage = (used: number, limit: string | number): number => {
    const limitNum = typeof limit === 'string' ? parseFloat(limit) : limit;
    return Math.round((used / limitNum) * 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const getBrandIcon = (brand: string) => {
    return <CreditCardIcon className="w-6 h-6" />;
  };

  const getCurrentInvoice = (card: CreditCard) => {
    const currentMonth = formatCompetencia(new Date());
    return invoices.find(inv =>
      inv.cartao_id === card.id &&
      formatCompetencia(inv.competencia) === currentMonth
    );
  };

  const getCardUsage = (card: CreditCard) => {
    // ✅ CORRIGIDO: Sempre usar usageByCard que calcula o TOTAL de todas as parcelas futuras
    // (não apenas o valor da fatura do mês atual)
    return usageByCard[card.id] ?? 0;
  };
  // Hooks derived from current invoice must be declared before any early return
  const currentInvoice = selectedCard ? getCurrentInvoice(selectedCard) : null;

  // 🔥 FIX CRÍTICO: Calcular competência correta baseada na data de fechamento do cartão
  // Se hoje (10/11) é DEPOIS do dia de fechamento (ex: dia 5), a compra cai no MÊS SEGUINTE
  const currentCompetencia = useMemo(() => {
    if (!selectedCard) return null;

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesAtual = hoje.getMonth(); // 0-11
    const anoAtual = hoje.getFullYear();

    // Se hoje é DEPOIS do fechamento, a próxima fatura é do mês seguinte
    let competenciaCalculada: Date;
    if (diaHoje > selectedCard.dia_fechamento) {
      // Exemplo: hoje é 10/11, fechamento dia 5 → competência = DEZEMBRO
      competenciaCalculada = new Date(anoAtual, mesAtual + 1, 1);
    } else {
      // Exemplo: hoje é 03/11, fechamento dia 5 → competência = NOVEMBRO
      competenciaCalculada = new Date(anoAtual, mesAtual, 1);
    }

    return formatCompetencia(competenciaCalculada);
  }, [selectedCard]);

  // 🔥 FIX: Buscar TODOS os itens do cartão e filtrar no frontend pela competência atual
  // Não filtrar por competência no backend, pois pode haver dessincronia entre fatura e competência
  const { items: invoiceItems, loading: loadingItems } = useInvoiceItems(
    currentInvoice?.id,
    selectedCard && !currentInvoice ? {
      cartao_id: selectedCard.id,
      // ❌ REMOVIDO: competencia (filtramos no frontend)
    } : undefined
  );

  // Buscar TODOS os itens do cartão (sem limitar por competência)
  const allCardFilters = useMemo(() =>
    selectedCard ? {
      cartao_id: selectedCard.id,
      order: "data_compra.desc",
      limit: 500
    } : undefined,
    [selectedCard]
  );

  const { items: allCardItems, loading: loadingAllItems } = useInvoiceItems(
    undefined,
    allCardFilters
  );

  // Utilitário para parsear competência robustamente
  const toCompDate = (c: string) => {
    const s = String(c);
    return new Date(s.length === 7 ? `${s}-01` : s);
  };

  // Calcular valor usado SOMANDO os itens da fatura atual (fallback: mês atual)
  const usedPending = useMemo(() => {
    if (!selectedCard) return 0;
    const relevantItems = (allCardItems || []).filter(i => {
      if (currentInvoice?.id) return i.fatura_id === currentInvoice.id;
      const comp = formatCompetencia(i.competencia || "");
      return comp === (currentCompetencia || "");
    });
    return relevantItems.reduce((sum, i) => {
      const v = typeof i.valor === "string" ? parseFloat(i.valor) : i.valor;
      return sum + (v || 0);
    }, 0);
  }, [allCardItems, selectedCard, currentInvoice?.id, currentCompetencia]);

  // 🔥 FIX: Filtrar itens por competência atual + busca
  const filteredItems = useMemo(() => {
    if (!invoiceItems) return [] as typeof invoiceItems;

    // 1️⃣ Filtrar por competência atual (se não houver fatura_id definida)
    let items = invoiceItems;
    if (!currentInvoice?.id && currentCompetencia) {
      items = invoiceItems.filter(item => {
        const comp = formatCompetencia(item.competencia || "");
        return comp === currentCompetencia;
      });
    }

    // 2️⃣ Aplicar filtro de busca
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.descricao?.toLowerCase().includes(term) ||
      categories.find(c => c.id === item.categoria_id)?.nome?.toLowerCase().includes(term)
    );
  }, [invoiceItems, searchTerm, categories, currentInvoice?.id, currentCompetencia]);

  // Todas as faturas do cartão selecionado, agrupadas por ano
  // ✅ MELHORADO: Ordenação DESC (mais recente primeiro)
  const invoicesByYear = useMemo(() => {
    const grouped: Record<string, typeof invoices> = {};
    invoices.forEach(inv => {
      // Garantir extração robusta do ano (competência no formato "YYYY-MM" ou "YYYYMM")
      const compStr = String(inv.competencia);
      const year = compStr.includes('-') ? compStr.split('-')[0] : compStr.substring(0, 4);
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(inv);
    });

    // Ordenar faturas dentro de cada ano por competência DESC (mais recente primeiro)
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const compA = String(a.competencia);
        const compB = String(b.competencia);
        return compB.localeCompare(compA); // DESC: mais recente primeiro
      });
    });

    return grouped;
  }, [invoices]);

  // Anos ordenados do mais recente para o mais antigo
  const years = useMemo(() => {
    return Object.keys(invoicesByYear).sort((a, b) => {
      return parseInt(b) - parseInt(a); // DESC: 2026, 2025, 2024...
    });
  }, [invoicesByYear]);

  // Faturas dos últimos 12 meses para o histórico
  // ✅ MELHORADO: Mostrar todas as faturas que tenham valor + faturas em atraso
  const last12MonthsInvoices = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    return invoices
      .filter(inv => {
        const invDate = toCompDate(inv.competencia);
        const compStr = format(invDate, "yyyy-MM");

        // Mostrar qualquer fatura que:
        // 1. Tenha valor (foi usada)
        const temValor = inv.valor_fechado && parseFloat(String(inv.valor_fechado)) > 0;
        // 2. Esteja fechada ou paga
        const temStatus = inv.status === 'fechada' || inv.status === 'paga';
        // 3. Esteja aberta mas de meses anteriores (EM ATRASO)
        const emAtraso = inv.status === 'aberta' && compStr < currentMonth;
        // 4. Dentro do range de 12 meses
        const isDentroRange = invDate >= twelveMonthsAgo;

        return isDentroRange && (temValor || temStatus || emAtraso);
      })
      .sort((a, b) => {
        return b.competencia.localeCompare(a.competencia); // DESC - mais recente primeiro
      });
  }, [invoices]);

  // Faturas futuras (próximos meses)
  const upcomingInvoices = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");

    return invoices
      .filter(inv => {
        const invDate = toCompDate(inv.competencia);
        const compStr = format(invDate, "yyyy-MM");
        return compStr > currentMonth;
      })
      .sort((a, b) => {
        return a.competencia.localeCompare(b.competencia); // ASC para futuras
      });
  }, [invoices]);

  // ✅ Calcular valor da próxima fatura (próximo mês) somando itens
  const nextInvoiceValue = useMemo(() => {
    if (!selectedCard) return 0;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextCompetencia = formatCompetencia(nextMonth);
    
    const nextMonthItems = (allItemsAllMonths || []).filter(i => {
      if (!i.cartao_id || i.cartao_id !== selectedCard.id) return false;
      const comp = formatCompetencia(i.competencia || "");
      return comp === nextCompetencia;
    });
    
    return nextMonthItems.reduce((sum, i) => {
      const v = typeof i.valor === "string" ? parseFloat(i.valor) : i.valor;
      return sum + (v || 0);
    }, 0);
  }, [allItemsAllMonths, selectedCard]);

  // DEBUG: Remover após validação
  // console.log("DEBUG Cartões - Compras encontradas:", {
  //   cartaoId: selectedCard?.id,
  //   competencia: currentCompetencia,
  //   totalCompras: invoiceItems?.length || 0,
  //   valorCalculado: usedPending,
  //   currentInvoiceId: currentInvoice?.id
  // });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <CreditCardIcon className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Nenhum cartão encontrado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você ainda não possui cartões de crédito cadastrados. Adicione seu primeiro cartão para começar a gerenciar suas faturas.
        </p>
        <Button
          className="bg-gradient-primary mt-4"
          onClick={() => setIsNewCardModalOpen(true)}
          disabled={activeAccounts.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Primeiro Cartão
        </Button>
        {activeAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            É necessário ter pelo menos uma conta ativa para criar um cartão.
          </p>
        )}

        <NewCardModal
          open={isNewCardModalOpen}
          onOpenChange={setIsNewCardModalOpen}
          onSuccess={refresh}
        />
      </div>
    );
  }

  // Mover todos os cálculos e useMemos para ANTES de qualquer render condicional
  const limite = selectedCard && typeof selectedCard.limite_total === 'string' ?
    parseFloat(selectedCard.limite_total) : (typeof selectedCard?.limite_total === 'number' ? selectedCard.limite_total : 0);
  
  // ✅ CORRIGIDO: Usar getCardUsage() que calcula TODAS as parcelas futuras
  const usage = selectedCard ? getCardUsage(selectedCard) : 0;
  
  const usagePercentage = selectedCard ? getUsagePercentage(usage, limite) : 0;
  const disponivel = Number(limite) - usage;
  const payingAccount = selectedCard ? activeAccounts.find(acc => acc.id === selectedCard.conta_pagamento_id) : null;

  // ✅ Valor da fatura ATUAL (apenas mês de novembro) - para exibir no card "Fatura Atual"
  const currentMonthInvoiceValue = usedPending;

  // Calcular próximo mês para exibição
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Hooks moved above early returns: filteredItems, last12MonthsInvoices

  // Calcular dias até vencimento
  const daysUntilDue = currentInvoice
    ? differenceInDays(new Date(currentInvoice.data_vencimento), new Date())
    : null;

  const handleSaveCard = async () => {
    if (!selectedCard) return;
    try {
      // Garantir que todos os campos necessários sejam enviados
      const updateData = {
        apelido: editForm.apelido || selectedCard.apelido,
        bandeira: editForm.bandeira || selectedCard.bandeira,
        limite_total: editForm.limite_total ?? selectedCard.limite_total,
        dia_fechamento: editForm.dia_fechamento ?? selectedCard.dia_fechamento,
        dia_vencimento: editForm.dia_vencimento ?? selectedCard.dia_vencimento,
        conta_pagamento_id: editForm.conta_pagamento_id ?? selectedCard.conta_pagamento_id,
      };

      console.log('💾 Salvando cartão:', { id: selectedCard.id, ...updateData });
      await updateCard(selectedCard.id, updateData);

      toast({
        title: "Cartão atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      setEditMode(false);
      refresh();
    } catch (error: any) {
      console.error('❌ Erro ao atualizar cartão:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };


  // Função para deletar o cartão
  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await deleteCard(cardToDelete.id);
      toast({
        title: 'Cartão excluído',
        description: 'O cartão foi removido com sucesso.',
      });
      setIsDeleteCardModalOpen(false);
      setCardToDelete(null);
      refresh();
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o cartão.',
        variant: 'destructive',
      });
    }
  };


  if (selectedCard) {
    // Função para deletar a fatura
    const handleDeleteInvoice = async () => {
      if (!currentInvoice) return;
      try {
        const res = await fetch(`/api/faturas/${currentInvoice.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Erro ao excluir fatura');
        toast({
          title: 'Fatura excluída',
          description: 'A fatura foi removida com sucesso.',
        });
        setIsDeleteInvoiceModalOpen(false);
        refresh();
      } catch (err: any) {
        toast({
          title: 'Erro ao excluir',
          description: err.message || 'Não foi possível excluir a fatura.',
          variant: 'destructive',
        });
      }
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCard(null);
              setEditMode(false);
              setSearchTerm("");
            }}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">{selectedCard.apelido}</h1>
        </div>

        {/* Cards de resumo no topo */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card 1: Limite */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Limite do Cartão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center">
                <CircularProgress
                  value={usage}
                  max={Number(limite)}
                  size={120}
                  strokeWidth={10}
                />
              </div>
              <div className="text-center space-y-1">
                <ValueDisplay value={usage} size="xl" />
                <p className="text-sm text-muted-foreground">
                  de <ValueDisplay value={Number(limite)} size="sm" className="text-muted-foreground" />
                </p>
                <StatusBadge
                  status={usagePercentage >= 90 ? "error" : usagePercentage >= 70 ? "warning" : "success"}
                  label={`${disponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} disponível`}
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Fatura Atual */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fatura Atual</CardTitle>
                {currentInvoice?.status === "aberta" && (
                  <Badge variant="destructive" className="text-xs">
                    <DollarSign className="w-3 h-3 mr-1" />
                    A Pagar
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ✅ CORRIGIDO: Mostrar fatura mesmo sem registro no banco (baseado nos itens) */}
              {currentInvoice || currentMonthInvoiceValue > 0 ? (
                <>
                  <div className="text-center space-y-2">
                    {/* ✅ CORRIGIDO: Mostrar valor da fatura ATUAL (novembro apenas) */}
                    <ValueDisplay value={currentMonthInvoiceValue} size="xl" />
                    <StatusBadge
                      status={
                        currentInvoice?.status === "paga" ? "success" :
                          currentInvoice?.status === "fechada" ? "warning" :
                            "error"
                      }
                      label={
                        currentInvoice?.status === "paga" ? "✓ Paga" :
                          currentInvoice?.status === "fechada" ? "⏸ Fechada" :
                            "⏳ Aberta"
                      }
                      size="sm"
                      className="capitalize font-medium"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {currentInvoice?.data_vencimento && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Vencimento:</span>
                        <span className="font-medium">{formatDateYmdToBr(currentInvoice.data_vencimento)}</span>
                      </div>
                    )}
                    {daysUntilDue !== null && daysUntilDue >= 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Faltam:</span>
                        <StatusBadge
                          status={daysUntilDue <= 3 ? "error" : "info"}
                          label={`${daysUntilDue} dias`}
                          size="xs"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem fatura atual</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Próxima Fatura */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Fatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center space-y-2">
                <ValueDisplay value={nextInvoiceValue} size="xl" />
                <StatusBadge status="info" label="Em aberto" size="sm" />
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fecha em:</span>
                  <span className="font-medium">
                    {differenceInDays(
                      new Date(new Date().getFullYear(), new Date().getMonth() + 1, selectedCard.dia_fechamento),
                      new Date()
                    )} dias
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Competência:</span>
                  <span className="font-medium capitalize">
                    {format(nextMonth, "MMM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info do cartão */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getBrandIcon(selectedCard.bandeira)}
                <div>
                  <CardTitle className="text-xl">{selectedCard.apelido}</CardTitle>
                  <CardDescription className="capitalize">
                    {selectedCard.bandeira} • Conta: {payingAccount?.nome}
                  </CardDescription>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Fecha dia {selectedCard.dia_fechamento} • Vence dia {selectedCard.dia_vencimento}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Fatura Atual</TabsTrigger>
            <TabsTrigger value="upcoming">Próximas Faturas</TabsTrigger>
            <TabsTrigger value="extrato">Extrato Completo</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fatura do Mês Atual</CardTitle>
                    <CardDescription>
                      {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsAddPurchaseModalOpen(true)}
                      size="sm"
                      variant="outline"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Nova Compra
                    </Button>
                    {currentInvoice?.status === "aberta" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setIsInvoiceActionsModalOpen(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Fechar Fatura
                      </Button>

                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditInvoiceForm(currentInvoice);
                        setIsEditInvoiceModalOpen(true);
                      }}>
                      Editar Fatura
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeleteInvoiceModalOpen(true)}
                    >
                      Excluir Fatura
                    </Button>
                    {currentInvoice?.status === "fechada" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setInvoiceToPayId(currentInvoice.id);
                          setIsPayInvoiceModalOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pagar Agora
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando compras...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma compra este mês</p>
                    <p className="text-sm mt-1">
                      Adicione sua primeira compra para começar
                    </p>
                    <Button
                      onClick={() => setIsAddPurchaseModalOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Adicionar Compra
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Busca de compras */}
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar compras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>

                    {/* Lista de compras */}
                    <CompactTable>
                      <CompactTableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </CompactTableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <CompactTableRow key={item.id}>
                            <TableCell>{formatDateYmdToBr(item.data_compra)}</TableCell>
                            <TableCell className="font-medium">{item.descricao}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.categoria_nome || item.categoria_pai_nome || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.parcela_total > 1 ? (
                                <Badge className="bg-blue-500">
                                  {item.parcela_numero}/{item.parcela_total}x
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <ValueDisplay value={typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor} size="sm" />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPurchase(item);
                                    setIsEditPurchaseModalOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPurchase(item);
                                    setIsDeletePurchaseModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </CompactTableRow>
                        ))}
                      </TableBody>
                    </CompactTable>

                    {/* Total */}
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-semibold">Total da Fatura:</span>
                      <ValueDisplay value={usedPending} size="xl" className="font-bold text-primary" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Faturas</CardTitle>
                <CardDescription>
                  Compras parceladas que cairão nos próximos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingInvoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Sem faturas futuras</p>
                    <p className="text-sm mt-1">Compras parceladas aparecerão aqui</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {upcomingInvoices.map((invoice) => (
                      <InvoiceListItem
                        key={invoice.id}
                        invoice={invoice}
                        categories={categories}
                        formatCurrency={formatCurrency}
                        onPayInvoice={() => {
                          setInvoiceToPayId(invoice.id);
                          setIsPayInvoiceModalOpen(true);
                        }}
                      />
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extrato" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Extrato Completo do Cartão</CardTitle>
                    <CardDescription>
                      Todas as compras realizadas neste cartão
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {allCardPurchases?.length || 0} compras
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAllPurchases ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando extrato...
                  </div>
                ) : allCardPurchases && allCardPurchases.length > 0 ? (
                  <div className="space-y-4">
                    {/* Busca e Filtros */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar no extrato..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="max-w-sm"
                        />
                      </div>
                      <Select value={extractPeriodFilter} onValueChange={setExtractPeriodFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tudo</SelectItem>
                          <SelectItem value="3m">Últimos 3 meses</SelectItem>
                          <SelectItem value="6m">Últimos 6 meses</SelectItem>
                          <SelectItem value="12m">Últimos 12 meses</SelectItem>
                          <SelectItem value="year">Este ano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Agrupar compras parceladas */}
                    {(() => {
                      // Aplicar filtro de período
                      const now = new Date();
                      let periodFilteredItems = allCardPurchases;

                      if (extractPeriodFilter !== "all") {
                        periodFilteredItems = allCardPurchases.filter(item => {
                          const itemDate = parseDateLocal(item.data_compra);
                          const diffMonths = (now.getFullYear() - itemDate.getFullYear()) * 12 +
                            (now.getMonth() - itemDate.getMonth());

                          switch (extractPeriodFilter) {
                            case "3m": return diffMonths <= 3;
                            case "6m": return diffMonths <= 6;
                            case "12m": return diffMonths <= 12;
                            case "year": return itemDate.getFullYear() === now.getFullYear();
                            default: return true;
                          }
                        });
                      }

                      // Aplicar filtro de busca
                      const filteredItems = periodFilteredItems.filter(item => {
                        if (!searchTerm) return true;
                        const search = searchTerm.toLowerCase();
                        return (
                          item.descricao?.toLowerCase().includes(search) ||
                          item.categoria_nome?.toLowerCase().includes(search) ||
                          item.categoria_pai_nome?.toLowerCase().includes(search)
                        );
                      });

                      // Agrupar por descrição base (sem " (1/12)")
                      const grouped = new Map<string, typeof filteredItems>();

                      filteredItems.forEach(item => {
                        // Remover texto de parcela da descrição para agrupar
                        const baseDesc = item.descricao.replace(/\s*\(\d+\/\d+\)$/, '');
                        const key = `${baseDesc}_${item.data_compra}_${item.categoria_id}`;

                        if (!grouped.has(key)) {
                          grouped.set(key, []);
                        }
                        grouped.get(key)!.push(item);
                      });

                      // Converter para array e ordenar
                      const groupedArray = Array.from(grouped.entries()).map(([key, items]) => {
                        // ✅ FIX: Converter parcela_numero para número antes de ordenar (pode vir como string do banco)
                        const sorted = items.sort((a, b) => {
                          const numA = typeof a.parcela_numero === 'string' ? parseInt(a.parcela_numero) : a.parcela_numero;
                          const numB = typeof b.parcela_numero === 'string' ? parseInt(b.parcela_numero) : b.parcela_numero;
                          return numA - numB;
                        });
                        const isParcelado = items.length > 1 || items[0].parcela_total > 1;
                        const valorTotal = items.reduce((sum, i) =>
                          sum + (typeof i.valor === 'string' ? parseFloat(i.valor) : i.valor || 0), 0
                        );

                        return {
                          key,
                          items: sorted,
                          firstItem: sorted[0],
                          isParcelado,
                          valorTotal
                        };
                      }).sort((a, b) =>
                        parseDateLocal(b.firstItem.data_compra).getTime() - parseDateLocal(a.firstItem.data_compra).getTime()
                      );

                      return (
                        <Accordion type="single" collapsible className="w-full space-y-2">
                          {groupedArray.map(({ key, items, firstItem, isParcelado, valorTotal }) => (
                            <AccordionItem key={key} value={key} className="border rounded-lg">
                              <AccordionTrigger className="hover:no-underline px-4 py-3">
                                <div className="flex items-center justify-between w-full pr-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                                      {formatDateYmdToBr(firstItem.data_compra)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-left truncate">
                                        {firstItem.descricao.replace(/\s*\(\d+\/\d+\)$/, '')}
                                      </p>
                                      <p className="text-xs text-muted-foreground text-left">
                                        {firstItem.categoria_pai_nome || firstItem.categoria_nome || "—"}
                                      </p>
                                    </div>
                                    {isParcelado && (
                                      <Badge className="bg-blue-500 text-xs">
                                        {items.length}x de <ValueDisplay value={items[0].valor} size="sm" className="inline" />
                                      </Badge>
                                    )}
                                  </div>
                                  <ValueDisplay value={valorTotal} size="sm" className="ml-3" />
                                </div>
                              </AccordionTrigger>
                              {isParcelado && (
                                <AccordionContent className="px-4 pb-3">
                                  <div className="space-y-1.5 pt-2">
                                    {items.map((item, idx) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between text-sm py-2 px-3 bg-muted/30 rounded border border-border/30"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline" className="text-xs">
                                            {item.parcela_numero}/{item.parcela_total}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {format(parseDateLocal(item.competencia), "MMM/yyyy", { locale: ptBR })}
                                          </span>
                                        </div>
                                        <ValueDisplay
                                          value={typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor}
                                          size="sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              )}
                            </AccordionItem>
                          ))}
                        </Accordion>
                      );
                    })()}

                    {/* Totalizador */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        Total de {allCardPurchases.length} parcelas
                      </span>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-2">Total:</span>
                        <ValueDisplay
                          value={allCardPurchases.reduce((sum, item) =>
                            sum + (typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor || 0), 0
                          )}
                          size="lg"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma compra encontrada</p>
                    <p className="text-sm mt-1">As compras realizadas aparecerão aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Faturas</CardTitle>
                <CardDescription>
                  Faturas pagas e fechadas dos últimos 12 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {last12MonthsInvoices.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {last12MonthsInvoices.map((invoice) => (
                      <InvoiceHistoryItem
                        key={invoice.id}
                        invoice={invoice}
                        categories={categories}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum histórico encontrado</p>
                    <p className="text-sm mt-1">Faturas pagas aparecerão aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configurações do Cartão</CardTitle>
                    <CardDescription>
                      Edite as informações do seu cartão de crédito
                    </CardDescription>
                  </div>
                  {!editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(true);
                        setEditForm({
                          apelido: selectedCard.apelido,
                          bandeira: selectedCard.bandeira,
                          limite_total: selectedCard.limite_total,
                          dia_fechamento: selectedCard.dia_fechamento,
                          dia_vencimento: selectedCard.dia_vencimento,
                          conta_pagamento_id: selectedCard.conta_pagamento_id,
                        });
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="apelido">Apelido do Cartão</Label>
                        <Input
                          id="apelido"
                          value={editForm.apelido || ""}
                          onChange={(e) => setEditForm({ ...editForm, apelido: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bandeira">Bandeira</Label>
                          <Select
                            value={editForm.bandeira || selectedCard.bandeira}
                            onValueChange={(value) => setEditForm({ ...editForm, bandeira: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="visa">Visa</SelectItem>
                              <SelectItem value="mastercard">Mastercard</SelectItem>
                              <SelectItem value="elo">Elo</SelectItem>
                              <SelectItem value="amex">American Express</SelectItem>
                              <SelectItem value="hipercard">Hipercard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="limite">Limite Total</Label>
                          <Input
                            id="limite"
                            type="number"
                            step="0.01"
                            value={editForm.limite_total || ""}
                            onChange={(e) => setEditForm({ ...editForm, limite_total: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fechamento">Dia de Fechamento</Label>
                          <Select
                            value={editForm.dia_fechamento?.toString() || selectedCard.dia_fechamento.toString()}
                            onValueChange={(value) => setEditForm({ ...editForm, dia_fechamento: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="vencimento">Dia de Vencimento</Label>
                          <Select
                            value={editForm.dia_vencimento?.toString() || selectedCard.dia_vencimento.toString()}
                            onValueChange={(value) => setEditForm({ ...editForm, dia_vencimento: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conta_pagamento">Conta de Pagamento</Label>
                        <Select
                          value={editForm.conta_pagamento_id || selectedCard.conta_pagamento_id}
                          onValueChange={(value) => setEditForm({ ...editForm, conta_pagamento_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.nome} ({account.tipo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveCard} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setEditForm({});
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Apelido:</span>
                        <span className="font-medium">{selectedCard.apelido}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Bandeira:</span>
                        <span className="font-medium capitalize">{selectedCard.bandeira}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Limite:</span>
                        <ValueDisplay value={Number(limite)} size="sm" className="font-medium" />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Dia de Fechamento:</span>
                        <span className="font-medium">Dia {selectedCard.dia_fechamento}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Dia de Vencimento:</span>
                        <span className="font-medium">Dia {selectedCard.dia_vencimento}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Conta de Pagamento:</span>
                        <span className="font-medium">{payingAccount?.nome}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PayInvoiceModal
          open={isPayInvoiceModalOpen}
          onOpenChange={setIsPayInvoiceModalOpen}
          invoice={(() => {
            const inv = invoiceToPayId ? invoices.find(i => i.id === invoiceToPayId) : null;
            if (!inv) return undefined;
            return {
              id: inv.id,
              valor_total: typeof inv.valor_total === 'string' ?
                parseFloat(inv.valor_total || '0') : (inv.valor_total || 0),
              valor_fechado: typeof inv.valor_fechado === 'string' ?
                parseFloat(inv.valor_fechado || '0') : (inv.valor_fechado || 0),
              status: inv.status,
              data_vencimento: inv.data_vencimento,
              competencia: inv.competencia,
              cartao_id: inv.cartao_id
            };
          })()}
          onSuccess={() => {
            setIsPayInvoiceModalOpen(false);
            setInvoiceToPayId(null);
            refresh();
          }}
        />

        <AddPurchaseModal
          open={isAddPurchaseModalOpen}
          onOpenChange={setIsAddPurchaseModalOpen}
          selectedCard={selectedCard}
          onSuccess={refresh}
        />

        <InvoiceActionsModal
          open={isInvoiceActionsModalOpen}
          onOpenChange={setIsInvoiceActionsModalOpen}
          card={selectedCard}
          competencia={formatCompetencia(new Date())}
          onSuccess={refresh}
        />
        {/* Modal de confirmação de exclusão de fatura */}
        {isDeleteInvoiceModalOpen && currentInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Excluir Fatura</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDeleteInvoiceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteInvoice}>
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edição de fatura */}
        {isEditInvoiceModalOpen && currentInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Editar Fatura</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={editInvoiceForm.data_vencimento?.slice(0, 10) || ''}
                    onChange={e => setEditInvoiceForm(f => ({ ...f, data_vencimento: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Status</label>
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={editInvoiceForm.status || ''}
                    onChange={e => setEditInvoiceForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="aberta">Aberta</option>
                    <option value="fechada">Fechada</option>
                    <option value="paga">Paga</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setIsEditInvoiceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="default" onClick={async () => {
                  try {
                    const res = await fetch(`/api/faturas/${currentInvoice.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editInvoiceForm),
                    });
                    if (!res.ok) throw new Error('Erro ao editar fatura');
                    toast({ title: 'Fatura atualizada', description: 'Alterações salvas com sucesso.' });
                    setIsEditInvoiceModalOpen(false);
                    refresh();
                  } catch (err: any) {
                    toast({ title: 'Erro ao editar', description: err.message || 'Não foi possível editar a fatura.', variant: 'destructive' });
                  }
                }}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edição de compra */}
        {isEditPurchaseModalOpen && selectedPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Editar Compra</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1 font-medium">Descrição</label>
                  <Input
                    value={selectedPurchase.descricao}
                    onChange={e => setSelectedPurchase({ ...selectedPurchase, descricao: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={typeof selectedPurchase.valor === 'string' ? parseFloat(selectedPurchase.valor) : selectedPurchase.valor}
                    onChange={e => setSelectedPurchase({ ...selectedPurchase, valor: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">Data da Compra</label>
                  <Input
                    type="date"
                    value={selectedPurchase.data_compra}
                    onChange={e => setSelectedPurchase({ ...selectedPurchase, data_compra: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => {
                  setIsEditPurchaseModalOpen(false);
                  setSelectedPurchase(null);
                }}>
                  Cancelar
                </Button>
                <Button variant="default" onClick={async () => {
                  try {
                    const res = await fetch(`/api/faturas/itens/${selectedPurchase.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        descricao: selectedPurchase.descricao,
                        valor: selectedPurchase.valor,
                        data_compra: selectedPurchase.data_compra,
                      }),
                    });
                    if (!res.ok) throw new Error('Erro ao editar compra');
                    toast({ title: 'Compra atualizada', description: 'Alterações salvas com sucesso.' });
                    setIsEditPurchaseModalOpen(false);
                    setSelectedPurchase(null);
                    refresh();
                  } catch (err: any) {
                    toast({ title: 'Erro ao editar', description: err.message || 'Não foi possível editar a compra.', variant: 'destructive' });
                  }
                }}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de exclusão de compra */}
        {isDeletePurchaseModalOpen && selectedPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Excluir Compra</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja excluir a compra "<strong>{selectedPurchase.descricao}</strong>"? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setIsDeletePurchaseModalOpen(false);
                  setSelectedPurchase(null);
                }}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={async () => {
                  try {
                    const res = await fetch(`/api/faturas/itens/${selectedPurchase.id}`, {
                      method: 'DELETE',
                    });
                    if (!res.ok) throw new Error('Erro ao excluir compra');
                    toast({ title: 'Compra excluída', description: 'A compra foi removida com sucesso.' });
                    setIsDeletePurchaseModalOpen(false);
                    setSelectedPurchase(null);
                    refresh();
                  } catch (err: any) {
                    toast({ title: 'Erro ao excluir', description: err.message || 'Não foi possível excluir a compra.', variant: 'destructive' });
                  }
                }}>
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View principal: grid de cartões
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddPurchaseModalOpen(true)}
            disabled={activeCards.length === 0}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
          <Button
            className="bg-gradient-primary"
            onClick={() => setIsNewCardModalOpen(true)}
            disabled={activeAccounts.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cartão
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeCards.map((card) => {
          const usage = getCardUsage(card);
          const limite = typeof card.limite_total === 'string' ? parseFloat(card.limite_total) : card.limite_total;
          const currentInvoice = getCurrentInvoice(card);

          return (
            <div key={card.id} className="space-y-3">
              {/* Cartão de crédito visual */}
              <CreditCardDisplay
                card={card}
                usage={usage}
                limite={limite}
                onClick={() => setSelectedCard(card)}
              />

              {/* Ações do cartão */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedCard(card);
                    setIsAddPurchaseModalOpen(true);
                  }}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Nova Compra
                </Button>
                {currentInvoice?.status === "aberta" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCard(card);
                      setIsInvoiceActionsModalOpen(true);
                    }}
                  >
                    <Receipt className="w-3 h-3 mr-1" />
                    Fatura
                  </Button>
                )}
                {currentInvoice?.status === "fechada" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCard(card);
                      setIsPayInvoiceModalOpen(true);
                    }}
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Pagar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setCardToDelete(card);
                    setIsDeleteCardModalOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <NewCardModal
        open={isNewCardModalOpen}
        onOpenChange={setIsNewCardModalOpen}
        onSuccess={refresh}
      />

      <PayInvoiceModal
        open={isPayInvoiceModalOpen}
        onOpenChange={setIsPayInvoiceModalOpen}
        invoice={(() => {
          const invoice = invoices.find(inv => inv.cartao_id === selectedCard?.id);
          return invoice ? {
            id: invoice.id,
            valor_total: typeof invoice.valor_total === 'string' ?
              parseFloat(invoice.valor_total || '0') : (invoice.valor_total || 0),
            data_vencimento: invoice.data_vencimento,
            competencia: invoice.competencia,
            cartao_id: invoice.cartao_id
          } : undefined;
        })()}
        onSuccess={() => {
          setIsPayInvoiceModalOpen(false);
          refresh();
        }}
      />

      <AddPurchaseModal
        open={isAddPurchaseModalOpen}
        onOpenChange={setIsAddPurchaseModalOpen}
        selectedCard={selectedCard}
        onSuccess={() => {
          setIsAddPurchaseModalOpen(false);
          refresh();
        }}
      />

      <InvoiceActionsModal
        open={isInvoiceActionsModalOpen}
        onOpenChange={setIsInvoiceActionsModalOpen}
        card={selectedCard}
        competencia={formatCompetencia(new Date())}
        onSuccess={refresh}
      />

      {/* Modal de confirmação de exclusão de cartão */}
      {isDeleteCardModalOpen && cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Excluir Cartão</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tem certeza que deseja excluir o cartão "<strong>{cardToDelete.apelido}</strong>"?
              Todas as faturas e compras associadas serão mantidas para fins de histórico, mas o cartão não estará mais disponível.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setIsDeleteCardModalOpen(false);
                setCardToDelete(null);
              }}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteCard}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}