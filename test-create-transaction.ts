// Script para testar criação de transação

async function testCreateTransaction() {
  try {
    const response = await fetch('http://localhost:3001/api/transacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'debito',
        valor: 100,
        descricao: 'Teste de transação',
        data_transacao: '2025-11-08',
        conta_id: '7a249b60-78fc-4f20-a68f-17894f8cf450',
        categoria_id: '82ad1b0e-7ab8-4b4c-8f86-a35743809dd8',
        status: 'liquidado',
        origem: 'manual'
      })
    });

    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Transação criada:', data);
  } catch (error) {
    console.error('❌ Erro ao criar transação:', error);
  }
}

testCreateTransaction();
