import { useMemo, useState, useCallback } from "react";
import { EquipamentosSDK, type EquipamentosSDKOptions } from "@/lib/equipamentos-sdk";

// Hook para criar e memorizar o cliente do SDK
export function useEquipamentosClient(opts: EquipamentosSDKOptions) {
  const client = useMemo(() => {
    return new EquipamentosSDK(opts);
  }, [opts.tenantId, opts.baseUrl, opts.apiKey, opts.timeoutMs]);
  
  return client;
}

// Hook para leitura de dados
export function useEquipamentosRead<T = any>(
  client: EquipamentosSDK,
  resource: string,
  filters: Record<string, any> = {},
  deps: any[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await client.read(resource, filters);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Erro ao buscar ${resource}:`, error);
    } finally {
      setLoading(false);
    }
  }, [client, resource, ...Object.values(filters), ...deps]);

  // Executar fetch ao montar e quando deps mudarem
  useMemo(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
}

// Hook para postar eventos
export function usePostEquipamentoEvent(
  client: EquipamentosSDK,
  opts?: {
    onSuccess?: (res: any) => void;
    onError?: (err: Error) => void;
  }
) {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);

  const postEvent = useCallback(
    async (
      eventType: string,
      payload: any,
      options?: { eventId?: string; occurredAt?: string }
    ) => {
      try {
        setPosting(true);
        setError(null);
        const res = await client.postEvent(eventType, payload, options);
        setResult(res);
        if (opts?.onSuccess) opts.onSuccess(res);
        return res;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        if (opts?.onError) opts.onError(error);
        throw error;
      } finally {
        setPosting(false);
      }
    },
    [client, opts?.onSuccess, opts?.onError]
  );

  return { postEvent, posting, error, result };
}
