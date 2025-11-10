// equipamentos-sdk.ts
// SDK para integração com API de Equipamentos

const DEFAULT_BASE = "https://docker-n8n-webhook.q4xusi.easypanel.host";

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

export interface EquipamentosSDKOptions {
  tenantId: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class EquipamentosSDK {
  private baseUrl: string;
  private tenantId: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(opts: EquipamentosSDKOptions) {
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

  async http(path: string, init: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.withTimeout(fetch(url, init));
    const text = await res.text();
    const json = text ? safeJson(text) : undefined;
    if (!res.ok) {
      const msg = (json && (json.message || json.error || json.detail)) || `HTTP ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return json ?? {};
  }

  // --------- POST /events ----------
  async postEvent(
    eventType: string, 
    payload: any, 
    options?: { eventId?: string; occurredAt?: string }
  ): Promise<any> {
    const body = {
      event_id: options?.eventId || uuidv4(),
      event_type: eventType,
      tenant_id: this.tenantId,
      payload: payload || {},
      occurred_at: options?.occurredAt || new Date().toISOString(),
    };

    return this.http("/webhook/equipamentos/events", {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
  }

  // --------- GET /read -------------
  async read(resource: string, filters: Record<string, any> = {}): Promise<any[]> {
    const params = new URLSearchParams();

    params.set("tenant_id", this.tenantId);
    params.set("resource", resource);

    // Filtros específicos
    for (const [key, value] of Object.entries(filters)) {
      if (value != null) {
        params.set(key, String(value));
      }
    }

    const url = `${this.baseUrl}/webhook/equipamentos/read?${params.toString()}`;
    console.debug("🔍 Buscando equipamentos:", url);
    
    const result = await this.http(url.replace(this.baseUrl, ""), {
      method: "GET",
      headers: this.buildHeaders(),
    });
    
    console.debug(`✅ ${resource}:`, result?.length || 0, "itens");
    return result;
  }

  // ============ Métodos específicos de Equipamentos ============
  
  async getEquipamentos(filters: Record<string, any> = {}) {
    return this.read("equipamento", filters);
  }

  async createEquipamento(equipamentoData: any) {
    return this.postEvent("equipamento.upsert", equipamentoData);
  }

  async updateEquipamento(equipamentoData: any) {
    return this.postEvent("equipamento.upsert", equipamentoData);
  }

  async deleteEquipamento(id: string) {
    return this.postEvent("equipamento.delete", { id });
  }

  async getManutencoes(equipamentoId?: string) {
    const filters = equipamentoId ? { equipamento_id: equipamentoId } : {};
    return this.read("manutencao", filters);
  }

  async createManutencao(manutencaoData: any) {
    return this.postEvent("manutencao.upsert", manutencaoData);
  }

  async getMovimentacoes(equipamentoId?: string) {
    const filters = equipamentoId ? { equipamento_id: equipamentoId } : {};
    return this.read("movimentacao", filters);
  }

  async createMovimentacao(movimentacaoData: any) {
    return this.postEvent("movimentacao.upsert", movimentacaoData);
  }

  async getDepreciacoes(equipamentoId?: string) {
    const filters = equipamentoId ? { equipamento_id: equipamentoId } : {};
    return this.read("depreciacao", filters);
  }

  async createDepreciacao(depreciacaoData: any) {
    return this.postEvent("depreciacao.upsert", depreciacaoData);
  }
}

// Create a default instance
export const equipamentosSDK = new EquipamentosSDK({ 
  tenantId: import.meta.env.VITE_FINANCEIRO_TENANT_ID || "obsidian" 
});

export default EquipamentosSDK;
