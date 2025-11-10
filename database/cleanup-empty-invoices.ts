/**
 * Limpeza: Remover faturas abertas sem itens
 * 
 * PROBLEMA IDENTIFICADO NA AUDITORIA:
 * - 11 faturas com status 'aberta' mas sem itens associados
 * - Podem causar confusão na UI e cálculos incorretos
 * - Provavelmente foram criadas automaticamente mas nunca usadas
 * 
 * SOLUÇÃO:
 * - Marcar como fechadas com valor_total = 0
 * - Ou excluir se nunca foram pagas
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

async function cleanupEmptyInvoices() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Buscando faturas vazias...\n");
    
    // Buscar faturas abertas sem itens
    const emptyInvoices = await client.query(`
      SELECT 
        f.id,
        f.cartao_id,
        f.competencia,
        f.status,
        f.valor_fechado,
        COUNT(fi.id) as itens_count
      FROM financeiro.fatura f
      LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id AND fi.is_deleted = false
      WHERE f.status = 'aberta'
      GROUP BY f.id, f.cartao_id, f.competencia, f.status, f.valor_fechado
      HAVING COUNT(fi.id) = 0
      ORDER BY f.competencia DESC;
    `);
    
    if (emptyInvoices.rows.length === 0) {
      console.log("✅ Nenhuma fatura vazia encontrada!");
      return;
    }
    
    console.log(`📊 Faturas vazias encontradas: ${emptyInvoices.rows.length}\n`);
    console.table(emptyInvoices.rows.map(f => ({
      cartao_id: f.cartao_id,
      competencia: f.competencia,
      status: f.status,
      valor_fechado: `R$ ${parseFloat(f.valor_fechado || '0').toFixed(2)}`
    })));
    
    console.log("\n🔧 Fechando faturas vazias...");
    
    // Fechar faturas vazias com valor_fechado = 0
    const result = await client.query(`
      UPDATE financeiro.fatura
      SET 
        status = 'fechada',
        valor_fechado = 0,
        data_fechamento = NOW()
      WHERE id IN (
        SELECT f.id
        FROM financeiro.fatura f
        LEFT JOIN financeiro.fatura_item fi ON f.id = fi.fatura_id AND fi.is_deleted = false
        WHERE f.status = 'aberta'
        GROUP BY f.id
        HAVING COUNT(fi.id) = 0
      )
      RETURNING id, cartao_id, competencia;
    `);
    
    console.log(`\n✅ ${result.rowCount} fatura(s) fechada(s) com sucesso!`);
    
    if (result.rows.length > 0) {
      console.table(result.rows);
    }
    
  } catch (error) {
    console.error("❌ Erro ao limpar faturas:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupEmptyInvoices()
  .then(() => {
    console.log("\n🎉 Limpeza concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na limpeza:", error);
    process.exit(1);
  });
