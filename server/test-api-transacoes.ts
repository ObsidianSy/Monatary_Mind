// Teste do endpoint de transações
async function testTransacoes() {
  try {
    const response = await fetch('http://localhost:3001/api/transacoes?tenant_id=obsidian&limit=5');
    const data = await response.json();
    
    console.log('\n📊 RESPOSTA DA API /api/transacoes (5 primeiras):');
    console.log(JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Total de transações retornadas: ${data.length}`);
    
    // Verificar se tem categoria_pai
    const comCategoriaPai = data.filter((t: any) => t.categoria_pai_nome);
    console.log(`✅ Transações com categoria pai: ${comCategoriaPai.length}`);
    
    if (comCategoriaPai.length > 0) {
      console.log('\n📋 Exemplo de transação com hierarquia:');
      console.log(`   Descrição: ${comCategoriaPai[0].descricao}`);
      console.log(`   Categoria Pai: ${comCategoriaPai[0].categoria_pai_nome}`);
      console.log(`   Subcategoria: ${comCategoriaPai[0].categoria_nome}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testTransacoes();
