const { Pool } = require('pg');

const pool = new Pool({
    host: '72.60.147.138',
    port: 5455,
    database: 'docker',
    user: 'postgres',
    password: '', // Tentar sem senha primeiro
});

async function checkAllTables() {
    try {
        // Listar todas as tabelas do schema financeiro
        const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'financeiro'
      ORDER BY table_name;
    `);

        console.log('\n=== TABELAS NO SCHEMA FINANCEIRO ===\n');

        for (const row of tablesResult.rows) {
            const tableName = row.table_name;
            console.log(`\n📊 TABELA: financeiro.${tableName}`);
            console.log('─'.repeat(60));

            // Colunas da tabela
            const columnsResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'financeiro' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

            console.log('\nColunas:');
            columnsResult.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
            });

            // Constraints (PK, FK)
            const constraintsResult = await pool.query(`
        SELECT 
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'financeiro' 
          AND tc.table_name = $1
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
      `, [tableName]);

            if (constraintsResult.rows.length > 0) {
                console.log('\nConstraints:');
                constraintsResult.rows.forEach(con => {
                    if (con.constraint_type === 'PRIMARY KEY') {
                        console.log(`  🔑 PK: ${con.column_name}`);
                    } else if (con.constraint_type === 'FOREIGN KEY') {
                        console.log(`  🔗 FK: ${con.column_name} → ${con.foreign_table}.${con.foreign_column}`);
                    }
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Total de tabelas: ${tablesResult.rows.length}`);
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkAllTables();
