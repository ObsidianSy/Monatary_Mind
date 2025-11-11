-- Teste da query corrigida
SELECT 
  fi.id,
  fi.fatura_id,
  fi.categoria_id,
  fi.descricao,
  TO_CHAR(fi.data_compra, 'YYYY-MM-DD') AS data_compra,
  fi.parcela_numero,
  fi.parcela_total,
  fi.valor,
  TO_CHAR(fi.competencia, 'YYYY-MM-DD') AS competencia,
  fi.cartao_id,
  fi.tenant_id,
  fi.created_at,
  fi.updated_at,
  fi.is_deleted,
  cat.nome AS categoria_nome,
  cat.parent_id AS categoria_parent_id,
  parent_cat.nome AS categoria_pai_nome
FROM financeiro.fatura_item fi
LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
LEFT JOIN financeiro.categoria parent_cat ON cat.parent_id = parent_cat.id
WHERE fi.tenant_id = 'obsidian' AND fi.is_deleted = false
ORDER BY data_compra DESC, CAST(fi.parcela_numero AS INTEGER) ASC
LIMIT 3;
