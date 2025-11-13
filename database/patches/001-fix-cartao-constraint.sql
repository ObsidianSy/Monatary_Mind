-- Patch: Ajusta constraint cartao_dia_fechamento_check para permitir 1..31
-- Use com cautela; faça backup antes de aplicar em produção.
BEGIN;

-- Remove a constraint atual (se existir) e recria com a faixa correta 1..31
ALTER TABLE financeiro.cartao DROP CONSTRAINT IF EXISTS cartao_dia_fechamento_check;

ALTER TABLE financeiro.cartao
  ADD CONSTRAINT cartao_dia_fechamento_check
  CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31);

COMMIT;

-- Nota: se quiser aplicar apenas depois de validar, execute os comandos acima manualmente via psql.
