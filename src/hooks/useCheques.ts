// Hook para gerenciar cheques/títulos

import { useFinanceiroClient, useFinanceiroRead, usePostEvent } from "./useFinanceiro";
import { useToast } from "./use-toast";
import { Cheque } from "@/types/financial";

export function useCheques() {
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { toast } = useToast();

  const { data: cheques, loading, error, refresh } = useFinanceiroRead<Cheque>(
    client,
    "cheque" as any, // Assumindo que terá endpoint no backend
    { limit: 500 },
    []
  );

  const defaultEventConfig = {
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Operação realizada com sucesso.",
      });
      refresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro na operação.",
        variant: "destructive" as const,
      });
    },
  };

  const { postEvent, posting } = usePostEvent(client, defaultEventConfig);

  const createCheque = async (chequeData: Omit<Cheque, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("cheque.upsert" as any, {
      ...chequeData,
      valor: typeof chequeData.valor === 'string' ? 
        parseFloat(chequeData.valor) : chequeData.valor,
    });
  };

  const updateCheque = async (id: string, chequeData: Partial<Cheque>) => {
    return postEvent("cheque.upsert" as any, { id, ...chequeData });
  };

  const updateStatus = async (id: string, status: Cheque['status'], dataCompensacao?: string) => {
    return postEvent("cheque.status" as any, { 
      id, 
      status,
      ...(dataCompensacao && { data_compensacao: dataCompensacao })
    });
  };

  const depositar = async (id: string) => updateStatus(id, "depositado");
  const compensar = async (id: string, dataCompensacao: string) => 
    updateStatus(id, "compensado", dataCompensacao);
  const devolver = async (id: string) => updateStatus(id, "devolvido");
  const sustar = async (id: string) => updateStatus(id, "sustado");
  const cancelar = async (id: string) => updateStatus(id, "cancelado");

  // Filtros úteis
  const chequesEmitidos = (cheques || []).filter(c => c.tipo === "emitido");
  const chequesRecebidos = (cheques || []).filter(c => c.tipo === "recebido");
  const chequesPendentes = (cheques || []).filter(
    c => c.status === "emitido" || c.status === "depositado"
  );

  return {
    cheques: cheques || [],
    chequesEmitidos,
    chequesRecebidos,
    chequesPendentes,
    loading,
    error,
    refresh,
    createCheque,
    updateCheque,
    updateStatus,
    depositar,
    compensar,
    devolver,
    sustar,
    cancelar,
    posting
  };
}
