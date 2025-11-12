# 🎯 PROMPT: Implementar Sistema Financeiro Completo

## 📋 VISÃO GERAL
Preciso implementar um **sistema de gestão financeira completo** com cartões de crédito, contas bancárias e transações. O sistema deve seguir padrões enterprise com multi-tenant, autenticação JWT e organização de código profissional.

---

## 🗄️ MODO BANCO DE DADOS — CONFIRMAÇÃO OBRIGATÓRIA

Antes de gerar QUALQUER código, você DEVE:

### [DB-1] Checklist de Esquema Proposto

Liste as tabelas que pretende criar no PostgreSQL, seguindo esta estrutura:

**Schema:** `financeiro`

**Tabelas principais:**
1. **financeiro.conta** - Contas bancárias/carteiras
2. **financeiro.categoria** - Categorias hierárquicas (receitas/despesas)
3. **financeiro.transacao** - Todas as transações financeiras
4. **financeiro.cartao** - Cartões de crédito
5. **financeiro.fatura** - Faturas mensais dos cartões
6. **financeiro.fatura_item** - Itens/compras nas faturas
7. **financeiro.recorrencia** - Receitas/despesas recorrentes
8. **financeiro.cheque** - Controle de cheques (opcional)

### [DB-2] Estrutura de Cada Tabela

Para cada tabela, defina:
- Colunas (nome, tipo, constraints)
- Chaves primárias (UUID com uuid_generate_v4())
- Chaves estrangeiras (relacionamentos)
- Índices importantes
- Multi-tenancy (coluna `tenant_id VARCHAR(100)`)

### [DB-3] PARE AQUI E CONFIRME

**NÃO GERE CÓDIGO AINDA!** Apenas apresente:
- ✅ Estrutura SQL completa das tabelas
- ✅ Relacionamentos (FK)
- ✅ Índices para performance
- ✅ Queries de validação (information_schema)

---

## 🏗️ ARQUITETURA DO SISTEMA

### Stack Tecnológico

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL 17.6 com multi-schema
- JWT authentication (jsonwebtoken)
- pg (node-postgres) para conexão
- tsx para hot reload em desenvolvimento
- Port: 3001

**Frontend:**
- React + TypeScript + Vite
- TailwindCSS para UI
- Shadcn/UI para componentes
- React Context para autenticação
- Axios ou fetch para API

**Segurança:**
- Multi-tenant obrigatório (tenant_id em todas as tabelas)
- JWT token com payload: `{ userId, tenantId, email, permissions }`
- Middleware `authenticateToken(pool)` em todas as rotas
- Validação de tenant_id no backend (nunca confiar no front)

---

## 📐 ROTEIRO DE IMPLEMENTAÇÃO

### [0] Tradução Técnica

Implemente um sistema financeiro completo com:
- ✅ Gestão de **Contas** (bancárias, poupança, carteira, dinheiro)
- ✅ Gestão de **Cartões de Crédito** (limite, vencimento, fechamento)
- ✅ Gestão de **Faturas** (competência mensal, status, valor total)
- ✅ Gestão de **Transações** (débito/crédito, liquidadas/previstas)
- ✅ Gestão de **Categorias** (hierárquica, pai-filho)
- ✅ **Multi-tenant** (isolamento por tenant_id)
- ✅ **Autenticação JWT** completa

### [1] Plano Didático (7 Passos)

1. **Criar Schema PostgreSQL** (`database/init-complete.sql`)
   - Schema `financeiro` com todas as tabelas
   - Extensão `uuid-ossp` habilitada
   - Índices para performance
   - Constraints e validações

2. **Configurar Banco de Dados** (`server/database.ts`)
   - Pool de conexão com pg
   - Search path: `'financeiro, public'`
   - Tratamento de erros
   - Logs de conexão

3. **Implementar Autenticação** (`server/auth.ts`)
   - Middleware `authenticateToken(pool)`
   - Extração de tenant_id do JWT
   - Interface `AuthRequest extends Request`
   - Validação de permissões (opcional)

