# 🚀 Guia de Deploy na VPS

## Problema Resolvido

**Antes:** SDKs apontavam para `localhost:3001` mesmo na VPS  
**Depois:** Detecta automaticamente a URL da API baseado no ambiente

---

## 🔧 Como Funciona

### Desenvolvimento (localhost)
```
Frontend: http://localhost:5173
Backend:  http://localhost:3001/api
```

### Produção (VPS) - DETECÇÃO AUTOMÁTICA! 🎯
```
Frontend: http://72.60.147.138 (ou seu domínio)
Backend:  http://72.60.147.138:3001/api (detectado AUTOMATICAMENTE baseado no window.location)
```

**Não precisa configurar nada!** O sistema detecta automaticamente o hostname e porta.

---

## 📝 Configuração

### 1️⃣ Arquivo `.env` (Desenvolvimento LOCAL)
```bash
VITE_API_URL=http://localhost:3001/api
```

### 2️⃣ Na VPS - SEM NECESSIDADE de .env.production!
O sistema detecta automaticamente:
- Se acessar via `http://72.60.147.138` → usa `http://72.60.147.138:3001/api`
- Se acessar via `https://seu-dominio.com` → usa `https://seu-dominio.com:3001/api`
- Se acessar via `localhost` → usa `http://localhost:3001/api`

**Você não precisa criar `.env.production`!** As variáveis de ambiente na VPS (PM2) são apenas para o backend.

---

## 🏗️ Build e Deploy

### Build para Produção
```bash
# 1. Build do frontend (usa .env.production)
npm run build

# 2. Build do backend
npm run build:server

# 3. Copiar arquivos para VPS
scp -r dist/ user@72.60.147.138:/caminho/do/projeto/
scp -r dist-server/ user@72.60.147.138:/caminho/do/projeto/
```

### Na VPS

```bash
# 1. Instalar dependências
npm install --production

# 2. As variáveis de ambiente JÁ EXISTEM na VPS (PM2)
# Não precisa criar .env novamente!

# 3. Iniciar backend com PM2 (se já não estiver rodando)
pm2 start ecosystem.config.cjs

# 4. Servir frontend com nginx (já configurado)
# Frontend vai detectar automaticamente a URL da API!
```

---

## ✅ Verificar se Funcionou

### 1. Testar Backend
```bash
curl http://72.60.147.138:3001/api/equipamentos
# Deve retornar 401 (pede autenticação) ✅
```

### 2. Abrir Frontend no Navegador
```
http://72.60.147.138
```

### 3. Verificar Console do Navegador
```
🔗 API URL configurada: http://72.60.147.138:3001/api
```

### 4. Testar CRUD
- Criar equipamento ✅
- Criar produto ✅
- Listar equipamentos ✅

---

## 🐛 Troubleshooting

### Erro: "Token inválido ou expirado"
**Causa:** Token JWT está expirado ou não existe  
**Solução:** Faça login novamente

### Erro: "Failed to fetch"
**Causa:** Backend não está rodando ou porta bloqueada  
**Solução:**
```bash
# Verificar se backend está rodando
pm2 list

# Verificar se porta 3001 está aberta
sudo ufw allow 3001

# Verificar logs
pm2 logs
```

### Erro: "CORS policy"
**Causa:** CORS não configurado no backend  
**Solução:** Já está configurado no `server/index.ts` para aceitar origem da VPS

### SDKs ainda apontando para localhost
**Causa:** Build antigo do frontend  
**Solução:**
```bash
# Limpar build anterior
rm -rf dist/

# Build novamente
npm run build

# Fazer deploy novamente
```

---

## 🎯 Resumo

### O que foi alterado:
1. ✅ Criado `src/lib/api-config.ts` - Detecta URL da API automaticamente
2. ✅ Atualizado `equipamentos-sdk.ts` - Usa api-config
3. ✅ Atualizado `estoque-sdk.ts` - Usa api-config
4. ✅ Atualizado `financeiro-sdk.ts` - Usa api-config
5. ✅ Criado `.env.production` - Configuração para produção

### Como funciona:
1. **Desenvolvimento:** Usa `VITE_API_URL` do `.env` (localhost:3001)
2. **Produção:** Detecta automaticamente baseado no `window.location`
3. **Fallback:** Se nada funcionar, usa localhost:3001

### Próximos passos:
1. Fazer build: `npm run build`
2. Fazer deploy na VPS
3. Testar criação de equipamentos/produtos
4. ✅ Deve funcionar!

---

## 📞 Comandos Úteis

```bash
# Ver logs do backend na VPS
pm2 logs

# Reiniciar backend
pm2 restart all

# Ver status
pm2 status

# Build local
npm run build

# Build + deploy (se tiver script configurado)
npm run deploy
```

---

**Pronto!** Agora os SDKs vão funcionar tanto em localhost quanto na VPS sem precisar mudar nada! 🎉
