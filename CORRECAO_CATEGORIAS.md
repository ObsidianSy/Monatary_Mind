# Correção da Hierarquia de Categorias

## Problema Identificado
O sistema não estava mostrando corretamente as categorias e subcategorias nas transações. A interface mostrava apenas as categorias principais, mas não as subcategorias.

## Estrutura do Banco de Dados
O banco PostgreSQL usa uma estrutura hierárquica simples na tabela `categoria`:
- **Categorias Principais**: `parent_id = NULL`
- **Subcategorias**: `parent_id = ID da categoria pai`

Exemplo:
```sql
-- Categoria Principal
id: "227ef89a-140b-4891-a680-5880fe636aaa"
nome: "Administrativo"
parent_id: NULL

-- Subcategoria
id: "82ad1b0e-7ab8-4b4c-8f86-a35743809dd8"
nome: "Agua/Esgoto"
parent_id: "227ef89a-140b-4891-a680-5880fe636aaa"  (aponta para Administrativo)
```

## Mudanças Realizadas

### 1. Backend (server/index.ts)

#### GET /api/transacoes
**Antes:**
```typescript
SELECT t.*, 
       c.nome as conta_nome,
       cat.nome as categoria_nome
FROM transacao t
LEFT JOIN conta c ON t.conta_id = c.id
LEFT JOIN categoria cat ON t.categoria_id = cat.id
```

**Depois:**
```typescript
SELECT t.*, 
       c.nome as conta_nome,
       cat.nome as categoria_nome,
       cat.parent_id as categoria_parent_id,
       cat.tipo as categoria_tipo,
       parent_cat.nome as categoria_pai_nome,
       parent_cat.id as categoria_pai_id
FROM transacao t
LEFT JOIN conta c ON t.conta_id = c.id
LEFT JOIN categoria cat ON t.categoria_id = cat.id
LEFT JOIN categoria parent_cat ON cat.parent_id = parent_cat.id
```

**Benefício:** Agora retorna tanto a categoria/subcategoria quanto sua categoria pai (se houver).

#### POST /api/transacoes
**Removido:** Campo `subcategoria_id`
**Mantido:** Apenas `categoria_id` (que pode ser uma categoria principal OU uma subcategoria)

### 2. Frontend

#### NewTransactionModal.tsx
**Antes:**
```typescript
interface TransactionForm {
  subcategoria_id: string;
  // ...
}
```

**Depois:**
```typescript
interface TransactionForm {
  categoria_id: string;  // Agora unificado
  // ...
}
```

**Mudança no Select:**
```tsx
<Select value={form.categoria_id} onValueChange={(value) => updateForm({ categoria_id: value })}>
  <SelectContent>
    {subcategoriesForSelect.map((sub) => (
      <SelectItem key={sub.id} value={sub.id}>
        {sub.fullName}  {/* Ex: "Administrativo → Agua/Esgoto" */}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Transacoes.tsx
**Antes:**
```typescript
const subcategoria = categories.find(c => c.id === apiTransaction.subcategoria_id);
const categoria = categories.find(c => c.id === apiTransaction.categoria_id);
```

**Depois:**
```typescript
// A API agora retorna categoria_nome e categoria_pai_nome diretamente
const categoryDisplay = apiTransaction.categoria_pai_nome || apiTransaction.categoria_nome || "Sem categoria";
const subcategoryDisplay = apiTransaction.categoria_pai_nome ? apiTransaction.categoria_nome : undefined;
```

### 3. Hook useCategories.ts
**Mantido sem alterações** - já estava preparado para trabalhar com hierarquia:
```typescript
const categoryTree = parentCategories.map(parent => ({
  id: parent.id,
  nome: parent.nome,
  tipo: parent.tipo,
  subcategorias: activeCategories
    .filter(cat => cat.parent_id === parent.id)
    .map(sub => ({
      id: sub.id,
      nome: sub.nome,
    }))
}));

