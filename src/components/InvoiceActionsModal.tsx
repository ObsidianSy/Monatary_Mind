import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, DollarSign, Calendar } from "lucide-react";
import { useInvoices } from "@/hooks/useFinancialData";
import { useToast } from "@/hooks/use-toast";

interface InvoiceActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: {
    id: string;
    apelido: string;
    bandeira: string;
  };
  competencia?: string;
  onSuccess?: () => void;
}

export default function InvoiceActionsModal({ 
  open, 
  onOpenChange, 
  card, 
  competencia = new Date().toISOString().slice(0, 7), // YYYY-MM
  onSuccess 
}: InvoiceActionsModalProps) {
  const [loading, setLoading] = useState(false);
  const { closeInvoice, payInvoice } = useInvoices();
  const { toast } = useToast();

  const handleCloseInvoice = async () => {
    if (!card) return;
    
    setLoading(true);
    try {
      await closeInvoice({
        cartao_id: card.id,
        competencia: competencia + "-01" // Convert YYYY-MM to YYYY-MM-01
      });
      
      toast({
        title: "Fatura fechada",
        description: "A fatura foi fechada e está pronta para pagamento.",
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao fechar fatura",
        description: "Não foi possível fechar a fatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const competenciaFormatted = new Date(competencia + "-01").toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Ações da Fatura
          </DialogTitle>
          <DialogDescription>
            Gerencie a fatura do cartão {card?.apelido} de {competenciaFormatted}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <CardTitle className="text-sm">{card?.apelido}</CardTitle>
                </div>
                <Badge variant="outline" className="capitalize">
                  {card?.bandeira}
                </Badge>
              </div>
              <CardDescription>
                Competência: {competenciaFormatted}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Button
                onClick={handleCloseInvoice}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {loading ? "Fechando..." : "Fechar Fatura"}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Ao fechar a fatura, o valor total será calculado com base nos itens da fatura e ela ficará disponível para pagamento.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}