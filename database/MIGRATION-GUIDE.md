# 📋 Guia de Migração - Schema Financeiro

## ⚠️ IMPORTANTE
Este guia é para **migrar dados existentes** do schema `public` (tabelas no plural) para o novo schema `financeiro` (tabelas no singular).

Se você está começando do zero, **pule direto para "Instalação Limpa"**.

---

## 🆕 Instalação Limpa (Sem Dados Existentes)

Se você ainda **não tem dados** no banco, basta executar:

```bash
psql -U seu_usuario -d seu_banco -f server/init-database.sql
```

✅ Pronto! O schema `financeiro` será criado com todas as tabelas corretas.

---

## 🔄 Migração de Dados Existentes

### Passo 1: Backup do Banco Atual

**SEMPRE faça backup antes de migrar!**

```bash
# Windows (PowerShell)
pg_dump -U seu_usuario -d seu_banco -F c -f backup_pre_migracao.dump

# Linux/Mac
pg_dump -U seu_usuario -d seu_banco -F c -f backup_pre_migracao.dump
```

### Passo 2: Verificar Estrutura Atual

```sql
-- Conectar ao banco
psql -U seu_usuario -d seu_banco

-- Verificar quais tabelas existem
\dt public.*
\dt financeiro.*

-- Contar registros atuais
SELECT 'contas' as tabela, COUNT(*) FROM public.contas
UNION ALL
SELECT 'categorias', COUNT(*) FROM public.categorias
UNION ALL
SELECT 'transacoes', COUNT(*) FROM public.transacoes
UNION ALL
SELECT 'cartoes', COUNT(*) FROM public.cartoes
UNION ALL
SELECT 'faturas', COUNT(*) FROM public.faturas
UNION ALL
SELECT 'fatura_itens', COUNT(*) FROM public.fatura_itens;
```

### Passo 3: Criar Novo Schema

```bash
psql -U seu_usuario -d seu_banco -f server/init-database.sql
```

**O que acontece:**
- ✅ Cria schema `financeiro`
- ✅ Cria tabelas no singular (`conta`, `categoria`, etc.)
- ✅ Adiciona constraint `UNIQUE(cartao_id, competencia)` em fatura
- ✅ Cria índices otimizados
- ✅ Insere categorias padrão

### Passo 4: Executar Migração

```bash
psql -U seu_usuario -d seu_banco -f database/migrate-to-financeiro-schema.sql
```

**O que acontece:**
- ✅ Copia todos os dados de `public.contas` → `financeiro.conta`
- ✅ Copia todos os dados de `public.categorias` → `financeiro.categoria`
- ✅ Copia transações, cartões, faturas, itens, recorrências, cheques
- ✅ Mostra relatório de verificação:
  ```
  CONTAS: old=5 new=5
  CATEGORIAS: old=12 new=12
  TRANSAÇÕES: old=150 new=150
  ...
  ```

### Passo 5: Verificar Migração

```sql
-- Conectar ao banco
psql -U seu_usuario -d seu_banco

-- Comparar contagens
SELECT 
    (SELECT COUNT(*) FROM public.contas) as contas_old,
    (SELECT COUNT(*) FROM financeiro.conta) as contas_new,
    (SELECT COUNT(*) FROM public.categorias) as categorias_old,
    (SELECT COUNT(*) FROM financeiro.categoria) as categorias_new,
    (SELECT COUNT(*) FROM public.transacoes) as transacoes_old,
    (SELECT COUNT(*) FROM financeiro.transacao) as transacoes_new;

-- Verificar integridade das faturas
SELECT f.id, f.cartao_id, f.competencia, f.status, COUNT(fi.id) as itens
FROM financeiro.fatura f
LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id
GROUP BY f.id, f.cartao_id, f.competencia, f.status
ORDER BY f.competencia DESC
LIMIT 10;
```

### Passo 6: Testar Aplicação

```bash
# Iniciar servidor backend
cd server
npm start

# OU com nodemon
npm run dev
```