const subcategoriesForSelect = categories
  .filter(cat => cat.parent_id !== null && !cat.is_deleted)
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
```

## Resultado

### Antes da Correção
- ❌ Transações mostravam apenas "Sem categoria"
- ❌ Modal de nova transação não mostrava subcategorias
- ❌ Tela de categorias não mostrava a hierarquia

### Depois da Correção
- ✅ **Transações mostram a hierarquia completa**
  - Exemplo: "Folha de pagamento → Sindicato"
  
- ✅ **Modal de nova transação mostra todas as subcategorias**
  - Seletor exibe: "Administrativo → Agua/Esgoto"
  
- ✅ **API de categorias retorna estrutura em árvore**
  ```json
  {
    "id": "227ef89a-...",
    "nome": "Administrativo",
    "tipo": "despesa",
    "children": [
      {
        "id": "82ad1b0e-...",
        "nome": "Agua/Esgoto"
      },
      {
        "id": "6aedd6bd-...",
        "nome": "Aluguel"
      }
    ]
  }
  ```

## Dados no Banco
- **11 categorias principais** (Administrativo, Empréstimos, Financeira, etc.)
- **82 subcategorias** distribuídas nas categorias principais
- **Todas as transações** usam `categoria_id` que pode apontar para categoria OU subcategoria

## Testes Executados

### 1. Teste de Categorias
```bash
node --import tsx server/test-categorias.ts
```
**Resultado:** ✅ 10 categorias principais e 10 subcategorias retornadas

### 2. Teste de API de Categorias
```bash
node --import tsx server/test-api-categorias.ts
```
**Resultado:** ✅ 11 categorias principais com 82 subcategorias total

### 3. Teste de API de Transações
```bash
node --import tsx server/test-api-transacoes.ts
```
**Resultado:** ✅ Todas as 5 transações retornam `categoria_pai_nome` e `categoria_nome`

Exemplo de transação retornada:
```json
{
  "descricao": "Sindicato",
  "valor": "40.00",
  "categoria_nome": "Sindicato",
  "categoria_pai_nome": "Folha de pagamento",
  "categoria_pai_id": "dd82dbed-9c9f-4f40-8721-636ce8062afc"
}
```

## Arquivos Modificados

### Backend
1. `server/index.ts`
   - Endpoint GET `/api/transacoes` - Adicionado JOIN com categoria pai
   - Endpoint POST `/api/transacoes` - Removido `subcategoria_id`
   - Endpoint GET `/api/recorrencias` - Adicionado JOIN com categoria pai
   - Endpoint POST `/api/recorrencias` - Removido `subcategoria_id`

### Frontend
1. `src/components/NewTransactionModal.tsx`
   - Interface `TransactionForm` - Substituído `subcategoria_id` por `categoria_id`
   - Todos os selects de categoria - Atualizado para usar `categoria_id`

2. `src/pages/Transacoes.tsx`
   - Interface `APITransaction` - Adicionado `categoria_pai_nome` e `categoria_pai_id`
   - Função `transformAPITransaction` - Usa dados da API diretamente

3. `src/components/ExemploFinanceiro.tsx`
   - Exemplo de criação - Substituído `subcategoria_id` por `categoria_id`

## Como Usar

### Criar uma Nova Transação
1. Abra o modal "Nova Transação"
2. No campo "Categoria", selecione uma opção do dropdown
3. As opções aparecem como: **"Categoria Pai → Subcategoria"**
4. O sistema salva o ID da subcategoria em `categoria_id`

### Visualizar Transações
- Na lista de transações, a categoria aparece como:
  - **Se for subcategoria:** "Folha de pagamento → Sindicato"
  - **Se for categoria principal:** "Administrativo"

### API Endpoints

**GET /api/categorias**
Retorna árvore com `children`:
```json
[
  {
    "id": "...",
    "nome": "Administrativo",
    "children": [
      { "id": "...", "nome": "Agua/Esgoto" }
    ]
  }
]
```

**GET /api/transacoes**
Retorna com hierarquia:
```json
[
  {
    "id": "...",
    "descricao": "Sindicato",
    "categoria_id": "e2ea444b-...",
    "categoria_nome": "Sindicato",
    "categoria_pai_nome": "Folha de pagamento",
    "categoria_pai_id": "dd82dbed-..."
  }
]
```

**POST /api/transacoes**
Enviar apenas `categoria_id`:
```json
{
  "tipo": "debito",
  "valor": 100.00,
  "descricao": "Pagamento",
  "conta_id": "...",
  "categoria_id": "e2ea444b-...",  // Pode ser categoria OU subcategoria
  "data_transacao": "2025-11-08"
}
```

## Conclusão
O sistema agora reflete corretamente a estrutura hierárquica do banco de dados PostgreSQL, onde `categoria_id` pode apontar tanto para categorias principais quanto para subcategorias, e a relação pai-filho é estabelecida pelo campo `parent_id`.
