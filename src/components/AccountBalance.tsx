import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { ValueDisplay } from "@/components/ValueDisplay";
import NewAccountModal from "./NewAccountModal";

const accountTypeLabels = {
  corrente: "Conta Corrente",
  poupanca: "Poupança", 
  carteira: "Carteira",
  caixa: "Caixa",
  fundo_caixa: "Fundo de Caixa",
  cartao_credito: "Cartão de Crédito",
  conta_pagamento: "Conta Pagamento",
  investimento: "Investimentos"
} as const;

const accountTypeColors = {
  corrente: "bg-primary/10 text-primary border-primary/20",
  poupanca: "bg-success/10 text-success border-success/20",
  carteira: "bg-warning/10 text-warning border-warning/20",
  caixa: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  fundo_caixa: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  cartao_credito: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  conta_pagamento: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
  investimento: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
} as const;

export function AccountBalance() {
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const { activeAccounts, loading } = useAccounts();
  const { isValuesCensored, toggleCensorship } = usePrivacy();
  
  const totalBalance = activeAccounts.reduce((sum, account) => {
    const balance = typeof account.saldo_inicial === 'string' ? parseFloat(account.saldo_inicial) : account.saldo_inicial;
    return sum + (balance || 0);
  }, 0);


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Saldos das Contas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded-lg animate-pulse"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Saldos das Contas</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCensorship}
              className="text-muted-foreground hover:text-foreground"
            >
              {isValuesCensored ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-primary"
              onClick={() => setIsNewAccountModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova Conta
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-gradient-card border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Saldo Total</span>
            <ValueDisplay value={totalBalance} size="xl" className="text-primary" />
          </div>
        </div>
        
        {activeAccounts.length > 0 ? (
          <div className="space-y-3">
            {activeAccounts.map((account) => {
              const balance = typeof account.saldo_inicial === 'string' ? parseFloat(account.saldo_inicial) : account.saldo_inicial;
              return (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.nome}</span>
                        <Badge variant="outline" className={accountTypeColors[account.tipo]}>
                          {accountTypeLabels[account.tipo]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <ValueDisplay 
                      value={balance} 
                      size="md" 
                      showTrend 
                      className="font-semibold"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta cadastrada</p>
            <Button 
              size="sm" 
              className="mt-4"
              onClick={() => setIsNewAccountModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Primeira Conta
            </Button>
          </div>
        )}
      </CardContent>

      <NewAccountModal
        open={isNewAccountModalOpen}
        onOpenChange={setIsNewAccountModalOpen}
        onSuccess={() => setIsNewAccountModalOpen(false)}
      />
    </Card>
  );
}