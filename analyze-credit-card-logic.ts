import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '72.60.147.138',
  port: parseInt(process.env.DB_PORT || '5455'),
  database: process.env.DB_NAME || 'docker',
  user: process.env.DB_USER || 'docker',
  password: process.env.DB_PASSWORD || 'docker',
});

async function analyzeLogic() {
  const client = await pool.connect();
  try {
    console.log('🔍 ANÁLISE COMPLETA DA LÓGICA DE CARTÃO DE CRÉDITO\n');
    
    // 1. Verificar constraints da tabela fatura_item
    console.log('1️⃣ CONSTRAINTS DA TABELA fatura_item:');
    const constraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'fatura_item'
        AND tc.table_schema = 'financeiro'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `);
    console.table(constraints.rows);
    
    // 2. Verificar índices
    console.log('\n2️⃣ ÍNDICES DA TABELA fatura_item:');
    const indexes = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'financeiro'
        AND tablename = 'fatura_item'
      ORDER BY indexname;
    `);
    console.table(indexes.rows);
    
    // 3. Verificar dados duplicados
    console.log('\n3️⃣ VERIFICANDO DUPLICATAS (cartao_id + competencia):');
    const duplicates = await client.query(`
      SELECT 
        cartao_id,
        competencia,
        COUNT(*) as total,
        string_agg(id::text, ', ') as ids,
        string_agg(descricao, ' | ') as descricoes
      FROM financeiro.fatura_item
      WHERE tenant_id = 'obsidian' AND is_deleted = false
      GROUP BY cartao_id, competencia
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10;
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️  ENCONTRADAS DUPLICATAS:');
      console.table(duplicates.rows);
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // 4. Analisar distribuição de compras
    console.log('\n4️⃣ DISTRIBUIÇÃO DE COMPRAS POR CARTÃO E COMPETÊNCIA:');
    const distribution = await client.query(`
      SELECT 
        c.apelido as cartao,
        TO_CHAR(fi.competencia, 'YYYY-MM') as mes,
        COUNT(*) as total_compras,
        SUM(fi.valor) as valor_total,
        COUNT(DISTINCT fi.fatura_id) as faturas_diferentes
      FROM financeiro.fatura_item fi
      JOIN financeiro.cartao c ON fi.cartao_id = c.id
      WHERE fi.tenant_id = 'obsidian' AND fi.is_deleted = false
      GROUP BY c.apelido, TO_CHAR(fi.competencia, 'YYYY-MM')
      ORDER BY mes DESC, cartao
      LIMIT 20;
    `);
    console.table(distribution.rows);
    
    // 5. Verificar lógica de fatura
    console.log('\n5️⃣ LÓGICA DE FATURAS (cartão + competência):');
    const invoiceLogic = await client.query(`
      SELECT 
        c.apelido as cartao,
        f.competencia,
        f.status,
        f.data_vencimento,
        COUNT(fi.id) as total_itens,
        SUM(fi.valor) as valor_calculado,
        f.valor_total as valor_fatura
      FROM financeiro.fatura f
      JOIN financeiro.cartao c ON f.cartao_id = c.id
      LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id
      WHERE f.tenant_id = 'obsidian'
      GROUP BY c.apelido, f.competencia, f.status, f.data_vencimento, f.valor_total
      ORDER BY f.competencia DESC
      LIMIT 15;
    `);
    console.table(invoiceLogic.rows);
    
    // 6. Verificar compras sem fatura
    console.log('\n6️⃣ COMPRAS SEM FATURA ASSOCIADA:');
    const orphanItems = await client.query(`
      SELECT 
        fi.id,
        fi.descricao,
        fi.valor,
        fi.competencia,
        fi.cartao_id,
        c.apelido as cartao,
        fi.fatura_id
      FROM financeiro.fatura_item fi
      LEFT JOIN financeiro.cartao c ON fi.cartao_id = c.id
      LEFT JOIN financeiro.fatura f ON fi.fatura_id = f.id
      WHERE fi.tenant_id = 'obsidian' 
        AND fi.is_deleted = false
        AND (fi.fatura_id IS NULL OR f.id IS NULL)
      LIMIT 10;
    `);
    
    if (orphanItems.rows.length > 0) {
      console.log('⚠️  COMPRAS SEM FATURA:');
      console.table(orphanItems.rows);
    } else {
      console.log('✅ Todas as compras têm fatura associada');
    }
    
    // 7. Analisar constraint problemática
    console.log('\n7️⃣ ANALISANDO A CONSTRAINT ÚNICA:');
    const uniqueConstraint = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname LIKE '%fatura_item%unique%'
        AND connamespace = 'financeiro'::regnamespace;
    `);
    
    if (uniqueConstraint.rows.length > 0) {
      console.log('📋 Constraint única encontrada:');
      console.table(uniqueConstraint.rows);
      
      console.log('\n💡 PROBLEMA IDENTIFICADO:');
      console.log('A constraint está impedindo múltiplas compras no mesmo cartão/competência.');
      console.log('Isso está ERRADO - um cartão pode ter várias compras no mesmo mês!');
      console.log('\n🔧 SOLUÇÃO: Remover essa constraint.');
    } else {
      console.log('Nenhuma constraint única problemática encontrada nos metadados.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeLogic();
