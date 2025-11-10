# 🚀 Setup do Monetary Mind - Configuração PostgreSQL

## 📋 Visão Geral

Este projeto foi configurado para conectar diretamente com o banco de dados PostgreSQL na VPS **72.60.147.138:5455**.

### Arquitetura

```
Frontend (React + Vite)  →  Backend (Express)  →  PostgreSQL (VPS)
     Porta 5173               Porta 3001           72.60.147.138:5455
```

## ⚙️ Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto e adicione a senha do PostgreSQL:

```bash
DB_HOST=72.60.147.138
DB_PORT=5455
DB_NAME=docker
DB_USER=postgres
DB_PASSWORD=COLOQUE_SUA_SENHA_AQUI  # ← Importante!
DB_SSL=false

PORT=3001

VITE_FINANCEIRO_TENANT_ID=obsidian
VITE_API_URL=http://localhost:3001/api
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Estrutura do Banco de Dados

Certifique-se de que o PostgreSQL possui as seguintes tabelas:

- `contas` - Contas bancárias/carteiras
- `categorias` - Categorias e subcategorias
- `transacoes` - Lançamentos financeiros
- `cartoes` - Cartões de crédito
- `faturas` - Faturas dos cartões
- `fatura_itens` - Itens/compras nas faturas
- `recorrencias` - Lançamentos recorrentes
- `cheques` - Cheques emitidos/recebidos

## 🚀 Executando o Projeto

### Modo Desenvolvimento (Recomendado)

Execute frontend e backend simultaneamente:

```bash
npm start
```

Isso irá:
- ✅ Iniciar o backend Express na porta **3001**
- ✅ Iniciar o frontend Vite na porta **5173**
- ✅ Auto-reload em ambos quando houver mudanças

### Executar Separadamente

**Apenas Backend:**
```bash
npm run server
```

**Apenas Frontend:**
```bash
npm run dev
```

## 🧪 Testando a Conexão

### 1. Teste de Saúde do Servidor

Abra no navegador:
```
http://localhost:3001/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T..."
}
```

### 2. Teste de Conexão com Banco

```
http://localhost:3001/db-test
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "now": "2025-11-08T...",
    "version": "PostgreSQL 14..."
  },
  "connection": "PostgreSQL conectado com sucesso!"
}
```

## 📡 Endpoints da API

### Contas
- `GET /api/contas` - Listar contas
- `POST /api/contas` - Criar/atualizar conta
- `DELETE /api/contas/:id` - Deletar conta

### Categorias
- `GET /api/categorias` - Listar categorias (em árvore)
- `POST /api/categorias` - Criar/atualizar categoria
- `DELETE /api/categorias/:id` - Deletar categoria

### Transações
- `GET /api/transacoes` - Listar transações
  - Filtros: `from`, `to`, `conta_id`, `categoria_id`, `tipo`, `status`, `limit`, `offset`
- `POST /api/transacoes` - Criar/atualizar transação
- `DELETE /api/transacoes/:id` - Deletar transação

### Cartões
- `GET /api/cartoes` - Listar cartões
- `POST /api/cartoes` - Criar/atualizar cartão

### Faturas
- `GET /api/faturas` - Listar faturas
  - Filtros: `cartao_id`, `status`, `limit`

### Recorrências
- `GET /api/recorrencias` - Listar recorrências
- `POST /api/recorrencias` - Criar/atualizar recorrência
- `DELETE /api/recorrencias/:id` - Deletar recorrência

## 🔧 SDK do Frontend

O SDK em `src/lib/financeiro-sdk.ts` foi atualizado para se comunicar com o backend local.

### Exemplo de Uso:

```typescript
import { financeiroSDK } from '@/lib/financeiro-sdk';

// Buscar contas
const contas = await financeiroSDK.read('conta', {});

// Criar transação
await financeiroSDK.postEvent('transacao.upsert', {
  tipo: 'debito',
  valor: 100.50,
  descricao: 'Compra no mercado',
  data_transacao: '2025-11-08',
  conta_id: 'uuid-da-conta',
  subcategoria_id: 'uuid-da-categoria',
  status: 'liquidado'
});
```

## 🔐 Segurança

⚠️ **IMPORTANTE:** 
- Nunca commite o arquivo `.env` com a senha real
- Use `.env.example` como template
- Em produção, use variáveis de ambiente do servidor

## 🐛 Troubleshooting

### Erro de Conexão com PostgreSQL

```
Error: connect ECONNREFUSED
```

**Solução:**
1. Verifique se a senha no `.env` está correta
2. Confirme que o PostgreSQL está rodando na VPS
3. Verifique se a porta 5455 está acessível (firewall)

### Erro CORS

```
Access to fetch blocked by CORS policy
```

**Solução:**
- O backend já está configurado com CORS habilitado
- Verifique se `VITE_API_URL` no `.env` está correto

### Tabela não existe

```
relation "tabela_nome" does not exist
```

**Solução:**
- Certifique-se de que o schema do banco está criado
- Rode as migrations necessárias no PostgreSQL

## 📦 Build para Produção

```bash
# Build do frontend
npm run build

# Executar backend em produção
npm run server:prod
```

## 📝 Notas

- O projeto usa **TypeScript** tanto no frontend quanto no backend
- Hot reload está habilitado no modo desenvolvimento
- Pool de conexões configurado com máximo de 20 conexões
- Timeout de queries: 10 segundos
- Todas as queries possuem logging para debug

## 🤝 Contribuindo

Ao fazer mudanças no schema do banco:
1. Atualize os tipos em `src/types/financial.ts`
2. Atualize as rotas do backend em `server/index.ts`
3. Documente as mudanças neste arquivo
