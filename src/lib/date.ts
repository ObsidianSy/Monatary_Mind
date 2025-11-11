/**
 * Utilitários de data timezone-safe para o frontend.
 * 
 * REGRA CRÍTICA:
 * - Backend retorna datas como strings 'YYYY-MM-DD' via TO_CHAR
 * - NUNCA usar new Date('YYYY-MM-DD') no front → causa shift UTC
 * - Sempre usar helpers desta lib para parsing e formatação
 */

/**
 * Formata string YYYY-MM-DD (ou YYYY-MM-DDTHH:MM) para dd/MM/yyyy
 * SEM parsing via Date (evita timezone shift).
 * 
 * @param value String no formato 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SS.000Z'
 * @returns String formatada 'dd/MM/yyyy' ou vazio se inválida
 * 
 * @example
 * formatDateYmdToBr('2025-11-10') → '10/11/2025'
 * formatDateYmdToBr('2025-11-10T03:00:00.000Z') → '10/11/2025'
 * formatDateYmdToBr(null) → ''
 */
export function formatDateYmdToBr(value?: string | null): string {
    if (!value) return '';

    // Pega apenas a parte da data (antes de 'T' se houver)
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-');

    if (!year || !month || !day) return '';

    return `${day}/${month}/${year}`;
}

/**
 * Parse TZ-safe de string YYYY-MM-DD para Date local.
 * Constrói Date usando ano/mês/dia explicitamente (não UTC).
 * 
 * @param dateStr String no formato 'YYYY-MM-DD' ou 'YYYY-MM'
 * @returns Date local ou Date atual se inválido
 * 
 * @example
 * parseDateLocal('2025-11-10') → Date(2025, 10, 10, 0, 0, 0) [mês 0-indexed]
 * parseDateLocal('2025-11') → Date(2025, 10, 1, 0, 0, 0)
 */
export function parseDateLocal(dateStr?: string | null): Date {
    if (!dateStr) return new Date();

    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);

    // Mês é 0-indexed em JS: Janeiro = 0, Dezembro = 11
    return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Converte Date para string YYYY-MM-DD (TZ-safe).
 * Usa getFullYear/getMonth/getDate (não toISOString).
 * 
 * @param date Date a ser convertido
 * @returns String 'YYYY-MM-DD'
 * 
 * @example
 * dateToYmd(new Date(2025, 10, 10)) → '2025-11-10'
 */
export function dateToYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Formata competência YYYY-MM-DD para formato legível.
 * 
 * @param dateStr String 'YYYY-MM-DD' ou 'YYYY-MM'
 * @returns String 'MMM/YYYY' capitalizado
 * 
 * @example
 * formatCompetencia('2025-11-01') → 'Nov/2025'
 * formatCompetencia('2025-02') → 'Fev/2025'
 */
export function formatCompetencia(dateStr: string | Date): string {
    const date = typeof dateStr === 'string' ? parseDateLocal(dateStr) : dateStr;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${month}/${year}`;
}

/**
 * Adiciona N meses a uma data de forma TZ-safe.
 * 
 * @param dateStr String 'YYYY-MM-DD'
 * @param months Número de meses a adicionar (pode ser negativo)
 * @returns Date resultante
 * 
 * @example
 * addMonthsSafe('2025-11-10', 1) → Date(2025, 11, 10) [dez/2025]
 * addMonthsSafe('2025-01-31', 1) → Date(2025, 1, 28/29) [fev/2025]
 */
export function addMonthsSafe(dateStr: string, months: number): Date {
    const date = parseDateLocal(dateStr);
    date.setMonth(date.getMonth() + months);
    return date;
}

/**
 * Extrai competência YYYY-MM-01 de uma string de data.
 * 
 * @param dateStr String 'YYYY-MM-DD'
 * @returns String 'YYYY-MM-01'
 * 
 * @example
 * getCompetenciaFromDate('2025-11-15') → '2025-11-01'
 */
export function getCompetenciaFromDate(dateStr: string): string {
    const [year, month] = dateStr.split('-');
    return `${year}-${month}-01`;
}