4. **Criar Rotas Backend** (`server/index.ts`)
   - Todas as rotas com `authenticateToken(pool)`
   - CRUD completo para cada entidade
   - Filtros por tenant_id SEMPRE
   - Validações de dados

5. **Criar SDKs Frontend** (`src/lib/`)
   - SDK para cada entidade (contas, cartoes, transacoes, etc.)
   - Classe TypeScript com métodos CRUD
   - Injeção de tenant_id via construtor
   - JWT token no header `Authorization: Bearer <token>`

6. **Implementar Páginas React** (`src/pages/`)
   - Página de Contas
   - Página de Cartões
   - Página de Transações
   - Página de Faturas/Compras
   - Instanciação dinâmica de SDKs via `useMemo`

7. **Testes e Validação**
   - Teste manual de todas as rotas
   - Validação de multi-tenancy
   - Edge cases e erros

### [2] Onde Mexer (Arquivos a Criar/Editar)

#### Criar Novos Arquivos:

```
database/
  └─ init-complete.sql          # Script SQL completo

server/
  ├─ database.ts                # Configuração do pool PostgreSQL
  ├─ auth.ts                    # Middleware de autenticação
  └─ index.ts                   # API Express com todas as rotas

src/lib/
  ├─ contas-sdk.ts             # SDK Contas
  ├─ cartoes-sdk.ts            # SDK Cartões
  ├─ transacoes-sdk.ts         # SDK Transações
  ├─ faturas-sdk.ts            # SDK Faturas
  └─ categorias-sdk.ts         # SDK Categorias

src/pages/
  ├─ Contas.tsx                # Página de Contas
  ├─ Cartoes.tsx               # Página de Cartões
  ├─ Transacoes.tsx            # Página de Transações
  └─ ComprasCartao.tsx         # Página de Faturas/Compras

src/contexts/
  └─ AuthContext.tsx           # Context de Autenticação
```

#### Editar Arquivos Existentes:

```
vite.config.ts                 # Proxy para API (evitar CORS)
package.json                   # Dependências (pg, jsonwebtoken, etc.)
```

---

## 📝 DETALHAMENTO DAS ENTIDADES

### 1️⃣ CONTAS (financeiro.conta)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tenant_id VARCHAR(100) NOT NULL
nome VARCHAR(200) NOT NULL
tipo VARCHAR(50) CHECK (tipo IN ('corrente', 'poupanca', 'investimento', 'dinheiro', 'carteira'))
saldo_inicial DECIMAL(15,2) DEFAULT 0.00
saldo_atual DECIMAL(15,2) DEFAULT 0.00
ativo BOOLEAN DEFAULT true
is_deleted BOOLEAN DEFAULT false
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Rotas Backend:**
- `GET /api/contas` - Listar (filtro: tenant_id, ativo=true)
- `POST /api/contas` - Criar (validar: nome, tipo, saldo_inicial)
- `PUT /api/contas/:id` - Atualizar
- `DELETE /api/contas/:id` - Soft delete (is_deleted=true)

**Regras de Negócio:**
- Saldo atual atualiza automaticamente com transações
- Não permitir exclusão se houver transações ativas
- Validar tipo da conta

---

### 2️⃣ CARTÕES (financeiro.cartao)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tenant_id VARCHAR(100) NOT NULL
apelido VARCHAR(100) NOT NULL
limite DECIMAL(15,2) NOT NULL DEFAULT 0.00
dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31)
dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31)
conta_pagamento_id UUID REFERENCES financeiro.conta(id)
ativo BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Rotas Backend:**
- `GET /api/cartoes` - Listar (filtro: tenant_id, ativo=true)
- `POST /api/cartoes` - Criar (validar: apelido, limite, dias)
- `PUT /api/cartoes/:id` - Atualizar
- `DELETE /api/cartoes/:id` - Soft delete (is_deleted=true)

