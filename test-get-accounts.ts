// Script para buscar contas

async function getAccounts() {
  try {
    const response = await fetch('http://localhost:3001/api/contas?tenant_id=obsidian');
    const data = await response.json();
    console.log('Contas disponíveis:');
    data.forEach((conta: any) => {
      console.log(`- ${conta.nome} (${conta.id})`);
    });
  } catch (error) {
    console.error('Erro:', error);
  }
}

getAccounts();
