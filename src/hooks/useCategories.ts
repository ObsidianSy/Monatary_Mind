// Legacy hook - mantido para compatibilidade
// Use useFinancialData.useCategories() para novos códigos
import { useMemo } from "react";
import { useFinanceiroClient, useFinanceiroRead } from "./useFinanceiro";

export interface Category {
  id: string;
  nome: string;
  tipo: "credito" | "debito" | "despesa" | "receita" | "transferencia";
  parent_id: string | null;
  ativo: boolean;
  is_deleted?: boolean;
  children?: Category[]; // API retorna children já aninhados
}

export interface CategoryTree {
  id: string;
  nome: string;
  tipo: "credito" | "debito" | "despesa" | "receita" | "transferencia";
  subcategorias: {
    id: string;
    nome: string;
  }[];
}

export function useCategories() {
  const client = useFinanceiroClient({ tenantId: "obsidian" });
  const { data: categories, loading, error, refresh } = useFinanceiroRead<Category>(
    client,
    "categoria",
    { limit: 100, offset: 0 },
    []
  );

  const categoryTree = useMemo(() => {
    if (!categories) return [];

    // A API já retorna com children aninhados, apenas converter para subcategorias
    return categories
      .filter(cat => cat.parent_id === null && !cat.is_deleted)
      .map(parent => ({
        id: parent.id,
        nome: parent.nome,
        tipo: parent.tipo,
        subcategorias: (parent.children || [])
          .filter(child => !child.is_deleted)
          .map(sub => ({
            id: sub.id,
            nome: sub.nome,
          }))
      }));
  }, [categories]);

  const subcategoriesForSelect = useMemo(() => {
    if (!categories) return [];
    
    // Achatar o array para pegar todas as subcategorias
    const allSubcategories: Array<{ id: string; nome: string; parent_id: string; parentName: string; tipo: string; fullName: string }> = [];
    
    categories
      .filter(cat => cat.parent_id === null && !cat.is_deleted)
      .forEach(parent => {
        (parent.children || [])
          .filter(child => !child.is_deleted)
          .forEach(sub => {
            allSubcategories.push({
              id: sub.id,
              nome: sub.nome,
              parent_id: parent.id,
              parentName: parent.nome,
              tipo: sub.tipo,
              fullName: `${parent.nome} → ${sub.nome}`
            });
          });
      });
    
    console.log('🔍 Subcategories for select:', allSubcategories);
    return allSubcategories;
  }, [categories]);

  return {
    categories: categories || [],
    categoryTree,
    subcategoriesForSelect,
    loading,
    error,
    refresh,
    // Category management methods
    createCategory: (nome: string, tipo: "despesa" | "receita" | "transferencia", subcategorias?: string[]) =>
      client.createCategory(nome, tipo, subcategorias),
    updateCategory: (id: string, nome: string, tipo: "despesa" | "receita" | "transferencia") =>
      client.updateCategory(id, nome, tipo),
    deleteCategory: (id: string) => client.deleteCategory(id),
    createSubcategory: (parent_id: string, nome: string) => client.createSubcategory(parent_id, nome),
    updateSubcategory: (id: string, parent_id: string, nome: string) => client.updateSubcategory(id, parent_id, nome),
    deleteSubcategory: (id: string) => client.deleteSubcategory(id)
  };
}