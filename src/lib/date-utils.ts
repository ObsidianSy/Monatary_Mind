import { format, isValid, startOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Parse robusto de data que aceita múltiplos formatos
 */
export function parseDate(dateStr: string | Date | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr).trim();
  
  // Formato ISO completo: "2025-01-15T10:30:00"
  if (str.includes('T')) {
    return new Date(str);
  }
  
  // Formato YYYY-MM-DD
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(str + 'T00:00:00');
  }
  
  // Formato YYYY-MM (competência)
  if (str.match(/^\d{4}-\d{2}$/)) {
    return new Date(str + '-01T00:00:00');
  }
  
  // Formato YYYYMM (competência sem hífen)
  if (str.match(/^\d{6}$/)) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    return new Date(`${year}-${month}-01T00:00:00`);
  }
  
  // Fallback: deixar JS tentar parsear
  const date = new Date(str);
  return isValid(date) ? date : new Date();
}

/**
 * Formatar competência para formato padrão YYYY-MM
 */
export function formatCompetencia(dateStr: string | Date): string {
  const date = parseDate(dateStr);
  return format(date, 'yyyy-MM');
}

/**
 * Formatar data para exibição
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const parsedDate = typeof date === 'string' ? parseDate(date) : date;
  return format(parsedDate, formatStr, { locale: ptBR });
}

/**
 * Presets de períodos comuns
 */
export const DATE_PRESETS = {
  hoje: () => ({
    from: startOfDay(new Date()),
    to: startOfDay(new Date())
  }),
  
  mesAtual: () => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  }),
  
  mesPassado: () => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth)
    };
  },
  
  proximos7dias: () => ({
    from: startOfDay(new Date()),
    to: addDays(startOfDay(new Date()), 7)
  }),
  
  proximos30dias: () => ({
    from: startOfDay(new Date()),
    to: addDays(startOfDay(new Date()), 30)
  }),
  
  ultimos30dias: () => ({
    from: addDays(startOfDay(new Date()), -30),
    to: startOfDay(new Date())
  }),
  
  anoAtual: () => ({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  })
};

/**
 * Aplicar preset de período
 */
export function applyPreset(preset: keyof typeof DATE_PRESETS) {
  return DATE_PRESETS[preset]();
}
