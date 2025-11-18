import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ShoppingBag, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice, CreditCard } from "@/types/financial";

interface InvoiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  card: CreditCard | null;
}

export function InvoiceDetailsModal({ open, onOpenChange, invoice, card }: InvoiceDetailsModalProps) {
  const { items, loading } = useInvoiceItems(invoice?.id);

  // Agrupar itens por data para melhor visualização
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, typeof items> = {};
    
    items.forEach(item => {
      const dateKey = item.data_compra;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  const formatCurrency = (value: string | number | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : value || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!invoice || !card) return null;

  const totalCompras = items.reduce((sum, item) => sum + (typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor))), 0);

  // Parse seguro da competência
  let competenciaDisplay = '';
  try {
    const compStr = String(invoice.competencia);
    const compDate = compStr.includes('-01') ? new Date(compStr) : new Date(compStr + '-01');
    if (!isNaN(compDate.getTime())) {
      competenciaDisplay = format(compDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  } catch (e) {
    competenciaDisplay = String(invoice.competencia);
  }

  // Parse seguro da data de vencimento
  let dataVencimentoDisplay = '';
  if (invoice.data_vencimento) {
    try {
      const dateStr = String(invoice.data_vencimento);
      const fullDateStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      const parsedDate = new Date(fullDateStr);
      if (!isNaN(parsedDate.getTime())) {
        dataVencimentoDisplay = format(parsedDate, "dd/MM/yyyy");
      }
    } catch (e) {
      console.warn('Data vencimento inválida:', invoice.data_vencimento);
    }
  }

  // Parse seguro da data de pagamento
  let dataPagamentoDisplay = '';
  if (invoice.status === 'paga' && invoice.data_pagamento) {
    try {
      const dateStr = String(invoice.data_pagamento);
      const fullDateStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      const parsedDate = new Date(fullDateStr);
      if (!isNaN(parsedDate.getTime())) {
        dataPagamentoDisplay = format(parsedDate, "dd/MM/yyyy");
      }
    } catch (e) {
      console.warn('Data pagamento inválida:', invoice.data_pagamento);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Detalhes da Fatura - {card.apelido}
          </DialogTitle>
          <DialogDescription>
            Competência: {competenciaDisplay}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da Fatura */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={invoice.status === 'paga' ? 'default' : invoice.status === 'fechada' ? 'destructive' : 'outline'}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
            
            {dataVencimentoDisplay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vencimento:</span>
                <span className="font-medium">{dataVencimentoDisplay}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de Compras:</span>
              <span className="font-semibold">R$ {formatCurrency(totalCompras)}</span>
            </div>
            
            {invoice.status !== 'aberta' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor Fechado:</span>
                <span className="text-lg font-bold">R$ {formatCurrency(invoice.valor_fechado)}</span>
              </div>
            )}
            
            {dataPagamentoDisplay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data do Pagamento:</span>
                <span className="font-medium">{dataPagamentoDisplay}</span>
              </div>
            )}
          </div>

          {/* Lista de Compras */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Compras ({items.length})
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Carregando compras...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma compra registrada nesta fatura</p>
              </div>
            ) : (
              <div className="space-y-4">
                {itemsByDate.map(([date, dateItems]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </div>
                    
                    <div className="space-y-2 ml-5">
                      {dateItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.descricao}</p>
                              {item.parcela_numero && item.parcela_total && (
                                <Badge variant="outline" className="text-xs">
                                  {item.parcela_numero}/{item.parcela_total}
                                </Badge>
                              )}
                            </div>
                            
                            {(item.categoria_pai_nome || item.categoria_nome) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Tag className="w-3 h-3" />
                                {item.categoria_pai_nome 
                                  ? `${item.categoria_pai_nome} → ${item.categoria_nome}`
                                  : item.categoria_nome
                                }
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold text-destructive">
                              R$ {formatCurrency(item.valor)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
