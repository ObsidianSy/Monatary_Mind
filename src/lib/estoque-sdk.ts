// estoque-sdk.ts
// SDK para integração com API de Estoque E-commerce

const DEFAULT_BASE = "https://docker-n8n-webhook.q4xusi.easypanel.host";

function safeJson(text: string): any | undefined {
  try { return JSON.parse(text); } catch { return undefined; }
}

export interface EstoqueSDKOptions {
  tenantId: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface ProdutoEstoque {
  id: string;
  tenant_id: string;
  sku: string;
  nome: string;
  categoria?: string;
  preco_venda: number;
  preco_custo?: number;
  quantidade_disponivel: number;
  quantidade_reservada?: number;
  estoque_minimo?: number;
  is_ativo: boolean;
  is_kit?: boolean;
  variante?: string;
  imagem_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface EstoqueFilters {
  q?: string;              // busca por SKU ou nome (ILIKE)
  sku?: string;            // filtra SKU exato (prioridade > q)
  only_active?: boolean;   // só produtos ativos (default true)
  include_kits?: boolean;  // incluir kits? (default true)
  updated_since?: string;  // ISO (yyyy-mm-dd)
  page?: number;           // default 1
  page_size?: number;      // 1..500 (default 100)
}

export class EstoqueSDK {
  private baseUrl: string;
  private tenantId: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(opts: EstoqueSDKOptions) {
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
      setTimeout(() => rej(new Error("Tempo de requisição excedido")), this.timeoutMs)
    );
    return Promise.race([promise, t]);
  }

  async http(url: string, init: RequestInit): Promise<any> {
    const res = await this.withTimeout(fetch(url, init));
    const text = await res.text();
    const json = text ? safeJson(text) : undefined;
    if (!res.ok) {
      const msg = (json && (json.message || json.error || json.detail)) || `HTTP ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return json ?? {};
  }

  // GET /webhook/estoque_ecomm
  async getProdutos(filters: EstoqueFilters = {}): Promise<ProdutoEstoque[]> {
    const params = new URLSearchParams();
    
    params.set("tenant_id", this.tenantId);
    
    // Filtros opcionais
    if (filters.q) params.set("q", filters.q);
    if (filters.sku) params.set("sku", filters.sku);
    if (filters.only_active !== undefined) params.set("only_active", String(filters.only_active));
    if (filters.include_kits !== undefined) params.set("include_kits", String(filters.include_kits));
    if (filters.updated_since) params.set("updated_since", filters.updated_since);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));

    const url = `${this.baseUrl}/webhook/estoque_ecomm?${params.toString()}`;
    console.debug("🔍 Buscando produtos do estoque:", url);
    
    const result = await this.http(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });
    
    console.debug(`✅ Produtos:`, result?.length || 0, "itens");
    return result;
  }
}

// Create a default instance
export const estoqueSDK = new EstoqueSDK({ 
  tenantId: import.meta.env.VITE_FINANCEIRO_TENANT_ID || "OPUS" 
});

export default EstoqueSDK;
