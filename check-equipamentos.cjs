// check-equipamentos.cjs
// Verificar a tabela equipamentos.equipamento

const { Client } = require('pg');

const client = new Client({
    host: '72.60.147.138',
    port: 5455,
    database: 'docker',
    user: 'postgres',
    password: '0dcb030800331655b981',
});

async function checkEquipamentos() {
    try {
        await client.connect();
        console.log('\n✅ Conectado ao PostgreSQL\n');

        // 1. Verificar estrutura da tabela
        console.log('📋 ESTRUTURA DA TABELA equipamentos.equipamento:\n');
        const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'equipamentos' 
        AND table_name = 'equipamento'
      ORDER BY ordinal_position;
    `);

        console.table(columns.rows);

        // 2. Ver todos os registros (incluindo deletados se houver)
        console.log('\n📦 TODOS OS EQUIPAMENTOS (incluindo deletados):\n');
        const all = await client.query(`
      SELECT id, nome, tipo, tenant_id, 
             is_deleted, created_at
      FROM equipamentos.equipamento
      ORDER BY created_at DESC;
    `);

        console.table(all.rows);

        // 3. Ver apenas ativos
        console.log('\n✅ EQUIPAMENTOS ATIVOS (is_deleted = false ou null):\n');
        const active = await client.query(`
      SELECT id, nome, tipo, tenant_id, 
             is_deleted, created_at
      FROM equipamentos.equipamento
      WHERE is_deleted IS NULL OR is_deleted = false
      ORDER BY created_at DESC;
    `);

        console.table(active.rows);

        // 4. Contar por tenant
        console.log('\n📊 CONTAGEM POR TENANT:\n');
        const byTenant = await client.query(`
      SELECT tenant_id, 
             COUNT(*) FILTER (WHERE is_deleted IS NULL OR is_deleted = false) as ativos,
             COUNT(*) FILTER (WHERE is_deleted = true) as deletados,
             COUNT(*) as total
      FROM equipamentos.equipamento
      GROUP BY tenant_id
      ORDER BY tenant_id;
    `);

        console.table(byTenant.rows);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

checkEquipamentos();
