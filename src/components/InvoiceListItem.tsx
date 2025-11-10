import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";
import { InvoiceItemsList } from "./InvoiceItemsList";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { censorValue } from "@/lib/utils";
interface InvoiceListItemProps {
  invoice: any;
  categories: any[];
  formatCurrency: (v: number) => string;
  onPayInvoice: () => void;
}

export function InvoiceListItem({ 
  invoice, 
  categories, 
  formatCurrency, 
  onPayInvoice 
}: InvoiceListItemProps) {
  const { isValuesCensored } = usePrivacy();
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paga": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "fechada": return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case "aberta": return <Clock className="w-5 h-5 text-muted-foreground" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "paga": return "default";
      case "fechada": return "secondary";
      case "aberta": return "outline";
      default: return "outline";
    }
  };

  const { items } = useInvoiceItems(invoice.id);
  const valorFechado = typeof invoice.valor_fechado === 'string'
    ? parseFloat(invoice.valor_fechado || '0') 
    : (invoice.valor_fechado || 0);
  const valor = valorFechado > 0
    ? valorFechado
    : (items || []).reduce((sum, it) => {
        const v = typeof it.valor === 'string' ? parseFloat(it.valor || '0') : (it.valor || 0);
        return sum + v;
      }, 0);

  const displayValue = censorValue(formatCurrency(valor), isValuesCensored);

  return (
    <AccordionItem value={invoice.id} className="border border-border/50 rounded-lg px-3 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex w-full items-center justify-between pr-3">
          <div className="flex items-center gap-2.5">
            {getStatusIcon(invoice.status)}
            <div className="text-left">
              <p className="text-sm font-medium capitalize">
                {format(
                  new Date(
                    typeof invoice.competencia === "string" && invoice.competencia.length === 7
                      ? `${invoice.competencia}-01`
                      : invoice.competencia
                  ), 
                  "MMMM yyyy", 
                  { locale: ptBR }
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Vence em {format(new Date(invoice.data_vencimento), "dd/MM/yyyy")}
                {invoice.data_pagamento && ` • Pago em ${format(new Date(invoice.data_pagamento), "dd/MM/yyyy")}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-base font-semibold">{displayValue}</p>
            </div>
            <Badge variant={getStatusVariant(invoice.status)} className="capitalize text-xs">
              {invoice.status}
            </Badge>
            {invoice.status === "fechada" && (
              <Button 
                size="sm" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayInvoice();
                }}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Pagar
              </Button>
            )}
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent>
        <InvoiceItemsList 
          invoiceId={invoice.id} 
          categories={categories}
          formatCurrency={formatCurrency}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
