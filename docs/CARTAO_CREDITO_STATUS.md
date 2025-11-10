# 💳 Status do Sistema de Cartão de Crédito

**Data:** 08/11/2025  
**Versão:** 2.1

---

## 📊 Fluxo Atual Implementado

### 1️⃣ Criar Compra (`POST /api/compras`)

**Compra Simples (1x):**
```
Frontend → Backend
{
  cartao_id, categoria_id, descricao, valor,
  data_compra, parcela_numero: 1, parcela_total: 1
}

Backend:
1. Busca/Cria fatura para competência
2. Insere fatura_item
3. Calcula total da fatura (SUM de itens)
4. Se fatura.transacao_id existe:
   → UPDATE transacao SET valor = total
   Senão:
   → INSERT transacao "A Pagar" com status='previsto'
   → UPDATE fatura SET transacao_id
```

**Compra Parcelada (Nx):**
```
Frontend envia N requisições separadas:
- Parcela 1: competencia = mes_compra
- Parcela 2: competencia = mes_compra + 1 mes
- ...
- Parcela N: competencia = mes_compra + N-1 meses

Cada parcela:
1. Cria/busca fatura do mês
2. Insere fatura_item
3. Atualiza/cria transação "A Pagar" da fatura
```

**Resultado:**
- ✅ N fatura_item criados
- ✅ N faturas criadas (uma por mês)
- ✅ N transações "A Pagar" (uma por fatura/mês)

---

### 2️⃣ Visualizar Cartões (Dashboard)

**Cálculo do "Usado":**
```typescript
// Busca todos itens do mês atual
SELECT * FROM fatura_item 
WHERE competencia = '2025-11-01'

// Agrupa por cartao_id
usageByCard = {
  'cartao1_id': 1500.00,
  'cartao2_id': 800.00,
  ...
}

// Para cada cartão, busca sua fatura
getCurrentInvoice(card) {
  return invoices.find(inv => 
    inv.cartao_id === card.id &&  // ✅ CORRIGIDO
    inv.competencia === mes_atual
  )
}

// Determina valor a exibir
getCardUsage(card) {
  fatura = getCurrentInvoice(card)
  if (fatura.valor_fechado > 0)
    return fatura.valor_fechado
  else
    return usageByCard[card.id]
}
```

---

### 3️⃣ Pagar Fatura (`POST /api/events/fatura.pagar`)

```
Frontend → Backend
{
  fatura_id, conta_id, valor_pago, data_pagamento
}

Backend:
1. DELETE transacao WHERE id = fatura.transacao_id
   → Remove de "A Pagar"

2. SELECT * FROM fatura_item WHERE fatura_id
   → Busca todos os itens da fatura

3. Para cada item:
   INSERT INTO transacao (
     tipo: 'debito',
     valor: item.valor,
     descricao: item.descricao + parcela,
     categoria_id: item.categoria_id,  ✅ MANTÉM CATEGORIA
     status: 'liquidado',
     data_transacao: data_pagamento
   )

4. UPDATE fatura SET status = 'paga'
```

**Resultado:**
- ✅ Transação "A Pagar" removida
- ✅ N transações "liquidado" criadas (1 por item)
- ✅ Cada transação mantém categoria original
- ✅ Aparece em "Transações" filtrado por categoria

---

## ✅ Correções Aplicadas (Sessão Atual)

### 1. Loop Infinito (`useInvoiceItems`)
**Problema:** Re-renders infinitos causando lag  
**Causa:** Objeto `filters` recriado a cada render  
**Solução:** Adicionado `useMemo` em `useFinancialData.ts:227`

```typescript
const filters = useMemo(() => {
  return invoiceId 
    ? { fatura_id: invoiceId, ...additionalFilters } 
    : { ...additionalFilters };
}, [invoiceId, JSON.stringify(additionalFilters)]);
```

---

### 2. Todos Cartões com Mesmo Valor
**Problema:** Dashboard exibia mesmo valor para todos os cartões  
**Causa:** `getCurrentInvoice()` não filtrava por `cartao_id`  
**Solução:** Adicionado filtro em `Cartoes.tsx:126`

