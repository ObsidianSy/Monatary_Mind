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

async function fixConstraints() {
  const client = await pool.connect();
  try {
    console.log('🔧 CORRIGINDO CONSTRAINTS PROBLEMÁTICAS\n');
    
    await client.query('BEGIN');
    
    // Remover índice único problemático
    console.log('1️⃣ Removendo fatura_item_cartao_competencia_unique...');
    await client.query(`
      DROP INDEX IF EXISTS financeiro.fatura_item_cartao_competencia_unique;
    `);
    console.log('✅ Removido com sucesso');
    
    // Remover índice de conflito
    console.log('\n2️⃣ Removendo fatura_item_conflict_idx...');
    await client.query(`
      DROP INDEX IF EXISTS financeiro.fatura_item_conflict_idx;
    `);
    console.log('✅ Removido com sucesso');
    
    // Criar índice normal (não único) para performance
    console.log('\n3️⃣ Criando índice normal para performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS fatura_item_lookup_idx 
      ON financeiro.fatura_item (tenant_id, cartao_id, competencia, is_deleted);
    `);
    console.log('✅ Índice criado');
    
    await client.query('COMMIT');
    
    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('\n📋 Agora você pode:');
    console.log('   - Inserir múltiplas compras no mesmo cartão e mês');
    console.log('   - Ter compras com descrições iguais na mesma competência');
    console.log('   - Sistema funcionará corretamente para compras parceladas e múltiplas');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraints();
