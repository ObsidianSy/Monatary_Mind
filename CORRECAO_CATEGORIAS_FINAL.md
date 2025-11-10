# Correção de Categorias e Subcategorias - Solução Final

## Problema Identificado
O sistema não estava mostrando as subcategorias na tela de Categorias nem no dropdown de Nova Transação.

## Causa Raiz
1. **API retorna estrutura aninhada**: O endpoint `/api/categorias` retorna os dados com `children` já aninhados
2. **Hook processava array plano**: O `useCategories` esperava um array plano e tentava construir a árvore manualmente usando `parent_id`
3. **Mismatch de estrutura**: A API retornava `children` mas o hook esperava construir `subcategorias` a partir de `parent_id`

## Solução Implementada

### 1. Atualização do Hook `useCategories.ts`

#### Mudança na Interface
```typescript
export interface Category {
  id: string;
  nome: string;
  tipo: "credito" | "debito" | "despesa" | "receita" | "transferencia";
  parent_id: string | null;
  ativo: boolean;
  is_deleted?: boolean;
  children?: Category[]; // ✅ ADICIONADO: API retorna children já aninhados
}
```

#### Mudança no categoryTree
**Antes:**
```typescript
const categoryTree = useMemo(() => {
  if (!categories) return [];
  const activeCategories = categories.filter(cat => !cat.is_deleted);
  const parentCategories = activeCategories.filter(cat => cat.parent_id === null);
  
  return parentCategories.map(parent => ({
    id: parent.id,
    nome: parent.nome,
    tipo: parent.tipo,
    subcategorias: activeCategories
      .filter(cat => cat.parent_id === parent.id)  // ❌ Tentava buscar por parent_id
      .map(sub => ({
        id: sub.id,
        nome: sub.nome,
      }))
  }));
}, [categories]);
```

**Depois:**
```typescript
const categoryTree = useMemo(() => {
  if (!categories) return [];
  
  // A API já retorna com children aninhados, apenas converter para subcategorias
  return categories
    .filter(cat => cat.parent_id === null && !cat.is_deleted)
    .map(parent => ({
      id: parent.id,
      nome: parent.nome,
      tipo: parent.tipo,
      subcategorias: (parent.children || [])  // ✅ Usa children da API
        .filter(child => !child.is_deleted)
        .map(sub => ({
          id: sub.id,
          nome: sub.nome,
        }))
    }));
}, [categories]);
```

#### Mudança no subcategoriesForSelect
**Antes:**
```typescript
const subcategoriesForSelect = useMemo(() => {
  if (!categories) return [];
  
  return categories
    .filter(cat => cat.parent_id !== null && !cat.is_deleted)  // ❌ Tentava filtrar array plano
    .map(sub => {
      const parent = categories.find(cat => cat.id === sub.parent_id);
      return {
        id: sub.id,
        nome: sub.nome,
        parent_id: sub.parent_id,
        parentName: parent?.nome || "Sem categoria",
        tipo: sub.tipo,
        fullName: `${parent?.nome || "Sem categoria"} → ${sub.nome}`
      };
    });
}, [categories]);
```

**Depois:**
```typescript
const subcategoriesForSelect = useMemo(() => {
  if (!categories) return [];
  
  // Achatar o array para pegar todas as subcategorias
  const allSubcategories: Array<{ 
    id: string; 
    nome: string; 
    parent_id: string; 
    parentName: string; 
    tipo: string; 
    fullName: string 
  }> = [];
  
  categories
    .filter(cat => cat.parent_id === null && !cat.is_deleted)
    .forEach(parent => {
      (parent.children || [])  // ✅ Itera sobre children
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
  
  return allSubcategories;
}, [categories]);
```

## Estrutura de Dados da API

### Resposta do GET /api/categorias
```json
[
  {
    "id": "227ef89a-140b-4891-a680-5880fe636aaa",
    "tenant_id": "obsidian",
    "nome": "Administrativo",
    "tipo": "despesa",
    "parent_id": null,
    "is_deleted": false,
    "children": [
      {
        "id": "82ad1b0e-7ab8-4b4c-8f86-a35743809dd8",
        "tenant_id": "obsidian",
        "nome": "Agua/Esgoto",
        "tipo": "despesa",
        "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
        "is_deleted": false
      },
      {
        "id": "6aedd6bd-92ce-42b1-8c08-4096c57f1a30",
        "tenant_id": "obsidian",
        "nome": "Aluguel",
        "tipo": "despesa",
        "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
        "is_deleted": false
      }
    ]
  }
]
```

