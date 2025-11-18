import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/useFinancialData";
import { useCreditCards } from "@/hooks/useFinancialData";
import { useAccounts } from "@/hooks/useAccounts";
import { InvoiceDetailsModal } from "@/components/InvoiceDetailsModal";
import type { Invoice } from "@/types/financial";
import { format, parse, addMonths, subMonths, startOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CreditCard, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  DollarSign,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorMessages } from "@/lib/error-messages";

interface InvoicesSectionProps {
  className?: string;
}

export function InvoicesSection({ className }: InvoicesSectionProps) {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Buscar dados
  const { invoices, loading: loadingInvoices, refresh: refreshInvoices, payInvoice, posting } = useInvoices();
  const { activeCards, loading: loadingCards } = useCreditCards();
  const { activeAccounts } = useAccounts();

  // Competência selecionada (formato YYYY-MM)
  const selectedCompetencia = format(selectedMonth, "yyyy-MM");

  // Filtrar faturas do mês selecionado (backend envia competencia como YYYY-MM-01)
  const monthInvoices = useMemo(() => {
    return (invoices || []).filter((invoice) => {
      if (!invoice?.competencia) return false;
      const comp = String(invoice.competencia);
      const compKey = comp.length >= 7 ? comp.slice(0, 7) : format(new Date(comp), "yyyy-MM");
      return compKey === selectedCompetencia;
    });
  }, [invoices, selectedCompetencia]);

  // Agrupar faturas por cartão
  const invoicesByCard = useMemo(() => {
    const grouped: Record<string, Invoice[]> = {};
    
    monthInvoices.forEach(invoice => {
      if (!grouped[invoice.cartao_id]) {
        grouped[invoice.cartao_id] = [];
      }
      grouped[invoice.cartao_id].push(invoice);
    });
    
    return grouped;
  }, [monthInvoices]);

  // Navegar entre meses
  const goToPreviousMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));
  const goToCurrentMonth = () => setSelectedMonth(new Date());

  // Abrir modal de detalhes
  const handleOpenDetailsModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsModalOpen(true);
  };

  // Abrir modal de pagamento
  const handleOpenPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    // Buscar conta de pagamento padrão do cartão
    const card = activeCards.find(c => c.id === invoice.cartao_id);
    if (card?.conta_pagamento_id) {
      setPaymentAccount(card.conta_pagamento_id);
    }
    
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setIsPayModalOpen(true);
  };

  // Pagar fatura
  const handlePayInvoice = async () => {
    if (!selectedInvoice || !paymentAccount) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a conta de pagamento",
        variant: "destructive"
      });
      return;
    }

    try {
      const valorPago = typeof selectedInvoice.valor_fechado === 'string' 
        ? parseFloat(selectedInvoice.valor_fechado) 
        : selectedInvoice.valor_fechado || 0;

      await payInvoice({
        fatura_id: selectedInvoice.id,
        conta_id: paymentAccount,
        valor_pago: valorPago,
        data_pagamento: paymentDate
      });

      toast({
        title: "Fatura paga",
        description: "A fatura foi paga com sucesso.",
      });

      setIsPayModalOpen(false);
      setSelectedInvoice(null);
      refreshInvoices();
    } catch (error: unknown) {
      toast({
        title: ErrorMessages.invoice.pay.title,
        description: error instanceof Error ? error.message : ErrorMessages.invoice.pay.description,
        variant: "destructive",
      });
    }
  };

  // Helpers de exibição
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paga":
        return <Badge className="bg-success text-white"><CheckCircle className="w-3 h-3 mr-1" />Paga</Badge>;
      case "fechada":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Fechada</Badge>;
      case "aberta":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Aberta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | number | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : value || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());
  const loading = loadingInvoices || loadingCards;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com navegação de mês */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Faturas de Cartões
              </CardTitle>
              <CardDescription>
                Visualize e gerencie as faturas dos seus cartões de crédito
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button 
                variant={isCurrentMonth ? "default" : "outline"} 
                size="sm"
                onClick={goToCurrentMonth}
                className="min-w-[140px]"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </Button>
              
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de faturas por cartão */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Carregando faturas...</p>
        </div>
      ) : Object.keys(invoicesByCard).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma fatura encontrada</p>
            <p className="text-sm text-muted-foreground">
              Não há faturas para {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(invoicesByCard).map(([cardId, cardInvoices]) => {
            const card = activeCards.find(c => c.id === cardId);
            const invoice = cardInvoices[0]; // Deveria ter apenas 1 fatura por cartão/mês
            
            if (!card) return null;

            // Calcular valor total: se vier zerado do backend, somar dos itens quando abrir modal
            // Por ora, usar o que vem da fatura (pode ser calculado pelo backend futuramente)
            const valorTotal = typeof invoice.valor_total === 'string' 
              ? parseFloat(invoice.valor_total) 
              : invoice.valor_total || 0;
            
            // Se valor_total for 0 e status for 'aberta', significa que ainda está acumulando compras
            // Neste caso, o valor real será exibido no modal ao carregar os itens

            const valorFechado = typeof invoice.valor_fechado === 'string' 
              ? parseFloat(invoice.valor_fechado) 
              : invoice.valor_fechado || 0;

            // Parse seguro da data de vencimento
            let dataVencimento: Date | null = null;
            if (invoice.data_vencimento) {
              try {
                const dateStr = String(invoice.data_vencimento);
                // Se já tem horário, usar direto; senão adicionar T00:00:00
                const fullDateStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
                const parsedDate = new Date(fullDateStr);
                // Validar se é data válida
                if (!isNaN(parsedDate.getTime())) {
                  dataVencimento = parsedDate;
                }
              } catch (e) {
                console.warn('Data de vencimento inválida:', invoice.data_vencimento, e);
              }
            }

            const vencida = dataVencimento && dataVencimento < new Date() && invoice.status !== 'paga';

            return (
              <Card 
                key={cardId} 
                className={cn(
                  "hover:shadow-md transition-shadow",
                  vencida && "border-destructive"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {card.apelido}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {card.bandeira.toUpperCase()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Total:</span>
                      <span className="font-semibold">R$ {formatCurrency(valorTotal)}</span>
                    </div>
                    
                    {invoice.status === 'fechada' || invoice.status === 'paga' ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Fechado:</span>
                        <span className="font-bold text-lg">R$ {formatCurrency(valorFechado)}</span>
                      </div>
                    ) : null}
                    
                    {dataVencimento && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vencimento:</span>
                        <span className={cn(
                          "font-medium",
                          vencida && "text-destructive"
                        )}>
                          {format(dataVencimento, "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  {vencida && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                      <AlertCircle className="w-3 h-3" />
                      <span>Fatura vencida</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenDetailsModal(invoice)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Detalhes
                    </Button>
                    
                    {invoice.status === 'fechada' && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleOpenPayModal(invoice)}
                        disabled={posting}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Pagamento */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Fatura</DialogTitle>
            <DialogDescription>
              Registre o pagamento da fatura do cartão{" "}
              {selectedInvoice && activeCards.find(c => c.id === selectedInvoice.cartao_id)?.apelido}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor a Pagar</Label>
              <div className="text-2xl font-bold">
                R$ {selectedInvoice && formatCurrency(selectedInvoice.valor_fechado)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-account">Conta de Pagamento *</Label>
              <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                <SelectTrigger id="payment-account">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Data do Pagamento *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayModalOpen(false)}
              disabled={posting}
            >
              Cancelar
            </Button>
            <Button onClick={handlePayInvoice} disabled={posting}>
              {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Fatura */}
      <InvoiceDetailsModal 
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        invoice={selectedInvoice}
        card={selectedInvoice ? activeCards.find(c => c.id === selectedInvoice.cartao_id) || null : null}
      />
    </div>
  );
}
