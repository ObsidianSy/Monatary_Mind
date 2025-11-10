// ExemploComponent.tsx
import React from "react";
import { useFinanceiroClient, useFinanceiroRead, usePostEvent } from "../hooks/useFinanceiro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExemploFinanceiro() {
  const { toast } = useToast();
  
  // 1) Instância do SDK (ajuste tenantId)
  const sdk = useFinanceiroClient({ tenantId: "obsidian" });

  // 2) Leitura: transações do mês
  const { data: transacoes, loading, error, refresh } = useFinanceiroRead(
    sdk,
    "transacao",
    { from: "2025-09-01", to: "2025-09-30", limit: 50 },
    []
  );

  // 3) Escrita: criar uma transação de crédito
  const { postEvent, posting } = usePostEvent(sdk, {
    onSuccess: (res) => {
      toast({
        title: "Transação criada",
        description: "Crédito adicionado com sucesso!",
      });
      refresh();
    },
    onError: (err) => {
      toast({
        title: "Erro ao criar transação",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  async function criarCredito() {
    await postEvent("transacao.upsert", {
      conta_id: "UUID-CONTA",
      categoria_id: "UUID-CATEGORIA",
      tipo: "credito",
      valor: 120.5,
      data_transacao: "2025-09-09",
      descricao: "Venda Shopee #999",
      status: "liquidado",
      origem: "pix"
    });
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo SDK Financeiro</CardTitle>
          <CardDescription>
            Demonstração do uso do SDK com hooks React
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={criarCredito} 
              disabled={posting}
              className="bg-gradient-primary"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar Crédito
            </Button>
            <Button onClick={refresh} variant="outline" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Recarregar
            </Button>
          </div>

          {loading && !transacoes && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Carregando transações...</span>
            </div>
          )}
          
          {error && (
            <div className="p-4 border border-destructive/20 rounded-md bg-destructive/10">
              <p className="text-destructive font-medium">Erro:</p>
              <p className="text-sm text-muted-foreground">{String(error.message)}</p>
            </div>
          )}

          {transacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transações ({transacoes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {transacoes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma transação encontrada
                    </p>
                  ) : (
                    transacoes.map((transacao, index) => (
                      <div 
                        key={transacao.id || index}
                        className="p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{transacao.descricao}</p>
                            <p className="text-sm text-muted-foreground">
                              {transacao.data_transacao} • {transacao.tipo} • {transacao.status}
                            </p>
                          </div>
                          <div className={`font-bold ${
                            transacao.tipo === 'credito' ? 'text-success' : 
                            transacao.tipo === 'debito' ? 'text-destructive' : 
                            'text-primary'
                          }`}>
                            {transacao.tipo === 'credito' ? '+' : transacao.tipo === 'debito' ? '-' : ''}
                            R$ {Number(transacao.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}