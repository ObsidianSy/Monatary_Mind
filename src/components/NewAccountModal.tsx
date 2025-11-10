import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { accountSchema } from "@/schemas/validation";

interface NewAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AccountForm {
  nome: string;
  tipo: string;
  saldo_inicial: string;
}

const tiposConta = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "fundo_caixa", label: "Fundo Caixa" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "caixa", label: "Caixa (Dinheiro em Espécie)" },
  { value: "conta_pagamento", label: "Conta de Pagamento" },
  { value: "investimento", label: "Investimentos" },
];

export default function NewAccountModal({ open, onOpenChange, onSuccess }: NewAccountModalProps) {
  const [form, setForm] = useState<AccountForm>({
    nome: "",
    tipo: "",
    saldo_inicial: "",
  });

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Conta criada",
        description: "A conta foi adicionada com sucesso.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      nome: "",
      tipo: "",
      saldo_inicial: "",
    });
  };

  const handleSubmit = async () => {
    const validationData = {
      nome: form.nome,
      tipo: form.tipo,
      saldo_inicial: form.saldo_inicial ? parseFloat(form.saldo_inicial.replace(",", ".")) : 0,
    };

    const validation = accountSchema.safeParse(validationData);
    
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
      await postEvent("conta.upsert", payload);
    } catch (error) {
      // Error handled by hook
    }
  };

  const updateForm = (updates: Partial<AccountForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
          <DialogDescription>
            Adicione uma nova conta financeira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Conta *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => updateForm({ nome: e.target.value })}
              placeholder="Ex: Conta Corrente Banco do Brasil"
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo de Conta *</Label>
            <Select value={form.tipo} onValueChange={(value) => updateForm({ tipo: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
               <SelectContent className="z-[9999]">
                {tiposConta.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
            <Input
              id="saldo_inicial"
              type="number"
              step="0.01"
              value={form.saldo_inicial}
              onChange={(e) => updateForm({ saldo_inicial: e.target.value })}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={posting}>
            {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}