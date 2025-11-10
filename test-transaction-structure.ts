// Script para verificar estrutura de transação

async function getTransactions() {
  try {
    const response = await fetch('http://localhost:3001/api/transacoes?tenant_id=obsidian&limit=1');
    const data = await response.json();
    
    if (data.length > 0) {
      console.log('📊 Estrutura da primeira transação:');
      console.log(JSON.stringify(data[0], null, 2));
      console.log('\n📋 Campos disponíveis:');
      console.log(Object.keys(data[0]).join(', '));
    } else {
      console.log('Nenhuma transação encontrada');
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

getTransactions();
