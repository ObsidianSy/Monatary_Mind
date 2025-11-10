import { format } from "date-fns";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { censorValue } from "@/lib/utils";

interface InvoiceItemsListProps {
  invoiceId: string;
  categories: any[];
  formatCurrency: (v: number) => string;
}

export function InvoiceItemsList({ invoiceId, categories, formatCurrency }: InvoiceItemsListProps) {
  const { items, loading } = useInvoiceItems(invoiceId);
  const { isValuesCensored } = usePrivacy();
  
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
          <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md border border-border/40">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {category?.nome || "Sem categoria"}
                {item.parcela_numero && ` • ${item.parcela_numero}/${item.parcela_total}`}
                {" • "}
                {format(new Date(item.data_compra), "dd/MM/yyyy")}
              </p>
            </div>
            <p className="text-sm font-semibold ml-3 flex-shrink-0">{displayValue}</p>
          </div>
        );
      })}
    </div>
  );
}
