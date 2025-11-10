-- ============================================
-- SCRIPT DE MIGRAÇÃO: public → financeiro
-- Database: PostgreSQL 17.6
-- Data: 2025-11-09
-- 
-- ATENÇÃO: Este script migra dados de tabelas antigas
-- (public.contas, public.categorias) para o novo schema
-- (financeiro.conta, financeiro.categoria)
-- 
-- EXECUTE APENAS UMA VEZ após criar o novo schema!
-- ============================================

-- Verificar se schema financeiro existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'financeiro') THEN
        RAISE EXCEPTION 'Schema financeiro não existe. Execute init-database.sql primeiro!';
    END IF;
END $$;

-- ============================================
-- MIGRAÇÃO DE DADOS
-- ============================================

BEGIN;

-- 1. CONTAS (plural → singular)
INSERT INTO financeiro.conta (id, tenant_id, nome, tipo, saldo_inicial, saldo_atual, ativo, is_deleted, created_at, updated_at)
SELECT id, tenant_id, nome, tipo, saldo_inicial, saldo_atual, ativo, is_deleted, created_at, updated_at
FROM public.contas
WHERE NOT EXISTS (SELECT 1 FROM financeiro.conta WHERE financeiro.conta.id = public.contas.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migradas %s contas', COUNT(*)) FROM public.contas;

-- 2. CATEGORIAS (plural → singular)
INSERT INTO financeiro.categoria (id, tenant_id, nome, tipo, parent_id, created_at, updated_at)
SELECT id, tenant_id, nome, tipo, parent_id, created_at, updated_at
FROM public.categorias
WHERE NOT EXISTS (SELECT 1 FROM financeiro.categoria WHERE financeiro.categoria.id = public.categorias.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migradas %s categorias', COUNT(*)) FROM public.categorias;

-- 3. TRANSAÇÕES (plural → singular)
INSERT INTO financeiro.transacao (
    id, tenant_id, tipo, valor, descricao, data_transacao, data_vencimento,
    conta_id, conta_destino_id, categoria_id, subcategoria_id, origem, referencia,
    status, grupo_id, parcela_numero, parcela_total, instrumento, observacoes,
    mes_referencia, created_at, updated_at
)
SELECT 
    id, tenant_id, tipo, valor, descricao, data_transacao, data_vencimento,
    conta_id, conta_destino_id, categoria_id, subcategoria_id, origem, referencia,
    status, grupo_id, parcela_numero, parcela_total, instrumento, observacoes,
    mes_referencia, created_at, updated_at
FROM public.transacoes
WHERE NOT EXISTS (SELECT 1 FROM financeiro.transacao WHERE financeiro.transacao.id = public.transacoes.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migradas %s transações', COUNT(*)) FROM public.transacoes;

-- 4. CARTÕES (plural → singular)
INSERT INTO financeiro.cartao (
    id, tenant_id, apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
    conta_pagamento_id, ativo, is_deleted, created_at, updated_at
)
SELECT 
    id, tenant_id, apelido, bandeira, limite_total, dia_fechamento, dia_vencimento,
    conta_pagamento_id, ativo, is_deleted, created_at, updated_at
FROM public.cartoes
WHERE NOT EXISTS (SELECT 1 FROM financeiro.cartao WHERE financeiro.cartao.id = public.cartoes.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migrados %s cartões', COUNT(*)) FROM public.cartoes;

-- 5. FATURAS (plural → singular)
INSERT INTO financeiro.fatura (
    id, tenant_id, cartao_id, competencia, status, valor_total, valor_fechado, valor_pago,
    data_fechamento, data_vencimento, data_pagamento, transacao_id, created_at, updated_at
)
SELECT 
    id, tenant_id, cartao_id, competencia, status, valor_total, valor_fechado, valor_pago,
    data_fechamento, data_vencimento, data_pagamento, transacao_id, created_at, updated_at
FROM public.faturas
WHERE NOT EXISTS (SELECT 1 FROM financeiro.fatura WHERE financeiro.fatura.id = public.faturas.id)
ON CONFLICT (cartao_id, competencia) DO NOTHING;

SELECT format('✅ Migradas %s faturas', COUNT(*)) FROM public.faturas;

-- 6. ITENS DE FATURA (plural → singular, nome completo)
INSERT INTO financeiro.fatura_item (
    id, tenant_id, fatura_id, cartao_id, descricao, valor, data_compra,
    categoria_id, subcategoria_id, parcela_numero, parcela_total, competencia,
    is_deleted, created_at, updated_at
)
SELECT 
    id, tenant_id, fatura_id, cartao_id, descricao, valor, data_compra,
    categoria_id, subcategoria_id, parcela_numero, parcela_total, competencia,
    COALESCE(is_deleted, false), created_at, updated_at
FROM public.fatura_itens
WHERE NOT EXISTS (SELECT 1 FROM financeiro.fatura_item WHERE financeiro.fatura_item.id = public.fatura_itens.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migrados %s itens de fatura', COUNT(*)) FROM public.fatura_itens;

-- 7. RECORRÊNCIAS (plural → singular)
INSERT INTO financeiro.recorrencia (
    id, tenant_id, conta_id, categoria_id, subcategoria_id, tipo, valor, descricao,
    frequencia, dia_vencimento, dia_semana, data_inicio, data_fim, ativo, is_paused,
    is_deleted, proxima_ocorrencia, alerta_dias_antes, created_at, updated_at
)
SELECT 
    id, tenant_id, conta_id, categoria_id, subcategoria_id, tipo, valor, descricao,
    frequencia, dia_vencimento, dia_semana, data_inicio, data_fim, ativo, is_paused,
    is_deleted, proxima_ocorrencia, alerta_dias_antes, created_at, updated_at
FROM public.recorrencias
WHERE NOT EXISTS (SELECT 1 FROM financeiro.recorrencia WHERE financeiro.recorrencia.id = public.recorrencias.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migradas %s recorrências', COUNT(*)) FROM public.recorrencias;

-- 8. CHEQUES (plural → singular)
INSERT INTO financeiro.cheque (
    id, tenant_id, tipo, numero, banco, agencia, conta_bancaria, nominal, documento,
    valor, data_emissao, data_prev_compensacao, data_compensacao, status, conta_id,
    transacao_id, observacoes, created_at, updated_at
)
SELECT 
    id, tenant_id, tipo, numero, banco, agencia, conta_bancaria, nominal, documento,
    valor, data_emissao, data_prev_compensacao, data_compensacao, status, conta_id,
    transacao_id, observacoes, created_at, updated_at
FROM public.cheques
WHERE NOT EXISTS (SELECT 1 FROM financeiro.cheque WHERE financeiro.cheque.id = public.cheques.id)
ON CONFLICT (id) DO NOTHING;

SELECT format('✅ Migrados %s cheques', COUNT(*)) FROM public.cheques;

COMMIT;

-- ============================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================

DO $$
DECLARE
    count_old INTEGER;
    count_new INTEGER;
BEGIN
    -- Contas
    SELECT COUNT(*) INTO count_old FROM public.contas WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.conta WHERE true;
    RAISE NOTICE 'CONTAS: old=% new=%', count_old, count_new;
    
    -- Categorias
    SELECT COUNT(*) INTO count_old FROM public.categorias WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.categoria WHERE true;
    RAISE NOTICE 'CATEGORIAS: old=% new=%', count_old, count_new;
    
    -- Transações
    SELECT COUNT(*) INTO count_old FROM public.transacoes WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.transacao WHERE true;
    RAISE NOTICE 'TRANSAÇÕES: old=% new=%', count_old, count_new;
    
    -- Cartões
    SELECT COUNT(*) INTO count_old FROM public.cartoes WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.cartao WHERE true;
    RAISE NOTICE 'CARTÕES: old=% new=%', count_old, count_new;
    
    -- Faturas
    SELECT COUNT(*) INTO count_old FROM public.faturas WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.fatura WHERE true;
    RAISE NOTICE 'FATURAS: old=% new=%', count_old, count_new;
    
    -- Itens de fatura
    SELECT COUNT(*) INTO count_old FROM public.fatura_itens WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.fatura_item WHERE true;
    RAISE NOTICE 'ITENS FATURA: old=% new=%', count_old, count_new;
    
    -- Recorrências
    SELECT COUNT(*) INTO count_old FROM public.recorrencias WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.recorrencia WHERE true;
    RAISE NOTICE 'RECORRÊNCIAS: old=% new=%', count_old, count_new;
    
    -- Cheques
    SELECT COUNT(*) INTO count_old FROM public.cheques WHERE true;
    SELECT COUNT(*) INTO count_new FROM financeiro.cheque WHERE true;
    RAISE NOTICE 'CHEQUES: old=% new=%', count_old, count_new;
END $$;

-- ============================================
-- OPCIONAL: REMOVER TABELAS ANTIGAS
-- ============================================
-- ATENÇÃO: Descomente apenas se tiver certeza que a migração foi bem-sucedida!
-- 
-- DROP TABLE IF EXISTS public.cheques CASCADE;
-- DROP TABLE IF EXISTS public.fatura_itens CASCADE;
-- DROP TABLE IF EXISTS public.faturas CASCADE;
-- DROP TABLE IF EXISTS public.recorrencias CASCADE;
-- DROP TABLE IF EXISTS public.cartoes CASCADE;
-- DROP TABLE IF EXISTS public.transacoes CASCADE;
-- DROP TABLE IF EXISTS public.categorias CASCADE;
-- DROP TABLE IF EXISTS public.contas CASCADE;
-- 
-- DROP VIEW IF EXISTS public.v_saldos_contas;
-- DROP VIEW IF EXISTS public.v_proximas_transacoes;
-- 
-- RAISE NOTICE '🗑️  Tabelas antigas removidas do schema public';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
SELECT '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;
