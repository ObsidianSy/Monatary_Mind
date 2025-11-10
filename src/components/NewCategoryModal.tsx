import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiroClient, usePostEvent } from "@/hooks/useFinanceiro";
import { categorySchema } from "@/schemas/validation";

interface NewCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CategoryForm {
  nome: string;
  tipo: "despesa" | "receita" | "transferencia";
  subcategorias: string[];
}

export function NewCategoryModal({ open, onOpenChange, onSuccess }: NewCategoryModalProps) {
  const [form, setForm] = useState<CategoryForm>({
    nome: "",
    tipo: "despesa",
    subcategorias: []
  });
  const [newSubcategory, setNewSubcategory] = useState("");

  const { toast } = useToast();
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  
  const { postEvent, posting } = usePostEvent(client, {
    onSuccess: () => {
      toast({
        title: "Categoria criada",
        description: "Nova categoria adicionada com sucesso.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setForm({
      nome: "",
      tipo: "despesa",
      subcategorias: []
    });
    setNewSubcategory("");
  };

  const addSubcategory = () => {
    if (newSubcategory.trim() && !form.subcategorias.includes(newSubcategory.trim())) {
      setForm(prev => ({
        ...prev,
        subcategorias: [...prev.subcategorias, newSubcategory.trim()]
      }));
      setNewSubcategory("");
    }
  };

  const removeSubcategory = (index: number) => {
    setForm(prev => ({
      ...prev,
      subcategorias: prev.subcategorias.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationData = {
      nome: form.nome.trim(),
      tipo: form.tipo,
    };

    const validation = categorySchema.safeParse(validationData);
    
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
      ...validation.data,
      is_deleted: false,
      ...(form.subcategorias.length > 0 && { subcategorias: form.subcategorias })
    };

    await postEvent("categoria.upsert", payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome da Categoria</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Alimentação"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(value: "despesa" | "receita" | "transferencia") => 
                setForm(prev => ({ ...prev, tipo: value }))}>
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

          <div>
            <Label>Subcategorias</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  placeholder="Digite uma subcategoria"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                />
                <Button type="button" onClick={addSubcategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {form.subcategorias.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.subcategorias.map((sub, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {sub}
                      <button
                        type="button"
                        onClick={() => removeSubcategory(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={posting}>
              {posting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Categoria
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}