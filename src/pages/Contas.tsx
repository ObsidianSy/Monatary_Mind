import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAccounts, Account } from "@/hooks/useAccounts";
import NewAccountModal from "@/components/NewAccountModal";
import { QuickActions } from "@/components/QuickActions";
import { ActionableCard } from "@/components/ActionableCard";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { useToast } from "@/hooks/use-toast";
import { ValueDisplay } from "@/components/ValueDisplay";

const tipoLabels = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  fundo_caixa: "Fundo Caixa",
  cartao_credito: "Cartão de Crédito",
  caixa: "Caixa (Dinheiro em Espécie)",
  conta_pagamento: "Conta de Pagamento",
  investimento: "Investimentos"
};

const tipoColors = {
  corrente: "bg-blue-500/10 text-blue-700 border-blue-200",
  poupanca: "bg-green-500/10 text-green-700 border-green-200",
  fundo_caixa: "bg-teal-500/10 text-teal-700 border-teal-200",
  cartao_credito: "bg-red-500/10 text-red-700 border-red-200",
  caixa: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  conta_pagamento: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  investimento: "bg-purple-500/10 text-purple-700 border-purple-200"
};

export default function Contas() {
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const { accounts, activeAccounts, loading, error, refresh } = useAccounts();
  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "A conta foi removida com sucesso.",
      });
      refresh();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await postEvent("conta.delete", { id: accountId });
    } catch (error) {
      // Error handled by hook
    }
  };


  const getAccountIcon = (tipo: Account['tipo']) => {
    switch (tipo) {
      case 'corrente':
        return <Wallet className="w-5 h-5" />;
      case 'poupanca':
        return <TrendingUp className="w-5 h-5" />;
      case 'fundo_caixa':
        return <Wallet className="w-5 h-5" />;
      case 'cartao_credito':
        return <Wallet className="w-5 h-5" />;
      case 'caixa':
        return <Wallet className="w-5 h-5" />;
      case 'conta_pagamento':
        return <Wallet className="w-5 h-5" />;
      case 'investimento':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando contas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar contas: {error.message}</p>
          <Button onClick={refresh} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const totalSaldo = activeAccounts.reduce((sum, account) => {
    const saldo = typeof account.saldo_inicial === 'string' ? parseFloat(account.saldo_inicial) : account.saldo_inicial;
    return sum + (saldo || 0);
  }, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas financeiras
          </p>
        </div>
        <Button onClick={() => setShowNewAccountModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionableCard
          title="Total de Contas"
          value={activeAccounts.length}
          icon={<Wallet className="w-5 h-5" />}
          status="info"
        />
        <ActionableCard
          title="Saldo Total"
          value={totalSaldo}
          icon={<TrendingUp className="w-5 h-5" />}
          status={totalSaldo >= 0 ? "success" : "error"}
          actions={[
            {
              label: "Nova Receita",
              icon: <ArrowUpRight className="w-4 h-4" />,
              onClick: () => {},
              variant: "outline"
            }
          ]}
        />
        <ActionableCard
          title="Contas Ativas"
          value={activeAccounts.length}
          icon={<TrendingUp className="w-5 h-5" />}
          status="default"
          actions={[
            {
              label: "Nova Conta",
              icon: <Plus className="w-4 h-4" />,
              onClick: () => setShowNewAccountModal(true),
              variant: "outline"
            }
          ]}
        />
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Contas</CardTitle>
          <CardDescription>
            Lista de todas as suas contas financeiras
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAccounts.length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhuma conta encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando sua primeira conta financeira.
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowNewAccountModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Conta
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo Inicial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getAccountIcon(account.tipo)}
                        </div>
                        <div>
                          <div className="font-medium">{account.nome}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={tipoColors[account.tipo] || tipoColors.corrente}
                      >
                        {tipoLabels[account.tipo] || account.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ValueDisplay 
                        value={account.saldo_inicial}
                        showTrend
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        Ativa
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implementar edição de conta
                            toast({
                              title: "Em desenvolvimento",
                              description: "Funcionalidade de edição será implementada em breve.",
                            });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={posting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a conta "{account.nome}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAccount(account.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuickActions context="accounts" onRefresh={refresh} />

      <NewAccountModal
        open={showNewAccountModal}
        onOpenChange={setShowNewAccountModal}
        onSuccess={refresh}
      />
    </div>
  );
}