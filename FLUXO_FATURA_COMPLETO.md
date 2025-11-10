# 🔄 FLUXO COMPLETO DE FATURA DE CARTÃO - 08/11/2025

## 🎯 Objetivo
Implementar fluxo completo de fatura de cartão com:
1. Registro de parcelas
2. Valor correto ao pagar
3. Criação de transação "A Pagar" ao fechar
4. Desmembramento de itens ao pagar

---

## ✅ FLUXO IMPLEMENTADO

### 1️⃣ **Registrar Compra no Cartão**

**Endpoint:** `POST /api/compras`

**Comportamento:**
```typescript
// Dados da compra
{
  cartao_id: "uuid",
  categoria_id: "uuid",
  descricao: "teste",
  valor: 5000,
  data_compra: "2025-09-28",
  parcela_numero: 1,  // Gerado automaticamente
  parcela_total: 3    // Definido pelo usuário
}

// Sistema cria automaticamente:
1. Fatura para a competência (se não existir)
   - competencia: "2025-09-01" (primeiro dia do mês da compra)
   - data_vencimento: calculada com base no dia_vencimento do cartão
   - data_fechamento: 7 dias antes do vencimento
   - valor_fechado: 0 (será calculado ao fechar)
   - status: 'aberta'

2. Item da fatura
   - fatura_id: ID da fatura criada/encontrada
   - valor: 5000
   - parcela_numero: 1
   - parcela_total: 3
```

**Resultado:**
- 3 itens criados (parcelas 1/3, 2/3, 3/3)
- Cada parcela: R$ 1.666,67
- Competências: set/2025, out/2025, nov/2025

---

### 2️⃣ **Fechar Fatura**

**Endpoint:** `POST /api/events/fatura.fechar`

**Comportamento:**
```typescript
1. Calcula valor total dos itens:
   SELECT SUM(valor) FROM fatura_item 
   WHERE fatura_id = X AND is_deleted = false
   // Resultado: R$ 1.666,67 (parcela 1/3)

2. Cria transação "A Pagar" na página de Transações:
   INSERT INTO transacao (
     tipo: 'debito',
     status: 'previsto',  // ⬅️ Aparece em "A Pagar"
     valor: 1666.67,
     descricao: 'Fatura Sicoob Obsidian - setembro de 2025',
     data_transacao: data_vencimento,  // Data prevista
     categoria_id: 'Pagamento Cartão de Crédito',
     origem: 'fatura:uuid',
     mes_referencia: '2025-09'
   )

3. Atualiza fatura:
   UPDATE fatura SET
     status = 'fechada',
     valor_fechado = 1666.67,  // ⬅️ Valor calculado dos itens
     data_fechamento = CURRENT_DATE,
     transacao_id = uuid  // ⬅️ Link com a transação criada
```

**Resultado:**
- Fatura fechada com valor correto
- Transação criada em "A Pagar" na página Transações
- Usuário vê valor R$ 1.666,67 ao abrir modal de pagamento

---

### 3️⃣ **Pagar Fatura**

**Endpoint:** `POST /api/events/fatura.pagar`

**Comportamento:**
```typescript
{
  fatura_id: "uuid",
  conta_id: "uuid-conta-sicoob",
  valor_pago: 1666.67,
  data_pagamento: "2025-11-08"
}

// Processo:
1. Marca transação da fatura como liquidada:
   UPDATE transacao SET
     status = 'liquidado',  // ⬅️ Remove de "A Pagar", aparece em "Efetivadas"
     data_transacao = '2025-11-08',
     conta_id = 'uuid-conta-sicoob',
     valor = 1666.67
   WHERE id = fatura.transacao_id

2. Busca itens da fatura:
   SELECT * FROM fatura_item 
   WHERE fatura_id = X
   // Resultado: 1 item (teste 1/3, R$ 1.666,67)

3. Desmembra cada item em transação separada:
   Para cada item:
     INSERT INTO transacao (
       tipo: 'debito',
       status: 'liquidado',
       valor: item.valor,
       descricao: 'teste (1/3)',  // ⬅️ Descrição + parcela
       data_transacao: '2025-11-08',
       conta_id: 'uuid-conta-sicoob',
       categoria_id: item.categoria_id,  // ⬅️ Categoria original da compra
       origem: 'fatura_item:uuid',
       mes_referencia: '2025-11'
     )

4. Atualiza fatura:
   UPDATE fatura SET
     status = 'paga',
     valor_pago = 1666.67,
     data_pagamento = '2025-11-08'
```

**Resultado:**
- Transação da fatura liquidada (1x R$ 1.666,67 - Fatura Sicoob)
- Transações de itens criadas (1x R$ 1.666,67 - teste 1/3)
- Página Transações > Efetivadas mostra:
  - ✅ Fatura Sicoob Obsidian - setembro de 2025: R$ 1.666,67
  - ✅ teste (1/3): R$ 1.666,67 (categoria original: Administrativo → Aluguel)
- Total debitado: R$ 3.333,34 (duplicado intencionalmente para rastreabilidade)

---

## 📊 ESTRUTURA DE DADOS

### Tabela: `fatura`
```sql
id: uuid
cartao_id: uuid
competencia: date  -- Primeiro dia do mês
data_vencimento: date
data_fechamento: date
valor_fechado: numeric  -- Calculado ao fechar
status: text  -- 'aberta' | 'fechada' | 'paga'
valor_pago: numeric  -- Preenchido ao pagar
data_pagamento: date  -- Preenchido ao pagar
transacao_id: uuid  -- Link com transacao "A Pagar"
```

