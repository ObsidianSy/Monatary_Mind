// Schemas de validação Zod para formulários
// Garantem dados consistentes antes de enviar para API

import { z } from "zod";

// ============ TRANSAÇÃO ============
export const transactionSchema = z.object({
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(200, "Descrição muito longa"),
  
  valor: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito alto"),
  
  tipo: z.enum(["credito", "debito", "transferencia"], {
    errorMap: () => ({ message: "Tipo inválido" })
  }),
  
  data_transacao: z.string()
    .refine((d) => !isNaN(Date.parse(d)), "Data inválida"),
  
  conta_id: z.string()
    .uuid("Conta inválida"),
  
  subcategoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  categoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  status: z.enum(["previsto", "liquidado", "cancelado"], {
    errorMap: () => ({ message: "Status inválido" })
  }),
  
  origem: z.string().optional(),
  observacoes: z.string().max(500, "Observação muito longa").optional(),
  
  // Para transferências
  conta_destino_id: z.string().uuid("Conta destino inválida").optional(),
})
.refine(
  (data) => data.subcategoria_id || data.categoria_id || data.tipo === "transferencia",
  {
    message: "Categoria é obrigatória para crédito/débito",
    path: ["subcategoria_id"]
  }
);

// ============ RECORRÊNCIA ============
export const recurrenceSchema = z.object({
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(200, "Descrição muito longa"),
  
  valor: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito alto"),
  
  tipo: z.enum(["credito", "debito"], {
    errorMap: () => ({ message: "Tipo inválido" })
  }),
  
  frequencia: z.enum(["semanal", "mensal", "anual"], {
    errorMap: () => ({ message: "Frequência não suportada. Use: semanal, mensal ou anual" })
  }),
  
  data_inicio: z.string()
    .refine((d) => !isNaN(Date.parse(d)), "Data de início inválida"),
  
  data_fim: z.string()
    .refine((d) => !isNaN(Date.parse(d)), "Data de fim inválida")
    .optional(),
  
  conta_id: z.string().uuid("Conta inválida"),
  
  subcategoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  categoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  dia_vencimento: z.number().min(1).max(31).optional(),
  dia_semana: z.number().min(0).max(6).optional(),
  alerta_dias_antes: z.number().min(0).max(30).optional(),
})
.refine(
  (data) => data.subcategoria_id || data.categoria_id,
  {
    message: "Categoria é obrigatória",
    path: ["subcategoria_id"]
  }
)
.refine(
  (data) => {
    if (data.data_fim && data.data_inicio) {
      return new Date(data.data_fim) > new Date(data.data_inicio);
    }
    return true;
  },
  {
    message: "Data fim deve ser posterior à data início",
    path: ["data_fim"]
  }
);

// ============ CONTA BANCÁRIA ============
export const accountSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo"),
  
  tipo: z.enum(["corrente", "poupanca", "investimento", "dinheiro"], {
    errorMap: () => ({ message: "Tipo de conta inválido" })
  }),
  
  saldo_inicial: z.number()
    .max(999999999, "Saldo muito alto")
    .optional(),
});

// ============ CARTÃO DE CRÉDITO ============
export const creditCardSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo"),
  
  limite: z.number()
    .positive("Limite deve ser positivo")
    .max(999999999, "Limite muito alto"),
  
  dia_fechamento: z.number()
    .min(1, "Dia de fechamento inválido")
    .max(31, "Dia de fechamento inválido"),
  
  dia_vencimento: z.number()
    .min(1, "Dia de vencimento inválido")
    .max(31, "Dia de vencimento inválido"),
  
  bandeira: z.string().optional(),
  conta_pagamento_id: z.string().uuid("Conta de pagamento inválida").optional(),
});

// ============ CATEGORIA ============
export const categorySchema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(50, "Nome muito longo"),
  
  tipo: z.enum(["despesa", "receita", "transferencia"], {
    errorMap: () => ({ message: "Tipo de categoria inválido" })
  }),
  
  subcategorias: z.array(z.string().min(2).max(50)).optional(),
});

// ============ COMPRA NO CARTÃO ============
export const creditPurchaseSchema = z.object({
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(200, "Descrição muito longa"),
  
  valor: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito alto"),
  
  data_compra: z.string()
    .refine((d) => !isNaN(Date.parse(d)), "Data inválida"),
  
  cartao_id: z.string().uuid("Cartão inválido"),
  
  subcategoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  categoria_id: z.string()
    .uuid("Categoria inválida")
    .optional(),
  
  parcela_total: z.number()
    .min(1, "Mínimo 1 parcela")
    .max(48, "Máximo 48 parcelas")
    .optional(),
})
.refine(
  (data) => data.subcategoria_id || data.categoria_id,
  {
    message: "Categoria é obrigatória",
    path: ["categoria_id"]
  }
);

// ============ PARCELAMENTO ============
export const installmentSchema = z.object({
  valor: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito alto"),
  
  numero_parcelas: z.number()
    .min(2, "Mínimo 2 parcelas")
    .max(48, "Máximo 48 parcelas"),
  
  descricao: z.string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(200, "Descrição muito longa"),
});

// ============ TIPOS EXPORTADOS ============
export type TransactionInput = z.infer<typeof transactionSchema>;
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CreditCardInput = z.infer<typeof creditCardSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CreditPurchaseInput = z.infer<typeof creditPurchaseSchema>;
export type InstallmentInput = z.infer<typeof installmentSchema>;
