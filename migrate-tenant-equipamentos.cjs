const { Client } = require('pg');

const client = new Client({
    host: '72.60.147.138',
    port: 5455,
    database: 'docker',
    user: 'postgres',
    password: '0dcb030800331655b981',
});

async function migrateTenant() {
    try {
        await client.connect();
        console.log('\n✅ Conectado ao PostgreSQL\n');

        // Atualizar tenant_id de 'obsidian' para 'main'
        console.log('📝 Atualizando tenant_id de "obsidian" para "main"...\n');

        const result = await client.query(`
      UPDATE equipamentos.equipamento
      SET tenant_id = 'main'
      WHERE tenant_id = 'obsidian'
      RETURNING id, nome, tenant_id;
    `);

        console.log(`✅ ${result.rowCount} registros atualizados:\n`);
        console.table(result.rows);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

migrateTenant();
