import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function analyzeCardSystem() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado ao PostgreSQL\n');
    const tenantId = 'obsidian';

    // 1. Verificar estrutura das tabelas
    console.log('📋 ESTRUTURA DAS TABELAS:\n');
    
    const tablesInfo = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'financeiro'
      AND table_name IN ('cartao', 'fatura', 'fatura_item')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('Colunas encontradas:');
    console.table(tablesInfo.rows);

    // 2. Verificar cartões cadastrados
    console.log('\n💳 CARTÕES CADASTRADOS:\n');
    const cartoes = await client.query(`
      SELECT 
        id, apelido, bandeira, 
        limite_total, 
        dia_fechamento, dia_vencimento,
        conta_pagamento_id,
        is_deleted
      FROM financeiro.cartao
      WHERE tenant_id = $1
      ORDER BY apelido
    `, [tenantId]);
    
    console.table(cartoes.rows);

    // 3. Verificar faturas
    console.log('\n📊 FATURAS:\n');
    const faturas = await client.query(`
      SELECT 
        f.id,
        c.apelido as cartao,
        f.competencia,
        f.status,
        f.valor_fechado,
        f.data_vencimento,
        f.data_fechamento
      FROM financeiro.fatura f
      JOIN financeiro.cartao c ON f.cartao_id = c.id
      WHERE f.tenant_id = $1
      ORDER BY f.competencia DESC, c.apelido
      LIMIT 20
    `, [tenantId]);
    
    console.table(faturas.rows);

    // 4. Verificar itens de fatura (compras)
    console.log('\n🛒 ITENS DE FATURA (últimas 20 compras):\n');
    const compras = await client.query(`
      SELECT 
        fi.id,
        c.apelido as cartao,
        fi.descricao,
        fi.valor,
        fi.data_compra,
        fi.competencia,
        fi.parcela_numero,
        fi.parcela_total,
        fi.fatura_id,
        cat.nome as categoria
      FROM financeiro.fatura_item fi
      LEFT JOIN financeiro.cartao c ON fi.cartao_id = c.id
      LEFT JOIN financeiro.categoria cat ON fi.categoria_id = cat.id
      WHERE fi.tenant_id = $1
      ORDER BY fi.data_compra DESC
      LIMIT 20
    `, [tenantId]);
    
    console.table(compras.rows);

    // 5. Análise de consistência
    console.log('\n⚠️ ANÁLISE DE CONSISTÊNCIA:\n');
    
    // Compras sem fatura vinculada
    const comprasSemFatura = await client.query(`
      SELECT COUNT(*) as total
      FROM financeiro.fatura_item
      WHERE tenant_id = $1 AND fatura_id IS NULL
    `, [tenantId]);
    
    console.log(`Compras sem fatura vinculada: ${comprasSemFatura.rows[0].total}`);

    // Compras sem cartão
    const comprasSemCartao = await client.query(`
      SELECT COUNT(*) as total
      FROM financeiro.fatura_item
      WHERE tenant_id = $1 AND cartao_id IS NULL
    `, [tenantId]);
    
    console.log(`Compras sem cartão vinculado: ${comprasSemCartao.rows[0].total}`);

    // Faturas com valor_fechado NULL mas com itens
    const faturasInconsistentes = await client.query(`
      SELECT 
        f.id,
        f.competencia,
        f.status,
        f.valor_fechado,
        COUNT(fi.id) as total_itens,
        SUM(fi.valor) as soma_itens
      FROM financeiro.fatura f
      LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id AND fi.is_deleted = false
      WHERE f.tenant_id = $1
      GROUP BY f.id, f.competencia, f.status, f.valor_fechado
      HAVING (f.valor_fechado IS NULL AND COUNT(fi.id) > 0 AND f.status = 'fechada')
         OR (f.valor_fechado <> SUM(fi.valor) AND f.status IN ('fechada', 'paga'))
    `, [tenantId]);
    
    if (faturasInconsistentes.rows.length > 0) {
      console.log('\n⚠️ Faturas com valores inconsistentes:');
      console.table(faturasInconsistentes.rows);
    } else {
      console.log('✅ Todas as faturas fechadas estão consistentes');
    }

    // 6. Verificar competências
    console.log('\n📅 COMPETÊNCIAS GERADAS:\n');
    const competencias = await client.query(`
      SELECT 
        c.apelido as cartao,
        fi.competencia,
        COUNT(*) as total_compras,
        SUM(fi.valor) as valor_total
      FROM financeiro.fatura_item fi
      JOIN financeiro.cartao c ON fi.cartao_id = c.id
      WHERE fi.tenant_id = $1
      GROUP BY c.apelido, fi.competencia
      ORDER BY fi.competencia DESC, c.apelido
      LIMIT 20
    `, [tenantId]);
    
    console.table(competencias.rows);

    // 7. Verificar lógica de fechamento
    console.log('\n🔒 STATUS DE FECHAMENTO:\n');
    const statusFechamento = await client.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM financeiro.fatura
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenantId]);
    
    console.table(statusFechamento.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

analyzeCardSystem().catch(console.error);
