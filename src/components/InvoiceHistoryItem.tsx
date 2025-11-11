import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import type { Invoice } from "@/types/financial";
import type { Category } from "@/hooks/useCategories";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { censorValue } from "@/lib/utils";
import { formatDateYmdToBr, parseDateLocal } from "@/lib/date"; // ✅ Helpers TZ-safe

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

  // Contar quantas compras tem parcelas
  const comprasParceladas = items?.filter(item => item.parcela_total && item.parcela_total > 1).length || 0;
  const totalCompras = items?.length || 0;

  // Verificar se está em atraso
  const now = new Date();
  const vencimento = parseDateLocal(invoice.data_vencimento); // ✅ TZ-safe
  const emAtraso = invoice.status === 'aberta' && vencimento < now;

  // TZ-safe parse para competência (YYYY-MM-DD ou YYYY-MM)
  const competenciaDate = parseDateLocal(String(invoice.competencia));

  return (
    <AccordionItem value={invoice.id} className={`border-b last:border-b-0 ${emAtraso ? 'bg-destructive/5 border-destructive/20' : ''}`}>
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center justify-between w-full pr-3">
          <div className="flex items-center gap-2.5">
            {emAtraso ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : invoice.status === "paga" ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : invoice.status === "fechada" ? (
              <Clock className="w-4 h-4 text-warning" />
            ) : (
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium capitalize">
                {format(competenciaDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoice.data_pagamento && (
                  <> • Pago: {formatDateYmdToBr(invoice.data_pagamento)}</>
                )}
                {totalCompras > 0 && (
                  <> • {totalCompras} {totalCompras === 1 ? 'compra' : 'compras'}</>
                )}
                {comprasParceladas > 0 && (
                  <> • <CreditCard className="w-3 h-3 inline-block" /> {comprasParceladas} parcelada{comprasParceladas > 1 ? 's' : ''}</>
                )}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <p className="text-base font-semibold">{displayValue}</p>
            {emAtraso ? (
              <Badge variant="destructive" className="capitalize text-xs">
                ⚠️ Em Atraso
              </Badge>
            ) : (
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
            )}
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
            const hasParcelas = item.parcela_total && item.parcela_total > 1;

            return (
              <div key={item.id} className="flex justify-between items-center text-xs py-2 px-3 bg-muted/20 rounded border border-border/30 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{item.descricao}</p>
                    {hasParcelas && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {item.parcela_numero}/{item.parcela_total}x
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {category?.nome && <span>{category.nome}</span>}
                    {category?.nome && item.data_compra && <span>•</span>}
                    {item.data_compra && (
                      <span>{formatDateYmdToBr(item.data_compra)}</span>
                    )}
                  </div>
                </div>
                <span className="font-medium text-sm ml-3 flex-shrink-0">{itemValue}</span>
              </div>
            );
          })}
          {items && items.length > 0 && (
            <div className="space-y-2 pt-3 mt-3 border-t">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">Total</span>
                <span>{displayValue}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  {items.length} {items.length === 1 ? 'compra' : 'compras'}
                </span>
                {comprasParceladas > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {comprasParceladas} parcelada{comprasParceladas > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