**Regras de Negócio:**
- Dia de vencimento deve ser > dia de fechamento
- Limite deve ser positivo
- Conta de pagamento deve existir e pertencer ao tenant

---

### 3️⃣ FATURAS (financeiro.fatura)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
cartao_id UUID REFERENCES financeiro.cartao(id) ON DELETE CASCADE
competencia DATE NOT NULL (formato: YYYY-MM-01)
data_vencimento DATE NOT NULL
valor_total DECIMAL(15,2) DEFAULT 0.00
valor_pago DECIMAL(15,2) DEFAULT 0.00
status VARCHAR(50) CHECK (status IN ('aberta', 'fechada', 'paga', 'vencida'))
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
UNIQUE(cartao_id, competencia)
```

**Rotas Backend:**
- `GET /api/faturas` - Listar (filtros: cartao_id, competencia, status)
- `POST /api/faturas/:id/fechar` - Fechar fatura (status='fechada')
- `POST /api/faturas/:id/pagar` - Pagar fatura (criar transação, status='paga')
- `GET /api/faturas/:id/itens` - Listar itens da fatura

**Regras de Negócio:**
- Fatura criada automaticamente ao adicionar primeira compra
- Valor total = soma dos itens não deletados
- Ao pagar, criar transação na conta de pagamento
- Status 'vencida' se data_vencimento < hoje e status != 'paga'

---

### 4️⃣ ITENS DE FATURA (financeiro.fatura_item)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
fatura_id UUID REFERENCES financeiro.fatura(id) ON DELETE CASCADE
descricao VARCHAR(255) NOT NULL
valor DECIMAL(15,2) NOT NULL
data_compra DATE NOT NULL
categoria_id UUID REFERENCES financeiro.categoria(id)
parcela_numero INTEGER (opcional, ex: 1, 2, 3...)
parcela_total INTEGER (opcional, ex: 12)
is_deleted BOOLEAN DEFAULT false
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Rotas Backend:**
- `GET /api/faturas/itens` - Listar (filtros: fatura_id, cartao_id)
- `POST /api/faturas/itens` - Criar (validar: descricao, valor, data_compra)
- `PUT /api/faturas/itens/:id` - Atualizar
- `DELETE /api/faturas/itens/:id` - Soft delete (is_deleted=true)

**Regras de Negócio:**
- Ao criar, atualizar valor_total da fatura
- Compras parceladas criam múltiplos itens (1 por competência)
- Validar que fatura pertence ao tenant

---

### 5️⃣ TRANSAÇÕES (financeiro.transacao)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tenant_id VARCHAR(100) NOT NULL
descricao VARCHAR(255) NOT NULL
valor DECIMAL(15,2) NOT NULL
tipo VARCHAR(50) CHECK (tipo IN ('credito', 'debito', 'transferencia'))
data_transacao DATE NOT NULL
status VARCHAR(50) CHECK (status IN ('previsto', 'liquidado', 'cancelado'))
origem VARCHAR(50) DEFAULT 'manual'
referencia VARCHAR(255)
conta_id UUID REFERENCES financeiro.conta(id)
categoria_id UUID REFERENCES financeiro.categoria(id)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Rotas Backend:**
- `GET /api/transacoes` - Listar (filtros: conta_id, tipo, status, data_inicio, data_fim)
- `POST /api/transacoes` - Criar (validar: descricao, valor, tipo, data)
- `PUT /api/transacoes/:id` - Atualizar
- `POST /api/transacoes/:id/pagar` - Liquidar (status='liquidado', atualizar saldo)
- `DELETE /api/transacoes/:id` - Hard delete

**Regras de Negócio:**
- Ao liquidar, atualizar saldo_atual da conta
- Débito diminui saldo, crédito aumenta
- Validar conta pertence ao tenant

---

### 6️⃣ CATEGORIAS (financeiro.categoria)

**Campos:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tenant_id VARCHAR(100) NOT NULL
nome VARCHAR(100) NOT NULL
tipo VARCHAR(50) CHECK (tipo IN ('despesa', 'receita', 'transferencia'))
parent_id UUID REFERENCES financeiro.categoria(id) (subcategoria)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Rotas Backend:**
- `GET /api/categorias` - Listar (filtro: tenant_id, tipo)
- `POST /api/categorias` - Criar (validar: nome, tipo)
- `PUT /api/categorias/:id` - Atualizar
- `DELETE /api/categorias/:id` - Soft delete (se não houver transações)

**Regras de Negócio:**
- Estrutura hierárquica (pai-filho)
- Categorias globais do sistema + customizadas por tenant
- Não permitir exclusão se houver transações/itens vinculados

---

## 🔐 AUTENTICAÇÃO E MULTI-TENANCY

### Middleware de Autenticação

```typescript
// server/auth.ts
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    email: string;
    permissions?: string[];
  };
}

