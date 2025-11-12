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

        // Ver TODOS os registros na tabela equipamento
        console.log('📦 TODOS OS REGISTROS EM equipamentos.equipamento:\n');
        const all = await client.query(`
      SELECT 
        id, 
        tenant_id, 
        nome, 
        tipo,
        marca,
        modelo,
        status,
        is_deleted, 
        created_at
      FROM equipamentos.equipamento
      ORDER BY created_at DESC;
    `);

        console.table(all.rows);

        console.log('\n📊 RESUMO:');
        console.log(`Total de registros: ${all.rowCount}`);
        console.log(`Ativos: ${all.rows.filter(r => !r.is_deleted).length}`);
        console.log(`Deletados: ${all.rows.filter(r => r.is_deleted).length}`);

        console.log('\n📋 POR TIPO:');
        const tipos = {};
        all.rows.forEach(r => {
            tipos[r.tipo] = (tipos[r.tipo] || 0) + 1;
        });
        console.table(tipos);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

checkEquipamentos();
