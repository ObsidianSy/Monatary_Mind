import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  CreditCard, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Target,
  TrendingUp,
  Wallet
} from "lucide-react";
import { useState } from "react";
import NewTransactionModal from "./NewTransactionModal";
import NewCardModal from "./NewCardModal";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  context?: "dashboard" | "accounts" | "cards" | "transactions";
  contextData?: any;
  onRefresh?: () => void;
}

export function QuickActions({ context = "dashboard", contextData, onRefresh }: QuickActionsProps) {
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const navigate = useNavigate();

  const getContextActions = () => {
    switch (context) {
      case "cards":
        return [
          {
            icon: Plus,
            label: "Nova Compra",
            description: "Registrar compra no cartão",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "default" as const,
            disabled: false
          },
          {
            icon: Receipt,
            label: "Pagar Fatura",
            description: "Quitar fatura pendente",
            onClick: () => {}, // Will be handled by parent
            variant: "secondary" as const,
            disabled: !contextData?.hasUnpaidInvoice
          },
          {
            icon: CreditCard,
            label: "Novo Cartão",
            description: "Adicionar cartão",
            onClick: () => setIsNewCardModalOpen(true),
            variant: "outline" as const,
            disabled: false
          },
          {
            icon: Calendar,
            label: "Ver Faturas",
            description: "Histórico completo",
            onClick: () => navigate("/faturas"),
            variant: "outline" as const,
            disabled: false
          }
        ];

      case "accounts":
        return [
          {
            icon: ArrowUpRight,
            label: "Receita",
            description: "Registrar entrada",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "default" as const,
            disabled: false
          },
          {
            icon: ArrowDownRight,
            label: "Despesa",
            description: "Registrar saída",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "secondary" as const,
            disabled: false
          },
          {
            icon: Wallet,
            label: "Nova Conta",
            description: "Adicionar conta",
            onClick: () => {}, // Will be handled by parent
            variant: "outline" as const,
            disabled: false
          },
          {
            icon: TrendingUp,
            label: "Transferir",
            description: "Entre contas",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "outline" as const,
            disabled: false
          }
        ];

      case "transactions":
        return [
          {
            icon: Plus,
            label: "Nova Transação",
            description: "Receita ou despesa",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "default" as const,
            disabled: false
          },
          {
            icon: Receipt,
            label: "Fatura Cartão",
            description: "Pagar pendência",
            onClick: () => navigate("/cartoes"),
            variant: "secondary" as const,
            disabled: false
          },
          {
            icon: Calendar,
            label: "Recorrência",
            description: "Configurar automática",
            onClick: () => navigate("/recorrencias"),
            variant: "outline" as const,
            disabled: false
          },
          {
            icon: Target,
            label: "Categorizar",
            description: "Organizar gastos",
            onClick: () => navigate("/categorias"),
            variant: "outline" as const,
            disabled: false
          }
        ];

      default: // dashboard
        return [
          {
            icon: Plus,
            label: "Nova Transação",
            description: "Receita ou despesa",
            onClick: () => setIsNewTransactionModalOpen(true),
            variant: "default" as const,
            disabled: false
          },
          {
            icon: Receipt,
            label: "Pagar Fatura",
            description: "Cartão de crédito",
            onClick: () => navigate("/cartoes"),
            variant: "secondary" as const,
            disabled: false
          },
          {
            icon: CreditCard,
            label: "Gerenciar Cartões",
            description: "Ver limites e faturas",
            onClick: () => navigate("/cartoes"),
            variant: "outline" as const,
            disabled: false
          },
          {
            icon: TrendingUp,
            label: "Ver Relatórios",
            description: "Análises detalhadas",
            onClick: () => navigate("/relatorios"),
            variant: "outline" as const,
            disabled: false
          }
        ];
    }
  };

  const actions = getContextActions();

  return (
    <>
      <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Ações Rápidas
            {context !== "dashboard" && (
              <Badge variant="outline" className="ml-2 text-xs">
                {context === "cards" ? "Cartões" : context === "accounts" ? "Contas" : "Transações"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant}
                  className="h-auto p-4 flex-col gap-2 text-left justify-start items-start"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  <div className="flex items-center gap-2 w-full">
                    <IconComponent className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground w-full text-left">
                    {action.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <NewTransactionModal
        open={isNewTransactionModalOpen}
        onOpenChange={setIsNewTransactionModalOpen}
        onSuccess={() => {
          onRefresh?.();
          setIsNewTransactionModalOpen(false);
        }}
      />

      <NewCardModal
        open={isNewCardModalOpen}
        onOpenChange={setIsNewCardModalOpen}
        onSuccess={() => {
          onRefresh?.();
          setIsNewCardModalOpen(false);
        }}
      />
    </>
  );
}