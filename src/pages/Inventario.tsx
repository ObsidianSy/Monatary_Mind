import { useState, useEffect } from "react";
import { Package, Box, Wrench, Plus, Pencil, Trash2, Search, Filter, X } from "lucide-react";
import { equipamentosSDK } from "@/lib/equipamentos-sdk";
import { estoqueSDK } from "@/lib/estoque-sdk";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { formatCurrency, censorValue } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Types
type Equipamento = {
  id: string;
  nome: string;
  tipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  valor: number;
  dataAquisicao: string;
  status: "ativo" | "manutencao" | "inativo" | "vendido";
};

type Produto = {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  estoqueMinimo: number;
  localizacao: string;
};

type MateriaPrima = {
  id: string;
  nome: string;
  codigo: string;
  fornecedor: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  estoqueMinimo: number;
  dataValidade?: string;
  lote?: string;
};

// Constants
const tiposEquipamento = [
  "prensa",
  "cortadeira",
  "costura",
  "impressora",
  "computador",
  "esteira",
  "balanca",
  "outro"
];

const categoriasProduto = [
  "Eletrônicos",
  "Ferramentas",
  "Materiais de Escritório",
  "Peças",
  "Acessórios",
  "Outros",
];

const unidadesMedida = ["UN", "KG", "L", "M", "CX", "PC", "PAR"];

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "manutencao", label: "Em Manutenção" },
  { value: "inativo", label: "Inativo" },
  { value: "vendido", label: "Vendido" },
];

