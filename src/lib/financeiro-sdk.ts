// financeiro-sdk.ts
// SDK TS para conexão com backend local PostgreSQL

const DEFAULT_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function safeJson(text: string): any | undefined {
  try { return JSON.parse(text); } catch { return undefined; }
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface FinanceiroSDKOptions {
  tenantId: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class FinanceiroSDK {
  private baseUrl: string;
  private tenantId: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(opts: FinanceiroSDKOptions) {
    if (!opts || !opts.tenantId) throw new Error("tenantId é obrigatório");
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
    this.tenantId = opts.tenantId;
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 20000;
  }

  buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 
      "Content-Type": "application/json", 
      "Accept": "application/json", 
      ...(extra || {}) 
    };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  withTimeout<T>(promise: Promise<T>): Promise<T> {
    const t = new Promise<never>((_, rej) => 
      setTimeout(() => {
        const error = new Error("Tempo de requisição excedido");
        (error as any).code = "TIMEOUT";
        rej(error);
      }, this.timeoutMs)
    );
    return Promise.race([promise, t]);
  }

  async httpWithRetry(
    path: string, 
    init: RequestInit, 
    retries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        const res = await this.withTimeout(fetch(url, init));
        const text = await res.text();
        const json = text ? safeJson(text) : undefined;
        
        if (!res.ok) {
          const msg = (json && (json.message || json.error || json.detail)) || `HTTP ${res.status} ${res.statusText}`;
          const error = new Error(msg);
          (error as any).status = res.status;
          throw error;
        }
        
        return json ?? {};
      } catch (error: any) {
        lastError = error;
        
        // Não retry em erros 4xx (exceto 408 timeout)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 408) {
          throw error;
        }
        
        // Se não é o último retry, aguarda antes de tentar novamente
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.debug(`Tentativa ${attempt}/${retries} falhou, aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    const finalError = new Error(`Todas as ${retries} tentativas falharam. Último erro: ${lastError?.message}`);
    (finalError as any).code = "MAX_RETRIES_EXCEEDED";
    (finalError as any).originalError = lastError;
    throw finalError;
  }

  async http(path: string, init: RequestInit): Promise<any> {
    // Use retry logic para todas as chamadas HTTP
    return this.httpWithRetry(path, init, 3);
  }

  // --------- POST /events ----------
  async postEvent(
    eventType: string, 
    payload: any, 
    options?: { eventId?: string; occurredAt?: string }
  ): Promise<any> {
    // Validações
    if (eventType === "transacao.upsert") {
      const tipo = (payload?.tipo || "").toLowerCase();
      if ((tipo === "credito" || tipo === "debito") && !payload?.subcategoria_id && !payload?.categoria_id) {
        throw new Error("Categoria/Subcategoria é obrigatória para crédito/débito (envie subcategoria_id de preferência)");
      }
    }
    if (eventType === "recorrencia.upsert") {
      if (!payload?.subcategoria_id && !payload?.categoria_id) {
        throw new Error("Categoria/Subcategoria é obrigatória na recorrência (envie subcategoria_id de preferência)");
      }
    }

    // Mapear eventos para endpoints REST
    const eventMap: Record<string, { endpoint: string; method: string }> = {
      'conta.upsert': { endpoint: '/contas', method: 'POST' },
      'categoria.upsert': { endpoint: '/categorias', method: 'POST' },
      'subcategoria.upsert': { endpoint: '/categorias', method: 'POST' },
      'transacao.upsert': { endpoint: '/transacoes', method: 'POST' },
      'cartao.upsert': { endpoint: '/cartoes', method: 'POST' },
      'recorrencia.upsert': { endpoint: '/recorrencias', method: 'POST' },
      'fatura_item.upsert': { endpoint: '/compras', method: 'POST' },
      'fatura.fechar': { endpoint: '/faturas/fechar', method: 'POST' },
      'fatura.pagar': { endpoint: '/faturas/pagar', method: 'POST' },
    };

    const mapping = eventMap[eventType];
    if (!mapping) {
      throw new Error(`Evento não suportado: ${eventType}`);
    }

    // Adicionar tenant_id ao payload
    const bodyWithTenant = {
      ...payload,
      tenant_id: payload.tenant_id || this.tenantId
    };

    const result = await this.http(mapping.endpoint, {
      method: mapping.method,
      headers: this.buildHeaders(),
      body: JSON.stringify(bodyWithTenant),
    });

    // Dispatch global event for auto-refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance:data-changed', { 
        detail: { eventType, payload } 
      }));
    }

    return result;
  }

  // --------- GET /read -------------
  async read(resource: string, filters: Record<string, any> = {}): Promise<any[]> {
    const params = new URLSearchParams();

    // tenant fixo
    params.set("tenant_id", filters.tenant_id || import.meta.env.VITE_FINANCEIRO_TENANT_ID || this.tenantId);

    // Mapear recursos para endpoints
    const resourceMap: Record<string, string> = {
      'conta': '/contas',
      'categoria': '/categorias',
      'transacao': '/transacoes',
      'cartao': '/cartoes',
      'fatura': '/faturas',
      'fatura_item': '/faturas/itens',
      'recorrencia': '/recorrencias',
      'cheque': '/cheques',
    };

    const endpoint = resourceMap[resource] || `/${resource}s`;

    // Adicionar filtros específicos
    if (resource === "transacao") {
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.conta_id) params.set("conta_id", filters.conta_id);
      if (filters.categoria_id) params.set("categoria_id", filters.categoria_id);
      if (filters.tipo) params.set("tipo", filters.tipo);
      if (filters.status) params.set("status", filters.status);
      if (filters.limit != null) params.set("limit", String(filters.limit));
      if (filters.offset != null) params.set("offset", String(filters.offset));
    }

    if (resource === "fatura") {
      if (filters.cartao_id) params.set("cartao_id", filters.cartao_id);
      if (filters.status) params.set("status", filters.status);
      params.set("limit", String(filters.limit ?? 100));
    }

    // outros filtros genéricos
    for (const [key, value] of Object.entries(filters)) {
      if (!params.has(key) && value != null && key !== 'tenant_id') {
        params.set(key, String(value));
      }
    }

    const url = `${endpoint}?${params.toString()}`;
    console.debug("🔍 Buscando:", this.baseUrl + url);
    
    const result = await this.http(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });
    
    console.debug(`✅ ${resource}:`, result?.length || 0, "itens");
    return result;
  }

  async *readPaginated(
    resource: string, 
    filters: Record<string, any> = {}, 
    pageSize: number = 200
  ): AsyncGenerator<any[], void, unknown> {
    let offset = 0;
    while (true) {
      const page = await this.read(resource, { ...filters, limit: pageSize, offset });
      if (!Array.isArray(page) || page.length === 0) break;
      yield page;
      if (page.length < pageSize) break;
      offset += pageSize;
    }
  }

  // ============ Backwards Compatibility Methods ============
  // These methods maintain compatibility with the old API
  
  async getTransactions(filters: Record<string, any> = {}) {
    return this.read("transacao", filters);
  }

  async createTransaction(transactionData: any) {
    return this.postEvent("transacao.upsert", transactionData);
  }

  async getAccountBalances() {
    return this.read("saldo_conta");
  }

  async getProjection30Days() {
    return this.read("fluxo_30d");
  }

  async createRecurringTransaction(recurringData: any) {
    return this.postEvent("recorrencia.upsert", recurringData);
  }

  async createCard(cardData: any) {
    return this.postEvent("cartao.upsert", cardData);
  }

  async closeInvoice(faturaId: string) {
    return this.postEvent("fatura.fechar", { fatura_id: faturaId });
  }

  async payInvoice(invoiceData: any) {
    return this.postEvent("fatura.pagar", invoiceData);
  }

  // Category management methods
  async createCategory(nome: string, tipo: "despesa" | "receita" | "transferencia", subcategorias?: string[]) {
    return this.postEvent("categoria.upsert", {
      nome,
      tipo,
      ...(subcategorias && { subcategorias })
    });
  }

  async updateCategory(id: string, nome: string, tipo: "despesa" | "receita" | "transferencia") {
    return this.postEvent("categoria.upsert", {
      id,
      nome,
      tipo
    });
  }

  async deleteCategory(id: string) {
    return this.postEvent("categoria.delete", { id });
  }

  async createSubcategory(parent_id: string, nome: string) {
    return this.postEvent("subcategoria.upsert", {
      parent_id,
      nome
    });
  }

  async updateSubcategory(id: string, parent_id: string, nome: string) {
    return this.postEvent("subcategoria.upsert", {
      id,
      parent_id,
      nome
    });
  }

  async deleteSubcategory(id: string) {
    return this.postEvent("subcategoria.delete", { id });
  }
}

// Create a default instance
export const financeiroSDK = new FinanceiroSDK({ tenantId: "obsidian" });
export const apiClient = financeiroSDK; // For backwards compatibility

export default FinanceiroSDK;