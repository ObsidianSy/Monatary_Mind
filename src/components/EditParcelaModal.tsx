import { useState, useEffect } from "react";
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

interface EditParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: any | null;
  onSuccess?: () => void;
}

interface ParcelaForm {
  status: "em_aberto" | "pago" | "atrasado";
  data_vencimento: Date;
  valor: string;
  observacoes?: string;
}

export default function EditParcelaModal({ open, onOpenChange, parcela, onSuccess }: EditParcelaModalProps) {
  const [form, setForm] = useState<ParcelaForm>({
    status: "em_aberto",
    data_vencimento: new Date(),
    valor: "",
    observacoes: "",
  });
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (parcela && open) {
      setForm({
        status: parcela.status || "em_aberto",
        data_vencimento: new Date(parcela.dueDate),
        valor: parcela.amount.toString(),
        observacoes: parcela.notes || "",
      });
    }
  }, [parcela, open]);

  const resetForm = () => {
    setForm({
      status: "em_aberto",
      data_vencimento: new Date(),
      valor: "",
      observacoes: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.valor) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simular chamada da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Parcela atualizada",
        description: "A parcela foi atualizada com sucesso.",
      });
      
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro ao atualizar parcela",
        description: "Não foi possível atualizar a parcela.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      // Simular criação de transação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Parcela marcada como paga",
        description: "Uma transação foi criada automaticamente.",
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro ao marcar como paga",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (updates: Partial<ParcelaForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Parcela</DialogTitle>
          <DialogDescription>
            {parcela.description} - Parcela {parcela.installment}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(value: any) => updateForm({ status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_aberto">Em Aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => updateForm({ valor: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="data_vencimento">Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_vencimento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.data_vencimento ? format(form.data_vencimento, "PPP", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.data_vencimento}
                  onSelect={(date) => date && updateForm({ data_vencimento: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              value={form.observacoes || ""}
              onChange={(e) => updateForm({ observacoes: e.target.value })}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
          {form.status !== "pago" && (
            <Button onClick={handleMarkAsPaid} disabled={loading} className="w-full bg-gradient-primary">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Marcar como Paga
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}