export default function Inventario() {
  const { isValuesCensored } = usePrivacy();
  const [activeTab, setActiveTab] = useState("equipamentos");
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  
  // Equipamentos State
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipamentoModalOpen, setEquipamentoModalOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [equipamentoForm, setEquipamentoForm] = useState<{
    nome: string;
    tipo: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    valor: string;
    dataAquisicao: string;
    status: "ativo" | "manutencao" | "inativo" | "vendido";
  }>({
    nome: "",
    tipo: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
    valor: "",
    dataAquisicao: "",
    status: "ativo",
  });

  // Produtos State
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [produtoForm, setProdutoForm] = useState<{
    nome: string;
    codigo: string;
    categoria: string;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    estoqueMinimo: string;
    localizacao: string;
  }>({
    nome: "",
    codigo: "",
    categoria: "",
    quantidade: "",
    unidade: "UN",
    valorUnitario: "",
    estoqueMinimo: "",
    localizacao: "",
  });

  // Matéria-Prima State
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [materiaPrimaModalOpen, setMateriaPrimaModalOpen] = useState(false);
  const [editingMateriaPrima, setEditingMateriaPrima] = useState<MateriaPrima | null>(null);
  const [materiaPrimaForm, setMateriaPrimaForm] = useState<{
    nome: string;
    codigo: string;
    fornecedor: string;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    estoqueMinimo: string;
    dataValidade: string;
    lote: string;
  }>({
    nome: "",
    codigo: "",
    fornecedor: "",
    quantidade: "",
    unidade: "KG",
    valorUnitario: "",
    estoqueMinimo: "",
    dataValidade: "",
    lote: "",
  });

  // Carregar equipamentos ao montar o componente
  useEffect(() => {
    loadEquipamentos();
    loadProdutos();
  }, []);

  const loadEquipamentos = async () => {
    try {
      setLoading(true);
      const data = await equipamentosSDK.getEquipamentos();
      
      // Converter do formato da API para o formato do frontend
      const equipamentosFormatados = data.map((eq: any) => ({
        id: eq.id,
        nome: eq.nome,
        tipo: eq.tipo || "Outro",
        marca: eq.marca || "",
        modelo: eq.modelo || "",
        numeroSerie: eq.numero_serie || "",
        valor: parseFloat(eq.valor_aquisicao || "0"),
        dataAquisicao: eq.data_aquisicao || new Date().toISOString().split('T')[0],
        status: eq.status || "ativo",
      }));
      
      setEquipamentos(equipamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      toast.error("Erro ao carregar equipamentos");
    } finally {
      setLoading(false);
    }
  };

  const loadProdutos = async () => {
    try {
      const data = await estoqueSDK.getProdutos({ only_active: true, include_kits: true });
      
      // Converter do formato da API para o formato do frontend
      const produtosFormatados = data.map((prod: any) => ({
        id: prod.id,
        nome: prod.nome,
        codigo: prod.sku,
        categoria: prod.categoria || "Outros",
        quantidade: prod.quantidade_disponivel || 0,
        unidade: "UN",
        valorUnitario: parseFloat(prod.preco_venda || "0"),
        estoqueMinimo: prod.estoque_minimo || 0,
        localizacao: prod.variante || "",
      }));
      
      setProdutos(produtosFormatados);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos do estoque");
    }
  };

  // Equipamentos Handlers
  const resetEquipamentoForm = () => {
    setEquipamentoForm({
      nome: "",
      tipo: "",
      marca: "",
      modelo: "",
      numeroSerie: "",
      valor: "",
      dataAquisicao: "",
      status: "ativo",
    });
    setEditingEquipamento(null);
  };

  const handleEquipamentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Converter data para formato dd/mm/yyyy
      const [year, month, day] = equipamentoForm.dataAquisicao.split('-');
      const dataFormatada = `${day}/${month}/${year}`;
      
      const payload = {
        id: editingEquipamento?.id || null,
        nome: equipamentoForm.nome,
        tipo: equipamentoForm.tipo,
        marca: equipamentoForm.marca,
        modelo: equipamentoForm.modelo,
        numero_serie: equipamentoForm.numeroSerie,
        valor_aquisicao: equipamentoForm.valor,
        data_aquisicao: dataFormatada,
        status: equipamentoForm.status,
      };

      if (editingEquipamento) {
        await equipamentosSDK.updateEquipamento(payload);
        toast.success("Equipamento atualizado com sucesso!");
      } else {
        await equipamentosSDK.createEquipamento(payload);
        toast.success("Equipamento cadastrado com sucesso!");
      }
      
      setEquipamentoModalOpen(false);
      resetEquipamentoForm();
      await loadEquipamentos();
    } catch (error) {
      console.error("Erro ao salvar equipamento:", error);
      toast.error("Erro ao salvar equipamento");
    }
  };

  const handleEquipamentoEdit = (equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setEquipamentoForm({
      nome: equipamento.nome,
      tipo: equipamento.tipo,
      marca: equipamento.marca,
      modelo: equipamento.modelo,
      numeroSerie: equipamento.numeroSerie,
      valor: equipamento.valor.toString(),
      dataAquisicao: equipamento.dataAquisicao,
      status: equipamento.status,
    });
    setEquipamentoModalOpen(true);
  };

  const handleEquipamentoDelete = async (id: string) => {
    try {
      await equipamentosSDK.deleteEquipamento(id);
      toast.success("Equipamento removido com sucesso!");
      await loadEquipamentos();
    } catch (error) {
      console.error("Erro ao deletar equipamento:", error);
      toast.error("Erro ao deletar equipamento");
    }
  };

  // Produtos Handlers
  const resetProdutoForm = () => {
    setProdutoForm({
      nome: "",
      codigo: "",
      categoria: "",
      quantidade: "",
      unidade: "UN",
      valorUnitario: "",
      estoqueMinimo: "",
      localizacao: "",
    });
    setEditingProduto(null);
  };

  const handleProdutoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduto) {
      setProdutos(produtos.map(p => 
        p.id === editingProduto.id 
          ? { 
              ...produtoForm, 
              id: p.id, 
              quantidade: parseFloat(produtoForm.quantidade),
              valorUnitario: parseFloat(produtoForm.valorUnitario),
              estoqueMinimo: parseFloat(produtoForm.estoqueMinimo),
            }
          : p
      ));
      toast.success("Produto atualizado com sucesso!");
    } else {
      const novoProduto: Produto = {
        id: crypto.randomUUID(),
        ...produtoForm,
        quantidade: parseFloat(produtoForm.quantidade),
        valorUnitario: parseFloat(produtoForm.valorUnitario),
        estoqueMinimo: parseFloat(produtoForm.estoqueMinimo),
      };
      setProdutos([...produtos, novoProduto]);
      toast.success("Produto cadastrado com sucesso!");
    }
    
    setProdutoModalOpen(false);
    resetProdutoForm();
  };

  const handleProdutoEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setProdutoForm({
      nome: produto.nome,
      codigo: produto.codigo,
      categoria: produto.categoria,
      quantidade: produto.quantidade.toString(),
      unidade: produto.unidade,
      valorUnitario: produto.valorUnitario.toString(),
      estoqueMinimo: produto.estoqueMinimo.toString(),
      localizacao: produto.localizacao,
    });
    setProdutoModalOpen(true);
  };

  const handleProdutoDelete = (id: string) => {
    setProdutos(produtos.filter(p => p.id !== id));
    toast.success("Produto removido com sucesso!");
  };

  // Matéria-Prima Handlers
  const resetMateriaPrimaForm = () => {
    setMateriaPrimaForm({
      nome: "",
      codigo: "",
      fornecedor: "",
      quantidade: "",
      unidade: "KG",
      valorUnitario: "",
      estoqueMinimo: "",
      dataValidade: "",
      lote: "",
    });
    setEditingMateriaPrima(null);
  };

  const handleMateriaPrimaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMateriaPrima) {
      setMateriasPrimas(materiasPrimas.map(mp => 
        mp.id === editingMateriaPrima.id 
          ? { 
              ...materiaPrimaForm, 
              id: mp.id, 
              quantidade: parseFloat(materiaPrimaForm.quantidade),
              valorUnitario: parseFloat(materiaPrimaForm.valorUnitario),
              estoqueMinimo: parseFloat(materiaPrimaForm.estoqueMinimo),
              dataValidade: materiaPrimaForm.dataValidade || undefined,
              lote: materiaPrimaForm.lote || undefined,
            }
          : mp
      ));
      toast.success("Matéria-prima atualizada com sucesso!");
    } else {
      const novaMateriaPrima: MateriaPrima = {
        id: crypto.randomUUID(),
        ...materiaPrimaForm,
        quantidade: parseFloat(materiaPrimaForm.quantidade),
        valorUnitario: parseFloat(materiaPrimaForm.valorUnitario),
        estoqueMinimo: parseFloat(materiaPrimaForm.estoqueMinimo),
        dataValidade: materiaPrimaForm.dataValidade || undefined,
        lote: materiaPrimaForm.lote || undefined,
      };
      setMateriasPrimas([...materiasPrimas, novaMateriaPrima]);
      toast.success("Matéria-prima cadastrada com sucesso!");
    }
    
    setMateriaPrimaModalOpen(false);
    resetMateriaPrimaForm();
  };

  const handleMateriaPrimaEdit = (materiaPrima: MateriaPrima) => {
    setEditingMateriaPrima(materiaPrima);
    setMateriaPrimaForm({
      nome: materiaPrima.nome,
      codigo: materiaPrima.codigo,
      fornecedor: materiaPrima.fornecedor,
      quantidade: materiaPrima.quantidade.toString(),
      unidade: materiaPrima.unidade,
      valorUnitario: materiaPrima.valorUnitario.toString(),
      estoqueMinimo: materiaPrima.estoqueMinimo.toString(),
      dataValidade: materiaPrima.dataValidade || "",
      lote: materiaPrima.lote || "",
    });
    setMateriaPrimaModalOpen(true);
  };

  const handleMateriaPrimaDelete = (id: string) => {
    setMateriasPrimas(materiasPrimas.filter(mp => mp.id !== id));
    toast.success("Matéria-prima removida com sucesso!");
  };

  // Filtrar dados
  const filteredEquipamentos = equipamentos.filter(eq => {
    const matchSearch = eq.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        eq.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        eq.modelo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "todos" || eq.status === statusFilter;
    const matchData = (!dataInicio || new Date(eq.dataAquisicao) >= new Date(dataInicio)) &&
                      (!dataFim || new Date(eq.dataAquisicao) <= new Date(dataFim));
    return matchSearch && matchStatus && matchData;
  });

  const filteredProdutos = produtos.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategoria = categoriaFilter === "todos" || p.categoria === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  const filteredMateriasPrimas = materiasPrimas.filter(mp => {
    const matchSearch = mp.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        mp.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // Calculate totals
  const valorTotalEquipamentos = filteredEquipamentos.reduce((acc, eq) => acc + eq.valor, 0);
  const equipamentosAtivos = filteredEquipamentos.filter(eq => eq.status === "ativo").length;
  const valorTotalProdutos = filteredProdutos.reduce((acc, p) => acc + (p.quantidade * p.valorUnitario), 0);
  const produtosBaixoEstoque = filteredProdutos.filter(p => p.quantidade <= p.estoqueMinimo).length;
  const valorTotalMateriasPrimas = filteredMateriasPrimas.reduce((acc, mp) => acc + (mp.quantidade * mp.valorUnitario), 0);
  const materiasPrimasBaixoEstoque = filteredMateriasPrimas.filter(mp => mp.quantidade <= mp.estoqueMinimo).length;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("todos");
    setCategoriaFilter("todos");
    setDataInicio("");
    setDataFim("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "todos" || categoriaFilter !== "todos" || dataInicio || dataFim;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
          <p className="text-muted-foreground">Gerencie equipamentos, produtos e matérias-primas</p>
        </div>
      </div>

      {/* Filtros Modernos */}
      <Card className="border-muted/40">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs ml-auto"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {activeTab === "equipamentos" && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-9"
                  />

                  <Input
                    type="date"
                    placeholder="Data final"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-9"
                  />
                </>
              )}

              {activeTab === "produtos" && (
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as categorias</SelectItem>
                    {categoriasProduto.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="equipamentos" className="gap-2">
            <Wrench className="w-4 h-4" />
            Equipamentos
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="materia-prima" className="gap-2">
            <Box className="w-4 h-4" />
            Matéria-Prima
          </TabsTrigger>
        </TabsList>

        {/* EQUIPAMENTOS TAB */}
        <TabsContent value="equipamentos" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={equipamentoModalOpen} onOpenChange={(open) => {
              setEquipamentoModalOpen(open);
              if (!open) resetEquipamentoForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Equipamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleEquipamentoSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingEquipamento ? "Editar Equipamento" : "Novo Equipamento"}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do equipamento
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome/Identificação *</Label>
                        <Input
                          id="nome"
                          value={equipamentoForm.nome}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, nome: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo *</Label>
                        <Select value={equipamentoForm.tipo} onValueChange={(value) => setEquipamentoForm({ ...equipamentoForm, tipo: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                           <SelectContent>
                            {tiposEquipamento.map(tipo => (
                              <SelectItem key={tipo} value={tipo}>
                                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="marca">Marca *</Label>
                        <Input
                          id="marca"
                          value={equipamentoForm.marca}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, marca: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="modelo">Modelo *</Label>
                        <Input
                          id="modelo"
                          value={equipamentoForm.modelo}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, modelo: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="numeroSerie">Número de Série</Label>
                        <Input
                          id="numeroSerie"
                          value={equipamentoForm.numeroSerie}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, numeroSerie: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor (R$) *</Label>
                        <Input
                          id="valor"
                          type="number"
                          step="0.01"
                          value={equipamentoForm.valor}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, valor: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataAquisicao">Data de Aquisição *</Label>
                        <Input
                          id="dataAquisicao"
                          type="date"
                          value={equipamentoForm.dataAquisicao}
                          onChange={(e) => setEquipamentoForm({ ...equipamentoForm, dataAquisicao: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select value={equipamentoForm.status} onValueChange={(value: any) => setEquipamentoForm({ ...equipamentoForm, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingEquipamento ? "Atualizar" : "Cadastrar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{equipamentos.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipamentos Ativos</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{equipamentosAtivos}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {censorValue(formatCurrency(valorTotalEquipamentos), isValuesCensored)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Equipamentos</CardTitle>
              <CardDescription>Equipamentos cadastrados no inventário</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Carregando equipamentos...</p>
                </div>
              ) : filteredEquipamentos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum equipamento encontrado.</p>
                  <p className="text-sm">
                    {equipamentos.length === 0 
                      ? 'Clique em "Novo Equipamento" para começar.'
                      : 'Tente ajustar os filtros de busca.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Nome</TableHead>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead className="w-[180px]">Marca/Modelo</TableHead>
                      <TableHead className="w-[120px]">Nº Série</TableHead>
                      <TableHead className="w-[120px]">Valor</TableHead>
                      <TableHead className="w-[100px]">Aquisição</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipamentos.map((equipamento) => (
                      <TableRow key={equipamento.id}>
                        <TableCell className="font-medium">{equipamento.nome}</TableCell>
                        <TableCell className="text-xs">{equipamento.tipo.charAt(0).toUpperCase() + equipamento.tipo.slice(1)}</TableCell>
                        <TableCell className="text-xs">{equipamento.marca} {equipamento.modelo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{equipamento.numeroSerie || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {censorValue(formatCurrency(equipamento.valor), isValuesCensored)}
                        </TableCell>
                        <TableCell className="text-xs">{new Date(equipamento.dataAquisicao).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            equipamento.status === "ativo" ? "default" :
                            equipamento.status === "manutencao" ? "secondary" : "outline"
                          } className="text-xs">
                            {statusOptions.find(s => s.value === equipamento.status)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEquipamentoEdit(equipamento)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEquipamentoDelete(equipamento.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUTOS TAB */}
        <TabsContent value="produtos" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={produtoModalOpen} onOpenChange={(open) => {
              setProdutoModalOpen(open);
              if (!open) resetProdutoForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleProdutoSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduto ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do produto
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prod-nome">Nome do Produto *</Label>
                        <Input
                          id="prod-nome"
                          value={produtoForm.nome}
                          onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="prod-codigo">Código *</Label>
                        <Input
                          id="prod-codigo"
                          value={produtoForm.codigo}
                          onChange={(e) => setProdutoForm({ ...produtoForm, codigo: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prod-categoria">Categoria *</Label>
                        <Select value={produtoForm.categoria} onValueChange={(value) => setProdutoForm({ ...produtoForm, categoria: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriasProduto.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="prod-localizacao">Localização *</Label>
                        <Input
                          id="prod-localizacao"
                          value={produtoForm.localizacao}
                          onChange={(e) => setProdutoForm({ ...produtoForm, localizacao: e.target.value })}
                          placeholder="Ex: Galpão A - Prateleira 3"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prod-quantidade">Quantidade *</Label>
                        <Input
                          id="prod-quantidade"
                          type="number"
                          step="0.01"
                          value={produtoForm.quantidade}
                          onChange={(e) => setProdutoForm({ ...produtoForm, quantidade: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="prod-unidade">Unidade *</Label>
                        <Select value={produtoForm.unidade} onValueChange={(value) => setProdutoForm({ ...produtoForm, unidade: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unidadesMedida.map(un => (
                              <SelectItem key={un} value={un}>{un}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="prod-valorUnitario">Valor Unit. (R$) *</Label>
                        <Input
                          id="prod-valorUnitario"
                          type="number"
                          step="0.01"
                          value={produtoForm.valorUnitario}
                          onChange={(e) => setProdutoForm({ ...produtoForm, valorUnitario: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prod-estoqueMinimo">Estoque Mínimo *</Label>
                      <Input
                        id="prod-estoqueMinimo"
                        type="number"
                        step="0.01"
                        value={produtoForm.estoqueMinimo}
                        onChange={(e) => setProdutoForm({ ...produtoForm, estoqueMinimo: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingProduto ? "Atualizar" : "Cadastrar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{produtos.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Estoque Baixo</CardTitle>
                <Package className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{produtosBaixoEstoque}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {censorValue(formatCurrency(valorTotalProdutos), isValuesCensored)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Produtos</CardTitle>
              <CardDescription>Produtos em estoque</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredProdutos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum produto encontrado.</p>
                  <p className="text-sm">
                    {produtos.length === 0 
                      ? 'Clique em "Novo Produto" para começar.'
                      : 'Tente ajustar os filtros de busca.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead className="w-[200px]">Nome</TableHead>
                      <TableHead className="w-[120px]">Categoria</TableHead>
                      <TableHead className="w-[120px]">Quantidade</TableHead>
                      <TableHead className="w-[100px]">Valor Unit.</TableHead>
                      <TableHead className="w-[100px]">Valor Total</TableHead>
                      <TableHead className="w-[140px]">Localização</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto) => {
                      const baixoEstoque = produto.quantidade <= produto.estoqueMinimo;
                      return (
                        <TableRow key={produto.id} className={baixoEstoque ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium text-xs font-mono">{produto.codigo}</TableCell>
                          <TableCell className="font-medium">
                            {produto.nome}
                            {baixoEstoque && (
                              <Badge variant="destructive" className="ml-2 text-xs px-1 py-0">Baixo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{produto.categoria}</TableCell>
                          <TableCell className="text-xs">
                            {produto.quantidade} {produto.unidade}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {censorValue(formatCurrency(produto.valorUnitario), isValuesCensored)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {censorValue(formatCurrency(produto.quantidade * produto.valorUnitario), isValuesCensored)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{produto.localizacao}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleProdutoEdit(produto)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleProdutoDelete(produto.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATÉRIA-PRIMA TAB */}
        <TabsContent value="materia-prima" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={materiaPrimaModalOpen} onOpenChange={(open) => {
              setMateriaPrimaModalOpen(open);
              if (!open) resetMateriaPrimaForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Matéria-Prima
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleMateriaPrimaSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMateriaPrima ? "Editar Matéria-Prima" : "Nova Matéria-Prima"}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da matéria-prima
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mp-nome">Nome *</Label>
                        <Input
                          id="mp-nome"
                          value={materiaPrimaForm.nome}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, nome: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mp-codigo">Código *</Label>
                        <Input
                          id="mp-codigo"
                          value={materiaPrimaForm.codigo}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, codigo: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mp-fornecedor">Fornecedor *</Label>
                      <Input
                        id="mp-fornecedor"
                        value={materiaPrimaForm.fornecedor}
                        onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, fornecedor: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mp-quantidade">Quantidade *</Label>
                        <Input
                          id="mp-quantidade"
                          type="number"
                          step="0.01"
                          value={materiaPrimaForm.quantidade}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, quantidade: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mp-unidade">Unidade *</Label>
                        <Select value={materiaPrimaForm.unidade} onValueChange={(value) => setMateriaPrimaForm({ ...materiaPrimaForm, unidade: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unidadesMedida.map(un => (
                              <SelectItem key={un} value={un}>{un}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mp-valorUnitario">Valor Unit. (R$) *</Label>
                        <Input
                          id="mp-valorUnitario"
                          type="number"
                          step="0.01"
                          value={materiaPrimaForm.valorUnitario}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, valorUnitario: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mp-estoqueMinimo">Estoque Mínimo *</Label>
                        <Input
                          id="mp-estoqueMinimo"
                          type="number"
                          step="0.01"
                          value={materiaPrimaForm.estoqueMinimo}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, estoqueMinimo: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mp-lote">Lote</Label>
                        <Input
                          id="mp-lote"
                          value={materiaPrimaForm.lote}
                          onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, lote: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mp-dataValidade">Data de Validade</Label>
                      <Input
                        id="mp-dataValidade"
                        type="date"
                        value={materiaPrimaForm.dataValidade}
                        onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, dataValidade: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingMateriaPrima ? "Atualizar" : "Cadastrar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Matérias-Primas</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{materiasPrimas.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Estoque Baixo</CardTitle>
                <Box className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{materiasPrimasBaixoEstoque}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {censorValue(formatCurrency(valorTotalMateriasPrimas), isValuesCensored)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Matérias-Primas</CardTitle>
              <CardDescription>Matérias-primas em estoque</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMateriasPrimas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma matéria-prima encontrada.</p>
                  <p className="text-sm">
                    {materiasPrimas.length === 0 
                      ? 'Clique em "Nova Matéria-Prima" para começar.'
                      : 'Tente ajustar os filtros de busca.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead className="w-[180px]">Nome</TableHead>
                      <TableHead className="w-[140px]">Fornecedor</TableHead>
                      <TableHead className="w-[100px]">Quantidade</TableHead>
                      <TableHead className="w-[100px]">Valor Unit.</TableHead>
                      <TableHead className="w-[100px]">Valor Total</TableHead>
                      <TableHead className="w-[100px]">Lote</TableHead>
                      <TableHead className="w-[100px]">Validade</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMateriasPrimas.map((mp) => {
                      const baixoEstoque = mp.quantidade <= mp.estoqueMinimo;
                      return (
                        <TableRow key={mp.id} className={baixoEstoque ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium text-xs font-mono">{mp.codigo}</TableCell>
                          <TableCell className="font-medium">
                            {mp.nome}
                            {baixoEstoque && (
                              <Badge variant="destructive" className="ml-2 text-xs px-1 py-0">Baixo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{mp.fornecedor}</TableCell>
                          <TableCell className="text-xs">
                            {mp.quantidade} {mp.unidade}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {censorValue(formatCurrency(mp.valorUnitario), isValuesCensored)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {censorValue(formatCurrency(mp.quantidade * mp.valorUnitario), isValuesCensored)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{mp.lote || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {mp.dataValidade ? new Date(mp.dataValidade).toLocaleDateString('pt-BR') : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMateriaPrimaEdit(mp)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMateriaPrimaDelete(mp.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}