// Hook central para dados financeiros
// Substitui múltiplos hooks especializados por um sistema unificado

import { useMemo } from "react";
import { useFinanceiroClient, useFinanceiroRead, usePostEvent } from "./useFinanceiro";
import { useToast } from "./use-toast";
import type { 
  Account, 
  CreditCard, 
  Invoice, 
  InvoiceItem, 
  Transaction, 
  Category, 
  Parcela,
  Recurrence 
} from "@/types/financial";

interface UseFinancialDataOptions {
  tenantId?: string;
}

export function useFinancialData(options: UseFinancialDataOptions = {}) {
  const tenantId = options.tenantId || import.meta.env.VITE_FINANCEIRO_TENANT_ID || "obsidian";
  const client = useFinanceiroClient({ tenantId });
  const { toast } = useToast();

  // Configuração de eventos padrão
  const defaultEventConfig = {
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Operação realizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro na operação.",
        variant: "destructive" as const,
      });
    },
  };

  return {
    client,
    defaultEventConfig,
    toast,
  };
}

// Hook para contas
export function useAccounts() {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: accounts, loading, error, refresh } = useFinanceiroRead<Account>(
    client,
    "conta",
    { limit: 500 },
    []
  );

  const activeAccounts = (accounts || []).filter(account => !account.is_deleted);

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const createAccount = async (accountData: Omit<Account, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("conta.upsert", {
      ...accountData,
      saldo_inicial: typeof accountData.saldo_inicial === 'string' ? 
        parseFloat(accountData.saldo_inicial) : accountData.saldo_inicial,
      ativo: true,
      is_deleted: false
    });
  };

  const updateAccount = async (id: string, accountData: Partial<Account>) => {
    return postEvent("conta.upsert", { id, ...accountData });
  };

  const deleteAccount = async (id: string) => {
    return postEvent("conta.upsert", { id, is_deleted: true });
  };

  return {
    accounts: accounts || [],
    activeAccounts,
    loading,
    error,
    refresh,
    createAccount,
    updateAccount,
    deleteAccount,
    posting
  };
}

// Hook para cartões de crédito
export function useCreditCards() {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: cards, loading, error, refresh } = useFinanceiroRead<CreditCard>(
    client,
    "cartao",
    { limit: 500 },
    []
  );

  const activeCards = (cards || []).filter(card => !card.is_deleted);

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const createCard = async (cardData: Omit<CreditCard, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("cartao.upsert", {
      ...cardData,
      limite_total: typeof cardData.limite_total === 'string' ? 
        parseFloat(cardData.limite_total) : cardData.limite_total,
      is_deleted: false
    });
  };

  const updateCard = async (id: string, cardData: Partial<CreditCard>) => {
    return postEvent("cartao.upsert", { id, ...cardData });
  };

  const deleteCard = async (id: string) => {
    return postEvent("cartao.upsert", { id, is_deleted: true });
  };

  return {
    cards: cards || [],
    activeCards,
    loading,
    error,
    refresh,
    createCard,
    updateCard,
    deleteCard,
    posting
  };
}

// Hook para faturas
export function useInvoices(cardId?: string) {
  const { client, defaultEventConfig } = useFinancialData();
  
  const filters = { ...(cardId ? { cartao_id: cardId } : {}), order: "competencia.desc", limit: 100 };
  
  const { data: invoices, loading, error, refresh } = useFinanceiroRead<Invoice>(
    client,
    "fatura",
    filters,
    [cardId]
  );

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const closeInvoice = async (invoiceData: { 
    fatura_id?: string; 
    cartao_id?: string; 
    competencia?: string 
  }) => {
    // Usar endpoint direto ao invés de postEvent
    const response = await client.http('/events/fatura.fechar', {
      method: 'POST',
      headers: client.buildHeaders(),
      body: JSON.stringify({
        ...invoiceData,
        tenant_id: 'obsidian'
      })
    });
    refresh(); // Atualizar lista de faturas
    return response;
  };

  const payInvoice = async (paymentData: { 
    fatura_id: string; 
    conta_id: string; 
    valor_pago: number; 
    data_pagamento: string;
  }) => {
    // Usar endpoint direto ao invés de postEvent
    const response = await client.http('/events/fatura.pagar', {
      method: 'POST',
      headers: client.buildHeaders(),
      body: JSON.stringify({
        ...paymentData,
        tenant_id: 'obsidian'
      })
    });
    refresh(); // Atualizar lista de faturas
    return response;
  };

  return {
    invoices: invoices || [],
    loading,
    error,
    refresh,
    closeInvoice,
    payInvoice,
    posting
  };
}

