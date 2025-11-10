// Barra global de filtros (fixa no topo)

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useFinancialData";
import { DATE_PRESETS } from "@/lib/date-utils";

export interface FilterState {
  periodo: "hoje" | "mesAtual" | "mesPassado" | "proximos7dias" | "proximos30dias" | "ultimos30dias" | "anoAtual" | "custom";
  dataInicio?: Date;
  dataFim?: Date;
  contaId?: string | "all";
  status?: "previsto" | "liquidado" | "atrasado" | "cancelado" | "all";
  tipo?: "credito" | "debito" | "transferencia" | "all";
  busca?: string;
}

interface GlobalFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onNovo?: () => void;
}

export function GlobalFilters({ filters, onChange, onNovo }: GlobalFiltersProps) {
  const { activeAccounts } = useAccounts();
  const [showCustomDate, setShowCustomDate] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const applyPreset = (preset: string) => {
    if (preset === "custom") {
      setShowCustomDate(true);
      return;
    }
    
    const presetKey = preset as keyof typeof DATE_PRESETS;
    if (DATE_PRESETS[presetKey]) {
      const range = DATE_PRESETS[presetKey]();
      onChange({
        ...filters,
        periodo: preset as any,
        dataInicio: range.from,
        dataFim: range.to
      });
      setShowCustomDate(false);
    }
  };

  const clearFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    key => key !== 'periodo' && filters[key as keyof FilterState]
  ).length;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center gap-3 p-4 flex-wrap">
        {/* Período */}
        <Select
          value={filters.periodo}
          onValueChange={(value: any) => applyPreset(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="mesAtual">Mês Atual</SelectItem>
            <SelectItem value="mesPassado">Mês Passado</SelectItem>
            <SelectItem value="proximos7dias">Próximos 7 dias</SelectItem>
            <SelectItem value="proximos30dias">Próximos 30 dias</SelectItem>
            <SelectItem value="ultimos30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="anoAtual">Ano Atual</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Data personalizada */}
        {showCustomDate && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dataInicio && filters.dataFim ? (
                  <>
                    {format(filters.dataInicio, "dd/MM/yy")} - {format(filters.dataFim, "dd/MM/yy")}
                  </>
                ) : (
                  <span>Selecionar período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dataInicio,
                  to: filters.dataFim,
                }}
                onSelect={(range) => {
                  if (range?.from) updateFilter("dataInicio", range.from);
                  if (range?.to) updateFilter("dataFim", range.to);
                }}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Conta */}
        <Select
          value={filters.contaId}
          onValueChange={(value) => updateFilter("contaId", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {activeAccounts.map((conta) => (
              <SelectItem key={conta.id} value={conta.id}>
                {conta.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(value: any) => updateFilter("status", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="previsto">Previsto</SelectItem>
            <SelectItem value="liquidado">Liquidado</SelectItem>
            <SelectItem value="atrasado">Em atraso</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Tipo */}
        <Select
          value={filters.tipo}
          onValueChange={(value: any) => updateFilter("tipo", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="credito">Receita</SelectItem>
            <SelectItem value="debito">Despesa</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
          </SelectContent>
        </Select>

        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição..."
            value={filters.busca || ""}
            onChange={(e) => updateFilter("busca", e.target.value)}
            className="pl-9"
          />
          {filters.busca && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => clearFilter("busca")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Botão Novo */}
        {onNovo && (
          <Button onClick={onNovo} className="ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        )}
      </div>

      {/* Chips de filtros ativos */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {filters.contaId && filters.contaId !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Conta
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter("contaId")}
              />
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter("status")}
              />
            </Badge>
          )}
          {filters.tipo && filters.tipo !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {filters.tipo === "credito" ? "Receita" : filters.tipo === "debito" ? "Despesa" : "Transferência"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter("tipo")}
              />
            </Badge>
          )}
          {filters.busca && (
            <Badge variant="secondary" className="gap-1">
              "{filters.busca}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter("busca")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
