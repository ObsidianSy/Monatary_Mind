# Sistema de Autenticação e Permissões - Monetary Mind

## 📋 Visão Geral

Sistema completo de autenticação JWT com controle granular de permissões baseado em Roles (RBAC - Role-Based Access Control).

## 🔐 Credenciais do Administrador Master

```
Email: vitorandrade1937@gmail.com
Senha: senhaadmin123
```

**⚠️ IMPORTANTE: Altere a senha após o primeiro login!**

## 🎭 Estrutura de Roles

### 1. SUPER_ADMIN (Nível 999)
- **Acesso Total** ao sistema
- Pode criar, editar e excluir usuários
- Pode atribuir qualquer role
- Pode excluir transações
- Acesso a todos os logs de auditoria

### 2. ADMIN (Nível 100)
- Gerenciar usuários (criar, editar)
- Visualizar logs de auditoria
- Todas as permissões de MANAGER
- **Não pode:** Gerenciar roles/permissões ou excluir SUPER_ADMIN

### 3. MANAGER (Nível 50)
- Criar e editar transações/contas/categorias
- Visualizar e exportar relatórios
- **Não pode:** Gerenciar usuários

### 4. USER (Nível 0)
- Criar e editar transações e categorias
- Visualizar contas (somente leitura)
- Visualizar relatórios básicos
- **Não pode:** Excluir transações, gerenciar usuários

## 🛡️ Permissões Disponíveis

### Transações
- `transacao:create` - Criar transações
- `transacao:read` - Visualizar transações
- `transacao:update` - Editar transações
- `transacao:delete` - Excluir transações (apenas ADMIN+)

### Categorias
- `categoria:create` - Criar categorias
- `categoria:read` - Visualizar categorias
- `categoria:update` - Editar categorias
- `categoria:delete` - Excluir categorias

### Contas
- `conta:create` - Criar contas
- `conta:read` - Visualizar contas
- `conta:update` - Editar contas
- `conta:delete` - Excluir contas

### Usuários
- `usuario:create` - Criar usuários (apenas ADMIN+)
- `usuario:read` - Visualizar usuários (apenas ADMIN+)
- `usuario:update` - Editar usuários (apenas ADMIN+)
- `usuario:delete` - Excluir usuários (apenas SUPER_ADMIN)

### Relatórios
- `relatorio:read` - Visualizar relatórios
- `relatorio:export` - Exportar relatórios

### Auditoria
- `auditoria:read` - Visualizar logs de auditoria (apenas ADMIN+)

## 📊 Schema do Banco de Dados

### Tabelas Criadas

```sql
financeiro.usuario         -- Usuários do sistema
financeiro.role            -- Papéis/Funções
financeiro.permission      -- Permissões granulares
financeiro.user_role       -- Relacionamento N:N (usuários ↔ roles)
financeiro.role_permission -- Relacionamento N:N (roles ↔ permissões)
financeiro.audit_log       -- Logs de auditoria
```

### Views Criadas

```sql
financeiro.vw_usuarios_roles       -- Usuários com suas roles
financeiro.vw_role_permissions     -- Permissões por role
financeiro.vw_usuario_permissions  -- Permissões achatadas por usuário
```

## 🚀 Como Usar

### 1. Instalação

```bash
# Instalar dependências
npm install bcrypt jsonwebtoken cookie-parser --legacy-peer-deps
npm install --save-dev @types/bcrypt @types/jsonwebtoken @types/cookie-parser --legacy-peer-deps

# Aplicar schema de autenticação e criar usuário master
npm run seed-auth
```

### 2. Endpoints da API

#### Autenticação

**POST /api/auth/login**
```json
{
  "email": "vitorandrade1937@gmail.com",
  "password": "senhaadmin123"
}
```

**POST /api/auth/register**
```json
{
  "email": "novo@usuario.com",
  "password": "senha12345",
  "nome": "Novo Usuário"
}
```

**GET /api/auth/me**
- Headers: `Authorization: Bearer <token>`
- Retorna dados do usuário autenticado