// Hook para itens de fatura
export function useInvoiceItems(invoiceId?: string, additionalFilters?: Record<string, any>) {
  const { client } = useFinancialData();
  
  // Memoizar filters para evitar loop infinito
  const filters = useMemo(() => {
    return invoiceId 
      ? { fatura_id: invoiceId, order: "data_compra.desc", limit: 100, ...additionalFilters } 
      : { order: "data_compra.desc", limit: 100, ...additionalFilters };
  }, [invoiceId, JSON.stringify(additionalFilters)]);
  
  const { data: items, loading, error, refresh } = useFinanceiroRead<InvoiceItem>(
    client,
    "fatura_item",
    filters,
    [invoiceId, JSON.stringify(additionalFilters)]
  );

  return {
    items: items || [],
    loading,
    error,
    refresh
  };
}

// Hook para transações
export function useTransactions(filters: Record<string, any> = {}) {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: transactions, loading, error, refresh } = useFinanceiroRead<Transaction>(
    client,
    "transacao",
    { limit: 500, ...filters },
    [JSON.stringify(filters)]
  );

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("transacao.upsert", {
      ...transactionData,
      valor: typeof transactionData.valor === 'string' ? 
        parseFloat(transactionData.valor) : transactionData.valor
    });
  };

  const updateTransaction = async (id: string, transactionData: Partial<Transaction>) => {
    return postEvent("transacao.upsert", { id, ...transactionData });
  };

  const deleteTransaction = async (id: string) => {
    return postEvent("transacao.delete", { id });
  };

  return {
    transactions: transactions || [],
    loading,
    error,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    posting
  };
}

// Hook para categorias
export function useCategories() {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: categories, loading, error, refresh } = useFinanceiroRead<Category>(
    client,
    "categoria",
    { limit: 500 },
    []
  );

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  // Separar categorias pai das subcategorias
  const parentCategories = (categories || []).filter(cat => cat.parent_id === null);
  const subCategories = (categories || []).filter(cat => cat.parent_id !== null);

  // Criar estrutura de árvore
  const categoryTree = parentCategories.map(parent => ({
    ...parent,
    children: subCategories.filter(sub => sub.parent_id === parent.id)
  }));

  // Para selects - subcategorias com nome completo
  const subcategoriesForSelect = subCategories.map(sub => {
    const parent = parentCategories.find(p => p.id === sub.parent_id);
    return {
      ...sub,
      fullName: `${parent?.nome} > ${sub.nome}`
    };
  });

  const createCategory = async (categoryData: { nome: string; tipo: string; parent_id?: string }) => {
    return postEvent("categoria.upsert", categoryData);
  };

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    return postEvent("categoria.upsert", { id, ...categoryData });
  };

  const deleteCategory = async (id: string) => {
    return postEvent("categoria.delete", { id });
  };

  return {
    categories: categories || [],
    parentCategories,
    subCategories,
    categoryTree,
    subcategoriesForSelect,
    loading,
    error,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
    posting
  };
}

// Hook para parcelas
export function useParcelas() {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: parcelas, loading, error, refresh } = useFinanceiroRead<Parcela>(
    client,
    "transacao", // API usa transacao para parcelas
    { limit: 500, tipo_parcela: true }, // Filtro específico
    []
  );

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const updateParcela = async (id: string, parcelaData: Partial<Parcela>) => {
    return postEvent("parcela.upsert", { id, ...parcelaData });
  };

  return {
    parcelas: parcelas || [],
    loading,
    error,
    refresh,
    updateParcela,
    posting
  };
}

// Hook para recorrências
export function useRecurrences() {
  const { client, defaultEventConfig } = useFinancialData();
  
  const { data: recurrences, loading, error, refresh } = useFinanceiroRead<Recurrence>(
    client,
    "recorrencia",
    { limit: 500 },
    []
  );

  const activeRecurrences = (recurrences || []).filter(rec => rec.ativo);

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
      refresh();
    }
  });

  const createRecurrence = async (recurrenceData: Omit<Recurrence, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    return postEvent("recorrencia.upsert", {
      ...recurrenceData,
      valor: typeof recurrenceData.valor === 'string' ? 
        parseFloat(recurrenceData.valor) : recurrenceData.valor,
      ativo: true
    });
  };

  const updateRecurrence = async (id: string, recurrenceData: Partial<Recurrence>) => {
    return postEvent("recorrencia.upsert", { id, ...recurrenceData });
  };

  const deleteRecurrence = async (id: string) => {
    return postEvent("recorrencia.upsert", { id, ativo: false });
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
    posting
  };
}

// Hook para compras no cartão (específico)
export function useCreditPurchases() {
  const { client, defaultEventConfig } = useFinancialData();

  const { postEvent, posting } = usePostEvent(client, {
    ...defaultEventConfig,
    onSuccess: () => {
      defaultEventConfig.onSuccess();
    }
  });

  const createPurchase = async (purchaseData: {
    cartao_id: string;
    competencia: string;
    descricao: string;
    valor: number;
    data_compra: string;
    categoria_id: string;
    parcela_numero: number;
    parcela_total: number;
  }) => {
    return postEvent("fatura_item.upsert", purchaseData);
  };

  return {
    createPurchase,
    posting
  };
}