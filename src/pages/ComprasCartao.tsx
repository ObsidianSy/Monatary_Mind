import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShoppingBag, CreditCard, AlertCircle } from "lucide-react";
import { useCreditCards } from "@/hooks/useFinancialData";
import { useCategories } from "@/hooks/useCategories";
import AddPurchaseModal from "@/components/AddPurchaseModal";
import { ActionableCard } from "@/components/ActionableCard";
import { formatCurrency } from "@/lib/utils";

export default function ComprasCartaoPage() {
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const { activeCards, loading } = useCreditCards();
  const { categories } = useCategories();
  const subCategories = categories.filter(cat => cat.parent_id !== null);

  const getUsagePercentage = (used: number, limit: number): number => {
    return Math.round((used / limit) * 100);
  };

  const getBrandIcon = (brand: string) => {
    return <CreditCard className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Nova Compra no Cartão</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Nenhum cartão encontrado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você precisa ter pelo menos um cartão de crédito cadastrado para registrar compras.
        </p>
        <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Vá para a página de Cartões para cadastrar seu primeiro cartão.</span>
        </div>
      </div>
    );
  }

  if (subCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Categorias não encontradas</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você precisa ter categorias cadastradas para registrar compras.
        </p>
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Vá para a página de Categorias para cadastrar subcategorias.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nova Compra no Cartão</h1>
          <p className="text-muted-foreground">
            Selecione um cartão de crédito para registrar uma nova compra
          </p>
        </div>
        <Button 
          onClick={() => setIsAddPurchaseModalOpen(true)}
          className="bg-gradient-primary"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Registrar Compra
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeCards.map((card) => {
          const limite = typeof card.limite_total === 'string' ? parseFloat(card.limite_total) : card.limite_total;
          // Simulando uso atual - em produção viria da API
          const usage = 0; // Por enquanto 0, será calculado com base nas faturas
          const usagePercentage = getUsagePercentage(usage, limite);

          return (
            <ActionableCard
              key={card.id}
              title={card.apelido}
              description={`${card.bandeira} • Limite: ${formatCurrency(limite)}`}
              status="success"
              icon={getBrandIcon(card.bandeira)}
              badge={{
                text: `${usagePercentage}% usado`,
                variant: usagePercentage >= 90 ? "destructive" : usagePercentage >= 70 ? "secondary" : "default"
              }}
              onClick={() => {
                setSelectedCard(card);
                setIsAddPurchaseModalOpen(true);
              }}
              actions={[
                {
                  label: "Usar Este Cartão",
                  icon: <ShoppingBag className="w-4 h-4" />,
                  onClick: () => {
                    setSelectedCard(card);
                    setIsAddPurchaseModalOpen(true);
                  },
                  variant: "default"
                }
              ]}
              className="cursor-pointer hover:scale-[1.02] border-l-4 border-l-primary"
            >
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Limite usado</span>
                    <span className="text-xs font-medium text-success">
                      {formatCurrency(usage)}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-1.5" />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">Limite disponível</span>
                    <span className="text-xs font-medium">
                      {formatCurrency(limite - usage)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">Fecha dia:</span>
                    <p className="font-medium">{card.dia_fechamento}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vence dia:</span>
                    <p className="font-medium">{card.dia_vencimento}</p>
                  </div>
                </div>
              </div>
            </ActionableCard>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Como funciona?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Compras no cartão geram itens de fatura, não transações diretas</li>
              <li>• A competência é calculada baseada no dia de fechamento do cartão</li>
              <li>• Compras parceladas distribuem automaticamente nas próximas faturas</li>
              <li>• Transações só são criadas quando você paga a fatura</li>
            </ul>
          </div>
        </div>
      </div>

      <AddPurchaseModal
        open={isAddPurchaseModalOpen}
        onOpenChange={setIsAddPurchaseModalOpen}
        selectedCard={selectedCard}
        onSuccess={() => {
          setIsAddPurchaseModalOpen(false);
          // Aqui poderia haver um refresh se necessário
        }}
      />
    </div>
  );
}