**POST /api/auth/logout**
- Headers: `Authorization: Bearer <token>`
- Limpa cookie de autenticação

#### Gerenciamento de Usuários (requer permissões)

**GET /api/usuarios**
- Requer: `usuario:read` (ADMIN+)
- Lista todos os usuários

**POST /api/usuarios**
- Requer: `usuario:create` (ADMIN+)
```json
{
  "email": "usuario@email.com",
  "password": "senha12345",
  "nome": "Nome do Usuário",
  "roles": ["USER"] // ou ["ADMIN"], ["MANAGER"], etc.
}
```

**PUT /api/usuarios/:id**
- Requer: `usuario:update` (ADMIN+)
```json
{
  "nome": "Novo Nome",
  "ativo": true,
  "email_verificado": true
}
```

**DELETE /api/usuarios/:id**
- Requer: Nível de acesso 999 (SUPER_ADMIN)

**POST /api/usuarios/:id/roles**
- Requer: `usuario:update` (ADMIN+)
```json
{
  "roleIds": ["uuid-da-role-1", "uuid-da-role-2"]
}
```

#### Roles e Permissões

**GET /api/roles**
- Requer: Autenticado
- Lista todas as roles

**GET /api/permissions**
- Requer: Nível 100+ (ADMIN)
- Lista todas as permissões

**GET /api/audit-logs**
- Requer: `auditoria:read` (ADMIN+)
- Lista logs de auditoria
- Query params: `limit`, `offset`

### 3. Frontend

#### Context de Autenticação

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    user,           // Usuário atual
    login,          // Função de login
    logout,         // Função de logout
    hasPermission,  // Verificar permissão específica
    hasRole,        // Verificar nível de acesso
    isSuperAdmin    // Verificar se é SUPER_ADMIN
  } = useAuth();

  // Verificar permissão
  if (hasPermission('transacao', 'delete')) {
    // Mostrar botão de excluir
  }

  // Verificar role
  if (hasRole(100)) {
    // Usuário é ADMIN ou superior
  }
}
```

#### Proteção de Rotas

```tsx
import { ProtectedRoute } from '@/contexts/AuthContext';

// Rota que requer autenticação
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>

// Rota que requer permissão específica
<Route 
  path="/usuarios" 
  element={
    <ProtectedRoute requirePermission={{ recurso: 'usuario', acao: 'read' }}>
      <Usuarios />
    </ProtectedRoute>
  } 
/>

// Rota que requer nível mínimo
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requireRole={100}>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

## 🔒 Middleware de Backend

### Autenticação

```typescript
import { authenticateToken } from './auth';

// Proteger rota
app.get('/api/dados-sensiveis', authenticateToken(pool), async (req, res) => {
  // req.user contém os dados do usuário autenticado
});
```

### Permissões

```typescript
import { authenticateToken, requirePermission } from './auth';

// Requer permissão específica
app.delete('/api/transacoes/:id', 
  authenticateToken(pool), 
  requirePermission('transacao', 'delete'),
  async (req, res) => {
    // Apenas usuários com permissão 'transacao:delete' podem acessar
  }
);
```

### Nível de Acesso

```typescript
import { authenticateToken, requireRole } from './auth';

// Requer nível mínimo
app.get('/api/admin/dados', 
  authenticateToken(pool), 
  requireRole(100), // Apenas ADMIN ou superior
  async (req, res) => {
    // Código aqui
  }
);
```

## 📝 Logs de Auditoria

Todas as ações importantes são registradas automaticamente:

- Login/Logout
- Criação/Edição/Exclusão de usuários
- Exclusão de transações
- Mudanças de roles

```typescript
import { logAudit } from './auth';

// Registrar ação manualmente
await logAudit(
  pool,
  req.user?.id,      // ID do usuário
  'create',          // Ação
  'transacao',       // Recurso
  transacao.id,      // ID do recurso
  null,              // Dados anteriores
  transacao,         // Dados novos
  req                // Request (para IP e User-Agent)
);
```

## 🎨 Páginas do Frontend

### `/login` - Página de Login
- Login com email e senha
- Validação de credenciais
- Redirecionamento automático após login

