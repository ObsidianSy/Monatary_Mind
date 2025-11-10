import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '72.60.147.138',
  port: 5455,
  database: 'docker',
  user: 'postgres',
  password: '0dcb030800331655b981',
});

async function addInvoiceFields() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado ao PostgreSQL\n');

    // Verificar se as colunas já existem
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_schema = 'financeiro' 
      AND table_name = 'fatura'
      AND column_name IN ('data_pagamento', 'valor_pago', 'transacao_id')
    `);

    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('📋 Colunas existentes:', existingColumns);

    // Adicionar data_pagamento se não existir
    if (!existingColumns.includes('data_pagamento')) {
      console.log('\n➕ Adicionando coluna data_pagamento...');
      await client.query(`
        ALTER TABLE financeiro.fatura
        ADD COLUMN data_pagamento DATE
      `);
      console.log('✅ Coluna data_pagamento adicionada');
    } else {
      console.log('⏭️ Coluna data_pagamento já existe');
    }

    // Adicionar valor_pago se não existir
    if (!existingColumns.includes('valor_pago')) {
      console.log('\n➕ Adicionando coluna valor_pago...');
      await client.query(`
        ALTER TABLE financeiro.fatura
        ADD COLUMN valor_pago NUMERIC(15, 2)
      `);
      console.log('✅ Coluna valor_pago adicionada');
    } else {
      console.log('⏭️ Coluna valor_pago já existe');
    }

    // Adicionar transacao_id se não existir
    if (!existingColumns.includes('transacao_id')) {
      console.log('\n➕ Adicionando coluna transacao_id...');
      await client.query(`
        ALTER TABLE financeiro.fatura
        ADD COLUMN transacao_id UUID
      `);
      console.log('✅ Coluna transacao_id adicionada');

      // Adicionar FK para transacao
      console.log('\n➕ Adicionando foreign key para transacao...');
      await client.query(`
        ALTER TABLE financeiro.fatura
        ADD CONSTRAINT fk_fatura_transacao
        FOREIGN KEY (transacao_id)
        REFERENCES financeiro.transacao(id)
        ON DELETE SET NULL
      `);
      console.log('✅ Foreign key adicionada');
    } else {
      console.log('⏭️ Coluna transacao_id já existe');
    }

    // Verificar estrutura final
    console.log('\n📊 Estrutura final da tabela fatura:');
    const finalStructure = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'financeiro' 
      AND table_name = 'fatura'
      ORDER BY ordinal_position
    `);
    console.table(finalStructure.rows);

    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addInvoiceFields().catch(console.error);