**Testes críticos:**
1. ✅ Listar contas (`GET /api/contas`)
2. ✅ Listar categorias (`GET /api/categorias`)
3. ✅ Listar transações (`GET /api/transacoes`)
4. ✅ Criar nova compra no cartão
5. ✅ Fechar fatura
6. ✅ Pagar fatura

### Passo 7: Remover Tabelas Antigas (OPCIONAL)

⚠️ **Só faça isso depois de confirmar que tudo funciona!**

```sql
-- Abrir o arquivo de migração
-- Descomentar as linhas de DROP TABLE no final
-- Executar novamente:
psql -U seu_usuario -d seu_banco -f database/migrate-to-financeiro-schema.sql
```

Ou manualmente:

```sql
BEGIN;

DROP TABLE IF EXISTS public.cheques CASCADE;
DROP TABLE IF EXISTS public.fatura_itens CASCADE;
DROP TABLE IF EXISTS public.faturas CASCADE;
DROP TABLE IF EXISTS public.recorrencias CASCADE;
DROP TABLE IF EXISTS public.cartoes CASCADE;
DROP TABLE IF EXISTS public.transacoes CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.contas CASCADE;

DROP VIEW IF EXISTS public.v_saldos_contas;
DROP VIEW IF EXISTS public.v_proximas_transacoes;

COMMIT;
```

---

## 🐛 Resolução de Problemas

### Erro: "relation financeiro.conta does not exist"

**Causa:** Schema financeiro não foi criado.

**Solução:**
```bash
psql -U seu_usuario -d seu_banco -f server/init-database.sql
```

### Erro: "duplicate key value violates unique constraint"

**Causa:** Tentou executar migração mais de uma vez.

**Solução:** A migração usa `ON CONFLICT DO NOTHING`, então é seguro. Se quiser limpar:
```sql
TRUNCATE financeiro.conta CASCADE;
TRUNCATE financeiro.categoria CASCADE;
-- Execute novamente a migração
```

### Dados não aparecem no frontend

**Causa:** Backend ainda está usando queries antigas sem `financeiro.`

**Solução:** Verificar que arquivo `server/index.ts` foi atualizado:
```bash
# Verificar se queries foram atualizadas
grep "FROM conta " server/index.ts  # Não deve retornar nada
grep "FROM financeiro.conta" server/index.ts  # Deve retornar linhas
```

Se retornar queries sem `financeiro.`, execute o script PowerShell novamente:
```powershell
(Get-Content "server/index.ts") -replace 'FROM conta ', 'FROM financeiro.conta ' | Set-Content "server/index.ts"
```

### Erro: "valor deve ser maior que zero"

**Causa:** Nova validação adicionada para prevenir valores negativos.

**Solução:** Isso é correto! Certifique-se que está enviando `valor > 0` nas requisições.

---

## 📊 Resumo das Mudanças

### Schema
- ❌ Antes: `public.contas`, `public.categorias` (plural)
- ✅ Depois: `financeiro.conta`, `financeiro.categoria` (singular)

### Validações Adicionadas
1. ✅ `valor > 0` em transações e compras
2. ✅ `parcela_numero >= 1` e `<= parcela_total`
3. ✅ Impede compras em faturas fechadas/pagas
4. ✅ Mensagem clara para faturas duplicadas

### Novas Constraints
- ✅ `UNIQUE(cartao_id, competencia)` em fatura
- ✅ `is_deleted` em fatura_item

---

## 🆘 Suporte

Se encontrar problemas:

1. **Restaurar backup:**
   ```bash
   pg_restore -U seu_usuario -d seu_banco -c backup_pre_migracao.dump
   ```

2. **Verificar logs do PostgreSQL**
3. **Verificar logs do backend** (`console.log` no terminal)
4. **Abrir issue no GitHub** com detalhes do erro

---

## ✅ Checklist Final

- [ ] Backup criado
- [ ] Novo schema criado (`init-database.sql`)
- [ ] Migração executada (`migrate-to-financeiro-schema.sql`)
- [ ] Contagens verificadas (old == new)
- [ ] Backend reiniciado
- [ ] Testes básicos funcionando
- [ ] Tabelas antigas removidas (opcional)

**Migração concluída com sucesso!** 🎉
