const { Client } = require('pg');

const client = new Client({
    host: '72.60.147.138',
    port: 5455,
    database: 'docker',
    user: 'postgres',
    password: '0dcb030800331655b981',
});

async function checkAllSchemas() {
    try {
        await client.connect();
        console.log('\n✅ Conectado ao PostgreSQL\n');

        // Listar TODOS os schemas (exceto system)
        const schemas = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `);

        console.log('📂 SCHEMAS NO BANCO:');
        schemas.rows.forEach(s => console.log(`  • ${s.schema_name}`));

        // Para cada schema, listar tabelas
        for (const schemaRow of schemas.rows) {
            const schema = schemaRow.schema_name;

            const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name;
      `, [schema]);

            if (tables.rows.length > 0) {
                console.log(`\n📊 Schema: ${schema.toUpperCase()} (${tables.rows.length} tabelas)`);
                tables.rows.forEach(t => console.log(`   └─ ${t.table_name}`));
            }
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

checkAllSchemas();
