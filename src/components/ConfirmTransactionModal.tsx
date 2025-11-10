import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionData {
  id?: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  account?: string;
  date?: Date;
  notes?: string;
}

interface ConfirmTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionData | null;
  onConfirm: (data: { valor: number; descricao: string; observacoes?: string }) => Promise<void>;
}

export function ConfirmTransactionModal({
  open,
  onOpenChange,
  transaction,
  onConfirm
}: ConfirmTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    valor: "",
    descricao: "",
    observacoes: ""
  });

  useEffect(() => {
    if (transaction && open) {
      setFormData({
        valor: Math.abs(transaction.amount).toFixed(2),
        descricao: transaction.description,
        observacoes: transaction.notes || ""
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onConfirm({
        valor: parseFloat(formData.valor),
        descricao: formData.descricao,
        observacoes: formData.observacoes || undefined
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao confirmar:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const TypeIcon = transaction.type === "income" ? TrendingUp : TrendingDown;
  const typeColor = transaction.type === "income" ? "text-success" : "text-destructive";
  const typeLabel = transaction.type === "income" ? "Receita" : "Despesa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 ${typeColor}`} />
            Confirmar {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Revise os dados antes de registrar a transação
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações fixas */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            {transaction.category && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-medium">{transaction.category}</span>
              </div>
            )}
            {transaction.account && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conta:</span>
                <span className="font-medium">{transaction.account}</span>
              </div>
            )}
            {transaction.date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data Original:</span>
                <span className="font-medium">
                  {format(transaction.date, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data de Registro:</span>
              <span className="font-medium">
                {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Campos editáveis */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da transação"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Adicione observações sobre esta transação..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-success hover:bg-success/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Confirmar Registro"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
