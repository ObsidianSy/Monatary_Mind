# 🔴 URGENTE: Correção de Autenticação PostgreSQL

## Problema Identificado

```
error: password authentication failed for user "postgres"
```

### Causa Raiz

O código estava usando `dotenv.config()` que carrega o arquivo `.env` **embutido na imagem Docker** em vez de usar as variáveis de ambiente do **container/Easypanel**.

Resultado:
- Você configura `DB_PASSWORD=0dcb03080033165sb981` no Easypanel
- Mas o app carrega `DB_PASSWORD=outra_senha` do `.env` dentro da imagem
- PostgreSQL rejeita a conexão ❌

---

## ✅ Correção Aplicada

### 1. Removido `dotenv.config()` do código de produção

**Arquivos alterados:**
- `server/database.ts` - Comentado `dotenv.config()`
- `server/index.ts` - Comentado `dotenv.config()`

**Motivo:** Em produção Docker/Easypanel, as variáveis de ambiente vêm do **sistema**, não de arquivos.

### 2. Atualizado fallbacks para valores genéricos

**Antes:**
```typescript
host: process.env.DB_HOST || '72.60.147.138',
port: parseInt(process.env.DB_PORT || '5455'),
```

**Depois:**
```typescript
host: process.env.DB_HOST || 'localhost',
port: parseInt(process.env.DB_PORT || '5432'),
```

### 3. Garantido que `.env` não é copiado para imagem

`.dockerignore` atualizado:
```
.env
.env.production
.env.development
```

---

## 🚀 Como Aplicar no Easypanel

### Passo 1: Rebuild da Imagem

No Easypanel:
1. **Services** → `financeiro_unified`
2. Clicar em **Rebuild**
3. Aguardar build completar

### Passo 2: Verificar Variáveis de Ambiente

Garantir que essas variáveis estão configuradas no Easypanel:

```bash
NODE_ENV=production
PORT=3001

# PostgreSQL - CRÍTICO!
DB_HOST=docker_financeiro
DB_PORT=5432
DB_NAME=docker
DB_USER=postgres
DB_PASSWORD=0dcb03080033165sb981

# JWT
JWT_SECRET=sff45d15s1d5lf515a6f294h51yuko52l62ky9h%48f4dl8q4i1z852h854u1k26x

# CORS
FRONTEND_URL=https://docker-financeiro-unified.q4xusi.easypanel.host
APP_ORIGIN=https://docker-financeiro-unified.q4xusi.easypanel.host

# Opcionais
LOG_LEVEL=info
ENABLE_SWAGGER=false
```

### Passo 3: Restart do Container

Após rebuild:
```bash
# Via Easypanel UI: Services → Restart
# Ou via SSH:
docker restart <container-id>
```

---

## 🧪 Teste Imediato

Após rebuild e restart, execute no console do container:

```bash
# Entrar no container
docker exec -it <container-id> sh

# Verificar variáveis de ambiente
echo "DB_HOST: $DB_HOST"
echo "DB_PASSWORD: $DB_PASSWORD"

# Testar conexão PostgreSQL
nc -zv $DB_HOST $DB_PORT
# Esperado: Connection successful
```

---

## 🎯 Resultado Esperado

### Logs Antes (Errado):
```
[dotenv@17.2.3] injecting env (0) from .env
password authentication failed for user "postgres"
```

### Logs Depois (Correto):
```
🚀 Servidor backend rodando em http://localhost:3001
📊 Conectado ao PostgreSQL em docker_financeiro:5432
✅ Conectado ao PostgreSQL
2025-11-10T... - GET /api/categorias
Executou query { text: 'SELECT * FROM financeiro.categoria', rows: 15 }
```

---

## 🔍 Debug

Se ainda falhar após rebuild:

### 1. Verificar se variáveis estão sendo lidas

Adicione temporariamente no `server/index.ts` (logo após imports):
```typescript
console.log('🔍 ENV CHECK:', {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD?.substring(0, 5) + '***',
});
```

### 2. Testar conexão direta

```bash
docker exec -it <container-id> sh

apk add postgresql-client

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

Se funcionar aqui → código está OK
Se falhar → variáveis estão incorretas no Easypanel

---

## ⚠️ IMPORTANTE

**Nunca commitar** `.env` ou `.env.production` com senhas reais no Git!

O `.gitignore` já protege:
```gitignore
.env
.env.*
```

Mas sempre verifique antes de `git push`.

---

## 📋 Checklist de Deploy

- [x] Código não usa `dotenv.config()` em produção
- [x] `.dockerignore` exclui arquivos `.env*`
- [ ] Rebuild da imagem no Easypanel
- [ ] Variáveis de ambiente configuradas no Easypanel
- [ ] Container reiniciado
- [ ] Logs mostram conexão bem-sucedida
- [ ] Teste de API retorna dados (não erro 500)

---

## 💡 Explicação Técnica

### Por que dotenv não funciona em containers?

1. **Build time vs Runtime**
   - `dotenv.config()` carrega `.env` no momento que o app inicia
   - Em Docker, esse arquivo é **fixo** dentro da imagem
   - Mudanças no Easypanel **não afetam** o arquivo dentro da imagem

2. **Prioridade de carregamento**
   ```
   dotenv.config() → carrega .env (hardcoded)
   process.env.DB_PASSWORD → sobrescreve apenas se já existir
   ```

3. **Solução correta**
   ```
   process.env.DB_PASSWORD → lê direto do sistema (Easypanel injeta)
   ```

### Fluxo Correto de Variáveis

```
Easypanel UI (configuração)
    ↓
Container runtime environment
    ↓
process.env em Node.js
    ↓
Pool do PostgreSQL
```

**NÃO:**
```
.env dentro da imagem → dotenv → process.env ❌
```

---

Após rebuild, a autenticação deve funcionar! 🎯