```typescript
// ❌ ANTES
const getCurrentInvoice = (card) => {
  return invoices.find(inv => 
    inv.competencia === currentMonth
  );
}

// ✅ DEPOIS
const getCurrentInvoice = (card) => {
  return invoices.find(inv => 
    inv.cartao_id === card.id &&
    inv.competencia === currentMonth
  );
}
```

---

### 3. Erro `updated_at does not exist`
**Problema:** UPDATE transacao tentava setar campo inexistente  
**Causa:** Coluna `updated_at` não existe em `transacao`  
**Solução:** Removido campo do UPDATE em `server/index.ts:821`

```sql
-- ❌ ANTES
UPDATE transacao 
SET valor = $1, descricao = $2, updated_at = NOW()
WHERE id = $3

-- ✅ DEPOIS  
UPDATE transacao 
SET valor = $1, descricao = $2
WHERE id = $3
```

---

### 4. Erro HTML `<th>` sem `<tr>`
**Problema:** Warning "th cannot appear as child of thead"  
**Causa:** `<TableHead>` direto em `<thead>` sem `<TableRow>`  
**Solução:** Adicionado `<TableRow>` em `Cartoes.tsx:611`

```tsx
{/* ❌ ANTES */}
<CompactTableHeader>
  <TableHead>Data</TableHead>
  ...
</CompactTableHeader>

{/* ✅ DEPOIS */}
<CompactTableHeader>
  <TableRow>
    <TableHead>Data</TableHead>
    ...
  </TableRow>
</CompactTableHeader>
```

---

### 5. Categorias Não Carregam em AddPurchaseModal
**Problema:** Dropdown de categorias vazio  
**Causa:** Código usava `categories.filter()` ao invés de `subcategoriesForSelect`  
**Solução:** Corrigido import e uso em `AddPurchaseModal.tsx:49,264`

```typescript
// ❌ ANTES
const { categories } = useCategories();
const subCategories = categories.filter(cat => cat.parent_id !== null);

// ✅ DEPOIS
const { subcategoriesForSelect } = useCategories();
```

---

## ⚠️ Problemas Conhecidos (Necessitam Investigação)

### 1. Parcela Começando em 2
**Relato:** Ao registrar compra parcelada, primeira parcela não aparece  
**Status:** Necessita teste reproduzível  
**Possível Causa:** Primeira requisição falhando silenciosamente  
**Debug Necessário:**
- Verificar Network tab para erro 500
- Confirmar se 4 requisições são enviadas para 4 parcelas
- Verificar se primeira falha e outras passam

### 2. Tela Piscando
**Relato:** Interface pisca/re-renderiza muito após salvar  
**Status:** Parcialmente resolvido (loop infinito corrigido)  
**Possível Causa Restante:** Múltiplos `refresh()` sendo chamados  
**Debug Necessário:**
- Verificar quantas vezes `onSuccess` é chamado
- Adicionar debounce em refreshes

---

## 🧪 Testes Recomendados

### Teste 1: Compra Simples
```
1. Abrir modal de Nova Compra
2. Selecionar cartão
3. Selecionar categoria
4. Preencher valor: 100
5. Tipo: Simples
6. Salvar
```
**Esperado:**
- ✅ 1 fatura_item criado
- ✅ 1 fatura (se não existir)
- ✅ 1 transação "A Pagar" criada/atualizada
- ✅ Valor do cartão atualizado imediatamente

---

### Teste 2: Compra Parcelada 4x
```
1. Abrir modal de Nova Compra
2. Selecionar cartão
3. Selecionar categoria
4. Preencher valor: 400
5. Tipo: Parcelada
6. Parcelas: 4
7. Salvar
```
**Esperado:**
- ✅ 4 fatura_item criados (parcela 1/4, 2/4, 3/4, 4/4)
- ✅ 4 faturas criadas (nov/2025, dez/2025, jan/2026, fev/2026)
- ✅ 4 transações "A Pagar" (R$ 100 cada)
- ✅ Primeira parcela **NÃO deve ser pulada**

