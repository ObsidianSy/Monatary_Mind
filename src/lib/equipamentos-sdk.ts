// equipamentos-sdk.ts
// SDK para integração com API de Equipamentos (Backend Local)

const DEFAULT_BASE = "http://localhost:3001/api";

function safeJson(text: string): any | undefined {
  try { return JSON.parse(text); } catch { return undefined; }
}

export interface EquipamentosSDKOptions {
  tenantId: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

export class EquipamentosSDK {
  private baseUrl: string;
  private tenantId: string;
  private token?: string;
  private timeoutMs: number;

  constructor(opts: EquipamentosSDKOptions) {
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

  async http(path: string, init: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    console.debug("🔍 HTTP Request:", init.method, url);
    console.debug("🔑 Headers:", init.headers);

    const res = await this.withTimeout(fetch(url, init));

    console.debug("📡 Response status:", res.status, res.statusText);

    const text = await res.text();
    console.debug("📄 Response body (raw):", text.substring(0, 200));

    const json = text ? safeJson(text) : undefined;

    if (!res.ok) {
      const msg = (json && (json.message || json.error || json.detail)) || `HTTP ${res.status} ${res.statusText}`;
      console.error("❌ HTTP Error:", msg);
      throw new Error(msg);
    }

    console.debug("✅ Parsed JSON:", json);
    return json ?? {};
  }  // ============ Métodos específicos de Equipamentos ============

  async getEquipamentos(filters: Record<string, any> = {}): Promise<any[]> {
    console.debug("🔍 Buscando equipamentos com filtros:", filters);

    const result = await this.http("/equipamentos", {
      method: "GET",
      headers: this.buildHeaders(),
    });

    console.debug(`✅ Equipamentos recebidos:`, result?.length || 0, "itens");
    return Array.isArray(result) ? result : [];
  }

  async getEquipamento(id: string): Promise<any> {
    return this.http(`/equipamentos/${id}`, {
      method: "GET",
      headers: this.buildHeaders(),
    });
  }

  async createEquipamento(equipamentoData: any): Promise<any> {
    console.log("� Criando equipamento:", equipamentoData);

    return this.http("/equipamentos", {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(equipamentoData),
    });
  }

  async updateEquipamento(id: string, equipamentoData: any): Promise<any> {
    console.log("📝 Atualizando equipamento:", id, equipamentoData);

    return this.http(`/equipamentos/${id}`, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify(equipamentoData),
    });
  }

  async deleteEquipamento(id: string): Promise<void> {
    console.log("🗑️ Deletando equipamento:", id);
    console.log("📡 tenant_id:", this.tenantId);
    console.log("🌐 Endpoint:", `${this.baseUrl}/equipamentos/${id}`);

    await this.http(`/equipamentos/${id}`, {
      method: "DELETE",
      headers: this.buildHeaders(),
    });

    console.log("✅ Equipamento deletado com sucesso");
  }
}

export default EquipamentosSDK;
