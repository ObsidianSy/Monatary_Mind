import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Calendar, Trash2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onLiquidar: () => void;
  onCancelar: () => void;
  onAdiar: () => void;
  onExcluir: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onLiquidar,
  onCancelar,
  onAdiar,
  onExcluir,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-2">
      <Badge variant="secondary" className="text-sm">
        {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
      </Badge>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" onClick={onLiquidar} className="gap-2">
          <Check className="h-4 w-4" />
          Liquidar
        </Button>

        <Button size="sm" variant="outline" onClick={onCancelar} className="gap-2">
          <X className="h-4 w-4" />
          Cancelar
        </Button>

        <Button size="sm" variant="outline" onClick={onAdiar} className="gap-2">
          <Calendar className="h-4 w-4" />
          Adiar
        </Button>

        <Button size="sm" variant="destructive" onClick={onExcluir} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={onClearSelection}>
        Limpar
      </Button>
    </div>
  );
}