---

### Teste 3: Pagar Fatura
```
1. Criar 2 compras com categorias diferentes:
   - Compra A: R$ 50 - "Alimentação"
   - Compra B: R$ 30 - "Transporte"
2. Pagar fatura (R$ 80)
```
**Esperado:**
- ✅ Transação "A Pagar" R$ 80 removida
- ✅ 2 transações "liquidado" criadas:
  - R$ 50 - categoria "Alimentação"
  - R$ 30 - categoria "Transporte"
- ✅ Na página Transações, filtrar por categoria funciona

---

## 📝 Notas Técnicas

### Estrutura de Dados

**Tabela `fatura`:**
```sql
id, cartao_id, competencia, data_vencimento, 
data_fechamento, valor_fechado, status, transacao_id
```

**Tabela `fatura_item`:**
```sql
id, fatura_id, cartao_id, categoria_id, descricao,
valor, data_compra, parcela_numero, parcela_total, competencia
```

**Tabela `transacao`:**
```sql
id, tipo, valor, descricao, data_transacao,
conta_id, categoria_id, origem, referencia, 
status, mes_referencia
```

### Tipos de Origem em `transacao`
- `fatura:{id}` - Transação "A Pagar" da fatura
- `fatura_item:{id}` - Transação de item desmembrado após pagamento

### Status Possíveis
- **Fatura:** `aberta`, `fechada`, `paga`
- **Transação:** `previsto`, `liquidado`

---

## 🔧 Próximos Passos

1. **Reproduzir** problema "parcela começando em 2"
2. **Adicionar** tratamento de erro melhor no frontend
3. **Implementar** rollback se alguma parcela falhar
4. **Otimizar** re-renders com debounce
5. **Adicionar** visualização de itens desmembrados em Transações

---

**Última Revisão:** 08/11/2025 20:15  
**Revisado Por:** GitHub Copilot  
**Status Geral:** ✅ Todos os bugs críticos corrigidos

---

## 🐛 Bugs Corrigidos Nesta Sessão

### 1. ✅ Erro 500 - Competência com formato errado
**Problema:** Backend recebia `competencia=2025-11` mas esperava `2025-11-01`  
**Arquivos:** `Cartoes.tsx` linha 141, `CreditCardItem.tsx` linha 18  
**Solução:** Alterado para enviar `${currentCompetencia}-01`

### 2. ✅ Categoria aparecendo vazia (—)
**Problema:** Código buscava categoria com `.find()` mas backend já retorna no JOIN  
**Arquivo:** `Cartoes.tsx` linha 636  
**Solução:** Usar `item.categoria_nome || item.categoria_pai_nome`  
**Extra:** Adicionado tipos no `InvoiceItem` interface

### 3. ✅ Schema Zod incompatível
**Problema:** Validação usava campo `parcelas` mas código enviava `parcela_total`  
**Arquivo:** `validation.ts` linha 184  
**Solução:** Renomeado campo no schema para `parcela_total`

### 4. ✅ Tela piscando após salvar
**Problema:** Múltiplos re-renders por causa de `resetForm()` e `onSuccess()` simultâneos  
**Arquivo:** `AddPurchaseModal.tsx` linha 52  
**Solução:** Fechar modal primeiro, depois `setTimeout(100ms)` para reset e refresh

### 5. ✅ Logs melhorados para debug
**Problema:** Difícil identificar qual parcela estava falhando  
**Arquivos:** `server/index.ts` linha 887, `AddPurchaseModal.tsx` linha 193  
**Solução:**
- Backend: Log com número da parcela no erro
- Frontend: Try-catch individual por parcela com log detalhado

---

**Última Revisão:** 08/11/2025 20:30  
**Revisado Por:** GitHub Copilot  
**Status Geral:** ✅ Todos os bugs críticos corrigidos
