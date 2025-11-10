# 💳 Fluxo de Fatura de Cartão de Crédito

## 📋 Visão Geral

Sistema de fatura inteligente onde cada fatura mantém **UMA única transação "A Pagar"** que é atualizada dinamicamente conforme compras são adicionadas. Quando a fatura é paga, essa transação é removida e substituída por transações individuais de cada item (desmembramento).

---

## 🔄 Fluxo Completo

### 1️⃣ Primeira Compra no Cartão
**Endpoint:** `POST /api/compras`

```json
{
  "cartao_id": 1,
  "valor": 100.00,
  "descricao": "Notebook Dell",
  "data_compra": "2025-01-15",
  "categoria_id": 5,
  "parcelas": 10
}
```

**O que acontece:**
1. ✅ Cria 10 registros em `fatura_item` (1 por mês)
2. ✅ Cria ou busca 10 faturas (competência: 2025-01 a 2025-10)
3. ✅ Para cada fatura:
   - Calcula valor total (`SUM(valor) WHERE fatura_id`)
   - **CRIA** transação "A Pagar" com status `previsto`
   - Salva `transacao_id` na fatura

**Resultado em "A Pagar":**
```
| Descrição                 | Valor  | Vencimento | Status    |
|---------------------------|--------|------------|-----------|
| Fatura Nubank - Jan/2025  | 100.00 | 2025-02-05 | previsto  |
| Fatura Nubank - Fev/2025  | 100.00 | 2025-03-05 | previsto  |
| ...                       | ...    | ...        | ...       |
| Fatura Nubank - Out/2025  | 100.00 | 2025-11-05 | previsto  |
```

---

### 2️⃣ Segunda Compra no Mesmo Mês
**Endpoint:** `POST /api/compras`

```json
{
  "cartao_id": 1,
  "valor": 50.00,
  "descricao": "Mouse Logitech",
  "data_compra": "2025-01-20",
  "categoria_id": 5,
  "parcelas": 1
}
```

**O que acontece:**
1. ✅ Cria 1 registro em `fatura_item`
2. ✅ Busca fatura existente (competência: 2025-01)
3. ✅ Calcula novo valor total: 100 + 50 = **150.00**
4. ✅ **ATUALIZA** transação existente (`UPDATE transacao SET valor = 150`)

**Resultado em "A Pagar":**
```
| Descrição                 | Valor  | Vencimento | Status    |
|---------------------------|--------|------------|-----------|
| Fatura Nubank - Jan/2025  | 150.00 | 2025-02-05 | previsto  | ⬅️ ATUALIZADO
| Fatura Nubank - Fev/2025  | 100.00 | 2025-03-05 | previsto  |
| ...                       | ...    | ...        | ...       |
```

---

### 3️⃣ Fechar Fatura
**Endpoint:** `POST /api/events/fatura.fechar`

```json
{
  "fatura_id": 1
}
```

**O que acontece:**
1. ✅ Calcula valor total final
2. ✅ Atualiza `fatura.status = 'fechada'`
3. ✅ Atualiza `fatura.valor_fechado = 150.00`
4. ❌ **NÃO cria transação** (já existe desde primeira compra)

**Resultado:**
- Fatura marcada como "fechada"
- Transação "A Pagar" permanece com valor **150.00**

---

### 4️⃣ Pagar Fatura
**Endpoint:** `POST /api/events/fatura.pagar`

```json
{
  "fatura_id": 1,
  "conta_id": 2,
  "data_pagamento": "2025-02-05"
}
```

**O que acontece:**

#### 4.1 - Remove Transação "A Pagar"
```sql
DELETE FROM financeiro.transacao 
WHERE id = fatura.transacao_id;
```

