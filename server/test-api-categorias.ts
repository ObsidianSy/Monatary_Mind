// Teste do endpoint de categorias
async function testCategorias() {
  try {
    const response = await fetch('http://localhost:3001/api/categorias?tenant_id=obsidian');
    const data = await response.json();
    
    console.log('\n📊 RESPOSTA DA API /api/categorias:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Total de categorias principais: ${data.length}`);
    
    const totalSubcategorias = data.reduce((acc: number, cat: any) => acc + (cat.children?.length || 0), 0);
    console.log(`✅ Total de subcategorias: ${totalSubcategorias}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testCategorias();
