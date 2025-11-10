# 🎯 FLUXO INTELIGENTE DE FATURA - IMPLEMENTADO

## 📌 Conceito

**UMA transação "A Pagar" por fatura que:**
- É criada na **primeira compra** do mês
- **Atualiza valor** automaticamente a cada nova compra
- Fica visível em "A Pagar" até o pagamento
- **Desaparece** ao pagar (substituída por itens desmembrados)
- **Próximo mês**: Nova fatura, nova transação

---

## 🔄 FLUXO COMPLETO

### 1️⃣ **Primeira Compra do Mês**

**Ação:** Usuário registra compra R$ 1.666,67 em 28/09/2025

```typescript
POST /api/compras
{
  cartao_id: "uuid-sicoob",
  categoria_id: "uuid-aluguel",
  descricao: "teste",
  valor: 5000,
  data_compra: "2025-09-28",
  parcelas: 3  // Sistema distribui automaticamente
}

// Sistema executa:
1. Cria fatura set/2025 (se não existe)
2. Insere item: R$ 1.666,67 (parcela 1/3)
3. Calcula total da fatura: R$ 1.666,67
4. CRIA transação "A Pagar":
   {
     tipo: 'debito',
     status: 'previsto',
     valor: 1666.67,
     descricao: 'Fatura Sicoob Obsidian - setembro de 2025',
     data_transacao: '2025-10-23' (vencimento),
     categoria: 'Pagamento Cartão de Crédito',
     origem: 'fatura:uuid'
   }
5. Vincula: fatura.transacao_id = uuid-transacao
```

**Resultado:**
- ✅ Compra registrada
- ✅ Fatura criada
- ✅ Transação "A Pagar" aparece em Transações
- ✅ Valor: R$ 1.666,67

---

### 2️⃣ **Segunda Compra no Mesmo Mês**

**Ação:** Usuário registra compra R$ 850,00 em 30/09/2025

```typescript
POST /api/compras
{
  cartao_id: "uuid-sicoob",
  categoria_id: "uuid-alimentacao",
  descricao: "Supermercado",
  valor: 850,
  data_compra: "2025-09-30",
  parcelas: 1
}

// Sistema executa:
1. Encontra fatura set/2025 existente
2. Insere item: R$ 850,00
3. Calcula total da fatura: R$ 2.516,67 (1666.67 + 850)
4. ATUALIZA transação "A Pagar" existente:
   UPDATE transacao SET
     valor = 2516.67,
     descricao = 'Fatura Sicoob Obsidian - setembro de 2025'
   WHERE id = fatura.transacao_id
```

**Resultado:**
- ✅ Nova compra registrada
- ✅ Valor em "A Pagar" ATUALIZADO: R$ 1.666,67 → R$ 2.516,67
- ✅ Mesma transação, só valor mudou
- ✅ Usuário vê valor crescendo conforme compra

---

### 3️⃣ **Fechar Fatura (Opcional)**

**Ação:** Usuário clica "Fechar Fatura"

```typescript
POST /api/events/fatura.fechar
{
  cartao_id: "uuid-sicoob",
  competencia: "2025-09-01"
}

// Sistema executa:
1. Calcula total final: R$ 2.516,67
2. Atualiza fatura:
   UPDATE fatura SET
     status = 'fechada',
     valor_fechado = 2516.67,
     data_fechamento = CURRENT_DATE
```

**Resultado:**
- ✅ Fatura marcada como fechada
- ✅ Transação "A Pagar" PERMANECE INALTERADA
- ✅ Valor já estava correto (R$ 2.516,67)
- ✅ Apenas impede novas compras nessa fatura

---

### 4️⃣ **Pagar Fatura**

**Ação:** Usuário clica "Pagar Fatura" → R$ 2.516,67

```typescript
POST /api/events/fatura.pagar
{
  fatura_id: "uuid-fatura-set",
  conta_id: "uuid-sicoob-conta",
  valor_pago: 2516.67,
  data_pagamento: "2025-11-08"
}

// Sistema executa:
1. DELETA transação "A Pagar"
   DELETE FROM transacao WHERE id = fatura.transacao_id
   ✅ Fatura desaparece de "A Pagar"

2. Busca itens da fatura (2 itens):
   - teste (1/3): R$ 1.666,67 - Administrativo → Aluguel
   - Supermercado: R$ 850,00 - Despesas → Alimentação

3. Cria 2 transações EFETIVADAS:
   INSERT transacao:
   {
     descricao: 'teste (1/3)',
     valor: 1666.67,
     categoria: 'Administrativo → Aluguel',
     conta: 'Sicoob',
     status: 'liquidado',
     data: '2025-11-08'
   }
   
   INSERT transacao:
   {
     descricao: 'Supermercado',
     valor: 850.00,
     categoria: 'Despesas → Alimentação',
     conta: 'Sicoob',
     status: 'liquidado',
     data: '2025-11-08'
   }

4. Atualiza fatura:
   UPDATE fatura SET
     status = 'paga',
     valor_pago = 2516.67,
     data_pagamento = '2025-11-08'
```

**Resultado:**
- ✅ Transação "A Pagar" REMOVIDA
- ✅ 2 transações efetivadas criadas
- ✅ Página Transações > A Pagar: **VAZIA** (fatura sumiu!)
- ✅ Página Transações > Efetivadas:
  - teste (1/3): R$ 1.666,67
  - Supermercado: R$ 850,00
- ✅ Total debitado: R$ 2.516,67