### `/usuarios` - Gerenciamento de Usuários
- **Acesso:** Apenas ADMIN+ (permissão `usuario:read`)
- Criar novos usuários
- Editar usuários existentes
- Atribuir roles
- Excluir usuários (apenas SUPER_ADMIN)
- Visualizar último acesso e status

## 🔧 Variáveis de Ambiente

```env
# JWT
JWT_SECRET=sua-chave-secreta-super-segura-mude-em-producao-123456789

# PostgreSQL (já existentes)
DB_HOST=72.60.147.138
DB_PORT=5455
DB_NAME=docker
DB_USER=postgres
DB_PASSWORD=1234
```

## 📦 Estrutura de Arquivos

```
server/
├── auth.ts              # Módulo de autenticação completo
├── seed-auth.ts         # Script de seed
└── index.ts            # Rotas de autenticação

database/
├── auth-schema.sql     # Schema completo de autenticação
└── create-master-user.sql

src/
├── contexts/
│   └── AuthContext.tsx  # Context React de autenticação
├── pages/
│   ├── Login.tsx        # Página de login
│   └── Usuarios.tsx     # Gerenciamento de usuários
└── App.tsx             # Rotas protegidas
```

## ✅ Checklist de Implementação

- [x] Schema de banco criado (tabelas, views, índices)
- [x] Seeds de roles e permissões
- [x] Usuário master criado
- [x] Hash de senhas com bcrypt
- [x] JWT tokens
- [x] Middleware de autenticação
- [x] Middleware de permissões
- [x] Logs de auditoria
- [x] Endpoints de login/register/logout
- [x] Endpoints de gerenciamento de usuários
- [x] Context React de autenticação
- [x] Página de login
- [x] Página de gerenciamento de usuários
- [x] Proteção de rotas no frontend
- [x] Proteção de rotas no backend (DELETE transações)
- [x] Menu com verificação de permissões

## 🚦 Como Testar

### 1. Login como SUPER_ADMIN

```bash
# Acessar http://localhost:8080/login
Email: vitorandrade1937@gmail.com
Senha: senhaadmin123
```

### 2. Criar Novo Usuário

1. Ir para **Usuários** no menu lateral
2. Clicar em **Novo Usuário**
3. Preencher dados
4. Selecionar role (USER, MANAGER, ADMIN)
5. Criar

### 3. Testar Permissões

1. Fazer logout
2. Fazer login com novo usuário
3. Verificar que menu "Usuários" não aparece (se não for ADMIN+)
4. Tentar excluir transação (apenas ADMIN+ consegue)

## 🔐 Segurança

### Boas Práticas Implementadas

- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ JWT com expiração (7 dias)
- ✅ Tokens em cookies httpOnly
- ✅ CORS configurado
- ✅ Validação de email
- ✅ Senha mínima de 8 caracteres
- ✅ Logs de auditoria completos
- ✅ Soft delete de usuários
- ✅ Verificação de permissões em todas as rotas críticas

### Recomendações para Produção

1. **Trocar JWT_SECRET** por uma chave forte e aleatória
2. **Habilitar HTTPS** (secure cookies)
3. **Configurar rate limiting** para evitar brute force
4. **Implementar 2FA** (autenticação de dois fatores)
5. **Monitorar logs de auditoria** regularmente
6. **Rotação de tokens** periódica
7. **Política de senhas fortes** (números, símbolos, maiúsculas)
8. **Backup do banco** antes de mudanças de schema

## 📚 Próximos Passos

- [ ] Implementar reset de senha via email
- [ ] Adicionar 2FA (Two-Factor Authentication)
- [ ] Implementar sessões ativas (visualizar e revogar)
- [ ] Rate limiting por IP
- [ ] Blacklist de tokens (logout forçado)
- [ ] Permissões em nível de tenant (multi-tenancy)
- [ ] Notificações de login suspeito
- [ ] Histórico de alterações de senha

---

**Desenvolvido por:** Monetary Mind Team  
**Versão:** 1.0.0  
**Data:** Novembro 2025