#### 4.2 - Desmembra Itens (Cria Transações Individuais)
Para cada `fatura_item`:
```sql
INSERT INTO financeiro.transacao (
  tipo, valor, descricao, data_transacao, conta_id, categoria_id,
  origem, referencia, status, mes_referencia
) VALUES (
  'debito',
  100.00,  -- valor do item
  'Notebook Dell (1/10)',
  '2025-02-05',  -- data_pagamento
  2,  -- conta_id
  5,  -- categoria_id do item
  'fatura_item:123',
  'Item fatura Nubank - 2025-01-15',
  'liquidado',  -- ✅ PAGO
  '2025-02'
);
```

**Resultado em "Efetivadas":**
```
| Descrição                 | Valor  | Data       | Categoria | Conta  | Status     |
|---------------------------|--------|------------|-----------|--------|------------|
| Notebook Dell (1/10)      | 100.00 | 2025-02-05 | Eletrônic | Itaú   | liquidado  |
| Mouse Logitech            | 50.00  | 2025-02-05 | Eletrônic | Itaú   | liquidado  |
```

**Resultado em "A Pagar":**
```
| Descrição                 | Valor  | Vencimento | Status    |
|---------------------------|--------|------------|-----------|
| Fatura Nubank - Fev/2025  | 100.00 | 2025-03-05 | previsto  |
| ...                       | ...    | ...        | ...       |
```
*✅ Fatura de Janeiro **DESAPARECEU** de "A Pagar"*

---

## 🔧 Detalhes Técnicos

### Estrutura de Dados

#### Tabela `fatura`
```sql
id              SERIAL PRIMARY KEY
cartao_id       INTEGER NOT NULL
competencia     DATE NOT NULL  -- Primeiro dia do mês (2025-01-01)
data_vencimento DATE NOT NULL  -- Dia de vencimento (2025-02-05)
data_fechamento DATE
valor_fechado   DECIMAL(10,2)
status          VARCHAR(20)  -- 'aberta', 'fechada', 'paga'
transacao_id    INTEGER      -- ⭐ FK para transação "A Pagar"
```

#### Tabela `fatura_item`
```sql
id             SERIAL PRIMARY KEY
fatura_id      INTEGER NOT NULL
descricao      VARCHAR(255)
valor          DECIMAL(10,2)
categoria_id   INTEGER
data_compra    DATE
parcela_numero INTEGER  -- 1 a N
parcela_total  INTEGER  -- N parcelas
```

#### Tabela `transacao`
```sql
id              SERIAL PRIMARY KEY
tipo            VARCHAR(20)  -- 'debito'
valor           DECIMAL(10,2)
descricao       VARCHAR(255)
data_transacao  DATE
conta_id        INTEGER
categoria_id    INTEGER
origem          VARCHAR(50)  -- 'fatura:123' ou 'fatura_item:456'
referencia      VARCHAR(255)
status          VARCHAR(20)  -- 'previsto' ou 'liquidado'
mes_referencia  VARCHAR(7)   -- 'YYYY-MM'
```

---

### Conversão de Tipos de Data

⚠️ **IMPORTANTE:** PostgreSQL retorna datas como objetos `Date`, não strings.

#### ✅ CORRETO: Converter antes de usar `.substring()`
```typescript
// Ler data do banco
const faturaInfo = await client.query('SELECT * FROM fatura WHERE id = $1', [id]);

// Converter Date para string
const dataVencimentoStr = faturaInfo.data_vencimento instanceof Date
  ? faturaInfo.data_vencimento.toISOString().split('T')[0]  // "2025-02-05"
  : String(faturaInfo.data_vencimento).split('T')[0];

// Usar .substring() na string
const mesReferencia = dataVencimentoStr.substring(0, 7);  // "2025-02"
```

#### ❌ ERRADO: Chamar .substring() em Date
```typescript
// ⛔ ERRO: data_vencimento.substring is not a function
const mesReferencia = faturaInfo.data_vencimento.substring(0, 7);
```

---

## 📊 Benefícios do Novo Fluxo

### ✅ Antes (Problema)
- Fechamento criava transação
- "A Pagar" ficava vazio até fechar
- Desmembramento não funcionava
- Fatura paga ainda aparecia em "A Pagar"

