-- Patch 002: Criar view vw_saldo_por_conta para endpoint de projeção
-- Data: 2025-11-18
-- Descrição: View para calcular saldo atual consolidado por conta (usado em /api/projecao)

-- View de saldo por conta (usada em projeções)
CREATE OR REPLACE VIEW financeiro.vw_saldo_por_conta AS
SELECT 
    c.id as conta_id,
    c.nome as conta_nome,
    c.tipo,
    c.saldo_inicial +
    COALESCE((SELECT SUM(valor) FROM financeiro.transacao WHERE conta_id = c.id AND tipo = 'credito' AND status = 'liquidado'), 0) -
    COALESCE((SELECT SUM(valor) FROM financeiro.transacao WHERE conta_id = c.id AND tipo = 'debito' AND status = 'liquidado'), 0) as saldo_atual
FROM financeiro.conta c
WHERE c.is_deleted = false;

-- Verificação
SELECT * FROM financeiro.vw_saldo_por_conta LIMIT 5;
