import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import type { Invoice } from "@/types/financial";
import type { Category } from "@/hooks/useCategories";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { censorValue } from "@/lib/utils";

interface InvoiceHistoryItemProps {
  invoice: Invoice;
  categories: Category[];
  formatCurrency: (value: number) => string;
}

export function InvoiceHistoryItem({ invoice, categories, formatCurrency }: InvoiceHistoryItemProps) {
  const { items } = useInvoiceItems(invoice.id);
  const { isValuesCensored } = usePrivacy();
  
  const valor = (() => {
    const vf = typeof invoice.valor_fechado === "string" 
      ? parseFloat(invoice.valor_fechado || "0") 
      : (invoice.valor_fechado || 0);
    if (vf > 0) return vf;
    return (items || []).reduce((s, it) => 
      s + (typeof it.valor === "string" ? parseFloat(it.valor) : it.valor || 0), 0
    );
  })();

  const displayValue = censorValue(formatCurrency(valor), isValuesCensored);

  return (
    <AccordionItem value={invoice.id} className="border-b last:border-b-0">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center justify-between w-full pr-3">
          <div className="flex items-center gap-2.5">
            {invoice.status === "paga" ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : invoice.status === "fechada" ? (
              <Clock className="w-4 h-4 text-warning" />
            ) : (
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium capitalize">
                {format(new Date(invoice.competencia), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                Venc: {format(new Date(invoice.data_vencimento), "dd/MM/yyyy")}
                {invoice.data_pagamento && (
                  <> • Pago: {format(new Date(invoice.data_pagamento), "dd/MM/yyyy")}</>
                )}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <p className="text-base font-semibold">{displayValue}</p>
            <Badge 
              variant={
                invoice.status === "paga" ? "default" : 
                invoice.status === "fechada" ? "secondary" : 
                "outline"
              }
              className="capitalize text-xs"
            >
              {invoice.status}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-1 pt-1 pb-2">
          {items?.map((item) => {
            const category = categories.find(c => c.id === item.categoria_id);
            const itemValue = censorValue(
              formatCurrency(typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor),
              isValuesCensored
            );
            return (
              <div key={item.id} className="flex justify-between items-center text-xs py-1.5 px-2 bg-muted/20 rounded border border-border/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">{category?.nome}</p>
                </div>
                <span className="font-medium ml-3 flex-shrink-0">{itemValue}</span>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
