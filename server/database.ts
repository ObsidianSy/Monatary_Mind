import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Configuração da conexão com PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financeiro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Testa a conexão ao iniciar e define search_path
pool.on('connect', async (client) => {
  try {
    await client.query('SET search_path TO financeiro, equipamentos, estoque, public');
    console.log('✅ Conectado ao PostgreSQL com search_path=financeiro,equipamentos,estoque,public');
  } catch (error) {
    console.error('❌ Erro ao configurar search_path:', error);
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
});

// Helper para executar queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executou query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query:', { text, error });
    throw error;
  }
}

// Helper para transações
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Log de conexão para debug
(async () => {
  try {
    const res = await pool.query('SELECT current_database() as db, current_user as user, current_schema as schema, current_setting(\'search_path\') as search_path');
    console.log('🔎 Banco conectado:', res.rows[0]);
  } catch (e) {
    console.error('Erro ao logar info do banco:', e);
  }
})();

export default pool;