export const authenticateToken = (pool: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,  // ✅ SEMPRE usar do token
        email: decoded.email,
        permissions: decoded.permissions || []
      };

      next();
    } catch (error) {
      return res.status(403).json({ error: 'Token inválido' });
    }
  };
};
```

### Uso nas Rotas

```typescript
// server/index.ts
import { authenticateToken, AuthRequest } from './auth';
import { pool } from './database';

// ✅ SEMPRE filtrar por tenant_id
app.get('/api/contas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId; // ✅ Do token JWT

  const result = await pool.query(
    'SELECT * FROM financeiro.conta WHERE tenant_id = $1 AND is_deleted = false',
    [tenantId]
  );

  res.json(result.rows);
});

// ✅ SEMPRE injetar tenant_id no INSERT
app.post('/api/contas', authenticateToken(pool), async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId; // ✅ Do token JWT
  const { nome, tipo, saldo_inicial } = req.body;

  const result = await pool.query(
    `INSERT INTO financeiro.conta (tenant_id, nome, tipo, saldo_inicial, saldo_atual)
     VALUES ($1, $2, $3, $4, $4) RETURNING *`,
    [tenantId, nome, tipo, saldo_inicial]
  );

  res.status(201).json(result.rows[0]);
});
```

---

## 🎨 SDKs FRONTEND

### Padrão de SDK

```typescript
// src/lib/contas-sdk.ts
export class ContasSDK {
  private baseUrl: string;
  private tenantId: string;