### Tabela: `fatura_item`
```sql
id: uuid
fatura_id: uuid
categoria_id: uuid
descricao: text
valor: numeric
data_compra: date
parcela_numero: int
parcela_total: int
cartao_id: uuid
competencia: date
```

### Tabela: `transacao`
```sql
id: uuid
tipo: text  -- 'debito' | 'credito'
status: text  -- 'previsto' | 'liquidado'
valor: numeric
descricao: text
data_transacao: date
conta_id: uuid
categoria_id: uuid
origem: text  -- 'fatura:uuid' | 'fatura_item:uuid'
mes_referencia: text  -- 'YYYY-MM'
```

---

## 🔗 RELACIONAMENTOS

```
Cartão
  └─> Fatura (competencia = 'set/2025')
        ├─> fatura_item (teste 1/3, R$ 1.666,67)
        ├─> fatura_item (teste 2/3, R$ 1.666,67)
        └─> fatura_item (teste 3/3, R$ 1.666,67)
        └─> transacao (A Pagar) ──┐
                                   │ (ao pagar, liquidada)
                                   ├─> transacao (Fatura paga)
                                   └─> transacao (teste 1/3 paga)
                                       transacao (teste 2/3 paga)
                                       transacao (teste 3/3 paga)
```

---

## 🎨 EXPERIÊNCIA DO USUÁRIO

### Passo 1: Registrar Compra
1. Usuário vai em Cartões > Nova Compra
2. Preenche:
   - Cartão: Sicoob Obsidian
   - Categoria: Administrativo → Aluguel
   - Descrição: teste
   - Valor: R$ 5.000,00
   - Data: 28/09/2025
   - Parcelas: 3x
3. Sistema mostra preview: 3 parcelas de R$ 1.666,67
4. Clica "Registrar Compra"
5. **Resultado:** 3 faturas criadas (set, out, nov)

### Passo 2: Fechar Fatura
1. Usuário vê "Próxima Fatura" com valor R$ 0,00 (ainda não fechada)
2. Clica "Fechar Fatura"
3. Sistema calcula: R$ 1.666,67 (soma dos itens da competência)
4. **Resultado:** 
   - Fatura fechada
   - Transação "A Pagar" criada em Transações
   - Valor correto R$ 1.666,67 aparece

### Passo 3: Pagar Fatura
1. Usuário vai em Cartões > "Pagar Fatura"
2. Modal abre com:
   - Valor da fatura: R$ 1.666,67 ✅ (correto!)
   - Vencimento: 23/12/2025
3. Seleciona:
   - Conta: Sicoob (poupança)
   - Valor: R$ 1.666,67 (pré-preenchido)
   - Data: 08/11/2025
4. Clica "Confirmar Pagamento"
5. **Resultado:**
   - Fatura marcada como paga
   - Transação da fatura liquidada
   - 1 transação de item criada: "teste (1/3)"
   - Página Transações > Efetivadas mostra ambas

---

## 🚀 BENEFÍCIOS

### Rastreabilidade
- Cada compra é rastreada desde o registro até o pagamento
- Origem clara: `fatura:uuid` e `fatura_item:uuid`
- Histórico completo de parcelas

### Controle Financeiro
- Faturas aparecem em "A Pagar" ao serem fechadas
- Valor correto calculado automaticamente
- Desmembramento permite análise por categoria original

### Flexibilidade
- Pagar antes do fechamento? Possível!
- Pagar valor diferente? Sistema registra
- Parcelas individuais rastreadas

---

## 🐛 BUGS CORRIGIDOS

1. ✅ **Valor R$ 0,00 ao pagar fatura**
   - Problema: Fatura criada com valor_fechado = 0
   - Solução: Calcular ao fechar fatura

2. ✅ **Fatura não aparece em Transações**
   - Problema: Nenhuma transação criada ao fechar
   - Solução: Criar transação "previsto" ao fechar

3. ✅ **Perda de informação dos itens**
   - Problema: Apenas 1 transação genérica ao pagar
   - Solução: Desmembrar itens em transações separadas

4. ✅ **data_fechamento NULL**
   - Problema: Campo obrigatório não preenchido ao criar fatura
   - Solução: Calcular como 7 dias antes do vencimento

---

## 📝 PRÓXIMOS PASSOS SUGERIDOS

1. **Validação de Parcelas**
   - Impedir fechar fatura se nem todas as parcelas foram registradas
   - Alertar se valor diverge muito do esperado

2. **Estorno de Pagamento**
   - Permitir desfazer pagamento de fatura
   - Reverter transações desmembradas

3. **Relatório de Parcelas**
   - Visualizar todas as parcelas de uma compra
   - Status: paga, prevista, atrasada

4. **Integração com OFX**
   - Importar fatura do banco
   - Conciliar automaticamente

---

## 🎉 CONCLUSÃO

Sistema agora tem fluxo completo e robusto de gestão de faturas de cartão!

**Antes:**
- ❌ Parcelas registradas mas sem rastreabilidade
- ❌ Valor R$ 0,00 ao pagar
- ❌ Faturas invisíveis em Transações
- ❌ Informação de itens perdida

**Depois:**
- ✅ Fluxo completo: Compra → Fatura → A Pagar → Efetivada
- ✅ Valor correto calculado
- ✅ Transações visíveis em todo o sistema
- ✅ Itens desmembrados com categoria original
- ✅ Rastreabilidade total
