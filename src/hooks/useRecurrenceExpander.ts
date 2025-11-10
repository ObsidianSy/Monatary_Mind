// Hook para expandir recorrências em transações previstas
// Gera transações no ledger até o horizonte configurado

import { useCallback } from "react";
import { Recurrence } from "@/types/financial";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, format, startOfMonth, endOfMonth, getDate } from "date-fns";
import { apiClient } from "@/lib/financeiro-sdk";

export function useRecurrenceExpander() {
  
  // Limites de segurança para evitar expansão infinita
  const HORIZONTE_PADRAO = 90; // dias
  const MAX_OCCURRENCES = 12;
  const MAX_MONTHS_AHEAD = 3;
  const VALID_FREQUENCIES = ['semanal', 'mensal', 'anual'] as const;

  /**
   * Calcula ocorrências de uma recorrência em um mês específico
   */
  const calculateOccurrencesInMonth = useCallback((
    rec: any, 
    year: number, 
    month: number
  ): Date[] => {
    const occurrences: Date[] = [];
    const firstDay = startOfMonth(new Date(year, month - 1));
    const lastDay = endOfMonth(new Date(year, month - 1));
    
    switch (rec.frequencia) {
      case 'mensal':
        if (rec.dia_vencimento) {
          // Usar o dia especificado, ou último dia do mês se maior
          const daysInMonth = getDate(lastDay);
          const dia = Math.min(rec.dia_vencimento, daysInMonth);
          const date = new Date(year, month - 1, dia);
          occurrences.push(date);
        }
        break;
        
      case 'semanal':
        // Adicionar todas as ocorrências da semana especificada no mês
        if (rec.dia_semana !== undefined) {
          let current = new Date(firstDay);
          while (current <= lastDay) {
            if (current.getDay() === rec.dia_semana) {
              occurrences.push(new Date(current));
            }
            current = addDays(current, 1);
          }
        }
        break;
        
      case 'anual':
        // Apenas se o mês de início coincidir
        const dataInicio = new Date(rec.data_inicio);
        if (dataInicio.getMonth() + 1 === month) {
          const dia = Math.min(getDate(dataInicio), getDate(lastDay));
          occurrences.push(new Date(year, month - 1, dia));
        }
        break;
    }
    
    return occurrences;
  }, []);

  /**
   * Gera contas de um mês específico a partir de recorrências
   * @param year Ano (ex: 2025)
   * @param month Mês (1-12)
   * @param activeRecurrences Lista de recorrências ativas
   * @param existingTransactions Lista de transações existentes (para verificar duplicatas)
   * @returns Número de transações criadas
   */
  const generateMonthFromRecurrences = useCallback(async (
    year: number, 
    month: number,
    activeRecurrences: any[],
    existingTransactions: any[] = []
  ): Promise<number> => {
    const mesReferencia = `${year}-${String(month).padStart(2, '0')}`;
    
    console.log(`\n🔄 Gerando contas para ${mesReferencia}...`);
    
    let created = 0;
    
    for (const rec of activeRecurrences) {
      // Pular se pausada/deletada
      if (rec.is_paused || rec.is_deleted) {
        console.debug(`Recorrência ${rec.id} pausada/deletada, pulando`);
        continue;
      }
      
      // Validar categoria obrigatória
      if (!rec.categoria_id && !rec.subcategoria_id) {
        console.warn(`Recorrência ${rec.id} sem categoria, pulando`);
        continue;
      }
      
      // Calcular datas de vencimento no mês
      const occurrences = calculateOccurrencesInMonth(rec, year, month);
      
      for (const occDate of occurrences) {
        const dateStr = format(occDate, 'yyyy-MM-dd');
        
        // Verificar se já existe transação para esse mês+recorrência
        const exists = existingTransactions.some(t => 
          t.origem === `recorrencia:${rec.id}` &&
          t.mes_referencia === mesReferencia
        );
        
        if (!exists) {
          try {
            const payload: any = {
              tipo: rec.tipo === 'credito' ? 'credito' : 'debito',
              valor: parseFloat(String(rec.valor)),
              descricao: rec.descricao,
              data_transacao: dateStr,
              conta_id: rec.conta_id,
              categoria_id: rec.categoria_id || rec.subcategoria_id,
              origem: `recorrencia:${rec.id}`,
              referencia: rec.id,
              status: 'previsto',
              mes_referencia: mesReferencia
            };
            
            await apiClient.postEvent('transacao.upsert', payload);
            created++;
            console.log(`✅ Criada: ${rec.descricao} - ${dateStr}`);
          } catch (error) {
            console.error(`❌ Erro ao criar transação para ${rec.descricao}:`, error);
          }
        } else {
          console.debug(`Já existe transação para ${rec.descricao} em ${mesReferencia}`);
        }
      }
    }
    
    console.log(`\n✅ Total criado: ${created} transações para ${mesReferencia}`);
    return created;
  }, [calculateOccurrencesInMonth]);

  return {
    generateMonthFromRecurrences,
    calculateOccurrencesInMonth,
  };
}
