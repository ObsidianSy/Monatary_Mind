# 📁 Database - Scripts de Banco de Dados

Este diretório contém scripts para criação, migração e otimização do banco de dados PostgreSQL.

## 📄 Arquivos

### `migrate.ps1` ⭐ RECOMENDADO
Script PowerShell automatizado que executa toda a migração com segurança.

**Uso:**
```powershell
cd database
.\migrate.ps1 -DbName "monetary_mind" -DbUser "postgres" -DbPassword "suasenha"
```

**O que faz:**
- ✅ Cria backup automático
- ✅ Verifica dependências (pg_dump, psql)
- ✅ Testa conexão com banco
- ✅ Executa init-database.sql (cria schema financeiro)
- ✅ Executa migrate-to-financeiro-schema.sql (migra dados)
- ✅ Verifica integridade dos dados
- ✅ Mostra relatório de sucesso/erro

### `migrate-to-financeiro-schema.sql`
Script SQL que migra dados do schema `public` (tabelas no plural) para `financeiro` (singular).

**Uso manual:**
```bash
psql -U postgres -d monetary_mind -f migrate-to-financeiro-schema.sql
```

**O que migra:**
- `public.contas` → `financeiro.conta`
- `public.categorias` → `financeiro.categoria`
- `public.transacoes` → `financeiro.transacao`
- `public.cartoes` → `financeiro.cartao`
- `public.faturas` → `financeiro.fatura`
- `public.fatura_itens` → `financeiro.fatura_item`
- `public.recorrencias` → `financeiro.recorrencia`
- `public.cheques` → `financeiro.cheque`

### `MIGRATION-GUIDE.md`
Guia completo passo a passo para migração manual e resolução de problemas.

**Inclui:**
- 🆕 Instruções para instalação limpa
- 🔄 Processo de migração detalhado
- 🐛 Troubleshooting comum
- ✅ Checklist de validação

### `create-indexes.sql`
Índices otimizados para melhorar performance de queries.

**Uso:**
```bash
psql -U postgres -d monetary_mind -f create-indexes.sql
```

**Índices criados:**
- `idx_transacao_tenant_data_deleted` - Listagem de transações
- `idx_transacao_categoria` - Análise por categoria
- `idx_transacao_conta` - Extrato por conta
- `idx_transacao_status` - Filtro por status
- `idx_categoria_parent` - Subcategorias
- `idx_recorrencia_ativo` - Recorrências ativas

### `add-mes-referencia.sql`
Adiciona campo `mes_referencia` às transações (YYYY-MM).

**Uso:**
```bash
psql -U postgres -d monetary_mind -f add-mes-referencia.sql
```

---

## 🚀 Início Rápido

### Opção 1: Instalação Limpa (Sem Dados)

```bash
# Executar apenas init-database.sql do diretório server/
psql -U postgres -d monetary_mind -f ../server/init-database.sql
```

### Opção 2: Migração de Dados Existentes

```powershell
# Windows PowerShell (RECOMENDADO)
cd database
.\migrate.ps1 -DbName "monetary_mind" -DbUser "postgres" -DbPassword "suasenha"
```

OU manualmente:

```bash
# 1. Backup
pg_dump -U postgres -d monetary_mind -F c -f backup.dump

# 2. Criar schema
psql -U postgres -d monetary_mind -f ../server/init-database.sql

# 3. Migrar dados
psql -U postgres -d monetary_mind -f migrate-to-financeiro-schema.sql

# 4. Otimizar
psql -U postgres -d monetary_mind -f create-indexes.sql
```

---

## ⚠️ Importante

- **SEMPRE faça backup** antes de executar scripts de migração
- Execute `migrate.ps1` **apenas uma vez**
- Verifique contagem de registros antes/depois
- Teste a aplicação antes de remover tabelas antigas

---

## 🆘 Restaurar Backup

Se algo der errado:

```bash
pg_restore -U postgres -d monetary_mind -c backup_pre_migracao_XXXXXXXX.dump
```

---

## 📊 Estrutura do Schema Financeiro

```
financeiro/
├── conta              (contas bancárias)
├── categoria          (categorias de transações)
├── transacao          (lançamentos financeiros)
├── cartao             (cartões de crédito)
├── fatura             (faturas dos cartões)
├── fatura_item        (compras individuais)
├── recorrencia        (transações recorrentes)
└── cheque             (controle de cheques)
```

---

## 🔧 Manutenção

### Rebuild de Índices (Mensal)
```sql
REINDEX TABLE financeiro.transacao;
REINDEX TABLE financeiro.categoria;
```

### Atualizar Estatísticas (Semanal)
```sql
ANALYZE financeiro.transacao;
ANALYZE financeiro.categoria;
```

### Vacuum (Quando houver muitas exclusões)
```sql
VACUUM ANALYZE financeiro.transacao;
```

---

## 📝 Changelog

### 2025-11-09
- ✅ Criado schema `financeiro`
- ✅ Renomeadas tabelas (plural → singular)
- ✅ Adicionada constraint `UNIQUE(cartao_id, competencia)` em fatura
- ✅ Adicionado campo `is_deleted` em fatura_item
- ✅ Criados scripts de migração automática
- ✅ Adicionadas validações no backend (valor > 0, parcelas válidas)
