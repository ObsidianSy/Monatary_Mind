import { useMemo, useState, useCallback, useEffect } from "react";
import { EstoqueSDK, type EstoqueSDKOptions, type EstoqueFilters } from "@/lib/estoque-sdk";

// Hook para criar e memorizar o cliente do SDK
export function useEstoqueClient(opts: EstoqueSDKOptions) {
  const client = useMemo(() => {
    return new EstoqueSDK(opts);
  }, [opts.tenantId, opts.baseUrl, opts.apiKey, opts.timeoutMs]);
  
  return client;
}

// Hook para leitura de produtos
export function useProdutosEstoque(
  client: EstoqueSDK,
  filters: EstoqueFilters = {},
  deps: any[] = []
) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await client.getProdutos(filters);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Erro ao buscar produtos:`, error);
    } finally {
      setLoading(false);
    }
  }, [client, ...Object.values(filters), ...deps]);

  // Executar fetch ao montar e quando deps mudarem
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
}
