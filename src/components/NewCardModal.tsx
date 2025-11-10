import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { creditCardSchema } from "@/schemas/validation";

interface NewCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CardForm {
  apelido: string;
  bandeira: string;
  limite: string;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagadora_id: string;
}


const bandeiras = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
];

export default function NewCardModal({ open, onOpenChange, onSuccess }: NewCardModalProps) {
  console.log("NewCardModal renderizado - open:", open);
  
  const [form, setForm] = useState<CardForm>({
    apelido: "",
    bandeira: "",
    limite: "",
    dia_fechamento: 15,
    dia_vencimento: 10,
    conta_pagadora_id: "",
  });

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { activeAccounts, loading: accountsLoading } = useAccounts();
  
  // Debug logs
  console.log("Modal state - open:", open, "accountsLoading:", accountsLoading, "activeAccounts:", activeAccounts?.length);
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Cartão criado",
        description: "O cartão foi adicionado com sucesso.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cartão", 
        description: error.message || "Ocorreu um erro ao criar o cartão.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      apelido: "",
      bandeira: "",
      limite: "",
      dia_fechamento: 15,
      dia_vencimento: 10,
      conta_pagadora_id: "",
    });
  };

  const handleSubmit = async () => {
    const validationData = {
      apelido: form.apelido,
      bandeira: form.bandeira,
      limite: parseFloat(form.limite.replace(",", ".")),
      dia_fechamento: form.dia_fechamento,
      dia_vencimento: form.dia_vencimento,
      conta_pagadora_id: form.conta_pagadora_id,
    };

    const validation = creditCardSchema.safeParse(validationData);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...validation.data,
      ativo: true,
    };

    try {
      await postEvent("cartao.upsert", payload);
    } catch (error) {
      // Error handled by hook
    }
  };

  const updateForm = (updates: Partial<CardForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Forçar renderização sempre que open for true
  if (open) {
    console.log("Modal deve estar VISÍVEL agora!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md fixed z-[100] bg-background border shadow-lg">
        <DialogHeader>
          <DialogTitle>Novo Cartão de Crédito</DialogTitle>
          <DialogDescription>
            Adicione um novo cartão de crédito à sua conta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="apelido">Nome do Cartão *</Label>
            <Input
              id="apelido"
              value={form.apelido}
              onChange={(e) => updateForm({ apelido: e.target.value })}
              placeholder="Ex: Cartão Principal"
            />
          </div>

          <div>
            <Label htmlFor="bandeira">Bandeira *</Label>
            <Select value={form.bandeira} onValueChange={(value) => updateForm({ bandeira: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar bandeira" />
              </SelectTrigger>
              <SelectContent>
                {bandeiras.map((bandeira) => (
                  <SelectItem key={bandeira.value} value={bandeira.value}>
                    {bandeira.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="limite">Limite *</Label>
            <Input
              id="limite"
              type="number"
              step="0.01"
              value={form.limite}
              onChange={(e) => updateForm({ limite: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dia_fechamento">Dia Fechamento *</Label>
              <Input
                id="dia_fechamento"
                type="number"
                min="1"
                max="31"
                value={form.dia_fechamento}
                onChange={(e) => updateForm({ dia_fechamento: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label htmlFor="dia_vencimento">Dia Vencimento *</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                value={form.dia_vencimento}
                onChange={(e) => updateForm({ dia_vencimento: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="conta_pagadora">Conta Pagadora *</Label>
            <Select value={form.conta_pagadora_id} onValueChange={(value) => updateForm({ conta_pagadora_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {accountsLoading ? (
                  <SelectItem value="" disabled>
                    Carregando contas...
                  </SelectItem>
                ) : activeAccounts.length === 0 ? (
                  <SelectItem value="" disabled>
                    Nenhuma conta ativa encontrada
                  </SelectItem>
                ) : (
                  activeAccounts.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={posting || accountsLoading || activeAccounts.length === 0}>
            {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {accountsLoading ? "Carregando..." : "Criar Cartão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}