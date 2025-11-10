# 📋 Proposta de Melhorias - Contas a Pagar e Receber

## 🎯 Objetivos

1. **Melhor visualização** de contas a pagar e receber agrupadas
2. **Geração automática** de contas mensais a partir de recorrências
3. **Interface intuitiva** para gestão de compromissos financeiros

---

## 📊 Análise da Situação Atual

### ✅ Pontos Positivos
- ✅ Hook `useRecurrenceExpander` já existe e gera transações previstas
- ✅ Página Agenda mostra transações previstas agrupadas por período
- ✅ Sistema de recorrências (mensal, semanal, anual) funcionando
- ✅ Filtros por período, conta, tipo

### ⚠️ Pontos de Melhoria
- ❌ Visualização não agrupa por mês/categoria de forma clara
- ❌ Não há resumo mensal consolidado
- ❌ Difícil identificar padrões de gastos recorrentes
- ❌ Falta visão de fluxo de caixa futuro
- ❌ Geração de recorrências limitada a 3 meses (pode ser configurável)
- ❌ Sem botão para gerar mês completo manualmente

---

## 🎨 Proposta de Solução

### 1. **Nova Página: Contas a Pagar/Receber** 📅

#### Layout Proposto:

```
┌─────────────────────────────────────────────────────────┐
│  FILTROS: [Mês Selector] [Tipo: Todos/Pagar/Receber]  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  RESUMO DO MÊS (Novembro/2025)                         │
│  ┌───────────────┬───────────────┬──────────────────┐  │
│  │ A Receber     │ A Pagar       │ Saldo Previsto  │  │
│  │ R$ 12.500,00  │ R$ 8.300,00   │ +R$ 4.200,00    │  │
│  └───────────────┴───────────────┴──────────────────┘  │
│                                                         │
│  Botão: [⚡ Gerar Contas do Mês de Recorrências]       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📊 AGRUPADO POR CATEGORIA                             │
│                                                         │
│  ▼ Moradia (R$ 2.500,00 - 3 contas)                    │
│     □ Aluguel - R$ 1.500,00 - Venc: 10/11              │
│     □ Condomínio - R$ 500,00 - Venc: 05/11 [ATRASADO] │
│     □ Energia - R$ 500,00 - Venc: 15/11                │
│                                                         │
│  ▼ Alimentação (R$ 1.200,00 - 2 contas)                │
│     □ Supermercado - R$ 800,00 - Venc: 20/11           │
│     □ Restaurantes - R$ 400,00 - Venc: 25/11           │
│                                                         │
│  ▼ Transporte (R$ 600,00 - 1 conta)                    │
│     □ Combustível - R$ 600,00 - Venc: 30/11            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📈 LINHA DO TEMPO (Calendário Visual)                 │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐   │
│  │ Dom  │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Sáb  │   │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│  │      │      │      │  5   │  6   │  7   │  8   │   │
│  │      │      │      │ 🔴500│      │      │      │   │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│  │  10  │  11  │  12  │  13  │  14  │  15  │  16  │   │
│  │🟢1500 │      │      │      │      │🔴500 │      │   │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Features:

1. **Seletor de Mês/Ano**
   - Navegar entre meses facilmente
   - Ver histórico e futuro

2. **Resumo Consolidado**
   - Total a receber (verde)
   - Total a pagar (vermelho)
   - Saldo previsto (azul/verde/vermelho)

3. **Botão: Gerar Contas do Mês**
   - Expande **todas** as recorrências para o mês selecionado
   - Mostra preview antes de confirmar
   - Evita duplicatas (verifica se já existe)

4. **Agrupamento por Categoria**
   - Accordion expansível
   - Soma por categoria
   - Checkbox para seleção múltipla
   - Botões de ação em lote (Pagar Selecionadas)

5. **Calendário Visual**
   - Heatmap de vencimentos
   - Cores por tipo (verde=receber, vermelho=pagar)
   - Clique para ver detalhes do dia

---

### 2. **Melhorias no Hook `useRecurrenceExpander`** ⚙️

#### Código Proposto:

```typescript
export function useRecurrenceExpander() {
  // ... código existente ...

  /**
   * Gera contas de um mês específico a partir de recorrências
   * @param year Ano (ex: 2025)
   * @param month Mês (1-12)
   * @param preview Se true, retorna array sem criar no banco
   */
  const generateMonthFromRecurrences = useCallback(async (
    year: number, 
    month: number,
    preview: boolean = false
  ): Promise<Transaction[]> => {
    const startDate = new Date(year, month - 1, 1); // Primeiro dia do mês
    const endDate = new Date(year, month, 0); // Último dia do mês
    
    const generated: Transaction[] = [];
    
    for (const rec of activeRecurrences) {
      // Pular se pausada/deletada
      if (rec.is_paused || rec.is_deleted) continue;
      
      // Calcular datas de vencimento no mês
      const occurrences = calculateOccurrencesInMonth(rec, year, month);
      
      for (const occDate of occurrences) {
        // Verificar se já existe
        const exists = transactions.some(t => 
          t.origem === `recorrencia:${rec.id}` &&
          format(new Date(t.data_transacao), 'yyyy-MM-dd') === format(occDate, 'yyyy-MM-dd')
        );
        
        if (!exists) {
          const transaction = {
            tipo: rec.tipo,
            valor: parseFloat(String(rec.valor)),
            descricao: rec.descricao,
            data_transacao: format(occDate, 'yyyy-MM-dd'),
            conta_id: rec.conta_id,
            categoria_id: rec.categoria_id || rec.subcategoria_id,
            origem: `recorrencia:${rec.id}`,
            status: 'previsto',
          };
          
          if (!preview) {
            await createTransaction(transaction);
          }
          
          generated.push(transaction as Transaction);
        }
      }
    }
    
    return generated;
  }, [activeRecurrences, transactions, createTransaction]);

  /**
   * Calcula ocorrências de uma recorrência em um mês específico
   */
  const calculateOccurrencesInMonth = (
    rec: Recurrence, 
    year: number, 
    month: number
  ): Date[] => {
    const occurrences: Date[] = [];
    
    switch (rec.frequencia) {
      case 'mensal':
        if (rec.dia_vencimento) {
          const date = new Date(year, month - 1, rec.dia_vencimento);
          occurrences.push(date);
        }
        break;
        
      case 'semanal':
        // Adicionar todas as semanas do mês
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        let current = new Date(firstDay);
        
        while (current <= lastDay) {
          if (current.getDay() === rec.dia_semana) {
            occurrences.push(new Date(current));
          }
          current = addDays(current, 1);
        }
        break;
        
      case 'anual':
        // Apenas se o mês de início coincidir
        const dataInicio = new Date(rec.data_inicio);
        if (dataInicio.getMonth() + 1 === month) {
          occurrences.push(new Date(year, month - 1, dataInicio.getDate()));
        }
        break;
    }
    
    return occurrences;
  };

  return {
    expandRecurrence,
    expandAllRecurrences,
    generateMonthFromRecurrences, // 🆕 NOVO
    calculateOccurrencesInMonth,  // 🆕 NOVO
  };
}
```

---

### 3. **Novo Componente: MonthlyBillsView** 📊

```typescript
// src/components/MonthlyBillsView.tsx
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyBillsViewProps {
  year: number;
  month: number;
  transactions: Transaction[];
  onGenerateMonth: () => void;
}

