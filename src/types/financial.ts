// Tipos centralizados do sistema financeiro
// Evita duplicação e garante consistência

export interface Account {
  id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  saldo_atual?: number;
  ativo: boolean;
  is_deleted?: boolean;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  nome: string;
  tipo: "despesa" | "receita" | "transferencia";
  parent_id: string | null;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryTree {
  id: string;
  nome: string;
  tipo: "despesa" | "receita" | "transferencia";
  parent_id: string | null;
  children: Category[];
}

export interface CreditCard {
  id: string;
  tenant_id?: string;
  apelido: string;
  bandeira: "visa" | "mastercard" | "elo" | "amex" | "hipercard";
  limite_total: string | number;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagamento_id: string;
  is_deleted?: boolean;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  cartao_id: string;
  competencia: string; // YYYY-MM
  status: "aberta" | "fechada" | "paga";
  valor_total?: string | number;
  valor_fechado?: string | number;
  valor_pago?: string | number;
  data_fechamento?: string;
  data_vencimento: string;
  data_pagamento?: string;
  transacao_id?: string; // Link para a transação de pagamento no ledger
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id: string;
  fatura_id: string;
  cartao_id?: string;
  descricao: string;
  valor: number;
  data_compra: string;
  categoria_id?: string;
  subcategoria_id?: string;
  parcela_numero?: number;
  parcela_total?: number;
  competencia?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  // Campos do JOIN com categoria
  categoria_nome?: string;
  categoria_parent_id?: string;
  categoria_pai_nome?: string;
}

export interface Transaction {
  id: string;
  tipo: "credito" | "debito" | "transferencia";
  valor: number;
  descricao: string;
  data_transacao: string;
  data_vencimento?: string; // Para previstos - quando vence
  conta_id: string;
  conta_destino_id?: string;
  categoria_id?: string;
  subcategoria_id?: string;
  origem: string; // Ex: 'manual', 'recorrencia:{id}', 'fatura:{id}', 'cheque:{id}'
  referencia?: string; // ID da origem para rastreamento
  status: "previsto" | "liquidado" | "cancelado" | "atrasado";
  grupo_id?: string; // Agrupar parcelas
  parcela_numero?: number;
  parcela_total?: number;
  instrumento?: "dinheiro" | "cheque" | "boleto" | "pix" | "cartao";
  observacoes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Parcela {
  id: string;
  cartao_apelido: string;
  cartao_bandeira: string;
  descricao: string;
  valor: number;
  numero_parcela: number;
  total_parcelas: number;
  competencia: string;
  data_vencimento: string;
  status: "em_aberto" | "pago" | "atrasado";
}

export interface Recurrence {
  id: string;
  conta_id: string;
  categoria_id?: string;
  subcategoria_id?: string;
  tipo: "credito" | "debito";
  valor: number;
  descricao: string;
  frequencia: "diario" | "semanal" | "quinzenal" | "mensal" | "anual";
  dia_vencimento?: number;
  dia_semana?: number; // 0-6 (Domingo-Sábado) para recorrências semanais
  data_inicio: string;
  data_fim?: string;
  ativo?: boolean; // Deprecated, usar is_paused
  is_paused: boolean;
  is_deleted?: boolean;
  proxima_ocorrencia: string;
  alerta_dias_antes?: number;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Novo: Cheques/Títulos
export interface Cheque {
  id: string;
  tenant_id?: string;
  tipo: "emitido" | "recebido";
  numero: string;
  banco?: string;
  agencia?: string;
  conta_bancaria?: string;
  nominal: string; // A favor de quem / De quem
  documento?: string; // CPF/CNPJ
  valor: number;
  data_emissao: string;
  data_prev_compensacao: string;
  data_compensacao?: string;
  status: "emitido" | "depositado" | "compensado" | "devolvido" | "sustado" | "cancelado";
  conta_id: string; // Conta financeira onde será compensado
  transacao_id?: string; // Link para transação no ledger
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

// Form interfaces para modais
export interface AccountForm {
  nome: string;
  tipo: string;
  saldo_inicial: string;
}

export interface CardForm {
  apelido: string;
  bandeira: string;
  limite: string;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagadora_id: string;
}

export interface TransactionForm {
  tipo: "credito" | "debito" | "transferencia";
  valor: string;
  descricao: string;
  data_transacao: Date;
  conta_id: string;
  conta_destino_id?: string;
  subcategoria_id: string;
  origem: string;
  status: "previsto" | "liquidado";
  observacoes?: string;
  parcelas?: number;
  is_recorrente?: boolean;
  frequencia?: "mensal" | "semanal" | "quinzenal" | "anual";
  data_fim?: Date;
}

export interface PurchaseForm {
  descricao: string;
  valor: string;
  data_compra: Date;
  categoria_id: string;
  parcela_total: number;
  cartao_id: string;
  observacoes: string;
  tipo_compra: "simples" | "parcelada";
}

export interface PaymentForm {
  conta_id: string;
  valor_pago: string;
  data_pagamento: Date;
}

export interface ParcelaForm {
  status: "em_aberto" | "pago" | "atrasado";
  data_vencimento: Date;
  valor: string;
  observacoes?: string;
}