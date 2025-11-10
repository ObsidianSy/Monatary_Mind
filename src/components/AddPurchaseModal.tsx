import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CreditCard as CreditCardIcon, ShoppingBag, AlertCircle } from "lucide-react";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useCreditCards, useCreditPurchases } from "@/hooks/useFinancialData";
import { useCategories } from "@/hooks/useCategories";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import type { CreditCard, PurchaseForm } from "@/types/financial";
import { creditPurchaseSchema } from "@/schemas/validation";
import { formatCurrency } from "@/lib/utils";

interface AddPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCard?: CreditCard;
  onSuccess?: () => void;
}

export default function AddPurchaseModal({ 
  open, 
  onOpenChange, 
  selectedCard,
  onSuccess 
}: AddPurchaseModalProps) {
  const [form, setForm] = useState<PurchaseForm>({
    descricao: "",
    valor: "",
    data_compra: new Date(),
    categoria_id: "",
    parcela_total: 1,
    cartao_id: selectedCard?.id || "",
    observacoes: "",
    tipo_compra: "simples"
  });

  const { toast } = useToast();
  const { activeCards } = useCreditCards();
  const { subcategoriesForSelect } = useCategories();
  const { createPurchase, posting } = useCreditPurchases();
  
  const handleSuccess = () => {
    toast({
      title: "Compra registrada",
      description: "A compra foi adicionada ao cartão com sucesso.",
    });
    
    // Fechar modal primeiro para evitar re-renders
    onOpenChange(false);
    
    // Aguardar 100ms antes de resetar e disparar refresh
    setTimeout(() => {
      resetForm();
      onSuccess?.();
    }, 100);
  };

  const handleError = (error: Error) => {
    toast({
      title: "Erro ao registrar compra",
      description: error.message || "Ocorreu um erro inesperado.",
      variant: "destructive",
    });
  };

  const resetForm = () => {
    setForm({
      descricao: "",
      valor: "",
      data_compra: new Date(),
      categoria_id: "",
      parcela_total: 1,
      cartao_id: selectedCard?.id || "",
      observacoes: "",
      tipo_compra: "simples"
    });
  };

  // Calcula competência baseada no dia de fechamento
  const getCompetencia = (dataCompra: Date, cartaoId: string) => {
    const cartao = activeCards.find(c => c.id === cartaoId);
    if (!cartao) return format(dataCompra, "yyyy-MM-01");
    
    const diaCompra = dataCompra.getDate();
    const diaFechamento = cartao.dia_fechamento;
    
    let competenciaCalculada: string;
    if (diaCompra <= diaFechamento) {
      competenciaCalculada = format(dataCompra, "yyyy-MM-01");
    } else {
      competenciaCalculada = format(addMonths(dataCompra, 1), "yyyy-MM-01");
    }
    
    console.log(`🗓️ getCompetencia:`, {
      dataCompra: format(dataCompra, "dd/MM/yyyy"),
      diaCompra,
      diaFechamento,
      entraProximaFatura: diaCompra > diaFechamento,
      competencia: competenciaCalculada
    });
    
    return competenciaCalculada;
  };

  // Gera preview das parcelas
  const previewParcelas = useMemo(() => {
    if (form.tipo_compra === "simples" || !form.valor || !form.cartao_id || form.parcela_total <= 1) {
      return [];
    }

    const valorTotal = parseFloat(form.valor);
    const valorParcela = valorTotal / form.parcela_total;
    const competenciaInicial = getCompetencia(form.data_compra, form.cartao_id);
    
    return Array.from({ length: form.parcela_total }, (_, i) => {
      // ✅ Usar parseISO para evitar shift de timezone
      const dataBase = parseISO(competenciaInicial);
      const dataCompetencia = addMonths(dataBase, i);
      const competencia = format(dataCompetencia, "yyyy-MM-dd");
      const mesAno = format(dataCompetencia, "MMM/yyyy", { locale: ptBR });
      
      return {
        numero: i + 1,
        valor: valorParcela,
        competencia: mesAno
      };
    });
  }, [form.valor, form.parcela_total, form.data_compra, form.cartao_id, form.tipo_compra, activeCards]);

  // Mostra aviso da competência
  const avisoCompetencia = useMemo(() => {
    if (!form.cartao_id) return "";
    
    const competencia = getCompetencia(form.data_compra, form.cartao_id);
    const mesAno = format(new Date(competencia), "MMM/yyyy", { locale: ptBR });
    
    return `Esta compra entrará na fatura de ${mesAno}`;
  }, [form.data_compra, form.cartao_id, activeCards]);

  const handleSubmit = async () => {
    // Validação Zod
    const validationData = {
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      cartao_id: form.cartao_id,
      categoria_id: form.categoria_id,
      data_compra: format(form.data_compra, "yyyy-MM-dd"),
      parcela_total: form.parcela_total,
    };

    const validation = creditPurchaseSchema.safeParse(validationData);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    if (form.tipo_compra === "parcelada" && form.parcela_total < 2) {
      toast({
        title: "Erro de validação",
        description: "Compras parceladas devem ter no mínimo 2 parcelas.",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados para API
    const valorTotal = parseFloat(form.valor);
    const valorParcela = form.tipo_compra === "parcelada" ? valorTotal / form.parcela_total : valorTotal;

    if (form.tipo_compra === "simples") {
      // Compra simples - uma única parcela
      const competencia = getCompetencia(form.data_compra, form.cartao_id);
      
      try {
        await createPurchase({
          cartao_id: form.cartao_id,
          competencia,
          descricao: form.descricao,
          valor: valorTotal,
          data_compra: format(form.data_compra, "yyyy-MM-dd"),
          categoria_id: form.categoria_id,
          parcela_numero: 1,
          parcela_total: 1
        });
        handleSuccess();
      } catch (error) {
        handleError(error as Error);
      }
    } else {
      // Compra parcelada - múltiplos itens
      const competenciaInicial = getCompetencia(form.data_compra, form.cartao_id);
      
      console.log(`🗓️ Competencia inicial calculada: ${competenciaInicial} (Data compra: ${format(form.data_compra, "dd/MM/yyyy")})`);
      
      try {
        for (let i = 0; i < form.parcela_total; i++) {
          // ✅ IMPORTANTE: usar parseISO para evitar problemas de timezone
          const dataBase = parseISO(competenciaInicial);
          const dataCompetencia = addMonths(dataBase, i);
          const competencia = format(dataCompetencia, "yyyy-MM-dd");
          const descricao = `${form.descricao} (${i + 1}/${form.parcela_total})`;
          
          console.log(`📤 Enviando parcela ${i + 1}/${form.parcela_total}:`, {
            numero: i + 1,
            total: form.parcela_total,
            descricao,
            competencia,
            competenciaDisplay: format(dataCompetencia, "MMM/yyyy"),
            valor: valorParcela,
            categoria_id: form.categoria_id
          });
          
          try {
            await createPurchase({
              cartao_id: form.cartao_id,
              competencia,
              descricao,
              valor: valorParcela,
              data_compra: format(form.data_compra, "yyyy-MM-dd"),
              categoria_id: form.categoria_id,
              parcela_numero: i + 1,
              parcela_total: form.parcela_total
            });
            console.log(`✅ Parcela ${i + 1}/${form.parcela_total} criada com sucesso`);
          } catch (parcelaError: any) {
            console.error(`❌ ERRO na parcela ${i + 1}/${form.parcela_total}:`, parcelaError);
            throw new Error(`Erro na parcela ${i + 1}: ${parcelaError.message}`);
          }
        }
        handleSuccess();
      } catch (error) {
        handleError(error as Error);
      }
    }
  };

  const updateForm = (field: keyof PurchaseForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Nova Compra no Cartão
          </DialogTitle>
          <DialogDescription>
            Registre uma nova compra no cartão de crédito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cartao">Cartão *</Label>
              <Select value={form.cartao_id} onValueChange={(value) => updateForm("cartao_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {activeCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="w-4 h-4" />
                        {card.apelido} ({card.bandeira})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={form.categoria_id} onValueChange={(value) => updateForm("categoria_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {subcategoriesForSelect.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              placeholder="Ex: Compras no supermercado"
              value={form.descricao}
              onChange={(e) => updateForm("descricao", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Total *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => updateForm("valor", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data da Compra *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(form.data_compra, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.data_compra}
                    onSelect={(date) => date && updateForm("data_compra", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Aviso da competência */}
          {avisoCompetencia && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{avisoCompetencia}</span>
            </div>
          )}

          {/* Abas de tipo de compra */}
          <Tabs 
            value={form.tipo_compra} 
            onValueChange={(value) => updateForm("tipo_compra", value as "simples" | "parcelada")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simples">Compra Simples</TabsTrigger>
              <TabsTrigger value="parcelada">Compra Parcelada</TabsTrigger>
            </TabsList>

            <TabsContent value="simples" className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Compra à vista ou em 1x no cartão de crédito
                </p>
              </div>
            </TabsContent>

            <TabsContent value="parcelada" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parcelas">Quantidade de Parcelas *</Label>
                <Select 
                  value={form.parcela_total.toString()} 
                  onValueChange={(value) => updateForm("parcela_total", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 23 }, (_, i) => i + 2).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview das parcelas */}
              {previewParcelas.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview das Parcelas</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    <div className="space-y-2">
                      {previewParcelas.map((parcela) => (
                        <div key={parcela.numero} className="flex justify-between items-center text-sm">
                          <span>{parcela.numero}ª parcela</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(parcela.valor)}</span>
                            <Badge variant="outline" className="text-xs">
                              {parcela.competencia}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Informações adicionais..."
              value={form.observacoes}
              onChange={(e) => updateForm("observacoes", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={posting}>
            {posting ? "Salvando..." : "Registrar Compra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}