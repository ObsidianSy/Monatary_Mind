import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financeiro',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function migrateDadosParaMain() {
    const client = await pool.connect();

    try {
        console.log('🔄 Iniciando migração de dados para o workspace Principal...\n');

        await client.query('BEGIN');

        // 1. Atualizar contas
        const contasResult = await client.query(`
      UPDATE financeiro.conta 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${contasResult.rowCount} contas atualizadas para tenant_id = 'main'`);

        // 2. Atualizar categorias
        const categoriasResult = await client.query(`
      UPDATE financeiro.categoria 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${categoriasResult.rowCount} categorias atualizadas para tenant_id = 'main'`);

        // 3. Atualizar transações
        const transacoesResult = await client.query(`
      UPDATE financeiro.transacao 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${transacoesResult.rowCount} transações atualizadas para tenant_id = 'main'`);

        // 4. Atualizar cartões
        const cartoesResult = await client.query(`
      UPDATE financeiro.cartao 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${cartoesResult.rowCount} cartões atualizados para tenant_id = 'main'`);

        // 5. Atualizar faturas
        const faturasResult = await client.query(`
      UPDATE financeiro.fatura 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${faturasResult.rowCount} faturas atualizadas para tenant_id = 'main'`);

        // 6. Atualizar fatura_item
        const faturaItensResult = await client.query(`
      UPDATE financeiro.fatura_item 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${faturaItensResult.rowCount} itens de fatura atualizados para tenant_id = 'main'`);

        // 7. Atualizar recorrências
        const recorrenciasResult = await client.query(`
      UPDATE financeiro.recorrencia 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${recorrenciasResult.rowCount} recorrências atualizadas para tenant_id = 'main'`);

        // 8. Atualizar alertas
        const alertasResult = await client.query(`
      UPDATE financeiro.alerta 
      SET tenant_id = 'main' 
      WHERE tenant_id IS NULL OR tenant_id = 'obsidian' OR tenant_id = ''
      RETURNING id
    `);
        console.log(`✅ ${alertasResult.rowCount} alertas atualizados para tenant_id = 'main'`);

        await client.query('COMMIT');

        console.log('\n🎉 Migração concluída com sucesso!');
        console.log('Todos os dados antigos agora pertencem ao workspace "Principal" (tenant_id = main)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateDadosParaMain().catch(console.error);
