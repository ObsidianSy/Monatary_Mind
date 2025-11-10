import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
// Configuração da conexão com PostgreSQL
export const pool = new Pool({
    host: process.env.DB_HOST || '72.60.147.138',
    port: parseInt(process.env.DB_PORT || '5455'),
    database: process.env.DB_NAME || 'docker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Usar schema financeiro por padrão
    options: '-c search_path=financeiro,public',
});
// Testa a conexão ao iniciar
pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL');
});
pool.on('error', (err) => {
    console.error('❌ Erro no pool do PostgreSQL:', err);
});
// Helper para executar queries
export async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executou query', { text: text.substring(0, 50), duration, rows: res.rowCount });
        return res;
    }
    catch (error) {
        console.error('Erro na query:', { text, error });
        throw error;
    }
}
// Helper para transações
export async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export default pool;
