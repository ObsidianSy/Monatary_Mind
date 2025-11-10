-- ============================================
-- OTIMIZAÇÃO DE PERFORMANCE - ÍNDICES
-- Database: PostgreSQL 17.6
-- Schema: financeiro
-- Data: 2025-11-08
-- ============================================

-- ÍNDICE PRINCIPAL: Transações por tenant e data
-- Acelera queries de listagem de transações filtradas por período
CREATE INDEX IF NOT EXISTS idx_transacao_tenant_data_deleted 
ON financeiro.transacao(tenant_id, data_transacao DESC) 
WHERE is_deleted = false;

-- ÍNDICE: Transações por categoria
-- Acelera queries de análise por categoria e relatórios
CREATE INDEX IF NOT EXISTS idx_transacao_categoria 
ON financeiro.transacao(categoria_id) 
WHERE is_deleted = false AND categoria_id IS NOT NULL;

-- ÍNDICE: Transações por conta
-- Acelera queries de extrato por conta
CREATE INDEX IF NOT EXISTS idx_transacao_conta 
ON financeiro.transacao(conta_id) 
WHERE is_deleted = false;

-- ÍNDICE: Transações por status
-- Acelera filtros de transações previstas/liquidadas
CREATE INDEX IF NOT EXISTS idx_transacao_status 
ON financeiro.transacao(tenant_id, status, data_transacao DESC) 
WHERE is_deleted = false;

-- ÍNDICE: Categorias por parent_id
-- Acelera queries de subcategorias
CREATE INDEX IF NOT EXISTS idx_categoria_parent 
ON financeiro.categoria(parent_id) 
WHERE is_deleted = false AND parent_id IS NOT NULL;

-- ÍNDICE: Recorrências ativas
CREATE INDEX IF NOT EXISTS idx_recorrencia_ativo 
ON financeiro.recorrencia(tenant_id, ativo) 
WHERE is_deleted = false;

-- ============================================
-- ANÁLISE DE ÍNDICES (executar após criar)
-- ============================================

-- Verificar uso dos índices
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'financeiro'
ORDER BY idx_scan DESC;

-- Verificar tamanho dos índices
SELECT schemaname, tablename, indexname, 
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'financeiro'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- COMANDOS DE MANUTENÇÃO
-- ============================================

-- Reconstruir índices (executar mensalmente)
-- REINDEX TABLE financeiro.transacao;
-- REINDEX TABLE financeiro.categoria;

-- Atualizar estatísticas (executar semanalmente)
-- ANALYZE financeiro.transacao;
-- ANALYZE financeiro.categoria;

-- Vacuum (executar quando houver muitas exclusões)
-- VACUUM ANALYZE financeiro.transacao;
