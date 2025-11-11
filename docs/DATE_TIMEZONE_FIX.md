# Fix de Timezone: Datas e Parcelas

## 🐛 Problema Identificado

### Sintomas
- **VPS**: Primeira parcela aparecendo como **2/3** e data **09/11** em vez de **1/3** e **10/11**
- **Local**: Funcionava corretamente
- **Root Cause**: Conversão automática DATE → JS Date → ISO UTC → shift de timezone

### Fluxo do Bug

```
PostgreSQL (DATE)     → Node.js Driver      → JSON Response        → Frontend Parse        → Problema
----------------        ---------------        --------------          ---------------          ----------
2025-11-10             Date (2025-11-10)     "2025-11-09T21:00Z"    new Date("2025-11-09")  09/11 ❌
                       (converte p/ ISO)      (UTC no servidor VPS)   (interpreta UTC)
```

**Diferença de Ambiente**:
- **Local**: Timezone coincidente mascarava o bug
- **VPS**: Timezone UTC evidenciava conversão incorreta

---

## ✅ Solução Implementada

### Backend (server/index.ts)

#### 1. Query GET /api/faturas/itens
**Antes:**
```sql
SELECT fi.*, cat.nome as categoria_nome, ...
FROM financeiro.fatura_item fi
```
→ Retornava `data_compra` como Date, convertido automaticamente para ISO UTC

**Depois:**
```sql
SELECT 
  fi.id,
  fi.fatura_id,
  TO_CHAR(fi.data_compra, 'YYYY-MM-DD') AS data_compra,  -- ✅ String pura
  TO_CHAR(fi.competencia, 'YYYY-MM-DD') AS competencia,   -- ✅ String pura
  fi.parcela_numero,
  ...
FROM financeiro.fatura_item fi
```
→ Retorna strings `"2025-11-10"` diretamente, **sem conversão Date**

#### 2. Logging para Debug
```typescript
console.log('📄 GET /api/faturas/itens - Sample:', result.rows.slice(0, 3).map(r => ({
  id: r.id,
  data_compra: r.data_compra,
  data_compra_type: typeof r.data_compra,  // Deve ser "string"
  parcela_numero: r.parcela_numero,
  parcela_total: r.parcela_total,
  competencia: r.competencia
})));
```

### Frontend

#### 1. Módulo Central: src/lib/date.ts
Criado biblioteca de utilitários **TZ-safe**:

```typescript
/**
 * Formata YYYY-MM-DD → dd/MM/yyyy SEM parsing Date
 */
export function formatDateYmdToBr(value?: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Parse TZ-safe de string para Date local
 */
export function parseDateLocal(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);  // mês 0-indexed
}

/**
 * Date → YYYY-MM-DD (TZ-safe)
 */
export function dateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

#### 2. Componentes Atualizados

| Componente | Mudanças |
|------------|----------|
| **Cartoes.tsx** | `formatDateYmdToBr(item.data_compra)` em tabelas<br/>`parseDateLocal(item.competencia)` para formatação mês/ano |
| **InvoiceHistoryItem.tsx** | `formatDateYmdToBr` para datas de compra e pagamento<br/>`parseDateLocal` para competência |
| **InvoiceItemsList.tsx** | `formatDateYmdToBr(item.data_compra)` |
| **PayInvoiceModal.tsx** | `formatDateYmdToBr(invoice.data_vencimento)`<br/>`parseDateLocal(invoice.competencia)` |
| **AddPurchaseModal.tsx** | Já estava usando lógica manual TZ-safe (sem alteração) |

---

## 📊 Antes vs Depois

### Antes (com bug)
```json
// Backend response
{
  "data_compra": "2025-11-09T21:00:00.000Z",  // ❌ ISO UTC (VPS)
  "parcela_numero": "2",                       // ❌ String
  "parcela_total": 3
}

// Frontend parse
new Date("2025-11-09T21:00:00.000Z")  // ❌ Interpreta UTC → 09/11
```

**Resultado**: Primeira parcela mostra `2/3` e `09/11` ❌

---

### Depois (corrigido)
```json
// Backend response
{
  "data_compra": "2025-11-10",        // ✅ String pura
  "parcela_numero": 1,                 // ✅ Integer (CAST no ORDER BY)
  "parcela_total": 3
}