---

### 5️⃣ **Próximo Mês (Outubro)**

**Ação:** Usuário registra compra R$ 1.666,67 em 28/10/2025 (parcela 2/3)

```typescript
POST /api/compras
{
  descricao: "teste",
  valor: 5000,
  data_compra: "2025-10-28",
  parcelas: 3
}

// Sistema executa:
1. Cria fatura OUT/2025
2. Insere item: R$ 1.666,67 (parcela 2/3)
3. CRIA NOVA transação "A Pagar":
   {
     descricao: 'Fatura Sicoob Obsidian - outubro de 2025',
     valor: 1666.67,
     data_transacao: '2025-11-23' (vencimento)
   }
```

**Resultado:**
- ✅ Nova fatura de OUTUBRO criada
- ✅ Nova transação "A Pagar" aparece
- ✅ Ciclo recomeça!

---

## 📊 VISUALIZAÇÃO NA PÁGINA TRANSAÇÕES

### Tab "A Pagar" (Previstas)

**Durante o mês:**
```
┌────────────────────────────────────────────────┬────────────┬──────────────┐
│ Descrição                                      │ Vencimento │ Valor        │
├────────────────────────────────────────────────┼────────────┼──────────────┤
│ Fatura Sicoob Obsidian - setembro de 2025     │ 23/10/2025 │ R$ 1.666,67  │ ← Primeira compra
│ Fatura Nubank - setembro de 2025              │ 25/10/2025 │ R$ 450,00    │
└────────────────────────────────────────────────┴────────────┴──────────────┘
```

**Após adicionar Supermercado (R$ 850):**
```
┌────────────────────────────────────────────────┬────────────┬──────────────┐
│ Descrição                                      │ Vencimento │ Valor        │
├────────────────────────────────────────────────┼────────────┼──────────────┤
│ Fatura Sicoob Obsidian - setembro de 2025     │ 23/10/2025 │ R$ 2.516,67  │ ← Valor atualizado!
│ Fatura Nubank - setembro de 2025              │ 25/10/2025 │ R$ 450,00    │
└────────────────────────────────────────────────┴────────────┴──────────────┘
```

**Após pagar fatura Sicoob:**
```
┌────────────────────────────────────────────────┬────────────┬──────────────┐
│ Descrição                                      │ Vencimento │ Valor        │
├────────────────────────────────────────────────┼────────────┼──────────────┤
│ Fatura Nubank - setembro de 2025              │ 25/10/2025 │ R$ 450,00    │ ← Sicoob sumiu!
└────────────────────────────────────────────────┴────────────┴──────────────┘
```

### Tab "Efetivadas" (Liquidadas)

**Após pagar fatura Sicoob:**
```
┌────────────────────────────────────────────────┬─────────────────────────┬──────────────┐
│ Descrição                                      │ Categoria               │ Valor        │
├────────────────────────────────────────────────┼─────────────────────────┼──────────────┤
│ teste (1/3)                                    │ Administrativo→Aluguel  │ R$ 1.666,67  │
│ Supermercado                                   │ Despesas→Alimentação    │ R$ 850,00    │
└────────────────────────────────────────────────┴─────────────────────────┴──────────────┘
```

---

## ✨ BENEFÍCIOS DESSE FLUXO

### 1. **Simplicidade**
- Uma fatura = UMA linha em "A Pagar"
- Valor sempre atualizado
- Fácil visualizar o que deve

### 2. **Rastreabilidade**
- Ao pagar, itens desmembrados mostram categorias originais
- Análise de gastos por categoria funciona perfeitamente
- Histórico completo de cada compra

### 3. **Controle Financeiro**
- Valor em "A Pagar" cresce conforme compras
- Usuário vê impacto imediato de cada compra
- Próximo mês limpa "A Pagar", evita acúmulo

### 4. **Flexibilidade**
- Pagar antes ou depois do vencimento
- Pagar valor diferente (parcial)
- Fechar fatura é opcional

---

## 🔄 COMPARAÇÃO: ANTES vs DEPOIS

### ANTES (Fluxo Antigo)
```
Compra 1 → Fatura (valor=0)
Compra 2 → Fatura (valor=0)
Fechar   → Transação A Pagar criada (R$ 2.516,67)
Pagar    → Transação liquidada + Itens desmembrados
```

**Problemas:**
- ❌ Fatura invisível em "A Pagar" até fechar
- ❌ Usuário não vê valor acumulando
- ❌ Precisa fechar manualmente

### DEPOIS (Fluxo Novo)
```
Compra 1 → Fatura + Transação A Pagar (R$ 1.666,67)
Compra 2 → Atualiza transação (R$ 2.516,67)
Fechar   → Apenas marca fatura (transação já existe)
Pagar    → Deleta "A Pagar" + Cria itens efetivados
```

**Benefícios:**
- ✅ Fatura visível desde primeira compra
- ✅ Valor atualiza automaticamente
- ✅ Fechar é opcional
- ✅ Ao pagar, some de "A Pagar" imediatamente

---

## 🎯 RESULTADO FINAL

**Experiência do Usuário:**

1. **Registra compra** → Vê aparecer em "A Pagar" instantaneamente
2. **Registra mais compras** → Vê valor crescendo em tempo real
3. **Paga fatura** → "A Pagar" limpa, itens aparecem em "Efetivadas"
4. **Próximo mês** → Lista limpa, novo ciclo

**Controle financeiro perfeito! 🚀**