  constructor(tenantId: string, baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
    this.tenantId = tenantId;
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async getContas() {
    const response = await fetch(`${this.baseUrl}/contas`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async createConta(data: any) {
    const response = await fetch(`${this.baseUrl}/contas`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async updateConta(id: string, data: any) {
    const response = await fetch(`${this.baseUrl}/contas/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async deleteConta(id: string) {
    const response = await fetch(`${this.baseUrl}/contas/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return response.json();
  }
}
```

### Uso no React

```typescript
// src/pages/Contas.tsx
import { useMemo } from 'react';
import { ContasSDK } from '@/lib/contas-sdk';
import { useTenant } from '@/contexts/TenantContext';

export default function Contas() {
  const { currentWorkspace } = useTenant();

  // ✅ Criar SDK dinamicamente por workspace
  const contasSDK = useMemo(() => {
    return new ContasSDK(currentWorkspace.tenant_id);
  }, [currentWorkspace.tenant_id]);

  // Agora use contasSDK.getContas(), etc.
}
```

---

## ✅ CHECKLIST DE QUALIDADE

### Backend
- [ ] Todas as rotas com `authenticateToken(pool)`
- [ ] Todas as queries filtram por `tenant_id`
- [ ] NUNCA confiar em `tenant_id` do body/params (sempre do JWT)
- [ ] Validação de dados (Zod, Joi ou manual)
- [ ] Tratamento de erros (try/catch, status codes corretos)
- [ ] Logs úteis (console.log do tenant_id e ação)
- [ ] Transações SQL para operações críticas

### Frontend
- [ ] SDKs instanciados via `useMemo` com `tenant_id`
- [ ] JWT token no `Authorization: Bearer <token>`
- [ ] Feedback visual (loading, sucesso, erro)
- [ ] Confirmação antes de deletar
- [ ] Validação de formulários (React Hook Form + Zod)
- [ ] Tratamento de erros da API

### Banco de Dados
- [ ] Schema `financeiro` criado
- [ ] Extensão `uuid-ossp` habilitada
- [ ] Índices em colunas filtradas (tenant_id, ativo, status, data)
- [ ] Constraints e validações (CHECK, FOREIGN KEY)
- [ ] UNIQUE constraints onde necessário

### Segurança
- [ ] Multi-tenant 100% funcional
- [ ] Não há vazamento de dados entre tenants
- [ ] JWT com SECRET seguro (.env)
- [ ] Validação de permissões (se necessário)

---

## 🧪 TESTES MANUAIS

### 1. Teste de Multi-Tenancy
```bash
# Login como Tenant A
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenantA@test.com","password":"123"}'

# Criar conta (deve ter tenant_id = A)
curl -X POST http://localhost:3001/api/contas \
  -H "Authorization: Bearer <token_A>" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Banco A","tipo":"corrente","saldo_inicial":1000}'

# Login como Tenant B
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenantB@test.com","password":"123"}'

# Listar contas (NÃO deve aparecer contas do Tenant A)
curl http://localhost:3001/api/contas \
  -H "Authorization: Bearer <token_B>"
```

### 2. Teste de CRUD Completo
- Criar conta → verificar no banco
- Criar cartão → vincular conta
- Criar compra → gerar fatura automaticamente
- Pagar fatura → verificar transação criada
- Liquidar transação → verificar saldo atualizado

### 3. Teste de Edge Cases
- Tentar deletar conta com transações ativas
- Criar fatura duplicada (mesma competência)
- Parcelar compra em 12x → verificar 12 itens criados
- Alterar limite do cartão
- Desativar conta → não deve aparecer na listagem

---

## 📚 DEPENDÊNCIAS NECESSÁRIAS

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2"
  }
}
```

---

## 🚀 COMANDOS DE EXECUÇÃO

### Backend
```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build
npm start
```

### Frontend
```bash
# Desenvolvimento
npm run dev

# Build
npm run build
```

### Banco de Dados
```bash
# Executar script SQL
psql -h <host> -p <port> -U <user> -d <database> -f database/init-complete.sql
```

---

## 📌 REGRAS IMPORTANTES

1. **SEMPRE filtrar por `tenant_id`** em TODAS as queries
2. **NUNCA confiar no `tenant_id` do body** - sempre usar do JWT
3. **Soft delete** para contas, cartões, categorias (`is_deleted=true`)
4. **Hard delete** para transações (se solicitado)
5. **Validar relacionamentos** (FK) antes de deletar
6. **Atualizar saldo automaticamente** ao liquidar transação
7. **Criar fatura automaticamente** ao adicionar primeira compra
8. **Parcelamento** cria múltiplos `fatura_item` (1 por mês)
9. **Status de fatura vencida** calculado dinamicamente
10. **Logs detalhados** para debug (tenant_id, ação, resultado)

---

## 💡 MELHORIAS FUTURAS

- [ ] Relatórios e dashboards
- [ ] Exportação para Excel/PDF
- [ ] Gráficos de gastos por categoria
- [ ] Alertas de vencimento
- [ ] Metas financeiras
- [ ] Reconciliação bancária (importar OFX/CSV)
- [ ] Controle de cheques pré-datados
- [ ] Previsão de fluxo de caixa
- [ ] Testes automatizados (Jest/Vitest)

---

## ✅ PRONTO PARA IMPLEMENTAR!

Agora siga o **MODO BANCO DE DADOS** e o **ROTEIRO DE IMPLEMENTAÇÃO** passo a passo. Boa sorte! 🚀