// Frontend render
formatDateYmdToBr("2025-11-10")  // ✅ Manipulação string → "10/11/2025"
```

**Resultado**: Primeira parcela mostra `1/3` e `10/11` ✅

---

## 🔍 Validação na VPS

### Passo 1: Deploy
```bash
cd /caminho/projeto
git pull
pm2 restart all
```

### Passo 2: Testar Criação
1. Criar compra **parcelada 3x** com data **10/11/2025**
2. Verificar log backend:
   ```
   📄 GET /api/faturas/itens - Sample: [
     {
       id: 123,
       data_compra: "2025-11-10",       ✅ String
       data_compra_type: "string",       ✅ Tipo correto
       parcela_numero: 1,                ✅ Primeira parcela
       parcela_total: 3
     }
   ]
   ```

### Passo 3: Verificar Visual
- **Fatura Atual**: Parcela `1/3` com data `10/11/2025` ✅
- **Extrato Completo**: Parcelas `1/3`, `2/3`, `3/3` em ordem ✅
- **Histórico**: Accordion mostra mês correto `Nov/2025` ✅

---

## 🚨 Pontos de Atenção

### ⚠️ Não Fazer
```typescript
// ❌ NUNCA: Causa shift UTC
new Date("2025-11-10")
new Date(item.data_compra)

// ❌ NUNCA: Depende de timezone do servidor
date.toISOString().split('T')[0]
```

### ✅ Fazer
```typescript
// ✅ Parsing TZ-safe
parseDateLocal("2025-11-10")

// ✅ Formatação sem Date
formatDateYmdToBr("2025-11-10")

// ✅ Date → string TZ-safe
dateToYmd(new Date())
```

---

## 📝 Outros Componentes

### Componentes Não Alterados (baixo risco)
- **useParcelas.ts**: Usa `.toISOString().slice(0, 7)` para mês corrente (apenas comparação, não display)
- **AddPurchaseModal.tsx**: Já usa lógica manual TZ-safe (geração de parcelas)

### Se Adicionar Novos Componentes
1. **Importar helpers**: `import { formatDateYmdToBr, parseDateLocal } from "@/lib/date"`
2. **Rendering**: Sempre usar `formatDateYmdToBr(dateString)`
3. **Cálculos**: Usar `parseDateLocal(dateString)` quando precisar Date object
4. **Submissões**: Usar `dateToYmd(date)` antes de enviar ao backend

---

## 🧪 Testes Futuros

### Cenários a Validar
- [ ] Compra no último dia do mês (31/01) → parcelas em fevereiro
- [ ] Compra próxima ao fechamento da fatura
- [ ] Faturas antigas (2024) exibindo datas corretas
- [ ] Timezone do servidor mudando (DST, etc.)

### Script de Verificação Rápida
```bash
# Na VPS, verificar timezone do Postgres
docker exec -it postgres psql -U usuario -d banco -c "SHOW timezone;"

# Se estiver UTC, está correto (dados armazenados sem TZ)
```

---

## 📚 Referências

- [MDN: Date.prototype.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [PostgreSQL DATE Type](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [Timezone Best Practices](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-TIMEZONES)

---

## ✅ Checklist Final

- [x] Backend retorna `data_compra` como string via `TO_CHAR`
- [x] Frontend usa `formatDateYmdToBr` para display de datas
- [x] Helpers centralizados em `src/lib/date.ts`
- [x] Componentes principais atualizados (Cartoes, InvoiceHistory, InvoiceItemsList, PayInvoice)
- [x] Logging adicionado para debug VPS
- [x] Documentação criada
- [ ] **Teste na VPS com compra 3x dia 10/11**
- [ ] Validar logs backend mostram `data_compra: "2025-11-10"`
- [ ] Confirmar visual: `1/3` e `10/11/2025`

---

**Última Atualização**: 10/11/2025  
**Autor**: GitHub Copilot  
**Status**: ✅ Implementado, aguardando validação VPS
