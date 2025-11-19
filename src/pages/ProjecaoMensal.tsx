import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/financeiro-sdk";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Helper para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper para exportar CSV
type CsvRow = Record<string, string | number>;
const exportToCSV = (data: CsvRow[], filename: string) => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

interface ProjecaoData {
  meses: string[];
  receitas: { categoria: string; valores: number[] }[];
  despesas: { categoria: string; valores: number[] }[];
  totaisReceitas: number[];
  totaisDespesas: number[];
  resultadoMensal: number[];
  resultadoAcumulado: number[];
}

const ProjecaoMensal: React.FC = () => {
  const { toast } = useToast();
  const [months, setMonths] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjecaoData | null>(null);

  const fetchProjecao = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.http(`/projecao-mensal?months=${months}`, { method: "GET" });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao carregar projeção", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [months, toast]);

  useEffect(() => {
    fetchProjecao();
  }, [fetchProjecao]);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Card único igual estilo Demonstrativo Mensal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projeção Mensal {new Date().getFullYear()}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Receitas, despesas e resultado projetado por mês</p>
            </div>
            <div className="flex gap-2">
              <Select value={String(months)} onValueChange={(v) => setMonths(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={fetchProjecao}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Atualizar'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (!data) return;
                  const rows = [
                    ...data.receitas.map((r) => ({
                      categoria: r.categoria,
                      ...Object.fromEntries(data.meses.map((m: string, i: number) => [m, r.valores[i]]))
                    })),
                    ...data.despesas.map((d) => ({
                      categoria: d.categoria,
                      ...Object.fromEntries(data.meses.map((m: string, i: number) => [m, d.valores[i]]))
                    }))
                  ];
                  exportToCSV(rows, `projecao_mensal_${months}m`);
                }}
                disabled={loading || !data}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-96 bg-muted rounded-lg animate-pulse flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : data ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left p-2 font-semibold sticky left-0 bg-background z-10 min-w-[160px]">Categoria</th>
                      {data.meses.map((mes: string, idx: number) => (
                        <th key={idx} className="text-right p-2 font-semibold min-w-[90px]">{mes}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* RECEITAS */}
                    <tr className="bg-success/5">
                      <td className="p-2 font-bold sticky left-0 bg-success/5 z-10">RECEITAS</td>
                      <td colSpan={months}></td>
                    </tr>
                    {data.receitas.filter((r) => r.valores.some((v: number) => v > 0)).map((linha, idx: number) => (
                      <tr key={`rec-${idx}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-2 sticky left-0 bg-background z-10">{linha.categoria}</td>
                        {linha.valores.map((val: number, i: number) => (
                          <td key={i} className="text-right p-2 text-success font-medium">
                            {val > 0 ? formatCurrency(val) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-success/10 font-bold border-t-2 border-success">
                      <td className="p-2 sticky left-0 bg-success/10 z-10">TOTAL RECEITAS</td>
                      {data.totaisReceitas.map((val: number, i: number) => (
                        <td key={i} className="text-right p-2 text-success">{formatCurrency(val)}</td>
                      ))}
                    </tr>

                    {/* DESPESAS */}
                    <tr className="bg-destructive/5 border-t-4">
                      <td className="p-2 font-bold sticky left-0 bg-destructive/5 z-10">DESPESAS</td>
                      <td colSpan={months}></td>
                    </tr>
                    {data.despesas.filter((d) => d.valores.some((v: number) => v > 0)).map((linha, idx: number) => (
                      <tr key={`desp-${idx}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-2 sticky left-0 bg-background z-10">{linha.categoria}</td>
                        {linha.valores.map((val: number, i: number) => (
                          <td key={i} className="text-right p-2 text-destructive font-medium">
                            {val > 0 ? formatCurrency(val) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-destructive/10 font-bold border-t-2 border-destructive">
                      <td className="p-2 sticky left-0 bg-destructive/10 z-10">TOTAL DESPESAS</td>
                      {data.totaisDespesas.map((val: number, i: number) => (
                        <td key={i} className="text-right p-2 text-destructive">{formatCurrency(val)}</td>
                      ))}
                    </tr>

                    {/* RESULTADO MENSAL */}
                    <tr className="bg-primary/10 font-bold border-t-2 border-primary">
                      <td className="p-2 sticky left-0 bg-primary/10 z-10">RESULTADO MENSAL</td>
                      {data.resultadoMensal.map((val: number, i: number) => (
                        <td key={i} className={`text-right p-2 ${val >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(val)}</td>
                      ))}
                    </tr>

                    {/* RESULTADO ACUMULADO */}
                    <tr className="bg-accent/10 font-bold border-t-2 border-accent">
                      <td className="p-2 sticky left-0 bg-accent/10 z-10">RESULTADO ACUMULADO</td>
                      {data.resultadoAcumulado.map((val: number, i: number) => (
                        <td key={i} className={`text-right p-2 ${val >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(val)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Clique em "Atualizar" para carregar a projeção</p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default ProjecaoMensal;
