/**
 * Manutenção: Executar VACUUM em tabelas
 * 
 * PROBLEMA IDENTIFICADO NA AUDITORIA:
 * - fatura_item: 6 dead_rows
 * - transacao: 10 dead_rows
 * - Dead rows ocupam espaço e degradam performance
 * - VACUUM recupera espaço e atualiza estatísticas
 * 
 * SOLUÇÃO:
 * - VACUUM ANALYZE em tabelas afetadas
 * - Permite otimizador usar estatísticas atualizadas
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function vacuumTables() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Verificando dead rows antes do VACUUM...\n");
    
    const statsBefore = await client.query(`
      SELECT 
        relname as tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'financeiro'
      AND n_dead_tup > 0
      ORDER BY n_dead_tup DESC;
    `);
    
    console.table(statsBefore.rows);
    
    if (statsBefore.rows.length === 0) {
      console.log("\n✅ Nenhuma tabela precisa de VACUUM!");
      return;
    }
    
    console.log("\n🧹 Executando VACUUM ANALYZE...\n");
    
    // VACUUM não pode rodar em transação, então commitamos antes
    await client.query('COMMIT');
    
    // Executar VACUUM em cada tabela com dead rows
    for (const row of statsBefore.rows) {
      console.log(`   - VACUUM ANALYZE financeiro.${row.tablename}...`);
      await client.query(`VACUUM ANALYZE financeiro.${row.tablename};`);
    }
    
    console.log("\n📊 Verificando resultado...\n");
    
    const statsAfter = await client.query(`
      SELECT 
        relname as tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        pg_size_pretty(pg_total_relation_size('financeiro.' || relname)) as total_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'financeiro'
      ORDER BY n_live_tup DESC;
    `);
    
    console.table(statsAfter.rows);
    
    console.log("\n✅ VACUUM concluído!");
    
  } catch (error) {
    console.error("❌ Erro ao executar VACUUM:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

vacuumTables()
  .then(() => {
    console.log("\n🎉 Manutenção concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na manutenção:", error);
    process.exit(1);
  });
