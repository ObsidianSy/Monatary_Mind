/**
 * Migration: Adicionar índice em data_transacao
 * 
 * PROBLEMA IDENTIFICADO NA AUDITORIA:
 * - Risco ALTO: SELECT FROM transacao sem índice em data_transacao
 * - Queries ordenadas por data são muito comuns (listagens, filtros)
 * - Performance degradada em tabelas grandes
 * 
 * SOLUÇÃO:
 * - Criar índice composto para queries filtradas por tenant + data + is_deleted
 * - Padrão de query: WHERE tenant_id = X AND data_transacao BETWEEN A AND B AND is_deleted = false
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

async function addTransacaoIndex() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Verificando índice existente...");
    
    // Verificar se o índice já existe
    const checkIndex = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'financeiro' 
      AND tablename = 'transacao' 
      AND indexname = 'idx_transacao_tenant_data_deleted';
    `);
    
    if (checkIndex.rows.length > 0) {
      console.log("✅ Índice já existe, pulando criação");
      return;
    }
    
    console.log("📊 Criando índice idx_transacao_tenant_data_deleted...");
    
    await client.query(`
      CREATE INDEX CONCURRENTLY idx_transacao_tenant_data_deleted 
      ON financeiro.transacao (tenant_id, data_transacao DESC, is_deleted)
      WHERE is_deleted = false;
    `);
    
    console.log("✅ Índice criado com sucesso!");
    
    // Mostrar estatísticas
    const stats = await client.query(`
      SELECT 
        pg_size_pretty(pg_relation_size('financeiro.transacao')) as table_size,
        pg_size_pretty(pg_relation_size('financeiro.idx_transacao_tenant_data_deleted')) as index_size,
        (SELECT count(*) FROM financeiro.transacao WHERE is_deleted = false) as live_rows
      FROM financeiro.transacao
      LIMIT 1;
    `);
    
    if (stats.rows.length > 0) {
      console.log("\n📈 Estatísticas:");
      console.log(`   Tamanho da tabela: ${stats.rows[0].table_size}`);
      console.log(`   Tamanho do índice: ${stats.rows[0].index_size}`);
      console.log(`   Linhas ativas: ${stats.rows[0].live_rows}`);
    }
    
  } catch (error) {
    console.error("❌ Erro ao criar índice:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTransacaoIndex()
  .then(() => {
    console.log("\n🎉 Migration concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na migration:", error);
    process.exit(1);
  });
