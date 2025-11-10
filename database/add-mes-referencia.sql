-- Adicionar campo mes_referencia para rastrear mês de geração
ALTER TABLE financeiro.transacao 
ADD COLUMN IF NOT EXISTS mes_referencia VARCHAR(7);

-- Criar índice para consultas por mês
CREATE INDEX IF NOT EXISTS idx_transacao_mes_referencia 
ON financeiro.transacao(mes_referencia, tenant_id, status) 
WHERE is_deleted = false;

-- Comentário explicativo
COMMENT ON COLUMN financeiro.transacao.mes_referencia IS 
'Mês de referência no formato YYYY-MM. Usado para rastrear contas mensais geradas automaticamente de recorrências';

-- Atualizar transações existentes com base na data_transacao
UPDATE financeiro.transacao 
SET mes_referencia = TO_CHAR(data_transacao, 'YYYY-MM')
WHERE mes_referencia IS NULL 
  AND data_transacao IS NOT NULL
  AND is_deleted = false;
