import { useCallback, useEffect, useState } from "react";
import { useFinanceiroClient, useFinanceiroRead } from "./useFinanceiro";

export interface Parcela {
  id: string;
  cartao_apelido: string;
  competencia: string;
  vencimento: string;
  descricao: string;
  categoria_id: string;
  valor: number;
  status: "pendente" | "paga" | "atrasada";
  parcela_atual?: number;
  total_parcelas?: number;
  subcategoria: string; // For compatibility with existing interface
}

export function useParcelas() {
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Para este MVP, vamos simular parcelas baseadas nos itens de fatura
  // Em implementação futura, haverá endpoint específico para parcelas
  const { data: invoiceItems, loading: itemsLoading, refresh: refreshItems } = useFinanceiroRead<any>(
    client,
    "fatura_item",
    { limit: 100 },
    []
  );

  const loadParcelas = useCallback(async () => {
    if (itemsLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar cartões e faturas para relacionar com itens
      const cards = await client.read("cartao", { limit: 100 });
      const invoices = await client.read("fatura", { limit: 100 });
      
      // Filtrar apenas itens do mês atual ou futuros
      const currentMonth = new Date().toISOString().slice(0, 7);
      const relevantItems = (invoiceItems || []).filter((item: any) => {
        const itemCompetencia = String(item.competencia || "");
        return itemCompetencia >= currentMonth;
      });
      
      const processedParcelas: Parcela[] = relevantItems.map((item: any) => {
        const invoice = invoices.find((inv: any) => inv.id === item.fatura_id);
        const card = cards.find((card: any) => card.id === (invoice?.cartao_id || item.cartao_id));
        
        // Mapear campos com múltiplos fallbacks possíveis
        const parcelaNumero = item.parcela_numero ?? item.numero_parcela ?? item.parcela_atual ?? null;
        const parcelaTotal = item.parcela_total ?? item.total_parcelas ?? null;
        
        // Extrair da descrição se necessário (ex: "Compra (2/10)")
        let extractedParcela = { numero: parcelaNumero, total: parcelaTotal };
        if (!parcelaNumero && item.descricao) {
          const match = item.descricao.match(/\((\d+)\/(\d+)\)/);
          if (match) {
            extractedParcela = { numero: parseInt(match[1]), total: parseInt(match[2]) };
          }
        }
        
        console.log("DEBUG useParcelas - Item:", {
          id: item.id.substring(0, 8),
          descricao: item.descricao,
          campos_raw: {
            parcela_numero: item.parcela_numero,
            numero_parcela: item.numero_parcela,
            parcela_atual: item.parcela_atual,
            parcela_total: item.parcela_total,
            total_parcelas: item.total_parcelas
          },
          extraido_descricao: extractedParcela,
          final: {
            numero: extractedParcela.numero ?? parcelaNumero,
            total: extractedParcela.total ?? parcelaTotal
          }
        });
        
        return {
          id: item.id,
          cartao_apelido: card?.apelido || "Cartão",
          competencia: invoice?.competencia || item.competencia || "",
          vencimento: invoice?.data_vencimento || "",
          descricao: item.descricao,
          categoria_id: item.subcategoria_id || item.categoria_id || "",
          valor: Number(item.valor || 0),
          status: invoice?.status === "paga" ? "paga" : "pendente",
          parcela_atual: extractedParcela.numero ?? parcelaNumero,
          total_parcelas: extractedParcela.total ?? parcelaTotal,
          subcategoria: card?.apelido || "Cartão",
        };
      });

      // Ordenar por vencimento mais recente primeiro (DESC)
      const sortedParcelas = processedParcelas.sort((a, b) => {
        const dateA = new Date(a.vencimento || a.competencia);
        const dateB = new Date(b.vencimento || b.competencia);
        return dateB.getTime() - dateA.getTime(); // DESC
      });

      setParcelas(sortedParcelas);
    } catch (err: any) {
      setError(err);
      console.error("Error loading parcelas:", err);
    } finally {
      setLoading(false);
    }
  }, [invoiceItems, itemsLoading, client]);

  useEffect(() => {
    loadParcelas();
  }, [loadParcelas]);

  const refresh = useCallback(async () => {
    await refreshItems();
    await loadParcelas();
  }, [refreshItems, loadParcelas]);

  return {
    parcelas,
    loading: itemsLoading || loading,
    error,
    refresh
  };
}