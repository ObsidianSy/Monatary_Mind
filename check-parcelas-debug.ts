import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'financeiro',
    user: 'postgres',
    password: '0dcb030800331655b981',
});

async function checkParcelas() {
    try {
        console.log('🔍 Verificando parcelas no banco...\n');

        const result = await pool.query(`
      SELECT 
        id,
        descricao,
        TO_CHAR(data_compra, 'YYYY-MM-DD') as data_compra,
        parcela_numero,
        parcela_total,
        valor,
        TO_CHAR(competencia, 'YYYY-MM-DD') as competencia,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as criado_em
      FROM financeiro.fatura_item
      WHERE tenant_id = 'obsidian' 
        AND is_deleted = false
      ORDER BY created_at DESC, parcela_numero ASC
      LIMIT 15
    `);

        console.log(`📋 Total de itens: ${result.rows.length}\n`);

        result.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.descricao}`);
            console.log(`   Data: ${row.data_compra} | Parcela: ${row.parcela_numero}/${row.parcela_total} | Valor: R$ ${row.valor}`);
            console.log(`   Competência: ${row.competencia} | Criado: ${row.criado_em}`);
            console.log(`   ID: ${row.id}\n`);
        });

        // Verificar se tem parcelas "pulando" números
        console.log('\n🔍 Verificando compras parceladas...\n');

        const groupResult = await pool.query(`
      SELECT 
        descricao,
        data_compra,
        parcela_total,
        COUNT(*) as quantidade,
        STRING_AGG(CAST(parcela_numero AS TEXT), ', ' ORDER BY parcela_numero) as parcelas_existentes
      FROM financeiro.fatura_item
      WHERE tenant_id = 'obsidian' 
        AND is_deleted = false
        AND parcela_total > 1
      GROUP BY descricao, data_compra, parcela_total
      ORDER BY data_compra DESC
    `);

        if (groupResult.rows.length === 0) {
            console.log('✅ Nenhuma compra parcelada encontrada.');
        } else {
            groupResult.rows.forEach((row, idx) => {
                const esperado = Array.from({ length: row.parcela_total }, (_, i) => i + 1).join(', ');
                const status = row.quantidade === row.parcela_total && row.parcelas_existentes === esperado ? '✅' : '⚠️';

                console.log(`${status} ${row.descricao}`);
                console.log(`   Total: ${row.parcela_total} | Encontradas: ${row.quantidade}`);
                console.log(`   Parcelas existentes: ${row.parcelas_existentes}`);
                console.log(`   Parcelas esperadas: ${esperado}\n`);
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

checkParcelas();
