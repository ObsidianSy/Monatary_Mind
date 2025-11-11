-- Ver TODAS as parcelas no banco com seus números
SELECT 
  id,
  descricao,
  TO_CHAR(data_compra, 'YYYY-MM-DD') as data_compra,
  parcela_numero,
  parcela_total,
  valor,
  TO_CHAR(competencia, 'YYYY-MM-DD') as competencia,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as criado_em
FROM financeiro.fatura_item
WHERE tenant_id = 'obsidian' 
  AND is_deleted = false
ORDER BY created_at DESC, parcela_numero ASC;

-- Ver se tem duplicatas ou parcelas órfãs
SELECT 
  descricao,
  data_compra,
  parcela_total,
  COUNT(*) as quantidade,
  STRING_AGG(CAST(parcela_numero AS TEXT), ', ' ORDER BY parcela_numero) as parcelas
FROM financeiro.fatura_item
WHERE tenant_id = 'obsidian' 
  AND is_deleted = false
  AND parcela_total > 1
GROUP BY descricao, data_compra, parcela_total
ORDER BY data_compra DESC;
