import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, TrendingUp, TrendingDown, Wallet, Loader2, ArrowUpCircle, ArrowDownCircle, Activity, AlertCircle, Info } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { apiClient } from "@/lib/financeiro-sdk";
import { ValueDisplay } from "@/components/ValueDisplay";
import { useToast } from "@/hooks/use-toast";

interface ProjecaoItem {
  type: 'credito' | 'debito';
  descricao: string;
  valor: number;
  origem?: string;
  referencia?: string;
  mes: string;
  conta: string;
}

interface ProjecaoMes {
  month: string;
  entradas: number;
  saidas: number;
  saldo_inicial: number;
  saldo_final: number;
  items: Omit<ProjecaoItem, 'mes' | 'conta'>[];
}

interface ProjecaoConta {
  account: { id: string; nome: string; tipo: string; saldo_inicial: number };
  saldo_atual: number;
  months: ProjecaoMes[];
}

interface ProjecaoResponse {
  accounts: ProjecaoConta[];
  consolidated: { months: ProjecaoMes[] };
}

const ProjecaoDetalhada: React.FC = () => {
  const { accounts } = useAccounts();
  const { toast } = useToast();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [projecao, setProjecao] = useState<ProjecaoResponse | null>(null);

  const fetchProjecao = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = `/projecao?months=${months}${accountId ? `&account_id=${accountId}` : ""}`;
      const result = await apiClient.http(url, { method: "GET" });
      setProjecao(result as ProjecaoResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao gerar projeção", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [months, accountId, toast]);

  useEffect(() => { fetchProjecao(); }, [fetchProjecao]);

  // Consolidar TODAS as transações em uma lista única
  const getAllTransactions = (): ProjecaoItem[] => {
    if (!projecao) return [];

    const allTrans: ProjecaoItem[] = [];

    if (accountId) {
      const conta = projecao.accounts.find(a => a.account.id === accountId);
      if (conta) {
        conta.months.forEach(mes => {
          mes.items.forEach(item => {
            allTrans.push({ ...item, mes: mes.month, conta: conta.account.nome });
          });
        });
      }
    } else {
      projecao.accounts.forEach(conta => {
        conta.months.forEach(mes => {
          mes.items.forEach(item => {
            allTrans.push({ ...item, mes: mes.month, conta: conta.account.nome });
          });
        });
      });
    }

    return allTrans.sort((a, b) => a.mes.localeCompare(b.mes));
  };

  const allTransactions = getAllTransactions();

  const totais = allTransactions.reduce(
    (acc, t) => {
      if (t.type === 'credito') acc.entradas += t.valor;
      else acc.saidas += t.valor;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  const saldoAtual = accountId
    ? projecao?.accounts.find(a => a.account.id === accountId)?.saldo_atual || 0
    : projecao?.accounts.reduce((sum: number, a: ProjecaoConta) => sum + a.saldo_atual, 0) || 0;

  const saldoFinal = saldoAtual + totais.entradas - totais.saidas;

  const transactionsByMonth = allTransactions.reduce((acc, t) => {
    if (!acc[t.mes]) acc[t.mes] = [];
    acc[t.mes].push(t);
    return acc;
  }, {} as Record<string, ProjecaoItem[]>);

  const accountName = accountId ? projecao?.accounts.find(a => a.account.id === accountId)?.account.nome : 'Consolidado';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Projeção de Caixa Detalhada</h1>
          </div>
          <p className="text-muted-foreground">
            Visualize débitos, créditos, recorrências e faturas previstas
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Conta</label>
                <Select onValueChange={v => setAccountId(v === 'all' ? null : v)} value={accountId || 'all'}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Todas as contas (Consolidado)
                      </div>
                    </SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select onValueChange={v => setMonths(Number(v))} value={String(months)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchProjecao} disabled={loading} size="lg" className="h-11 sm:mt-7">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculando...</> : <><Activity className="w-4 h-4 mr-2" />Atualizar</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-20 flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Calculando projeção...</p>
            </CardContent>
          </Card>
        ) : projecao ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Saldo Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <ValueDisplay value={saldoAtual} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Posição hoje</p>
                </CardContent>
              </Card>

              <Card className="border-2 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                    Total Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    <ValueDisplay value={totais.entradas} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{months} meses</p>
                </CardContent>
              </Card>

              <Card className="border-2 bg-red-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    Total Saídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    <ValueDisplay value={totais.saidas} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{months} meses</p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${saldoFinal >= 0 ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    {saldoFinal >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    Saldo Final
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <ValueDisplay value={saldoFinal} size="lg" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Após {months} meses</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Todas as Movimentações Previstas</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{allTransactions.length} transações</p>
              </CardHeader>
              <CardContent>
                {allTransactions.length > 0 ? (
                  <ScrollArea className="h-[600px] rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[120px]">Mês</TableHead>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          {!accountId && <TableHead className="w-[150px]">Conta</TableHead>}
                          <TableHead className="w-[150px] text-right">Valor</TableHead>
                          <TableHead className="w-[150px]">Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(transactionsByMonth).map(([mes, items]) => {
                          const monthData = accountId
                            ? projecao?.accounts.find(a => a.account.id === accountId)?.months.find(m => m.month === mes)
                            : projecao?.consolidated?.months.find(m => m.month === mes);
                          
                          return (
                          <React.Fragment key={mes}>
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={accountId ? 5 : 6} className="font-bold py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    {new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    <Badge variant="outline" className="ml-2">{items.length}</Badge>
                                  </div>
                                  {monthData && (
                                    <div className="flex items-center gap-4 text-sm font-normal">
                                      <div className="text-green-600 flex items-center gap-1">
                                        <ArrowUpCircle className="w-3 h-3" />
                                        <ValueDisplay value={monthData.entradas} size="sm" />
                                      </div>
                                      <div className="text-red-600 flex items-center gap-1">
                                        <ArrowDownCircle className="w-3 h-3" />
                                        <ValueDisplay value={monthData.saidas} size="sm" />
                                      </div>
                                      <div className={`font-semibold flex items-center gap-1 ${monthData.saldo_final >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        <span className="text-xs text-muted-foreground font-normal">Saldo:</span>
                                        <ValueDisplay value={monthData.saldo_final} size="sm" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {items.map((item, idx) => (
                              <TableRow key={`${mes}-${idx}`} className="hover:bg-muted/50">
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.type === 'credito' ? 'default' : 'destructive'}>
                                    {item.type === 'credito' ? <>< ArrowUpCircle className="w-3 h-3 mr-1" />Entrada</> : <><ArrowDownCircle className="w-3 h-3 mr-1" />Saída</>}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{item.descricao || 'Sem descrição'}</TableCell>
                                {!accountId && (
                                  <TableCell className="text-sm">
                                    <Wallet className="w-3 h-3 inline mr-1" />
                                    {item.conta}
                                  </TableCell>
                                )}
                                <TableCell className={`text-right font-semibold ${item.type === 'credito' ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.type === 'credito' ? '+' : '-'}
                                  <ValueDisplay value={item.valor} size="sm" />
                                </TableCell>
                                <TableCell>
                                  {item.origem?.startsWith('recorrencia:') && <Badge variant="outline">🔄 Recorrência</Badge>}
                                  {item.origem?.startsWith('fatura:') && <Badge variant="outline">💳 Fatura</Badge>}
                                  {item.origem === 'manual' && <Badge variant="outline">✍️ Manual</Badge>}
                                  {!item.origem && <Badge variant="outline">📝 Previsto</Badge>}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma movimentação prevista</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-20 text-center text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Clique em "Atualizar" para gerar a projeção</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProjecaoDetalhada;
