import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { useInvoiceItems } from "@/hooks/useFinancialData";
import { differenceInDays, format } from "date-fns";
import { ValueDisplay } from "@/components/ValueDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import type { CreditCard } from "@/types/financial";

interface CreditCardItemProps {
  card: CreditCard;
  currentInvoice: any;
  onClick: () => void;
}

export function CreditCardItem({ card, currentInvoice, onClick }: CreditCardItemProps) {
  const currentCompetencia = format(new Date(), "yyyy-MM-01"); // ✅ Formato completo para backend
  
  const { items: invoiceItems } = useInvoiceItems(
    currentInvoice?.id,
    !currentInvoice ? { cartao_id: card.id, competencia: currentCompetencia } : undefined
  );
  
  const limite = typeof card.limite_total === 'string' ? parseFloat(card.limite_total) : card.limite_total;
  
  const used = useMemo(() => {
    return (invoiceItems || []).reduce((sum, item) => {
      const valor = typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor;
      return sum + (valor || 0);
    }, 0);
  }, [invoiceItems]);
  

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.round((used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };
  
  const usagePercentage = getUsagePercentage(used, limite);
  const isHighUsage = usagePercentage >= 80;
  
  const daysUntilDue = currentInvoice 
    ? differenceInDays(new Date(currentInvoice.data_vencimento), new Date())
    : null;
  
  return (
    <div 
      className="p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{card.apelido}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {card.bandeira}
            </Badge>
            {isHighUsage && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Alto Uso
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Vencimento: dia {card.dia_vencimento}
            {daysUntilDue !== null && daysUntilDue >= 0 && (
              <StatusBadge 
                status={daysUntilDue <= 3 ? "error" : "info"}
                label={`${daysUntilDue} dias`}
                size="xs"
                className="ml-2"
              />
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            Fatura: <ValueDisplay value={used} size="sm" />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span>Usado: <ValueDisplay value={used} size="sm" /></span>
          <span className={getUsageColor(usagePercentage)}>
            {usagePercentage}% do limite
          </span>
        </div>
        
        <Progress 
          value={usagePercentage} 
          className="h-2"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Disponível: <ValueDisplay value={limite - used} size="sm" className="text-muted-foreground" /></span>
          <span>Limite: <ValueDisplay value={limite} size="sm" className="text-muted-foreground" /></span>
        </div>
      </div>
    </div>
  );
}
