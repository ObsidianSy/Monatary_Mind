// Legacy hook - mantido para compatibilidade
// Use useFinancialData.useAccounts() para novos códigos
import { useFinanceiroClient, useFinanceiroRead } from "./useFinanceiro";

export interface Account {
  id: string;
  nome: string;
  tipo: "corrente" | "poupanca" | "fundo_caixa" | "cartao_credito" | "caixa" | "conta_pagamento" | "investimento";
  saldo_inicial: string | number;
  ativo?: boolean;
  is_deleted?: boolean;
  tenant_id?: string;
  created_at?: string;
}

export function useAccounts() {
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: accounts, loading, error, refresh } = useFinanceiroRead<Account>(
    client,
    "conta",
    {},
    []
  );

  const activeAccounts = (accounts || []).filter(account => !account.is_deleted);

  return {
    accounts: accounts || [],
    activeAccounts,
    loading,
    error,
    refresh
  };
}