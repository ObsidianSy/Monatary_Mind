import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Target,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Archive,
  Download,
  Upload
} from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Using Category interface from useCategories hook - no need to redefine

// Removed mock data - using real API data from useCategories hook

export default function Categorias() {
  const { 
    categoryTree, 
    loading, 
    refresh, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    createSubcategory, 
    updateSubcategory: updateSubcategoryHook, 
    deleteSubcategory 
  } = useCategories();
  const { toast } = useToast();
  
  // Initialize hooks at top level for categoria.upsert and categoria.delete events
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { postEvent } = usePostEvent(client, {
    onSuccess: () => {
      refresh();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState<any>(null);
  
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "despesa" as "despesa" | "receita" | "transferencia",
    color: "#3b82f6",
    icon: "📂",
    subcategories: [] as { name: string }[]
  });

  const [newSubcategory, setNewSubcategory] = useState({
    name: "",
    parent_id: ""
  });

  const [processing, setProcessing] = useState(false);

  // Auto-expand all categories when data loads
  useEffect(() => {
    if (categoryTree.length > 0) {
      setExpandedCategories(new Set(categoryTree.map(cat => cat.id)));
    }
  }, [categoryTree]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = categoryTree.filter(category => {
    const matchesSearch = category.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.subcategorias.some(sub => sub.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || 
                       (filterType === "income" && (category.tipo === "credito" || category.tipo === "receita")) ||
                       (filterType === "expense" && (category.tipo === "debito" || category.tipo === "despesa" || category.tipo === "transferencia"));
    
    return matchesSearch && matchesType;
  });

  const totalExpenses = categoryTree
    .filter(cat => cat.tipo === "debito" || cat.tipo === "despesa")
    .reduce((sum) => sum + 0, 0); // TODO: Add real amounts

  const totalIncome = categoryTree
    .filter(cat => cat.tipo === "credito" || cat.tipo === "receita")
    .reduce((sum) => sum + 0, 0); // TODO: Add real amounts

  const addSubcategory = () => {
    setNewCategory(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, { name: "" }]
    }));
  };

  const removeSubcategory = (index: number) => {
    setNewCategory(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const updateSubcategory = (index: number, name: string) => {
    setNewCategory(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sub, i) => 
        i === index ? { ...sub, name } : sub
      )
    }));
  };

  const resetNewCategoryForm = () => {
    setNewCategory({
      name: "",
      type: "despesa",
      color: "#3b82f6",
      icon: "📂",
      subcategories: []
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome da categoria.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const subcategorias = newCategory.subcategories
        .filter(sub => sub.name.trim())
        .map(sub => sub.name.trim());

      // Use the standardized categoria.upsert event
      await postEvent("categoria.upsert", {
        nome: newCategory.name.trim(),
        tipo: newCategory.type,
        is_deleted: false,
        ...(subcategorias.length > 0 && { subcategorias })
      });
      
      toast({
        title: "Categoria criada",
        description: "Nova categoria adicionada com sucesso.",
      });
      resetNewCategoryForm();
      setIsCreateModalOpen(false);
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory?.nome?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome da categoria.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      await updateCategory(editingCategory.id, editingCategory.nome, editingCategory.tipo);
      
      toast({
        title: "Categoria atualizada",
        description: "Categoria editada com sucesso.",
      });
      setIsEditModalOpen(false);
      setEditingCategory(null);
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao editar categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoryName}" e todas suas subcategorias?`)) {
      return;
    }

    setProcessing(true);
    try {
      // Use the standardized categoria.delete event
      await postEvent("categoria.delete", { id: categoryId });
      
      toast({
        title: "Categoria excluída",
        description: "Categoria removida com sucesso.",
      });
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategory.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome da subcategoria.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      await createSubcategory(newSubcategory.parent_id, newSubcategory.name);
      
      toast({
        title: "Subcategoria criada",
        description: "Nova subcategoria adicionada com sucesso.",
      });
      setNewSubcategory({ name: "", parent_id: "" });
      setIsSubcategoryModalOpen(false);
      setSelectedParentCategory(null);
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao criar subcategoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory?.nome?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome da subcategoria.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      await updateSubcategoryHook(editingSubcategory.id, editingSubcategory.parent_id, editingSubcategory.nome);
      
      toast({
        title: "Subcategoria atualizada",
        description: "Subcategoria editada com sucesso.",
      });
      setEditingSubcategory(null);
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao editar subcategoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, subcategoryName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a subcategoria "${subcategoryName}"?`)) {
      return;
    }

    setProcessing(true);
    try {
      await deleteSubcategory(subcategoryId);
      
      toast({
        title: "Subcategoria excluída",
        description: "Subcategoria removida com sucesso.",
      });
      refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir subcategoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openEditCategoryModal = (category: any) => {
    setEditingCategory({ ...category });
    setIsEditModalOpen(true);
  };

  const openSubcategoryModal = (parentCategory: any) => {
    setSelectedParentCategory(parentCategory);
    setNewSubcategory({ name: "", parent_id: parentCategory.id });
    setIsSubcategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (subcategory: any, parentCategory: any) => {
    setEditingSubcategory({ 
      ...subcategory,
      parent_id: parentCategory.id 
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground">
            Organize suas transações por categorias e subcategorias
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Categoria</DialogTitle>
                <DialogDescription>
                  Defina uma nova categoria para organizar suas transações
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-name">Nome da Categoria</Label>
                    <Input
                      id="category-name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Alimentação"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-type">Tipo</Label>
                    <Select value={newCategory.type} onValueChange={(value: "despesa" | "receita" | "transferencia") => setNewCategory(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-icon">Ícone</Label>
                    <Input
                      id="category-icon"
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="📂"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">Cor</Label>
                    <Input
                      id="category-color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Subcategorias</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSubcategory}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {newCategory.subcategories.map((sub, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={sub.name}
                          onChange={(e) => updateSubcategory(index, e.target.value)}
                          placeholder="Nome da subcategoria"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSubcategory(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={processing}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCategory} disabled={processing}>
                  {processing && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Criar Categoria
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Category Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Categoria</DialogTitle>
                <DialogDescription>
                  Modifique os dados da categoria
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-category-name">Nome da Categoria</Label>
                    <Input
                      id="edit-category-name"
                      value={editingCategory?.nome || ""}
                      onChange={(e) => setEditingCategory(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Alimentação"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category-type">Tipo</Label>
                    <Select 
                      value={editingCategory?.tipo || "despesa"} 
                      onValueChange={(value: "despesa" | "receita" | "transferencia") => 
                        setEditingCategory(prev => ({ ...prev, tipo: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={processing}>
                  Cancelar
                </Button>
                <Button onClick={handleEditCategory} disabled={processing}>
                  {processing && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Subcategory Modal */}
          <Dialog open={isSubcategoryModalOpen} onOpenChange={setIsSubcategoryModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Subcategoria</DialogTitle>
                <DialogDescription>
                  Adicionar uma nova subcategoria à categoria "{selectedParentCategory?.nome}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subcategory-name">Nome da Subcategoria</Label>
                  <Input
                    id="subcategory-name"
                    value={newSubcategory.name}
                    onChange={(e) => setNewSubcategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Supermercado"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSubcategoryModalOpen(false)} disabled={processing}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSubcategory} disabled={processing}>
                  {processing && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Criar Subcategoria
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Subcategory Modal */}
          {editingSubcategory && (
            <Dialog open={!!editingSubcategory} onOpenChange={() => setEditingSubcategory(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Subcategoria</DialogTitle>
                  <DialogDescription>
                    Modifique os dados da subcategoria
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-subcategory-name">Nome da Subcategoria</Label>
                    <Input
                      id="edit-subcategory-name"
                      value={editingSubcategory?.nome || ""}
                      onChange={(e) => setEditingSubcategory(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Supermercado"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingSubcategory(null)} disabled={processing}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEditSubcategory} disabled={processing}>
                    {processing && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    Salvar Alterações
                  </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-success/20 bg-gradient-to-r from-success/5 to-success/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{formatCurrency(totalIncome)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {categoryTree.filter(c => c.tipo === "credito" || c.tipo === "receita").length} categorias
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-{formatCurrency(totalExpenses)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {categoryTree.filter(c => c.tipo === "debito" || c.tipo === "despesa").length} categorias
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{categoryTree.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {categoryTree.reduce((sum, cat) => sum + cat.subcategorias.length, 0)} subcategorias
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar categoria ou subcategoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Lista de Categorias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredCategories.map((category, categoryIndex) => {
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <div 
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      categoryIndex !== filteredCategories.length - 1 ? 'border-b border-border' : ''
                    }`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm bg-primary"
                          >
                            📂
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{category.nome}</h3>
                            <Badge variant="outline" className={
                              (category.tipo === "credito" || category.tipo === "receita") ? "text-success border-success/20" : 
                              category.tipo === "transferencia" ? "text-primary border-primary/20" : "text-destructive border-destructive/20"
                            }>
                              {category.tipo === "credito" || category.tipo === "receita" ? "Receita" : 
                               category.tipo === "transferencia" ? "Transferência" : "Despesa"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.subcategorias.length} subcategorias
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            (category.tipo === "credito" || category.tipo === "receita") ? "text-success" : "text-destructive"
                          }`}>
                            {(category.tipo === "credito" || category.tipo === "receita") ? "+" : "-"}{formatCurrency(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Este mês
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openSubcategoryModal(category)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditCategoryModal(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category.id, category.nome)}
                            disabled={processing}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subcategories */}
                  {isExpanded && (
                    <div className="bg-muted/30">
                      {category.subcategorias.map((subcategory, subIndex) => (
                        <div 
                          key={subcategory.id}
                          className={`p-4 pl-16 hover:bg-muted/50 transition-colors ${
                            subIndex !== category.subcategorias.length - 1 ? 'border-b border-border/50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{subcategory.nome}</h4>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                0 transações
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className={`font-semibold ${
                                  (category.tipo === "credito" || category.tipo === "receita") ? "text-success" : "text-destructive"
                                }`}>
                                  {(category.tipo === "credito" || category.tipo === "receita") ? "+" : "-"}{formatCurrency(0)}
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openEditSubcategoryModal(subcategory, category)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSubcategory(subcategory.id, subcategory.nome)}
                                  disabled={processing}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}