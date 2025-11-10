import { query } from './database';

async function testCategorias() {
  try {
    // Buscar categorias principais
    const principais = await query(
      `SELECT id, nome, tipo, parent_id FROM categoria 
       WHERE tenant_id = 'obsidian' AND parent_id IS NULL
       ORDER BY nome LIMIT 10`
    );
    
    console.log('\n📁 CATEGORIAS PRINCIPAIS:');
    console.log(JSON.stringify(principais.rows, null, 2));

    // Buscar subcategorias
    const subs = await query(
      `SELECT id, nome, tipo, parent_id FROM categoria 
       WHERE tenant_id = 'obsidian' AND parent_id IS NOT NULL
       ORDER BY nome LIMIT 10`
    );
    
    console.log('\n📂 SUBCATEGORIAS:');
    console.log(JSON.stringify(subs.rows, null, 2));

    // Buscar uma transação com categoria
    const trans = await query(
      `SELECT id, descricao, categoria_id FROM transacao 
       WHERE tenant_id = 'obsidian' AND categoria_id IS NOT NULL
       LIMIT 5`
    );
    
    console.log('\n💰 TRANSAÇÕES COM CATEGORIA:');
    console.log(JSON.stringify(trans.rows, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testCategorias();