export function MonthlyBillsView({ 
  year, 
  month, 
  transactions,
  onGenerateMonth 
}: MonthlyBillsViewProps) {
  // Agrupar por categoria
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    transactions.forEach(t => {
      const catName = t.categoria_nome || 'Sem Categoria';
      if (!groups[catName]) {
        groups[catName] = [];
      }
      groups[catName].push(t);
    });
    
    return groups;
  }, [transactions]);
  
  // Calcular totais
  const summary = useMemo(() => {
    const aReceber = transactions
      .filter(t => t.tipo === 'credito')
      .reduce((sum, t) => sum + t.valor, 0);
      
    const aPagar = transactions
      .filter(t => t.tipo === 'debito')
      .reduce((sum, t) => sum + t.valor, 0);
      
    return {
      aReceber,
      aPagar,
      saldo: aReceber - aPagar
    };
  }, [transactions]);
  
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">A Receber</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(summary.aReceber)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">A Pagar</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.aPagar)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Previsto</p>
            <p className={`text-2xl font-bold ${
              summary.saldo >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(Math.abs(summary.saldo))}
            </p>
          </div>
        </div>
        
        <Button 
          className="w-full mt-4" 
          onClick={onGenerateMonth}
          variant="outline"
        >
          ⚡ Gerar Contas do Mês de Recorrências
        </Button>
      </Card>
      
      {/* Agrupado por Categoria */}
      <Accordion type="multiple" className="space-y-2">
        {Object.entries(groupedByCategory).map(([category, items]) => {
          const total = items.reduce((sum, t) => sum + t.valor, 0);
          
          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>{category}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{items.length} contas</Badge>
                    <span className="font-mono">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {items.map(transaction => (
                  <TransactionRow 
                    key={transaction.id} 
                    transaction={transaction} 
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
```

---

### 4. **Componente de Calendário Visual** 📅

```typescript
// src/components/BillsCalendar.tsx
import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  format,
  isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BillsCalendar({ 
  year, 
  month, 
  transactions 
}: BillsCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    return eachDayOfInterval({ start, end });
  }, [year, month]);
  
  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => 
      isSameDay(new Date(t.data_transacao), day)
    );
  };
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Headers */}
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
        <div key={day} className="text-center font-medium text-sm">
          {day}
        </div>
      ))}
      
      {/* Days */}
      {days.map(day => {
        const dayTransactions = getDayTransactions(day);
        const total = dayTransactions.reduce((sum, t) => 
          sum + (t.tipo === 'credito' ? t.valor : -t.valor), 0
        );
        
        return (
          <div 
            key={day.toString()} 
            className={cn(
              "aspect-square p-2 border rounded-lg",
              dayTransactions.length > 0 && "bg-muted cursor-pointer hover:bg-muted/80"
            )}
          >
            <div className="text-sm font-medium">
              {format(day, 'd')}
            </div>
            {dayTransactions.length > 0 && (
              <div className={cn(
                "text-xs font-mono mt-1",
                total >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(Math.abs(total))}
              </div>
            )}
            <div className="flex gap-1 mt-1">
              {dayTransactions.slice(0, 3).map((t, i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-1 w-1 rounded-full",
                    t.tipo === 'credito' ? "bg-success" : "bg-destructive"
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 🚀 Plano de Implementação

### Fase 1: Backend (1-2h)
1. ✅ Verificar se `useRecurrenceExpander` funciona corretamente
2. ✅ Adicionar método `generateMonthFromRecurrences`
3. ✅ Adicionar método `calculateOccurrencesInMonth`

### Fase 2: Componentes (2-3h)
1. ⬜ Criar `MonthlyBillsView.tsx`
2. ⬜ Criar `BillsCalendar.tsx`
3. ⬜ Criar `CategoryGroupAccordion.tsx`
4. ⬜ Criar `TransactionRow.tsx` (reutilizável)

### Fase 3: Página Principal (1-2h)
1. ⬜ Criar `src/pages/ContasMensais.tsx`
2. ⬜ Integrar todos os componentes
3. ⬜ Adicionar filtros e navegação de mês

### Fase 4: Testes e Ajustes (1h)
1. ⬜ Testar geração de contas
2. ⬜ Verificar duplicatas
3. ⬜ Ajustar UX/UI

---

## 📈 Benefícios Esperados

✅ **Visibilidade**: Fácil identificar compromissos mensais  
✅ **Controle**: Gerar contas com 1 clique  
✅ **Organização**: Agrupamento por categoria intuitivo  
✅ **Planejamento**: Calendário visual para planejamento  
✅ **Automação**: Menos trabalho manual  
✅ **Previsibilidade**: Saldo previsto por mês  

---

## 🎯 Decisões a Tomar

1. **Nome da página**: "Contas Mensais" ou "Agenda Financeira"?
2. **Rota**: `/contas-mensais` ou `/agenda-mensal`?
3. **Substituir página Agenda** ou criar nova?
4. **Gerar quantos meses**: Apenas mês atual ou permitir futuros?
5. **Confirmação antes de gerar**: Preview ou direto?

---

## 💡 Próximos Passos

Aguardo sua aprovação para:
1. ⬜ Implementar os novos métodos no hook
2. ⬜ Criar os componentes visuais
3. ⬜ Integrar na nova página
4. ⬜ Testar e ajustar

O que você acha? Quer que eu comece pela implementação do hook ou pelos componentes visuais?
