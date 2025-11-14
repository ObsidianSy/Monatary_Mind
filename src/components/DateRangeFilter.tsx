import { useState, useRef, useEffect } from "react";
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
  isSameDay
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
    getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) })
  },
  {
    label: "Últimos 7 dias",
    getValue: () => ({ from: subDays(new Date(), 7), to: endOfDay(new Date()) })
  },
  {
    label: "Últimos 30 dias",
    getValue: () => ({ from: subDays(new Date(), 30), to: endOfDay(new Date()) })
  },
  {
    label: "Este mês",
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
  },
  {
    label: "Mês passado",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  },
  {
    label: "Este ano",
    getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) })
  }
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'create' | 'from' | 'to' | null>(null); // create: novo intervalo arrastando
  const [anchorDate, setAnchorDate] = useState<Date | null>(null); // data onde começou drag create
  const calendarRef = useRef<HTMLDivElement>(null);

  // Quando abre o popover, prepara um range temporário baseado no valor atual
  useEffect(() => {
    if (open) setTempRange(value);
  }, [open, value]);

  const formatDateRange = (r: DateRange) => {
    if (!r?.from) return "Selecionar período";
    const fromStr = format(r.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = format(r.to, "dd/MM/yyyy", { locale: ptBR });
    return fromStr === toStr ? fromStr : `${fromStr} - ${toStr}`;
  };

  const handlePresetClick = (preset: typeof presets[number]) => {
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

  // Helpers de identificação de extremidades
  const isFromDate = (date: Date) => tempRange ? isSameDay(date, tempRange.from) : false;
  const isToDate = (date: Date) => tempRange ? isSameDay(date, tempRange.to) : false;

  // Extrai Date de um botão do calendário
  const getDateFromElement = (el: Element): Date | null => {
    // Busca mais genérica: qualquer botão com aria-label de dia
    const btn = el.closest('button[aria-label]');
    if (!btn) return null;
    const dateAttr = btn.getAttribute('data-date');
    if (dateAttr) return new Date(dateAttr);
    const ariaLabel = btn.getAttribute('aria-label');
    if (ariaLabel) {
      const match = ariaLabel.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/);
      if (match) {
        const day = parseInt(match[1]);
        const monthMap: Record<string, number> = {
          'janeiro': 0,'fevereiro': 1,'março': 2,'abril': 3,'maio': 4,'junho': 5,'julho': 6,'agosto': 7,'setembro': 8,'outubro': 9,'novembro': 10,'dezembro': 11
        };
        const month = monthMap[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        if (month !== undefined) return new Date(year, month, day);
      }
    }
    return null;
  };

  // Drag para ajustar extremidades
  useEffect(() => {
    if (!open) return;
    const calendarEl = calendarRef.current;
    if (!calendarEl) return;

    const handlePointerDown = (e: PointerEvent) => {
      const date = getDateFromElement(e.target as Element);
      if (!date) return;
      // Se já há tempRange, podemos redimensionar extremidades
      if (tempRange && isFromDate(date)) {
        setIsDragging(true);
        setDragMode('from');
        calendarEl.style.cursor = 'grabbing';
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      if (tempRange && isToDate(date)) {
        setIsDragging(true);
        setDragMode('to');
        calendarEl.style.cursor = 'grabbing';
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      // Criar novo intervalo via drag livre
      setTempRange({ from: date, to: date });
      setAnchorDate(date);
      setIsDragging(true);
      setDragMode('create');
      calendarEl.style.cursor = 'grabbing';
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragMode) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;
      const date = getDateFromElement(target);
      if (!date) return;

      if (dragMode === 'create') {
        if (!anchorDate) return;
        const from = date < anchorDate ? date : anchorDate;
        const to = date > anchorDate ? date : anchorDate;
        setTempRange({ from, to });
        return;
      }

      if (!tempRange) return;
      if (dragMode === 'from') {
        if (date <= tempRange.to) {
          setTempRange({ from: date, to: tempRange.to });
        } else {
          // inverter se passou
          setTempRange({ from: tempRange.to, to: date });
          setDragMode('to');
        }
      } else if (dragMode === 'to') {
        if (date >= tempRange.from) {
          setTempRange({ from: tempRange.from, to: date });
        } else {
          setTempRange({ from: date, to: tempRange.from });
          setDragMode('from');
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      setDragMode(null);
      setAnchorDate(null);
      calendarEl.style.cursor = '';
      if (tempRange?.from && tempRange?.to) {
        // Evento de fim de drag (não aplica ainda) apenas log didático
        console.log('Drag range definido:', {
          data_inicial: tempRange.from,
          data_final: tempRange.to,
        });
      }
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (isDragging) return;
      const date = getDateFromElement(e.target as Element);
      if (!date) return;
      if (tempRange && (isFromDate(date) || isToDate(date))) {
        calendarEl.style.cursor = 'grab';
      } else {
        calendarEl.style.cursor = '';
      }
    };

    calendarEl.addEventListener('pointerdown', handlePointerDown);
    calendarEl.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      calendarEl.removeEventListener('pointerdown', handlePointerDown);
      calendarEl.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [open, isDragging, dragMode, tempRange, anchorDate]);

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
            <div className="text-sm font-medium mb-2 text-muted-foreground">Período</div>
            {presets.map(p => (
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
          <div ref={calendarRef} className="p-3 flex flex-col gap-3">
            <Calendar
              mode="range"
              selected={{
                from: tempRange?.from || value.from,
                to: tempRange?.to || value.to
              }}
              onSelect={(r) => {
                if (isDragging) return; // ignora seleção durante drag
                if (r?.from) {
                  const next: DateRange = {
                    from: r.from,
                    to: r.to || r.from
                  };
                  setTempRange(next);
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="flex gap-2 justify-end border-t pt-3">
              <Button variant="outline" size="sm" onClick={handleCancel}>Cancelar</Button>
              <Button size="sm" onClick={handleApply} disabled={!tempRange?.from || !tempRange?.to}>Aplicar</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