### ✅ Depois (Solução)
- **Primeira compra cria transação** → Fatura visível imediatamente
- **Compras subsequentes atualizam valor** → Total sempre correto
- **Pagamento remove transação "A Pagar"** → Desaparece da lista
- **Desmembramento cria itens liquidados** → Rastreabilidade perfeita

---

## 🧪 Casos de Teste

### Teste 1: Compra Parcelada (10x)
1. Criar compra de R$ 1.000,00 em 10x
2. Verificar 10 transações "A Pagar" (R$ 100 cada)
3. Adicionar compra à vista de R$ 50 no primeiro mês
4. Verificar primeira transação atualizada para R$ 150
5. Pagar primeira fatura
6. Verificar:
   - Transação "A Pagar" removida
   - 2 transações liquidadas (R$ 100 + R$ 50)
   - 9 transações "A Pagar" restantes

### Teste 2: Múltiplas Compras no Mesmo Mês
1. Compra 1: R$ 100 (2025-01-10)
2. Compra 2: R$ 50 (2025-01-15)
3. Compra 3: R$ 30 (2025-01-20)
4. Verificar transação "A Pagar" = R$ 180
5. Fechar fatura
6. Verificar `valor_fechado` = R$ 180
7. Pagar fatura
8. Verificar 3 transações liquidadas

### Teste 3: Conversão de Data
1. Criar compra via API
2. Verificar logs do servidor para conversão de data
3. Confirmar mes_referencia correto (YYYY-MM)
4. Pagar fatura
5. Verificar referência de item formatada corretamente

---

## 🐛 Problemas Resolvidos

### ✅ Loop Infinito em Transações
**Problema:** `useTransactionFilters` chamava `loadTransactions` infinitamente  
**Solução:** Envolver em `useCallback` com dependências corretas

### ✅ Erro "data_vencimento.substring is not a function"
**Problema:** Date object não tem método `.substring()`  
**Solução:** Converter para string com `toISOString().split('T')[0]`

### ✅ 11 Faturas Vazias
**Problema:** Faturas sem itens marcadas como 'aberta'  
**Solução:** Script de limpeza marcou como 'fechada'

### ✅ Performance em Queries de Data
**Problema:** Queries lentas em `data_transacao`  
**Solução:** Criado index `idx_transacao_tenant_data_deleted`

### ✅ 27 Dead Rows no PostgreSQL
**Problema:** Linhas mortas ocupando espaço  
**Solução:** Executado `VACUUM ANALYZE`

---

## 📝 Próximos Passos

1. ✅ Testar fluxo completo com 10x parcelas
2. ✅ Validar transações "A Pagar" atualizando corretamente
3. ✅ Confirmar desmembramento criando itens liquidados
4. 🔄 Adicionar validações de erro (data inválida, valor negativo)
5. 🔄 Melhorar mensagens de erro para usuário
6. 🔄 Documentar API endpoints com exemplos

---

## 🚀 Como Usar

### Criar Compra Parcelada
```bash
curl -X POST http://localhost:3001/api/compras \
  -H "Content-Type: application/json" \
  -d '{
    "cartao_id": 1,
    "valor": 1000.00,
    "descricao": "Notebook",
    "data_compra": "2025-01-15",
    "categoria_id": 5,
    "parcelas": 10
  }'
```

### Fechar Fatura
```bash
curl -X POST http://localhost:3001/api/events/fatura.fechar \
  -H "Content-Type: application/json" \
  -d '{
    "fatura_id": 1
  }'
```

### Pagar Fatura
```bash
curl -X POST http://localhost:3001/api/events/fatura.pagar \
  -H "Content-Type: application/json" \
  -d '{
    "fatura_id": 1,
    "conta_id": 2,
    "data_pagamento": "2025-02-05"
  }'
```

---

**Última Atualização:** 2025-01-15  
**Versão:** 2.0 (Fluxo Inteligente)
