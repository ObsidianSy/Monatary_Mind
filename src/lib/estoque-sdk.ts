// estoque-sdk.ts
// SDK para integração com API de Estoque (Backend Local)

const DEFAULT_BASE = "http://localhost:3001/api";

function safeJson(text: string): any | undefined {
  try { return JSON.parse(text); } catch { return undefined; }
}

export interface EstoqueSDKOptions {
  tenantId: string;
  baseUrl?: string;
  token?: string;
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
  private token?: string;
  private timeoutMs: number;

  constructor(opts: EstoqueSDKOptions) {
    if (!opts || !opts.tenantId) throw new Error("tenantId é obrigatório");
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
    this.tenantId = opts.tenantId;
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 20000;
  }

  buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(extra || {})
    };

    // Usar token JWT se disponível, senão pegar do localStorage
    const authToken = this.token || localStorage.getItem('token');
    if (authToken) {
      h.Authorization = `Bearer ${authToken}`;
    }

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

  // GET /api/produtos
  async getProdutos(filters: EstoqueFilters = {}): Promise<ProdutoEstoque[]> {
    console.debug("🔍 Buscando produtos do estoque");

    const result = await this.http(`${this.baseUrl}/produtos`, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    console.debug(`✅ Produtos:`, result?.length || 0, "itens");
    return Array.isArray(result) ? result : [];
  }

  async createProduto(produtoData: any): Promise<any> {
    return this.http(`${this.baseUrl}/produtos`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(produtoData),
    });
  }

  async updateProduto(id: string, produtoData: any): Promise<any> {
    return this.http(`${this.baseUrl}/produtos/${id}`, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify(produtoData),
    });
  }

  async deleteProduto(id: string): Promise<void> {
    await this.http(`${this.baseUrl}/produtos/${id}`, {
      method: "DELETE",
      headers: this.buildHeaders(),
    });
  }
}

export default EstoqueSDK;
