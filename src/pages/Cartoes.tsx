import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion } from "@/components/ui/accordion";
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
  Save
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
import { CompactTable, CompactTableHeader, CompactTableRow, TableBody, TableCell, TableHead } from "@/components/CompactTable";
import { TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCompetencia, parseDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";

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

  const { activeCards, loading, refresh, updateCard } = useCreditCards();
  const { invoices } = useInvoices(selectedCard?.id);
  const { activeAccounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useToast();
  const { isValuesCensored } = usePrivacy();


  // Itens de fatura do mês atual para TODOS os cartões (para montar o 'Usado' no grid)
  // ✅ CORRIGIDO: Backend espera competencia no formato YYYY-MM-DD completo
  const monthCompetenciaAll = format(new Date(), 'yyyy-MM-01');
  
  const { items: allItemsThisMonth } = useInvoiceItems(undefined, {
    competencia: monthCompetenciaAll, // Já está no formato correto YYYY-MM-DD
    order: "data_compra.desc",
    limit: 500
  });

  const usageByCard = useMemo(() => {
    const map: Record<string, number> = {};
    
    (allItemsThisMonth || []).forEach((i) => {
      // Validar que a competência do item corresponde ao mês atual
      const itemCompetencia = typeof i.competencia === 'string' 
        ? i.competencia.substring(0, 7) 
        : format(new Date(i.competencia), 'yyyy-MM-01');
      
      if (itemCompetencia === monthCompetenciaAll.substring(0, 7)) {
        const v = typeof i.valor === 'string' ? parseFloat(i.valor) : (i.valor || 0);
        if (!i.cartao_id) return;
        map[i.cartao_id] = (map[i.cartao_id] || 0) + v;
      }
    });
    
    return map;
  }, [allItemsThisMonth, monthCompetenciaAll]);

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
    const inv = getCurrentInvoice(card);
    // Se a fatura estiver fechada/paga e possuir valor_fechado, usar esse valor
    const vf = inv?.valor_fechado as any;
    const closedValue = typeof vf === 'string' ? parseFloat(vf || '0') : (vf || 0);
    if (closedValue > 0) return closedValue;
    // Caso contrário, somar itens do mês atual para este cartão
    return usageByCard[card.id] ?? 0;
  };
  // Hooks derived from current invoice must be declared before any early return
  const currentInvoice = selectedCard ? getCurrentInvoice(selectedCard) : null;
  const currentCompetencia = selectedCard ? formatCompetencia(new Date()) : null;
  
  // Priorizar busca por fatura_id se existir, senão usar cartao_id + competencia
  const { items: invoiceItems, loading: loadingItems } = useInvoiceItems(
    currentInvoice?.id,
    selectedCard && !currentInvoice ? { 
      cartao_id: selectedCard.id, 
      competencia: `${currentCompetencia}-01` // ✅ CORRIGIDO: Backend espera formato YYYY-MM-DD
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

  // Filtrar itens por busca (moved above early returns)
  const filteredItems = useMemo(() => {
    if (!invoiceItems) return [] as typeof invoiceItems;
    if (!searchTerm.trim()) return invoiceItems;
    const term = searchTerm.toLowerCase();
    return invoiceItems.filter(item =>
      item.descricao?.toLowerCase().includes(term) ||
      categories.find(c => c.id === item.categoria_id)?.nome?.toLowerCase().includes(term)
    );
  }, [invoiceItems, searchTerm, categories]);

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

  // Faturas dos últimos 12 meses para o histórico (apenas anteriores ao mês atual)
  // ✅ MELHORADO: Separar histórico (pagas/fechadas) de futuras
  const last12MonthsInvoices = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);
    
    return invoices
      .filter(inv => {
        const invDate = toCompDate(inv.competencia);
        const compStr = format(invDate, "yyyy-MM");
        // Apenas faturas do passado que foram pagas ou fechadas
        return invDate >= twelveMonthsAgo && 
               compStr < currentMonth && 
               (inv.status === 'paga' || inv.status === 'fechada');
      })
      .sort((a, b) => {
        return b.competencia.localeCompare(a.competencia); // DESC
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
  const usage = usedPending;
  const usagePercentage = selectedCard ? getUsagePercentage(usage, limite) : 0;
  const disponivel = Number(limite) - usage;
  const payingAccount = selectedCard ? activeAccounts.find(acc => acc.id === selectedCard.conta_pagamento_id) : null;

  // Próxima fatura (próximo mês)
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextCompetencia = formatCompetencia(nextMonth);
  const nextInvoice = invoices.find(inv => formatCompetencia(inv.competencia) === nextCompetencia);
  const nextInvoiceValue = nextInvoice?.valor_total 
    ? (typeof nextInvoice.valor_total === 'string' ? parseFloat(nextInvoice.valor_total) : nextInvoice.valor_total)
    : 0;

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

  
  if (selectedCard) {
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Fatura Atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentInvoice ? (
                <>
                  <div className="text-center space-y-2">
                    <ValueDisplay value={usage} size="xl" />
                    <StatusBadge 
                      status={
                        currentInvoice.status === "paga" ? "success" : 
                        currentInvoice.status === "fechada" ? "warning" : 
                        "info"
                      }
                      label={currentInvoice.status}
                      size="sm"
                      className="capitalize"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Vencimento:</span>
                      <span className="font-medium">{format(new Date(currentInvoice.data_vencimento), "dd/MM/yyyy")}</span>
                    </div>
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
                        onClick={() => setIsInvoiceActionsModalOpen(true)}
                      >
                        <Receipt className="w-3 h-3 mr-2" />
                        Fechar Fatura
                      </Button>
                    )}
                    {currentInvoice?.status === "fechada" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setInvoiceToPayId(currentInvoice.id);
                          setIsPayInvoiceModalOpen(true);
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-2" />
                        Pagar Fatura
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
                        </TableRow>
                      </CompactTableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <CompactTableRow key={item.id}>
                            <TableCell>{format(new Date(item.data_compra), "dd/MM/yyyy")}</TableCell>
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
      </div>
    );
  }

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeCards.map((card) => {
          const usage = getCardUsage(card);
          const limite = typeof card.limite_total === 'string' ? parseFloat(card.limite_total) : card.limite_total;
          const usagePercentage = getUsagePercentage(usage, limite);
          const disponivel = limite - usage;
          const payingAccount = activeAccounts.find(acc => acc.id === card.conta_pagamento_id);
          const currentInvoice = getCurrentInvoice(card);

          return (
            <Card 
              key={card.id}
              className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-primary hover:scale-[1.02]"
              onClick={() => setSelectedCard(card)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getBrandIcon(card.bandeira)}
                    <div>
                      <CardTitle className="text-base">{card.apelido}</CardTitle>
                      <CardDescription className="text-xs capitalize">
                        {card.bandeira}
                      </CardDescription>
                    </div>
                  </div>
                  <CircularProgress 
                    value={usage}
                    max={limite}
                    size={60}
                    strokeWidth={6}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Usado</span>
                    <ValueDisplay value={usage} size="lg" className={`font-bold ${getUsageColor(usagePercentage)}`} />
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Limite</span>
                    <ValueDisplay value={limite} size="sm" className="font-medium" />
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t">
                    <span className="text-sm text-muted-foreground">Disponível</span>
                    <StatusBadge 
                      status={usagePercentage >= 90 ? "error" : "success"}
                      label={formatCurrency(disponivel)}
                      size="sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Fecha dia:</span>
                    <p className="font-medium">{card.dia_fechamento}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vence dia:</span>
                    <p className="font-medium">{card.dia_vencimento}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCard(card);
                        setIsInvoiceActionsModalOpen(true);
                      }}
                    >
                      <Receipt className="w-3 h-3" />
                    </Button>
                  )}
                  {currentInvoice?.status === "fechada" && (
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCard(card);
                        setIsPayInvoiceModalOpen(true);
                      }}
                    >
                      <DollarSign className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}