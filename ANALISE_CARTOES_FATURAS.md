# 📊 ANÁLISE COMPLETA: SISTEMA DE CARTÕES DE CRÉDITO E FATURAS

**Data da Análise:** 08/11/2025  
**Sistema:** Monetary Mind - Gestão Financeira  
**Módulo:** Cartões de Crédito, Faturas e Compras

---

## 📋 ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [Análise do Banco de Dados](#análise-do-banco-de-dados)
3. [Análise do Frontend](#análise-do-frontend)
4. [Análise do Backend](#análise-do-backend)
5. [Problemas Identificados](#problemas-identificados)
6. [Melhorias Propostas](#melhorias-propostas)
7. [Plano de Ação](#plano-de-ação)

---

## 🎯 RESUMO EXECUTIVO

### Estado Atual
- ✅ **4 cartões** cadastrados e ativos
- ✅ **25 faturas** geradas (todas com status "aberta")
- ✅ **20+ compras** parceladas registradas
- ✅ Estrutura de dados **consistente** (0 inconsistências)
- ⚠️ **Falta de fechamento/pagamento** de faturas
- ⚠️ **UX complexa** para usuários

### Pontos Fortes
1. Estrutura de dados bem normalizada
2. Suporte completo a parcelamento
3. Cálculo automático de competências
4. Vínculo correto entre itens e faturas
5. Múltiplos cartões funcionando simultaneamente

### Pontos Fracos
1. Fluxo de fechamento de fatura pouco intuitivo
2. Visualização de faturas não clara
3. Falta de dashboard consolidado
4. Ausência de alertas de vencimento
5. Não há geração automática de transações de pagamento

---

## 🗄️ ANÁLISE DO BANCO DE DADOS

### Estrutura das Tabelas

#### 1. Tabela `cartao`
```sql
✅ ESTRUTURA ADEQUADA
- id (UUID)
- tenant_id (TEXT) - Multitenancy
- apelido (TEXT) - Nome amigável
- bandeira (TEXT) - visa, mastercard, elo, etc
- limite_total (NUMERIC) - Valor do limite
- dia_fechamento (SMALLINT) - Dia do mês para fechar
- dia_vencimento (SMALLINT) - Dia do mês para vencer
- conta_pagamento_id (UUID) - Conta que paga a fatura
- is_deleted (BOOLEAN) - Soft delete
- created_at (TIMESTAMP)
```

**Cartões Cadastrados:**
| Apelido | Bandeira | Limite | Fechamento | Vencimento |
|---------|----------|--------|------------|------------|
| Inter | Mastercard | R$ 15.000 | Dia 3 | Dia 10 |
| Nubank Subverse | Mastercard | R$ 13.000 | Dia 20 | Dia 25 |
| Obsidian Visa 07 | Visa | R$ 30.000 | Dia 7 | Dia 11 |
| Sicoob Obsidian | Mastercard | R$ 30.000 | Dia 20 | Dia 22 |

#### 2. Tabela `fatura`
```sql
✅ ESTRUTURA BOA, MAS FALTA CAMPO
- id (UUID)
- tenant_id (TEXT)
- cartao_id (UUID) FK -> cartao
- competencia (DATE) - Mês/ano da fatura (YYYY-MM-01)
- data_fechamento (DATE) - Quando fecha
- data_vencimento (DATE) - Quando vence
- valor_fechado (NUMERIC) - Total calculado no fechamento
- status (TEXT) - 'aberta', 'fechada', 'paga'

❌ CAMPO FALTANDO:
- data_pagamento (DATE) - Quando foi paga
- valor_pago (NUMERIC) - Quanto foi pago
- transacao_id (UUID) FK -> transacao - Link para transação de pagamento
```

**Status Atual das Faturas:**
- **25 faturas** criadas
- **100% com status "aberta"**
- ⚠️ **PROBLEMA:** Nenhuma fatura fechada ou paga
- ✅ **BOM:** Todas com valor_fechado = 0.00 (consistente)

#### 3. Tabela `fatura_item`
```sql
✅ ESTRUTURA EXCELENTE
- id (UUID)
- tenant_id (TEXT)
- fatura_id (UUID) FK -> fatura (NULLABLE ⚠️)
- cartao_id (UUID) FK -> cartao (NULLABLE ⚠️)
- descricao (TEXT)
- categoria_id (UUID) FK -> categoria
- valor (NUMERIC)
- data_compra (DATE) - Quando foi comprada
- competencia (DATE) - Em qual fatura entra
- parcela_numero (SMALLINT) - Ex: 3
- parcela_total (SMALLINT) - Ex: 12
- is_deleted (BOOLEAN)
- created_at (TIMESTAMP)

✅ CONSISTÊNCIA:
- 0 itens sem fatura vinculada
- 0 itens sem cartão vinculado
```

**Compras Recentes:**
- **Parcelamentos longos:** 12x (acerto duda)
- **Parcelamentos médios:** 3x (materiais)
- **Compras simples:** 1x (Metal Vale)
- **Competências futuras:** Até Agosto/2026

### Lógica de Competência

O sistema calcula corretamente a competência:

```
Se data_compra <= dia_fechamento:
    competencia = mês atual
Senão:
    competencia = próximo mês
```

**Exemplo Real (Nubank - Fecha dia 20):**
- Compra em 15/10 → Entra na fatura de Outubro (fecha dia 20/10)
- Compra em 21/10 → Entra na fatura de Novembro (já passou do fechamento)

### Análise de Consistência

✅ **100% CONSISTENTE:**
- Todas as compras têm fatura vinculada
- Todas as compras têm cartão vinculado
- Valores somados batem com total das faturas fechadas
- Parcelamentos mantêm número/total corretos

---

## 💻 ANÁLISE DO FRONTEND

### 1. Página Principal (`Cartoes.tsx`) - 859 linhas

#### Pontos Positivos
- ✅ Layout visual atraente com cards coloridos
- ✅ CircularProgress mostra uso do limite
- ✅ Três abas: Faturas, Histórico, Configurações
- ✅ Responsivo e bem organizado
- ✅ Integração com Privacy Context (censura valores)

#### Problemas Identificados

**🔴 CRÍTICO: Cálculo de "Usado" Inconsistente**
```typescript
// Linha 130-140: Busca itens do mês ATUAL de TODOS os cartões
const { items: allItemsThisMonth } = useInvoiceItems(undefined, {
  competencia: monthCompetenciaAll,
  order: "data_compra.desc",
  limit: 500
});

// Depois agrupa por cartão
const usageByCard = useMemo(() => {
  const map: Record<string, number> = {};
  (allItemsThisMonth || []).forEach((i) => {
    map[i.cartao_id] = (map[i.cartao_id] || 0) + valor;
  });
  return map;
}, [allItemsThisMonth]);
```

**PROBLEMA:** 
- Se uma compra parcelada tem 12 parcelas, **TODAS** aparecerão como "usado" no mês atual
- Deveria mostrar apenas a parcela do mês atual
- Exemplo: Compra de R$ 1.200 em 12x deveria mostrar R$ 100, mas mostra R$ 1.200

**🟡 MÉDIO: Fatura Atual vs Fatura Fechada**
```typescript
// Linhas 203-213: Lógica confusa
const currentInvoice = selectedCard ? getCurrentInvoice(selectedCard) : null;
const { items: invoiceItems } = useInvoiceItems(
  currentInvoice?.id,
  selectedCard && !currentInvoice ? { 
    cartao_id: selectedCard.id, 
    competencia: currentCompetencia 
  } : undefined
);
```

**PROBLEMA:**
- Se não existe fatura para o mês atual, busca por cartao_id + competencia
- Mas faturas são criadas automaticamente ao adicionar compra
- Lógica rebuscada, poderia ser mais simples

**🟡 MÉDIO: Preview de Parcelas não Atualiza**
```typescript
// AddPurchaseModal.tsx - Linhas 94-112
const previewParcelas = useMemo(() => {
  // Recalcula apenas quando form muda
}, [form.valor, form.parcela_total, form.data_compra, form.cartao_id, form.tipo_compra, activeCards]);
```

**PROBLEMA:**
- Depende de `activeCards` completo ao invés de apenas o cartão selecionado
- Causa re-renders desnecessários

**🟢 MENOR: Sem Confirmação ao Fechar Fatura**
```typescript
// InvoiceActionsModal.tsx - Linha 30
const handleCloseInvoice = async () => {
  await closeInvoice({...});
  toast({ title: "Fatura fechada" });
}
```

**PROBLEMA:**
- Não pede confirmação
- Usuário pode fechar fatura por engano
- Deveria mostrar preview do valor total antes

### 2. Componentes Modais

#### `AddPurchaseModal.tsx` - ✅ Muito Bom

**Pontos Fortes:**
- Validação com Zod
- Preview de parcelas
- Aviso de competência
- Suporte a compra simples e parcelada
- UX clara com Tabs

**Sugestões:**
1. Adicionar opção "Salvar e Adicionar Outra" (compras em lote)
2. Memorizar último cartão usado
3. Sugerir categoria baseada em histórico

#### `PayInvoiceModal.tsx` - ⚠️ Precisa Melhorias

**Problemas:**
```typescript
// Linha 40-48: Reset não espera invoice estar disponível
useEffect(() => {
  if (invoice) {
    setForm({ valor_pago: invoice.valor_total.toString() });
  }
}, [invoice]);
```

**PROBLEMA:**
- Se `invoice` for `undefined` por um frame, reseta para vazio
- Deveria ter guard clause

**Falta:**
- Não cria transação no ledger automaticamente
- Não atualiza saldo da conta
- Apenas chama `fatura.pagar` no backend

#### `InvoiceActionsModal.tsx` - 🔴 Muito Simples

**Problemas:**
1. Apenas um botão: "Fechar Fatura"
2. Sem opções de:
   - Visualizar itens antes de fechar
   - Editar/remover itens
   - Antecipar pagamento
   - Parcelar fatura
3. Modal poderia ser apenas um `AlertDialog`

### 3. Visualização de Faturas

#### `InvoiceListItem.tsx` - ✅ Bom, mas pode melhorar

**Atual:**
- Accordion com lista de itens
- Ordenado por data de compra DESC
- Mostra categoria e valor

**Sugestões:**
1. Agrupar por categoria (subtotais)
2. Destacar parcelamentos (ex: "3/12" com cor diferente)
3. Botão inline para editar item
4. Gráfico de pizza com categorias

#### `InvoiceHistoryItem.tsx` - ✅ Similar ao anterior

**Poderia Adicionar:**
- Comparação com mês anterior
- Média dos últimos 6 meses
- Destacar meses com gasto excessivo

### 4. Hooks Customizados

#### `useInvoiceItems` - ⚠️ Performance

```typescript
// Linha 203-220
export function useInvoiceItems(invoiceId?: string, additionalFilters?: Record<string, any>) {
  const filters = invoiceId 
    ? { fatura_id: invoiceId }
    : additionalFilters || {};

  const { data, loading, error, refresh } = useFinanceiroRead<InvoiceItem>(
    client,
    'fatura-item',
    filters
  );
}
```

**PROBLEMA:**
- Se `invoiceId` for `undefined`, faz query de TODOS os itens
- Depois filtra no frontend (ineficiente)
- Deveria sempre ter um filtro mínimo (tenant_id)

---

## ⚙️ ANÁLISE DO BACKEND

### API Endpoints

#### `GET /api/faturas`
```typescript
// server/index.ts - Linha 471
app.get('/api/faturas', async (req, res) => {
  const { cartao_id, competencia, status } = req.query;
  // Query com JOIN para pegar apelido do cartão
});
```

✅ **Bom:** Filtros flexíveis, JOIN otimizado

#### `POST /events (fatura.fechar)`
```typescript
// Não encontrado no código!
```

❌ **PROBLEMA:** Lógica de fechamento está APENAS no hook
- Deveria estar no backend
- Calcular valor_fechado somando itens
- Atualizar status para "fechada"
- Retornar erro se já estiver fechada

#### `POST /events (fatura.pagar)`
```typescript
// Não encontrado no código!
```

❌ **PROBLEMA CRÍTICO:**
- Não cria transação no ledger
- Não debita da conta
- Apenas atualiza status da fatura

**O que DEVERIA fazer:**
```typescript
POST /events { event: "fatura.pagar", payload: {...} }

1. Validar se fatura está fechada
2. Validar se conta tem saldo (se aplicável)
3. Criar TRANSAÇÃO de débito:
   - tipo: "debito"
   - conta_id: conta escolhida
   - valor: valor_pago
   - categoria_id: "Pagamento Cartão"
   - origem: "fatura:{fatura_id}"
   - status: "liquidado"
   - data_transacao: data_pagamento
4. Atualizar fatura:
   - status = "paga"
   - data_pagamento = data
   - valor_pago = valor
   - transacao_id = id da transação criada
5. Atualizar saldo da conta
6. Retornar sucesso
```

### Eventos SDK

Verificando `financeiro-sdk.ts`:

```typescript
// Eventos disponíveis
✅ transacao.upsert
✅ conta.upsert
✅ categoria.upsert
✅ cartao.upsert
❓ fatura.fechar - Não implementado
❓ fatura.pagar - Não implementado
```

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS (Impedem uso correto)

#### 1. Fatura não gera transação ao pagar
**Impacto:** Sistema financeiro fica inconsistente
- Fatura marcada como "paga"
- Mas saldo da conta não diminui
- Não aparece nas transações
- Impossível reconciliar

**Solução:** Implementar evento `fatura.pagar` completo no backend

#### 2. Cálculo errado de "Usado" no limite
**Impacto:** Usuário vê limite errado
- Compra de R$ 1.200 em 12x mostra R$ 1.200 usado
- Deveria mostrar apenas parcela do mês (R$ 100)
- Causa confusão e decisões erradas

**Solução:** Filtrar apenas parcela do mês atual na query

#### 3. Faturas criadas mas nunca fechadas
**Impacto:** 25 faturas abertas, 0 fechadas
- Usuário não sabe quando fechar
- Não há automação
- Fluxo manual complexo

**Solução:** 
- Auto-fechar no dia de fechamento
- OU botão claro "Fechar Fatura" na tela principal
- OU alerta: "Fatura do cartão X pronta para fechar"

### 🟡 MÉDIOS (Prejudicam usabilidade)

#### 4. Interface de faturas confusa
**Impacto:** Difícil entender quanto deve
- Abas "Faturas" e "Histórico" são similares
- Não é claro qual está aberta vs fechada
- Falta destaque visual

**Solução:**
- Tab "Fatura Atual" (mês corrente, grande destaque)
- Tab "Próximas Faturas" (meses futuros)
- Tab "Histórico" (pagas/fechadas)

#### 5. Falta visualização consolidada
**Impacto:** Usuário não tem visão geral
- Precisa clicar em cada cartão
- Não sabe total a pagar de todos os cartões
- Não vê alertas de vencimento próximo

**Solução:** Dashboard na home:
```
┌─────────────────────────────────────┐
│ 💳 CARTÕES DE CRÉDITO              │
│                                     │
│ Vence em 2 dias: Nubank R$ 2.500   │
│ Vence em 8 dias: Inter R$ 1.200    │
│                                     │
│ Total a pagar este mês: R$ 3.700   │
└─────────────────────────────────────┘
```

#### 6. Sem edição de compras
**Impacto:** Erro ao cadastrar = deletar e refazer
- Não dá pra corrigir valor
- Não dá pra mudar categoria
- Não dá pra mudar descrição

**Solução:** Modal de edição de item de fatura

### 🟢 MENORES (Melhorias de UX)

#### 7. Parcelamentos não destacados
**Impacto:** Difícil identificar parcelas
- "acerto duda (3/12)" está no texto
- Poderia ter badge "12x"
- Poderia mostrar progresso visual

**Solução:** Badge de parcelamento + barra de progresso

#### 8. Categorias genéricas
**Impacto:** Análise de gastos pobre
- "Pro Labore", "Material", "Metal Franca"
- Poderia ter subcategorias mais detalhadas

**Solução:** Revisar árvore de categorias

#### 9. Falta busca de compras
**Impacto:** Achar compra antiga é difícil
- Tem que scrollar accordion
- Não há filtro

**Solução:** Input de busca em `InvoiceListItem`

#### 10. Sem exportação
**Impacto:** Não dá pra usar dados fora do sistema
- Não exporta OFX
- Não exporta CSV
- Não imprime fatura

**Solução:** Botões de exportação

---

## 💡 MELHORIAS PROPOSTAS

### FASE 1 - CORREÇÕES URGENTES (1-2 dias)

#### 1.1 Implementar `fatura.pagar` Completo
```typescript
// server/index.ts
app.post('/events', async (req, res) => {
  if (event === 'fatura.pagar') {
    const { fatura_id, conta_id, valor_pago, data_pagamento } = payload;
    
    // Buscar fatura
    const fatura = await getFatura(fatura_id);
    if (fatura.status === 'paga') throw new Error('Fatura já paga');
    
    // Criar transação
    const transacao_id = await createTransaction({
      tipo: 'debito',
      conta_id,
      valor: valor_pago,
      descricao: `Pagamento Fatura ${getCartaoApelido(fatura.cartao_id)} - ${formatCompetencia(fatura.competencia)}`,
      categoria_id: getCategoriaId('Pagamento Cartão de Crédito'),
      origem: `fatura:${fatura_id}`,
      status: 'liquidado',
      data_transacao: data_pagamento
    });
    
    // Atualizar fatura
    await updateFatura(fatura_id, {
      status: 'paga',
      data_pagamento,
      valor_pago,
      transacao_id
    });
    
    // Atualizar saldo conta
    await updateContaSaldo(conta_id, -valor_pago);
    
    return { success: true, transacao_id };
  }
});
```

#### 1.2 Corrigir Cálculo de "Usado"
```typescript
// Cartoes.tsx - Substituir linha 130-140
const currentMonthCompetencia = format(new Date(), 'yyyy-MM-01');

const { items: currentMonthItems } = useInvoiceItems(undefined, {
  competencia: currentMonthCompetencia, // Apenas mês atual
  order: "data_compra.desc",
  limit: 500
});

const usageByCard = useMemo(() => {
  const map: Record<string, number> = {};
  (currentMonthItems || []).forEach((item) => {
    // Apenas se a competência for do mês atual
    const itemComp = format(new Date(item.competencia), 'yyyy-MM-01');
    if (itemComp === currentMonthCompetencia) {
      const valor = typeof item.valor === 'string' ? parseFloat(item.valor) : item.valor;
      map[item.cartao_id] = (map[item.cartao_id] || 0) + valor;
    }
  });
  return map;
}, [currentMonthItems, currentMonthCompetencia]);
```

#### 1.3 Implementar Auto-Fechamento de Faturas
```typescript
// Novo arquivo: server/cron/close-invoices.ts
import cron from 'node-cron';

// Roda todo dia às 00:01
cron.schedule('1 0 * * *', async () => {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  
  // Buscar cartões cujo dia de fechamento é hoje
  const cartoesToClose = await pool.query(`
    SELECT id, dia_fechamento 
    FROM financeiro.cartao 
    WHERE dia_fechamento = $1 
      AND is_deleted = false
  `, [diaHoje]);
  
  for (const cartao of cartoesToClose.rows) {
    // Buscar fatura aberta do mês atual
    const competencia = format(hoje, 'yyyy-MM-01');
    const fatura = await getFatura(cartao.id, competencia);
    
    if (fatura && fatura.status === 'aberta') {
      // Somar itens
      const total = await sumInvoiceItems(fatura.id);
      
      // Fechar fatura
      await updateFatura(fatura.id, {
        status: 'fechada',
        valor_fechado: total,
        data_fechamento: format(hoje, 'yyyy-MM-dd')
      });
      
      console.log(`✅ Fatura ${fatura.id} fechada automaticamente: R$ ${total}`);
    }
  }
});
```

### FASE 2 - MELHORIAS DE UX (2-3 dias)

#### 2.1 Reorganizar Abas de Faturas
```typescript
// Cartoes.tsx - Alterar TabsList
<TabsList>
  <TabsTrigger value="current">Fatura Atual</TabsTrigger>
  <TabsTrigger value="upcoming">Próximas</TabsTrigger>
  <TabsTrigger value="history">Histórico</TabsTrigger>
  <TabsTrigger value="settings">Configurações</TabsTrigger>
</TabsList>

<TabsContent value="current">
  {/* Apenas fatura do mês corrente */}
  {/* Card grande com:
      - Valor total
      - Data de vencimento com countdown
      - Botão "Fechar Fatura" (se aberta)
      - Botão "Pagar Fatura" (se fechada)
      - Lista de compras do mês
      - Gráfico de categorias
  */}
</TabsContent>

<TabsContent value="upcoming">
  {/* Faturas dos próximos meses */}
  {/* Compras parceladas que cairão */}
</TabsContent>

<TabsContent value="history">
  {/* Apenas faturas pagas */}
  {/* Com comparativo mês a mês */}
</TabsContent>
```

#### 2.2 Dashboard Consolidado na Home
```typescript
// pages/Index.tsx - Adicionar componente
<Card>
  <CardHeader>
    <CardTitle>💳 Cartões de Crédito</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {cartoesComFaturaVencendo.map(cartao => (
        <div key={cartao.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div>
            <p className="font-medium">{cartao.apelido}</p>
            <p className="text-sm text-muted-foreground">
              Vence em {diasAteVencimento(cartao)} dias
            </p>
          </div>
          <div className="text-right">
            <ValueDisplay value={cartao.faturaValor} size="lg" />
            <Button size="sm" onClick={() => pagarFatura(cartao)}>
              Pagar
            </Button>
          </div>
        </div>
      ))}
      
      <Separator />
      
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Total a pagar este mês:</span>
        <ValueDisplay value={totalMesAtual} size="xl" className="font-bold" />
      </div>
      
      <Button variant="outline" className="w-full" onClick={() => navigate('/cartoes')}>
        Ver Todos os Cartões
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 2.3 Modal de Edição de Compra
```typescript
// components/EditPurchaseModal.tsx
export function EditPurchaseModal({ item, onSuccess }: Props) {
  const [form, setForm] = useState({
    descricao: item.descricao,
    valor: item.valor,
    categoria_id: item.categoria_id,
  });
  
  const handleSave = async () => {
    await apiClient.postEvent('fatura-item.update', {
      id: item.id,
      ...form
    });
    onSuccess();
  };
  
  return (
    <Dialog>
      {/* Formulário similar ao AddPurchaseModal */}
      {/* MAS não permite mudar cartão ou parcelas */}
    </Dialog>
  );
}
```

#### 2.4 Destacar Parcelamentos
```typescript
// components/InvoiceItemsList.tsx
{items.map(item => (
  <div key={item.id} className="flex items-center justify-between">
    <div>
      <p>{item.descricao}</p>
      <div className="flex gap-2 mt-1">
        <Badge variant="outline">{categoria.nome}</Badge>
        {item.parcela_total > 1 && (
          <Badge className="bg-blue-500">
            {item.parcela_numero}/{item.parcela_total}x
          </Badge>
        )}
      </div>
      {/* Barra de progresso se parcelado */}
      {item.parcela_total > 1 && (
        <Progress 
          value={(item.parcela_numero / item.parcela_total) * 100} 
          className="h-1 mt-2"
        />
      )}
    </div>
    <ValueDisplay value={item.valor} />
  </div>
))}
```

### FASE 3 - RECURSOS AVANÇADOS (3-5 dias)

#### 3.1 Análise de Gastos por Categoria
```typescript
// components/CategorySpendingChart.tsx
export function CategorySpendingChart({ cartao_id, competencia }: Props) {
  const { items } = useInvoiceItems(undefined, { cartao_id, competencia });
  
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    items?.forEach(item => {
      const current = map.get(item.categoria_id) || 0;
      map.set(item.categoria_id, current + item.valor);
    });
    return Array.from(map.entries()).map(([cat_id, total]) => ({
      categoria: getCategoriaName(cat_id),
      valor: total
    })).sort((a, b) => b.valor - a.valor);
  }, [items]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={categoryTotals} 
              dataKey="valor" 
              nameKey="categoria" 
              label
            />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### 3.2 Comparativo Mensal
```typescript
// components/MonthlyComparison.tsx
export function MonthlyComparison({ cartao_id }: Props) {
  const last6Months = getLast6Months();
  const { invoices } = useInvoices(cartao_id);
  
  const chartData = last6Months.map(month => {
    const invoice = invoices.find(inv => 
      formatCompetencia(inv.competencia) === month
    );
    return {
      mes: format(new Date(month), 'MMM/yy', { locale: ptBR }),
      valor: invoice?.valor_fechado || 0
    };
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução dos Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="valor" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Média:</p>
            <p className="font-bold">{formatCurrency(average(chartData))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Maior:</p>
            <p className="font-bold text-red-600">{formatCurrency(max(chartData))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Menor:</p>
            <p className="font-bold text-green-600">{formatCurrency(min(chartData))}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.3 Alertas e Notificações
```typescript
// components/InvoiceAlerts.tsx
export function InvoiceAlerts() {
  const { activeCards } = useCreditCards();
  const { invoices } = useInvoices();
  
  const alerts = useMemo(() => {
    const result = [];
    const hoje = new Date();
    
    activeCards.forEach(card => {
      const currentInvoice = getCurrentInvoice(card.id, invoices);
      
      if (currentInvoice) {
        const daysUntilDue = differenceInDays(
          new Date(currentInvoice.data_vencimento), 
          hoje
        );
        
        // Alerta de vencimento próximo
        if (daysUntilDue <= 3 && daysUntilDue >= 0 && currentInvoice.status === 'fechada') {
          result.push({
            type: 'warning',
            title: `Fatura ${card.apelido} vence em ${daysUntilDue} dias`,
            description: `Valor: ${formatCurrency(currentInvoice.valor_fechado)}`,
            action: () => navigate(`/cartoes/${card.id}`)
          });
        }
        
        // Alerta de vencimento atrasado
        if (daysUntilDue < 0 && currentInvoice.status !== 'paga') {
          result.push({
            type: 'error',
            title: `Fatura ${card.apelido} ATRASADA`,
            description: `Venceu há ${Math.abs(daysUntilDue)} dias`,
            action: () => navigate(`/cartoes/${card.id}`)
          });
        }
        
        // Alerta de limite próximo
        const usage = getUsagePercentage(card);
        if (usage >= 90) {
          result.push({
            type: 'warning',
            title: `${card.apelido}: ${usage}% do limite usado`,
            description: 'Cuidado com gastos adicionais',
            action: () => navigate(`/cartoes/${card.id}`)
          });
        }
      }
    });
    
    return result;
  }, [activeCards, invoices]);
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{alert.description}</span>
            <Button size="sm" variant="outline" onClick={alert.action}>
              Ver
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

#### 3.4 Exportação de Dados
```typescript
// utils/export-invoice.ts
export function exportInvoiceToCSV(invoice_id: string) {
  const invoice = getInvoice(invoice_id);
  const items = getInvoiceItems(invoice_id);
  
  const csv = [
    ['Data Compra', 'Descrição', 'Categoria', 'Valor', 'Parcela'],
    ...items.map(item => [
      format(new Date(item.data_compra), 'dd/MM/yyyy'),
      item.descricao,
      getCategoriaName(item.categoria_id),
      item.valor.toString(),
      item.parcela_total > 1 ? `${item.parcela_numero}/${item.parcela_total}` : '1/1'
    ])
  ].map(row => row.join(',')).join('\n');
  
  downloadFile(csv, `fatura-${invoice.competencia}.csv`, 'text/csv');
}

export function exportInvoiceToPDF(invoice_id: string) {
  // Usar biblioteca como jsPDF ou html2canvas
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('FATURA DE CARTÃO DE CRÉDITO', 20, 20);
  
  // Adicionar detalhes da fatura
  // Adicionar tabela de itens
  // Adicionar total
  
  doc.save(`fatura-${invoice.competencia}.pdf`);
}
```

---

## 📅 PLANO DE AÇÃO

### Sprint 1 - Correções Críticas (2 dias)

**Objetivo:** Tornar o sistema consistente e confiável

**Tarefas:**
- [x] ✅ Análise completa documentada
- [ ] 🔴 Implementar `fatura.pagar` com criação de transação
- [ ] 🔴 Corrigir cálculo de "Usado" no limite
- [ ] 🔴 Implementar evento `fatura.fechar` no backend
- [ ] 🔴 Adicionar campos faltantes na tabela `fatura`:
  - `data_pagamento DATE`
  - `valor_pago NUMERIC`
  - `transacao_id UUID FK`

**Critérios de Sucesso:**
- ✅ Pagar fatura cria transação no ledger
- ✅ Saldo da conta é debitado
- ✅ Limite usado reflete apenas parcela do mês
- ✅ 0 inconsistências entre fatura e transações

### Sprint 2 - Melhorias de UX (3 dias)

**Objetivo:** Tornar o sistema intuitivo e fácil de usar

**Tarefas:**
- [ ] 🟡 Reorganizar abas: Atual / Próximas / Histórico
- [ ] 🟡 Dashboard consolidado na home
- [ ] 🟡 Modal de edição de compras
- [ ] 🟡 Destacar parcelamentos com badge e progress
- [ ] 🟡 Adicionar busca de compras
- [ ] 🟡 Confirmação ao fechar fatura

**Critérios de Sucesso:**
- ✅ Usuário encontra fatura atual em 1 clique
- ✅ Vê total a pagar de todos os cartões na home
- ✅ Consegue editar compra sem deletar
- ✅ Identifica parcelamentos visualmente

### Sprint 3 - Recursos Avançados (5 dias)

**Objetivo:** Adicionar inteligência e automação

**Tarefas:**
- [ ] 🟢 Gráfico de gastos por categoria
- [ ] 🟢 Comparativo mensal (últimos 6 meses)
- [ ] 🟢 Sistema de alertas (vencimento, limite)
- [ ] 🟢 Auto-fechamento de faturas (cron job)
- [ ] 🟢 Exportação para CSV e PDF
- [ ] 🟢 Sugestão de categoria baseada em histórico

**Critérios de Sucesso:**
- ✅ Usuário vê onde gasta mais (gráfico)
- ✅ Recebe alerta 3 dias antes do vencimento
- ✅ Faturas fecham automaticamente no dia certo
- ✅ Consegue exportar para uso externo

### Sprint 4 - Polimento (2 dias)

**Objetivo:** Refinar e otimizar

**Tarefas:**
- [ ] 🟢 Testes de performance (queries otimizadas)
- [ ] 🟢 Testes de usabilidade com usuários
- [ ] 🟢 Documentação do usuário
- [ ] 🟢 Tutoriais interativos (onboarding)
- [ ] 🟢 Atalhos de teclado
- [ ] 🟢 Modo offline (PWA)

**Critérios de Sucesso:**
- ✅ Todas as queries < 100ms
- ✅ 0 erros reportados em 1 semana de uso
- ✅ Usuário novo consegue usar sem treinamento

---

## 📊 MÉTRICAS DE SUCESSO

### Antes (Estado Atual)
- ❌ 25 faturas abertas, 0 fechadas
- ❌ Limite calculado errado
- ❌ Pagar fatura não afeta saldo
- ⚠️ 3+ cliques para ver fatura atual
- ⚠️ Não há alertas de vencimento
- ⚠️ Não dá pra editar compras

### Depois (Objetivo)
- ✅ 100% das faturas fecham automaticamente
- ✅ Limite calculado corretamente
- ✅ Pagar fatura cria transação e debita conta
- ✅ 1 clique para ver fatura atual (dashboard)
- ✅ Alertas 3 dias antes do vencimento
- ✅ Edição de compras em 2 cliques

---

## 🎓 APRENDIZADOS

### O que está funcionando bem
1. **Estrutura de dados:** Normalização correta, FKs bem definidas
2. **Parcelamento:** Lógica complexa mas funcional
3. **Multitenancy:** Isolamento correto por tenant
4. **Visual:** Interface bonita e responsiva
5. **Componentização:** Código bem organizado

### O que precisa melhorar
1. **Fluxo de negócio:** Pagar fatura não integra com ledger
2. **UX:** Muitos cliques, informação fragmentada
3. **Automação:** Nada acontece automaticamente
4. **Feedback:** Usuário não sabe se está fazendo certo
5. **Visibilidade:** Informação importante "escondida"

### Recomendações Gerais
1. **Backend primeiro:** Lógica crítica deve estar no servidor
2. **Testes automatizados:** Evitar regressões
3. **Documentação:** Fluxos complexos precisam estar documentados
4. **Logging:** Rastrear todas as operações financeiras
5. **Auditoria:** Histórico de mudanças (quem, quando, o quê)

---

## 📝 CONCLUSÃO

O sistema de cartões está **estruturalmente sólido** mas **funcionalmente incompleto**. A arquitetura de dados está correta, o frontend é atraente, mas faltam peças críticas como:

- Integração entre módulos (fatura ↔ transação)
- Automação de processos manuais
- Feedback visual adequado
- Fluxos simplificados

Com as melhorias propostas, especialmente as da **Sprint 1 (críticas)**, o sistema se tornará:
- ✅ **Consistente:** Dados financeiros corretos
- ✅ **Intuitivo:** Fácil de usar sem treinamento
- ✅ **Automático:** Menos trabalho manual
- ✅ **Inteligente:** Alertas e sugestões proativas

**Prioridade máxima:** Implementar criação de transação ao pagar fatura (Sprint 1)

---

**Documento gerado em:** 08/11/2025  
**Próxima revisão:** Após implementação da Sprint 1
