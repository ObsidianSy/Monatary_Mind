# 🚀 Deploy no Easypanel - Checklist Completo

## ✅ Problemas Corrigidos

### 1. PM2 Cluster Mode → Fork Mode
- ❌ Antes: `instances: 2, exec_mode: 'cluster'` causava SIGINT
- ✅ Agora: `instances: 1, exec_mode: 'fork'`

### 2. CORS
- ❌ Antes: Apenas localhost
- ✅ Agora: Inclui `FRONTEND_URL` da env

### 3. Variáveis de Ambiente
- ✅ DB_HOST correto: `docker_financeiro`
- ✅ DB_NAME correto: `docker`
- ✅ FRONTEND_URL com domínio Easypanel

---

## 📋 Configuração no Easypanel

### Serviço PostgreSQL (`docker_financeiro`)
Já configurado com:
- Host interno: `docker_financeiro`
- Porta: `5432`
- Database: `docker`
- User: `postgres`
- Password: `0dcb03080033165sb981`

### Serviço App (`financeiro_unified`)

#### Variáveis de Ambiente Obrigatórias:
```bash
NODE_ENV=production
PORT=3001

# PostgreSQL - USAR NOME DO SERVIÇO NO EASYPANEL
DB_HOST=docker_financeiro
DB_PORT=5432
DB_NAME=docker
DB_USER=postgres
DB_PASSWORD=0dcb03080033165sb981

# JWT
JWT_SECRET=sff45d15s1d5lf515a6f294h51yuko52l62ky9h%48f4dl8q4i1z852h854u1k26x

# CORS e URLs
APP_ORIGIN=https://docker-financeiro-unified.q4xusi.easypanel.host
FRONTEND_URL=https://docker-financeiro-unified.q4xusi.easypanel.host

# Vite (build time - passar como build args)
VITE_API_URL=/api
VITE_FINANCEIRO_TENANT_ID=obsidian
VITE_APP_URL=/

# Opcionais
LOG_LEVEL=info
ENABLE_SWAGGER=false
```

---

## 🔧 Configuração de Proxy (Easypanel)

O Easypanel precisa rotear `/api/*` para a porta `3001`:

### Opção 1: Configuração Automática
Se o Easypanel suporta **path routing**, configure:
```
Path: /api/*
Target: localhost:3001
```

### Opção 2: Nginx Manual
Se usar Nginx customizado:
```nginx
location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 🧪 Testes de Validação

### 1. Testar conexão PostgreSQL
```bash
# Dentro do container app
nc -zv docker_financeiro 5432
# Esperado: Connection successful
```

### 2. Testar endpoint de login
```bash
curl -X POST https://docker-financeiro-unified.q4xusi.easypanel.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teste.com","password":"123456"}'

# Esperado: {"success":true,"token":"..."}
```

### 3. Verificar CORS
```bash
curl -I https://docker-financeiro-unified.q4xusi.easypanel.host/api/categorias \
  -H "Origin: https://docker-financeiro-unified.q4xusi.easypanel.host"

# Esperado: Header "Access-Control-Allow-Origin" presente
```

### 4. Verificar frontend carrega
```bash
curl -I https://docker-financeiro-unified.q4xusi.easypanel.host/

# Esperado: 200 OK com Content-Type: text/html
```

---

## 🐛 Debug de Problemas Comuns

### Erro: "Connection Refused" no login

**Causa**: O proxy não está roteando `/api` corretamente.

**Solução**:
1. Verificar configuração de proxy no Easypanel
2. Testar diretamente: `curl http://localhost:3001/api/auth/login` (dentro do container)
3. Se funcionar, o problema é no proxy externo

### Erro: "CORS blocked"

**Causa**: `FRONTEND_URL` não está configurada ou está incorreta.

**Solução**:
1. Verificar variável de ambiente `FRONTEND_URL` no container
2. Reiniciar app após alterar: `pm2 restart monetary-mind`
3. Verificar logs: `pm2 logs monetary-mind --lines 50`

### Erro: "password authentication failed"

**Causa**: `DB_PASSWORD` diferente entre app e PostgreSQL.

**Solução**:
1. Verificar senha do PostgreSQL: ver credenciais no Easypanel
2. Copiar senha exata para variável `DB_PASSWORD` do app
3. Reiniciar app

### PM2 continua matando o processo

**Causa**: Processo não mantém conexão ativa.

**Solução**:
```javascript
// ecosystem.config.cjs
instances: 1,  // ← Importante!
exec_mode: 'fork',  // ← Não usar 'cluster'
autorestart: true,
```

---

## 📊 Monitoramento

### Ver logs em tempo real
```bash
# Logs do PM2
pm2 logs monetary-mind --lines 100

# Logs do container
docker logs -f <container-id>
```

### Status do PM2
```bash
pm2 status
pm2 monit
```

### Verificar processos
```bash
pm2 list
# Deve mostrar 1 instância online (não 0)
```

---

## 🔄 Rebuild Após Mudanças

```bash
# No servidor Easypanel ou via SSH
cd /caminho/do/projeto

# Pull latest code
git pull origin main

# Rebuild (se usar Docker)
docker compose build --no-cache
docker compose up -d

# Ou rebuild pelo Easypanel UI:
# Services → financeiro_unified → Rebuild
```

---

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas no Easypanel
- [ ] `DB_HOST=docker_financeiro` (nome correto do serviço)
- [ ] `DB_PASSWORD` igual ao PostgreSQL
- [ ] `FRONTEND_URL` com domínio Easypanel
- [ ] Proxy configurado para rotear `/api` → `3001`
- [ ] PM2 em modo fork (não cluster)
- [ ] CORS permite origem do domínio
- [ ] Teste de login funciona (via curl ou navegador)
- [ ] Frontend carrega sem erro 404
- [ ] Network DevTools mostra requisições para `/api/*` (não localhost:3001)

---

## 🎯 Resultado Esperado

Ao acessar `https://docker-financeiro-unified.q4xusi.easypanel.host`:

1. Frontend carrega ✅
2. Login funciona ✅
3. APIs respondem com 200 OK ✅
4. Sem erros de CORS ✅
5. PM2 mantém processo ativo ✅
