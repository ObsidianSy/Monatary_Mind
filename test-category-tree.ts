// Script de teste para verificar o processamento da árvore de categorias

const mockApiResponse = [
  {
    "id": "227ef89a-140b-4891-a680-5880fe636aaa",
    "nome": "Administrativo",
    "tipo": "despesa",
    "parent_id": null,
    "is_deleted": false,
    "children": [
      {
        "id": "82ad1b0e-7ab8-4b4c-8f86-a35743809dd8",
        "nome": "Agua/Esgoto",
        "tipo": "despesa",
        "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
        "is_deleted": false
      },
      {
        "id": "6aedd6bd-92ce-42b1-8c08-4096c57f1a30",
        "nome": "Aluguel",
        "tipo": "despesa",
        "parent_id": "227ef89a-140b-4891-a680-5880fe636aaa",
        "is_deleted": false
      }
    ]
  },
  {
    "id": "f4de587e-6025-4137-98b2-f31611df7548",
    "nome": "Empréstimos",
    "tipo": "despesa",
    "parent_id": null,
    "is_deleted": false,
    "children": [
      {
        "id": "74d13299-843f-4f5b-ad51-4612e4a65222",
        "nome": "CAIXA",
        "tipo": "despesa",
        "parent_id": "f4de587e-6025-4137-98b2-f31611df7548",
        "is_deleted": false
      }
    ]
  }
];

// Processar categoryTree
const categoryTree = mockApiResponse
  .filter(cat => cat.parent_id === null && !cat.is_deleted)
  .map(parent => ({
    id: parent.id,
    nome: parent.nome,
    tipo: parent.tipo,
    subcategorias: (parent.children || [])
      .filter(child => !child.is_deleted)
      .map(sub => ({
        id: sub.id,
        nome: sub.nome,
      }))
  }));

// Processar subcategoriesForSelect
const subcategoriesForSelect: Array<{ 
  id: string; 
  nome: string; 
  parent_id: string; 
  parentName: string; 
  tipo: string; 
  fullName: string 
}> = [];

mockApiResponse
  .filter(cat => cat.parent_id === null && !cat.is_deleted)
  .forEach(parent => {
    (parent.children || [])
      .filter(child => !child.is_deleted)
      .forEach(sub => {
        subcategoriesForSelect.push({
          id: sub.id,
          nome: sub.nome,
          parent_id: parent.id,
          parentName: parent.nome,
          tipo: sub.tipo,
          fullName: `${parent.nome} → ${sub.nome}`
        });
      });
  });

console.log('📊 Category Tree:');
console.log(JSON.stringify(categoryTree, null, 2));
console.log('\n📋 Subcategories for Select:');
console.log(JSON.stringify(subcategoriesForSelect, null, 2));

console.log('\n✅ Resumo:');
console.log(`- ${categoryTree.length} categorias principais`);
console.log(`- ${categoryTree.reduce((sum, cat) => sum + cat.subcategorias.length, 0)} subcategorias no total`);
console.log(`- ${subcategoriesForSelect.length} subcategorias para seleção`);