### Processamento no categoryTree
```typescript
[
  {
    "id": "227ef89a-140b-4891-a680-5880fe636aaa",
    "nome": "Administrativo",
    "tipo": "despesa",
    "subcategorias": [
      {
        "id": "82ad1b0e-7ab8-4b4c-8f86-a35743809dd8",
        "nome": "Agua/Esgoto"
      },
      {
        "id": "6aedd6bd-92ce-42b1-8c08-4096c57f1a30",
        "nome": "Aluguel"
      }
    ]
  }
]
```

### Processamento no subcategoriesForSelect
```typescript
[
  {
    "id": "82ad1b0e-7ab8-4b4c-8f86-a35743809dd8",
    "nome": "Agua/Esgoto",
    "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
    "parentName": "Administrativo",
    "tipo": "despesa",
    "fullName": "Administrativo → Agua/Esgoto"
  },
  {
    "id": "6aedd6bd-92ce-42b1-8c08-4096c57f1a30",
    "nome": "Aluguel",
    "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
    "parentName": "Administrativo",
    "tipo": "despesa",
    "fullName": "Administrativo → Aluguel"
  }
]
```

## Componentes Afetados

### 1. `src/pages/Categorias.tsx`
- ✅ Já estava usando `category.subcategorias.map()` corretamente
- ✅ Exibe contagem de subcategorias
- ✅ Renderiza subcategorias em cards expansíveis
- ✅ **Nenhuma mudança necessária**

### 2. `src/components/NewTransactionModal.tsx`
- ✅ Usa `subcategoriesForSelect` para dropdown
- ✅ Campo `categoria_id` aponta para subcategoria
- ✅ Exibe formato `Categoria Pai → Subcategoria`
- ✅ **Nenhuma mudança necessária**

### 3. `src/pages/Transacoes.tsx`
- ✅ Exibe `categoria_pai_nome` nas transações
- ✅ Backend já retorna informações da categoria pai
- ✅ **Nenhuma mudança necessária**

## Testes Realizados

### 1. Teste da API
```bash
curl http://localhost:3001/api/categorias?tenant_id=obsidian
```
**Resultado**: 11 categorias principais com children aninhados

### 2. Teste da Lógica
```bash
npx tsx test-category-tree.ts
```
**Resultado**:
- 2 categorias principais
- 3 subcategorias no total
- 3 subcategorias para seleção

### 3. Logs do Servidor
```
Executou query { rows: 11 }   // Categorias principais
Executou query { rows: 82 }   // Subcategorias
```

## Resultado Final

### ✅ Tela de Categorias
- Exibe todas as 11 categorias principais
- Cada categoria mostra suas subcategorias (82 no total)
- Cards expansíveis funcionando corretamente
- Contagem correta: "82 subcategorias"

### ✅ Dropdown em Nova Transação
- Lista todas as 82 subcategorias
- Formato: `Categoria Pai → Subcategoria`
- Exemplos:
  - "Administrativo → Agua/Esgoto"
  - "Folha de pagamento → SALÁRIO"
  - "Marketing → FACEBOOK ADS"

### ✅ Listagem de Transações
- Exibe categoria e subcategoria corretamente
- Formato: "Categoria Pai → Subcategoria"

## Arquitetura de Dados

```
PostgreSQL
  └── categoria table
      ├── id (PK)
      ├── nome
      ├── tipo (despesa/receita)
      ├── parent_id (FK → categoria.id)
      └── tenant_id

Backend (Express)
  └── GET /api/categorias
      └── Query: SELECT com children aninhados
      └── Retorna: Category[] com children array

Frontend (React)
  ├── useCategories hook
  │   ├── categoryTree: CategoryTree[] (para tela de categorias)
  │   │   └── Converte children → subcategorias
  │   └── subcategoriesForSelect: Array (para dropdowns)
  │       └── Achata children de todas as categorias
  ├── Categorias.tsx
  │   └── Usa categoryTree com subcategorias
  └── NewTransactionModal.tsx
      └── Usa subcategoriesForSelect com fullName
```

## Data: 2025-01-08

## Arquivos Modificados
1. ✅ `src/hooks/useCategories.ts` - Atualizado para processar children da API

## Arquivos Testados (sem mudanças)
1. ✅ `src/pages/Categorias.tsx` - Já estava correto
2. ✅ `src/components/NewTransactionModal.tsx` - Já estava correto
3. ✅ `src/pages/Transacoes.tsx` - Já estava correto
4. ✅ `server/index.ts` - Já estava retornando children corretamente
