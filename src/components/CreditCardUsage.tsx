import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, AlertTriangle } from "lucide-react";
import { useCreditCards, useInvoices } from "@/hooks/useFinancialData";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import NewCardModal from "./NewCardModal";
import { CreditCardItem } from "./CreditCardItem";

export function CreditCardUsage() {
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const { activeCards, loading } = useCreditCards();
  const { invoices } = useInvoices();
  const navigate = useNavigate();

  const getCurrentInvoice = (cardId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    // Buscar fatura do mês atual ou próxima pendente
    const currentMonthInvoice = invoices.find(
      inv => inv.cartao_id === cardId && inv.competencia.startsWith(currentMonth)
    );
    if (currentMonthInvoice) return currentMonthInvoice;
    
    // Se não houver fatura do mês atual, pegar a próxima pendente
    return invoices
      .filter(inv => inv.cartao_id === cardId && inv.competencia >= currentMonth && inv.status !== 'paga')
      .sort((a, b) => b.competencia.localeCompare(a.competencia))[0]; // DESC: mais recente primeiro
  };

  const handleCardClick = (cardId: string) => {
    navigate('/cartoes', { state: { selectedCardId: cardId } });
  };

  // Calcular alertas de vencimentos próximos (7 dias)
  const upcomingDueInvoices = useMemo(() => {
    return activeCards.map(card => {
      const invoice = getCurrentInvoice(card.id);
      if (!invoice || invoice.status === 'paga') return null;
      
      const daysUntilDue = differenceInDays(new Date(invoice.data_vencimento), new Date());
      if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        const valor = typeof invoice.valor_fechado === 'string' 
          ? parseFloat(invoice.valor_fechado || '0') 
          : (invoice.valor_fechado || 0);
        return {
          cardId: card.id,
          cardName: card.apelido || card.bandeira,
          daysUntilDue,
          amount: formatCurrency(valor)
        };
      }
      return null;
    }).filter(Boolean);
  }, [activeCards, invoices]);

  // Calcular alertas de uso alto (>80%)
  const highUsageCards = useMemo(() => {
    return activeCards.map(card => {
      const invoice = getCurrentInvoice(card.id);
      const usado = invoice?.valor_total 
        ? (typeof invoice.valor_total === 'string' ? parseFloat(invoice.valor_total) : invoice.valor_total)
        : 0;
      const limite = typeof card.limite_total === 'string' 
        ? parseFloat(card.limite_total) 
        : card.limite_total;
      const percentage = Math.round((usado / limite) * 100);
      
      if (percentage > 80) {
        return {
          cardId: card.id,
          cardName: card.apelido || card.bandeira,
          usagePercentage: percentage,
          used: formatCurrency(usado),
          limit: formatCurrency(limite)
        };
      }
      return null;
    }).filter(Boolean);
  }, [activeCards, invoices]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Uso dos Cartões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Uso dos Cartões
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsNewCardModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Cartão
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCards.length > 0 ? (
          activeCards.slice(0, 3).map((card) => (
            <CreditCardItem
              key={card.id}
              card={card}
              currentInvoice={getCurrentInvoice(card.id)}
              onClick={() => handleCardClick(card.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum cartão cadastrado</p>
            <Button 
              size="sm" 
              className="mt-4"
              onClick={() => setIsNewCardModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Primeiro Cartão
            </Button>
          </div>
        )}
        
        {activeCards.length > 0 && (upcomingDueInvoices.length > 0 || highUsageCards.length > 0) && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertas e Próximos Vencimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingDueInvoices.map((alert: any) => (
                <div key={alert.cardId} className="flex justify-between text-sm items-center">
                  <span>{alert.cardName} vence em {alert.daysUntilDue} {alert.daysUntilDue === 1 ? 'dia' : 'dias'}</span>
                  <Badge variant="destructive">{alert.amount}</Badge>
                </div>
              ))}
              
              {highUsageCards.map((alert: any) => (
                <div key={alert.cardId} className="flex justify-between text-sm items-center">
                  <span>{alert.cardName} está em {alert.usagePercentage}% do limite</span>
                  <Badge variant="secondary">{alert.used}/{alert.limit}</Badge>
                </div>
              ))}
              
              {upcomingDueInvoices.length === 0 && highUsageCards.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ✅ Nenhum alerta no momento
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {activeCards.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Mantenha o uso do cartão abaixo de 30% do limite para uma boa pontuação de crédito.
            </div>
          </div>
        )}
      </CardContent>

      <NewCardModal
        open={isNewCardModalOpen}
        onOpenChange={setIsNewCardModalOpen}
        onSuccess={() => setIsNewCardModalOpen(false)}
      />
    </Card>
  );
}
