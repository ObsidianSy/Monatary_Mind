

-- Validação pós-migração: registros ainda com tenant_id inválido
SELECT 'conta', COUNT(*) FROM financeiro.conta WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'categoria', COUNT(*) FROM financeiro.categoria WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'transacao', COUNT(*) FROM financeiro.transacao WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'cartao', COUNT(*) FROM financeiro.cartao WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'fatura', COUNT(*) FROM financeiro.fatura WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'fatura_item', COUNT(*) FROM financeiro.fatura_item WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
SELECT 'recorrencia', COUNT(*) FROM financeiro.recorrencia WHERE tenant_id IS NULL OR tenant_id = '' OR tenant_id = 'obsidian';
-- Este script atualiza todos os registros que não têm tenant_id
-- ou que têm tenant_id = 'obsidian' (valor antigo) para 'main'
-- ============================================


DO $$
DECLARE
    v_conta INTEGER := 0;
    v_categoria INTEGER := 0;
    v_transacao INTEGER := 0;
    v_cartao INTEGER := 0;
    v_fatura INTEGER := 0;
    v_fatura_item INTEGER := 0;
    v_recorrencia INTEGER := 0;
BEGIN

-- 1. Contas
UPDATE financeiro.conta 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_conta = ROW_COUNT;
RAISE NOTICE 'Contas alteradas: %', v_conta;

-- 2. Categorias
UPDATE financeiro.categoria 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_categoria = ROW_COUNT;
RAISE NOTICE 'Categorias alteradas: %', v_categoria;

-- 3. Transações
UPDATE financeiro.transacao 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_transacao = ROW_COUNT;
RAISE NOTICE 'Transações alteradas: %', v_transacao;

-- 4. Cartões de Crédito
UPDATE financeiro.cartao 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_cartao = ROW_COUNT;
RAISE NOTICE 'Cartões alterados: %', v_cartao;

-- 5. Faturas
UPDATE financeiro.fatura 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_fatura = ROW_COUNT;
RAISE NOTICE 'Faturas alteradas: %', v_fatura;

-- 6. Itens de Fatura
UPDATE financeiro.fatura_item 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_fatura_item = ROW_COUNT;
RAISE NOTICE 'Itens de fatura alterados: %', v_fatura_item;

-- 7. Recorrências
UPDATE financeiro.recorrencia 
SET tenant_id = 'main' 
WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = '';
GET DIAGNOSTICS v_recorrencia = ROW_COUNT;
RAISE NOTICE 'Recorrências alteradas: %', v_recorrencia;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na migração, realizando rollback.';
        RAISE;
END $$;

-- Verificar quantos registros foram atualizados
SELECT 
    'contas' as tabela,
    COUNT(*) as total_registros
FROM financeiro.conta WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'categorias',
    COUNT(*)
FROM financeiro.categoria WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'transacoes',
    COUNT(*)
FROM financeiro.transacao WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'cartoes',
    COUNT(*)
FROM financeiro.cartao WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'faturas',
    COUNT(*)
FROM financeiro.fatura WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'fatura_items',
    COUNT(*)
FROM financeiro.fatura_item WHERE tenant_id = 'main'
UNION ALL
SELECT 
    'recorrencias',
    COUNT(*)
FROM financeiro.recorrencia WHERE tenant_id = 'main';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
