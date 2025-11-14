import { format } from "date-fns";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { censorValue } from "@/lib/utils";
import { formatDateYmdToBr } from "@/lib/date"; // ✅ Helpers TZ-safe
import { useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";

interface InvoiceItemsListProps {
  invoiceId: string;
  categories: any[];
  formatCurrency: (v: number) => string;
  onEditItem?: (item: any) => void;
  onDeleteItem?: (item: any) => void;
  showActions?: boolean;
}

export function InvoiceItemsList({ 
  invoiceId, 
  categories, 
  formatCurrency, 
  onEditItem, 
  onDeleteItem,
  showActions = false 
}: InvoiceItemsListProps) {
  const { items, loading } = useInvoiceItems(invoiceId);
  const { isValuesCensored } = usePrivacy();

  // 🔥 DEBUG: Ver dados brutos que chegam do backend
  useEffect(() => {
    if (items.length > 0) {
      console.log('🔥 InvoiceItemsList - Itens recebidos:', items.slice(0, 3).map(i => ({
        descricao: i.descricao,
        parcela_numero: i.parcela_numero,
        parcela_total: i.parcela_total,
        data_compra: i.data_compra,
        tipos: {
          parcela_numero: typeof i.parcela_numero,
          parcela_total: typeof i.parcela_total,
          data_compra: typeof i.data_compra
        }
      })));
    }
  }, [items]);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Nenhum item nesta fatura</p>
      </div>
    );
  }

  // Ordenar itens por data mais recente primeiro
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.data_compra);
    const dateB = new Date(b.data_compra);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-1 p-3">
      {sortedItems.map(item => {
        const category = categories.find(c => c.id === item.categoria_id);
        const valor = typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor;
        const displayValue = censorValue(formatCurrency(Number(valor)), isValuesCensored);

        return (
          <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md border border-border/40 gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {category?.nome || "Sem categoria"}
                {item.parcela_numero && ` • ${item.parcela_numero}/${item.parcela_total}`}
                {" • "}
                {formatDateYmdToBr(item.data_compra)}
              </p>
            </div>
            <p className="text-sm font-semibold flex-shrink-0">{displayValue}</p>
            
            {showActions && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onEditItem?.(item)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDeleteItem?.(item)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
