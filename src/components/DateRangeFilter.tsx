import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  {
    label: "Hoje",
    getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Últimos 7 dias",
    getValue: () => ({ from: subDays(new Date(), 7), to: endOfDay(new Date()) }),
  },
  {
    label: "Últimos 30 dias",
    getValue: () => ({ from: subDays(new Date(), 30), to: endOfDay(new Date()) }),
  },
  {
    label: "Este mês",
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: "Mês passado",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
  {
    label: "Este ano",
    getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value);

  useEffect(() => {
    if (open) {
      setTempRange(value);
    }
  }, [open, value]);

  const formatDateRange = (r: DateRange) => {
    if (!r?.from) return "Selecionar período";
    const fromStr = format(r.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = format(r.to, "dd/MM/yyyy", { locale: ptBR });
    return fromStr === toStr ? fromStr : `${fromStr} - ${toStr}`;
  };

  const handlePresetClick = (preset: (typeof presets)[number]) => {
    const newRange = preset.getValue();
    onChange(newRange);
    setTempRange(null);
    setOpen(false);
  };

  const handleApply = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange({ from: startOfDay(tempRange.from), to: endOfDay(tempRange.to) });
      setTempRange(null);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setTempRange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 p-3 border-r">
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              Período
            </div>
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePresetClick(p)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-3 flex flex-col gap-3">
            <Calendar
              mode="range"
              selected={{
                from: tempRange?.from || value.from,
                to: tempRange?.to || value.to,
              }}
              onSelect={(r) => {
                if (r?.from) {
                  const next: DateRange = {
                    from: r.from,
                    to: r.to || r.from,
                  };
                  setTempRange(next);
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="flex gap-2 justify-end border-t pt-3">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempRange?.from || !tempRange?.to}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}