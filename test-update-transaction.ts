// Script para testar UPDATE de transação

async function testUpdateTransaction() {
  try {
    // Primeiro, buscar uma transação existente
    const getResponse = await fetch('http://localhost:3001/api/transacoes?tenant_id=obsidian&limit=1');
    const transactions = await getResponse.json();
    
    if (transactions.length === 0) {
      console.log('❌ Nenhuma transação encontrada para editar');
      return;
    }
    
    const transaction = transactions[0];
    console.log('📊 Transação original:', {
      id: transaction.id,
      descricao: transaction.descricao,
      referencia: transaction.referencia
    });
    
    // Tentar atualizar
    const updateResponse = await fetch('http://localhost:3001/api/transacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: transaction.id,
        tipo: transaction.tipo,
        valor: parseFloat(transaction.valor),
        descricao: transaction.descricao + ' [EDITADO]',
        data_transacao: transaction.data_transacao.split('T')[0],
        conta_id: transaction.conta_id,
        categoria_id: transaction.categoria_id,
        status: transaction.status,
        origem: transaction.origem,
        referencia: 'Observação de teste editada'
      })
    });

    console.log('📊 Status:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Erro:', errorText);
      return;
    }

    const updatedTransaction = await updateResponse.json();
    console.log('✅ Transação atualizada:', {
      id: updatedTransaction.id,
      descricao: updatedTransaction.descricao,
      referencia: updatedTransaction.referencia
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar transação:', error);
  }
}

testUpdateTransaction();
