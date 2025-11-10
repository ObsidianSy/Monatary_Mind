import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { transactionSchema } from "@/schemas/validation";

interface NewTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  initial?: any;
}

interface TransactionForm {
  tipo: "credito" | "debito" | "transferencia";
  valor: string;
  descricao: string;
  data_transacao: Date;
  conta_id: string;
  categoria_id: string;
  origem: string;
  status: "previsto" | "liquidado";
  observacoes?: string;
  // Para transferências
  conta_destino_id?: string;
  // Para parcelamento
  parcelas?: number;
  // Para recorrência
  frequencia?: "mensal" | "semanal" | "quinzenal" | "anual";
  data_fim?: Date;
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


export default function NewTransactionModal({ open, onOpenChange, onSuccess, mode = "create", initial }: NewTransactionModalProps) {
  const [activeTab, setActiveTab] = useState("simple");
  const [form, setForm] = useState<TransactionForm>({
    tipo: "debito",
    valor: "",
    descricao: "",
    data_transacao: new Date(),
    conta_id: "",
    categoria_id: "",
    origem: "manual",
    status: "liquidado",
  });

  // Load initial data for edit mode
  useEffect(() => {
    if (mode === "edit" && initial && open) {
      setForm({
        tipo: initial.tipo || "debito",
        valor: String(initial.valor || ""),
        descricao: initial.descricao || "",
        data_transacao: initial.data_transacao ? new Date(initial.data_transacao) : new Date(),
        conta_id: initial.conta_id || "",
        categoria_id: initial.categoria_id || "",
        origem: initial.origem || "manual",
        status: initial.status || "liquidado",
        observacoes: initial.referencia || "", // Mapear referencia para observacoes
      });
    }
  }, [mode, initial, open]);

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { activeAccounts } = useAccounts();
  const { subcategoriesForSelect } = useCategories();
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Transação criada",
        description: "A transação foi adicionada com sucesso.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      tipo: "debito",
      valor: "",
      descricao: "",
      data_transacao: new Date(),
      conta_id: "",
      categoria_id: "",
      origem: "manual",
      status: "liquidado",
    });
    setActiveTab("simple");
  };

  const handleSubmit = async () => {
    // Validação Zod
    const validationData = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor.replace(",", ".")),
      conta_id: form.conta_id,
      categoria_id: form.categoria_id || undefined,
      data_transacao: format(form.data_transacao, "yyyy-MM-dd"),
      origem: form.origem,
      status: form.status,
    };

    const validation = transactionSchema.safeParse(validationData);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...(mode === "edit" && initial?.id ? { id: initial.id } : {}),
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor.replace(",", ".")),
      conta_id: form.conta_id,
      categoria_id: form.categoria_id || undefined,
      data_transacao: format(form.data_transacao, "yyyy-MM-dd"),
      origem: form.origem,
      status: form.status,
      referencia: form.observacoes || null, // Mapear observacoes para referencia
    };

    try {
      if (activeTab === "recurring") {
        // Criar recorrência
        if (!form.frequencia) {
          toast({
            title: "Frequência obrigatória",
            description: "Selecione a frequência da recorrência.",
            variant: "destructive",
          });
          return;
        }

        const recorrenciaPayload = {
          tipo: form.tipo,
          descricao: form.descricao,
          valor: parseFloat(form.valor.replace(",", ".")),
          conta_id: form.conta_id,
          categoria_id: form.categoria_id || undefined,
          frequencia: form.frequencia,
          dia_vencimento: form.data_transacao.getDate(),
          data_inicio: format(form.data_transacao, "yyyy-MM-dd"),
          data_fim: form.data_fim ? format(form.data_fim, "yyyy-MM-dd") : undefined,
          ativo: true,
          observacoes: form.observacoes,
        };

        await postEvent("recorrencia.upsert", recorrenciaPayload);
        
        toast({
          title: "Recorrência criada",
          description: "A recorrência foi adicionada com sucesso.",
        });
      } else if (activeTab === "installments") {
        // Criar parcelas
        if (!form.parcelas || form.parcelas < 2) {
          toast({
            title: "Número de parcelas inválido",
            description: "Informe pelo menos 2 parcelas.",
            variant: "destructive",
          });
          return;
        }

        const valorTotal = parseFloat(form.valor.replace(",", "."));
        const valorParcela = valorTotal / form.parcelas;
        const parcelaGrupoId = uuidv4();

        const promises = [];
        for (let i = 0; i < form.parcelas; i++) {
          const dataParcela = new Date(form.data_transacao);
          dataParcela.setMonth(dataParcela.getMonth() + i);

          promises.push(
            postEvent("transacao.upsert", {
              tipo: form.tipo,
              descricao: `${form.descricao} (${i + 1}/${form.parcelas})`,
              valor: valorParcela,
              conta_id: form.conta_id,
              categoria_id: form.categoria_id || undefined,
              data_transacao: format(dataParcela, "yyyy-MM-dd"),
              origem: "parcelamento",
              status: "previsto",
              observacoes: form.observacoes,
              parcela_numero: i + 1,
              parcela_total: form.parcelas,
              parcela_grupo_id: parcelaGrupoId,
            })
          );
        }

        await Promise.all(promises);

        toast({
          title: "Parcelas criadas",
          description: `${form.parcelas} parcelas foram adicionadas com sucesso.`,
        });
      } else {
        // Criar transação simples
        await postEvent("transacao.upsert", payload);
        
        toast({
          title: mode === "edit" ? "Transação atualizada" : "Transação criada",
          description: "A operação foi realizada com sucesso.",
        });
      }
      
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar operação",
        variant: "destructive",
      });
    }
  };

  const updateForm = (updates: Partial<TransactionForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Altere os dados da transação" : "Adicione uma nova movimentação financeira"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simple">Simples</TabsTrigger>
            <TabsTrigger value="installments">Parcelas</TabsTrigger>
            <TabsTrigger value="recurring">Recorrente</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={form.tipo} onValueChange={(value: any) => updateForm({ tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="credito">Receita</SelectItem>
                    <SelectItem value="debito">Despesa</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => updateForm({ valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => updateForm({ descricao: e.target.value })}
                placeholder="Ex: Compra no supermercado"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conta">Conta *</Label>
                <Select value={form.conta_id} onValueChange={(value) => updateForm({ conta_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {activeAccounts.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data">Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_transacao && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.data_transacao ? format(form.data_transacao, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.data_transacao}
                      onSelect={(date) => date && updateForm({ data_transacao: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {form.tipo === "transferencia" ? (
              <div>
                <Label htmlFor="conta-destino">Conta de Destino *</Label>
                <Select value={form.conta_destino_id || ""} onValueChange={(value) => updateForm({ conta_destino_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar conta de destino" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {activeAccounts.filter(c => c.id !== form.conta_id).map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={form.categoria_id} onValueChange={(value) => updateForm({ categoria_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {subcategoriesForSelect.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(value: any) => updateForm({ status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="liquidado">Concluído</SelectItem>
                    <SelectItem value="previsto">Previsto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="origem">Origem</Label>
                <Select value={form.origem} onValueChange={(value) => updateForm({ origem: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="importacao">Importação</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={form.observacoes || ""}
                onChange={(e) => updateForm({ observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="installments" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo-parcelas">Tipo *</Label>
                <Select value={form.tipo} onValueChange={(value: any) => updateForm({ tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="credito">Receita Parcelada</SelectItem>
                    <SelectItem value="debito">Despesa Parcelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valor-total">Valor Total *</Label>
                <Input
                  id="valor-total"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => updateForm({ valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao-parcelas">Descrição *</Label>
              <Input
                id="descricao-parcelas"
                value={form.descricao}
                onChange={(e) => updateForm({ descricao: e.target.value })}
                placeholder="Ex: Compra parcelada"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="conta-parcelas">Conta *</Label>
                <Select value={form.conta_id} onValueChange={(value) => updateForm({ conta_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {activeAccounts.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoria-parcelas">Categoria *</Label>
                <Select value={form.categoria_id} onValueChange={(value) => updateForm({ categoria_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {subcategoriesForSelect.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="num-parcelas">Nº Parcelas *</Label>
                <Input
                  id="num-parcelas"
                  type="number"
                  min="2"
                  max="48"
                  value={form.parcelas || 2}
                  onChange={(e) => updateForm({ parcelas: parseInt(e.target.value) })}
                  placeholder="2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="data-primeira-parcela">Data da 1ª Parcela *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_transacao && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.data_transacao ? format(form.data_transacao, "PPP", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.data_transacao}
                    onSelect={(date) => date && updateForm({ data_transacao: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {form.valor && form.parcelas && form.parcelas > 1 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="text-sm font-semibold mb-2">Preview das Parcelas</h4>
                <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {Array.from({ length: Math.min(form.parcelas, 5) }).map((_, i) => {
                    const valorParcela = parseFloat(form.valor || "0") / (form.parcelas || 1);
                    const dataParcela = new Date(form.data_transacao);
                    dataParcela.setMonth(dataParcela.getMonth() + i);
                    
                    return (
                      <div key={i} className="flex justify-between">
                        <span>{i + 1}ª parcela - {format(dataParcela, "dd/MM/yyyy")}</span>
                        <span className="font-semibold">R$ {valorParcela.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {form.parcelas > 5 && (
                    <div className="text-muted-foreground text-xs pt-1">
                      ... e mais {form.parcelas - 5} parcelas
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="observacoes-parcelas">Observações</Label>
              <Textarea
                id="observacoes-parcelas"
                value={form.observacoes || ""}
                onChange={(e) => updateForm({ observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo-recorrente">Tipo *</Label>
                <Select value={form.tipo} onValueChange={(value: any) => updateForm({ tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="credito">Receita Recorrente</SelectItem>
                    <SelectItem value="debito">Despesa Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valor-recorrente">Valor *</Label>
                <Input
                  id="valor-recorrente"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => updateForm({ valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao-recorrente">Descrição *</Label>
              <Input
                id="descricao-recorrente"
                value={form.descricao}
                onChange={(e) => updateForm({ descricao: e.target.value })}
                placeholder="Ex: Salário mensal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conta-recorrente">Conta *</Label>
                <Select value={form.conta_id} onValueChange={(value) => updateForm({ conta_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {activeAccounts.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoria-recorrente">Categoria *</Label>
                <Select value={form.categoria_id} onValueChange={(value) => updateForm({ categoria_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {subcategoriesForSelect.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequencia">Frequência *</Label>
                <Select 
                  value={form.frequencia} 
                  onValueChange={(value: any) => updateForm({ frequencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar frequência" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data-inicio">Data de Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_transacao && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.data_transacao ? format(form.data_transacao, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.data_transacao}
                      onSelect={(date) => date && updateForm({ data_transacao: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="data-fim">Data de Término (Opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_fim && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.data_fim ? format(form.data_fim, "PPP", { locale: ptBR }) : "Sem data de término"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.data_fim}
                    onSelect={(date) => updateForm({ data_fim: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="observacoes-recorrente">Observações</Label>
              <Textarea
                id="observacoes-recorrente"
                value={form.observacoes || ""}
                onChange={(e) => updateForm({ observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={posting}>
            {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "edit" ? "Salvar Alterações" : "Criar Transação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}