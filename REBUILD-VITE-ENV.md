# 🔧 Rebuild com Variáveis Vite

## Problema Resolvido
Frontend estava tentando conectar em `localhost:3001/api` em vez de usar caminho relativo `/api`.

## Solução
As variáveis `VITE_*` agora são injetadas durante o **build** do Docker via ARG/ENV.

---

## 📋 Comandos para Rebuild

### Opção 1: Docker Compose (Recomendado)
```bash
# No servidor VPS, no diretório do projeto:
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Opção 2: Docker Build Manual
```bash
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_FINANCEIRO_TENANT_ID=obsidian \
  --build-arg VITE_APP_URL=/ \
  -t financeiro-app .

docker run -d \
  -p 3001:3001 \
  --name financeiro \
  --env-file .env.production \
  financeiro-app
```

### Opção 3: Portainer
1. **Stacks** → Selecionar stack `financeiro_unified`
2. Clicar em **Editor**
3. Não precisa alterar nada (docker-compose.yml já tem os args)
4. Clicar em **Update the stack** ✅ Marcar **Re-pull and redeploy**
5. **Update**

---

## ✅ Verificação

Após rebuild, abra DevTools → Network e confirme:

**Antes (Errado):**
```
❌ localhost:3001/api/categorias → ERR_CONNECTION_REFUSED
```

**Depois (Correto):**
```
✅ /api/categorias → 200 OK
✅ /api/contas → 200 OK
✅ /api/auth/login → 200 OK
```

---

## 🔍 Debug

Se ainda aparecer localhost:3001:

```bash
# Verificar se variáveis foram embedadas no build
docker exec -it financeiro sh
cat dist/assets/index-*.js | grep -o 'VITE_API_URL' || echo "Variável não encontrada"

# Deve aparecer código compilado com '/api' hardcoded
```

---

## 📝 Mudanças nos Arquivos

### `Dockerfile`
- ✅ Adicionado `ARG VITE_API_URL`, `VITE_FINANCEIRO_TENANT_ID`, `VITE_APP_URL`
- ✅ Convertido ARGs em ENVs antes de `npm run build`

### `docker-compose.yml`
- ✅ Adicionada seção `build.args` no serviço `app`

### `.env.production`
- ✅ Adicionadas variáveis `VITE_*` (para referência, mas build usa docker-compose args)

---

## 🚀 Após Rebuild

1. Acessar aplicação no navegador
2. F12 → Network → Limpar (Clear)
3. Fazer login
4. Verificar que todas requisições vão para `/api/*` (não localhost:3001)
5. Status 200 OK em todas
