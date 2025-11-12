const { Pool } = require('pg');

const pool = new Pool({
    host: '72.60.147.138',
    port: 5455,
    database: 'docker',
    user: 'postgres',
    password: '0dcb030800331655b981',
});

async function checkAllSchemas() {
    try {
        console.log('\n🔍 VERIFICANDO TODOS OS SCHEMAS E TABELAS...\n');

        // 1. Listar todos os schemas
        const schemasResult = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name;
        `);

        console.log('📂 SCHEMAS ENCONTRADOS:');
        schemasResult.rows.forEach(s => console.log(`  • ${s.schema_name}`));
        console.log('');

        // 2. Para cada schema, listar tabelas
        for (const schemaRow of schemasResult.rows) {
            const schema = schemaRow.schema_name;

            const tablesResult = await pool.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = $1
                ORDER BY table_name;
            `, [schema]);

            if (tablesResult.rows.length > 0) {
                console.log(`\n${'='.repeat(70)}`);
                console.log(`📊 SCHEMA: ${schema.toUpperCase()} (${tablesResult.rows.length} tabelas)`);
                console.log('='.repeat(70));

                for (const tableRow of tablesResult.rows) {
                    const tableName = tableRow.table_name;
                    console.log(`\n  ├─ 📋 ${schema}.${tableName}`);

                    // Colunas
                    const columnsResult = await pool.query(`
                        SELECT 
                          column_name, 
                          data_type, 
                          is_nullable,
                          column_default
                        FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = $2
                        ORDER BY ordinal_position;
                    `, [schema, tableName]);

                    console.log('  │  Colunas:');
                    columnsResult.rows.forEach(col => {
                        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                        const defaultVal = col.column_default ? ` = ${col.column_default.substring(0, 30)}` : '';
                        console.log(`  │    • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(15)} ${nullable}${defaultVal}`);
                    });

                    // PKs e FKs
                    const constraintsResult = await pool.query(`
                        SELECT 
                          tc.constraint_type,
                          kcu.column_name,
                          ccu.table_schema AS foreign_schema,
                          ccu.table_name AS foreign_table,
                          ccu.column_name AS foreign_column
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                          ON tc.constraint_name = kcu.constraint_name
                        LEFT JOIN information_schema.constraint_column_usage ccu 
                          ON ccu.constraint_name = tc.constraint_name
                        WHERE tc.table_schema = $1 AND tc.table_name = $2
                          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
                    `, [schema, tableName]);

                    if (constraintsResult.rows.length > 0) {
                        console.log('  │  Constraints:');
                        constraintsResult.rows.forEach(con => {
                            if (con.constraint_type === 'PRIMARY KEY') {
                                console.log(`  │    🔑 PK: ${con.column_name}`);
                            } else if (con.constraint_type === 'FOREIGN KEY') {
                                console.log(`  │    🔗 FK: ${con.column_name} → ${con.foreign_schema}.${con.foreign_table}.${con.foreign_column}`);
                            }
                        });
                    }

                    // Contar registros
                    try {
                        const countResult = await pool.query(`SELECT COUNT(*) as total FROM "${schema}"."${tableName}";`);
                        console.log(`  │  📊 Registros: ${countResult.rows[0].total}`);
                    } catch (e) {
                        console.log(`  │  ⚠️ Não foi possível contar registros`);
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ VERIFICAÇÃO COMPLETA');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

checkAllSchemas();
