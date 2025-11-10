import { useFinanceiroClient, useFinanceiroRead, usePostEvent } from "./useFinanceiro";
import { useToast } from "./use-toast";

export interface Recurrence {
  id: string;
  conta_id: string;
  categoria_id: string;
  subcategoria_id?: string;
  tipo: "debito" | "credito";
  descricao: string;
  valor: string | number;
  frequencia: "mensal" | "semanal" | "anual";
  dia_vencimento?: number;
  dia_semana?: number;
  data_inicio: string;
  data_fim?: string;
  proxima_ocorrencia: string;
  alerta_dias_antes?: number;
  is_paused: boolean;
  is_deleted?: boolean;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function useRecurrences() {
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: recurrences, loading, error, refresh } = useFinanceiroRead<Recurrence>(
    client,
    "recorrencia",
    {},
    []
  );

  const activeRecurrences = (recurrences || []).filter(rec => !rec.is_deleted && !rec.is_paused);

  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      refresh();
    }
  });

  const createRecurrence = async (recurrenceData: Omit<Recurrence, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("recorrencia.upsert", recurrenceData);
  };

  const updateRecurrence = async (id: string, recurrenceData: Partial<Recurrence>) => {
    return postEvent("recorrencia.upsert", { id, ...recurrenceData });
  };

  const deleteRecurrence = async (id: string) => {
    return postEvent("recorrencia.upsert", { id, is_deleted: true });
  };

  const pauseRecurrence = async (id: string) => {
    return postEvent("recorrencia.upsert", { id, is_paused: true });
  };

  const resumeRecurrence = async (id: string) => {
    return postEvent("recorrencia.upsert", { id, is_paused: false });
  };

  return {
    recurrences: recurrences || [],
    activeRecurrences,
    loading,
    error,
    refresh,
    createRecurrence,
    updateRecurrence,
    deleteRecurrence,
    pauseRecurrence,
    resumeRecurrence,
    posting
  };
}