// useFinanceiro.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FinanceiroSDK from "@/lib/financeiro-sdk";

export function useFinanceiroClient(opts: {
  tenantId: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}) {
  const client = useMemo(
    () => new FinanceiroSDK(opts),
    [opts?.tenantId, opts?.baseUrl, opts?.apiKey, opts?.timeoutMs]
  );
  return client;
}

type ReadResource =
  | "transacao"
  | "recorrencia"
  | "cartao"
  | "fatura"
  | "fatura_item"
  | "fluxo_30d"
  | "saldo_conta"
  | "conta"
  | "categoria";

export function useFinanceiroRead<T = any>(
  client: FinanceiroSDK,
  resource: ReadResource,
  filters: Record<string, any>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await client.read(resource, filters);
      if (!ac.signal.aborted) setData(res as T[]);
    } catch (e: any) {
      if (!ac.signal.aborted) setError(e);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [client, resource, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
    
    // Listen for global finance data changes
    const handleDataChange = () => {
      fetchData();
    };
    
    window.addEventListener('finance:data-changed', handleDataChange);
    
    return () => {
      abortRef.current?.abort();
      window.removeEventListener('finance:data-changed', handleDataChange);
    };
  }, [fetchData, ...deps]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  return { data, loading, error, refresh };
}

export function usePostEvent(
  client: FinanceiroSDK,
  opts?: { onSuccess?: (res: any) => void; onError?: (err: Error) => void }
) {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);

  const postEvent = useCallback(
    async (eventType: string, payload: any, options?: { eventId?: string; occurredAt?: string }) => {
      setPosting(true);
      setError(null);
      try {
        // Generate event_id if not provided
        const eventId = options?.eventId || crypto.randomUUID();
        
        // The SDK will handle the standardized payload format internally
        
        const res = await client.postEvent(eventType as any, payload, { 
          eventId,
          occurredAt: options?.occurredAt 
        });
        setResult(res);
        opts?.onSuccess?.(res);
        return res;
      } catch (e: any) {
        setError(e);
        opts?.onError?.(e);
        throw e;
      } finally {
        setPosting(false);
      }
    },
    [client, opts?.onSuccess, opts?.onError]
  );

  return { postEvent, posting, error, result };
}