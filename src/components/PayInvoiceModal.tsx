import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency } from "@/lib/utils";

interface PayInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    valor_total: number;
    valor_fechado?: number;
    status?: string;
    data_vencimento: string;
    competencia: string;
    cartao_id?: string;
  };
  onSuccess?: () => void;
}

interface PaymentForm {
  conta_id: string;
  valor_pago: string;
  data_pagamento: Date;
}

export default function PayInvoiceModal({ open, onOpenChange, invoice, onSuccess }: PayInvoiceModalProps) {
  const [form, setForm] = useState<PaymentForm>({
    conta_id: "",
    valor_pago: "",
    data_pagamento: new Date(),
  });

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { activeAccounts } = useAccounts();
  
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Fatura paga",
        description: "O pagamento da fatura foi registrado com sucesso.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao pagar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      // Usar valor_fechado se fatura estiver fechada, senão usar valor_total calculado dos itens
      const valorFatura = invoice.status === 'fechada' && invoice.valor_fechado 
        ? invoice.valor_fechado 
        : invoice.valor_total;
        
      setForm({
        conta_id: "",
        valor_pago: valorFatura.toString(),
        data_pagamento: new Date(),
      });
    }
  }, [invoice]);

  const resetForm = () => {
    setForm({
      conta_id: "",
      valor_pago: invoice?.valor_total.toString() || "",
      data_pagamento: new Date(),
    });
  };

  const handleSubmit = async () => {
    if (!form.conta_id || !form.valor_pago || !invoice) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const valorPago = parseFloat(form.valor_pago.replace(",", "."));
    
    if (valorPago <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor pago deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      fatura_id: invoice.id,
      conta_id: form.conta_id,
      valor_pago: valorPago,
      data_pagamento: format(form.data_pagamento, "yyyy-MM-dd"),
    };

    try {
      await postEvent("fatura.pagar", payload);
    } catch (error) {
      // Error handled by hook
    }
  };

  const updateForm = (updates: Partial<PaymentForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const isOverdue = (dataVencimento: string) => {
    return new Date(dataVencimento) < new Date();
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento da fatura de {format(new Date(invoice.competencia), "MMM/yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da fatura */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Valor da fatura</span>
              <span className="font-bold text-lg">{formatCurrency(invoice.valor_total)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Vencimento</span>
              <span className="text-sm">
                {new Date(invoice.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {isOverdue(invoice.data_vencimento) && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Fatura em atraso</span>
              </div>
            )}
          </div>

          {/* Formulário de pagamento */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="conta">Conta para Pagamento *</Label>
              <Select value={form.conta_id} onValueChange={(value) => updateForm({ conta_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{conta.nome}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({conta.tipo})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="valor">Valor Pago *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={form.valor_pago}
                onChange={(e) => updateForm({ valor_pago: e.target.value })}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor sugerido: {formatCurrency(invoice.valor_total)}
              </p>
            </div>

            <div>
              <Label htmlFor="data">Data do Pagamento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.data_pagamento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.data_pagamento ? format(form.data_pagamento, "PPP", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.data_pagamento}
                    onSelect={(date) => date && updateForm({ data_pagamento: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={posting}>
            {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}