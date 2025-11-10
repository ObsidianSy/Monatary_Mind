# 🚨 CORREÇÕES URGENTES - DEPLOY VPS

## ⚠️ 3 Erros Corrigidos

### ❌ Erro 1: Build Failed
```
ERESOLVE could not resolve
date-fns@4.1.0 conflicting with react-day-picker@8.10.1
```

### ❌ Erro 2: Runtime Failed (PM2)
```
ReferenceError: module is not defined in ES module scope
ecosystem.config.js incompatível com "type": "module"
```

### ❌ Erro 3: Module Not Found (Build)
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx'
PM2 tentando usar tsx que não está em produção
```

### ❌ Erro 4: Module Not Found (Runtime)
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/dist-server/database'
Imports ES modules precisam da extensão .js
```

---

## ✅ SOLUÇÃO RÁPIDA - 7 Passos no GitHub

### 📝 Passo 1: Editar `package.json`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/edit/main/package.json

**Mudança A (linha ~56):**
```diff
- "date-fns": "^4.1.0",
+ "date-fns": "^3.6.0",
```

**Mudança B (linha ~16):**
```diff
- "start:prod": "NODE_ENV=production pm2 start ecosystem.config.js",
+ "start:prod": "NODE_ENV=production pm2 start ecosystem.config.cjs",
```

✅ Commit changes

---

### 📝 Passo 2: Renomear arquivo

🔗 https://github.com/VitorRandrade/monetary-mind-71177/blob/main/ecosystem.config.js

1. Clique nos **3 pontos (...)** no canto superior direito
2. Selecione **"Rename file"**
3. Mude: `ecosystem.config.js` → `ecosystem.config.cjs`

✅ Commit changes

---

### 📝 Passo 3: Editar `Dockerfile`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/edit/main/Dockerfile

**Mudança A (linha ~38):**
```diff
- COPY ecosystem.config.js ./
+ COPY ecosystem.config.cjs ./
```

**Mudança B (linha ~51):**
```diff
- CMD ["pm2-runtime", "start", "ecosystem.config.js"]
+ CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
```

✅ Commit changes

---

### 📝 Passo 4: Criar `tsconfig.server.json`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/new/main

1. Clique em "Add file" → "Create new file"
2. Nome: `tsconfig.server.json`
3. Cole este conteúdo:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "lib": ["ES2023"],
    "moduleResolution": "Node16",
    "outDir": "./dist-server",
    "rootDir": "./server",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "allowImportingTsExtensions": false
  },
  "include": ["server/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "dist-server",
    "server/test-*.ts",
    "server/**/*.test.ts",
    "server/**/*.spec.ts"
  ]
}
```

✅ Commit changes

---

### 📝 Passo 5: Editar `ecosystem.config.cjs`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/edit/main/ecosystem.config.cjs

**Substituir TODO o conteúdo por:**

```javascript
module.exports = {
  apps: [
    {
      name: 'monetary-mind',
      script: 'dist-server/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
```

✅ Commit changes

---

### 📝 Passo 6: Editar `Dockerfile`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/edit/main/Dockerfile

**Mudança A (após `RUN npm run build`, linha ~15):**
Adicionar esta linha:
```dockerfile
# Compilar servidor TypeScript para JavaScript
RUN npx tsc --project tsconfig.server.json
```

**Mudança B (linha ~33, após `COPY --from=builder /app/dist ./dist`):**
Adicionar:
```dockerfile
# Copiar servidor compilado
COPY --from=builder /app/dist-server ./dist-server
```

**Resultado esperado (linhas 13-17):**
```dockerfile
# Build do frontend
RUN npm run build

# Compilar servidor TypeScript para JavaScript
RUN npx tsc --project tsconfig.server.json

# Production stage
```

**Resultado esperado (linhas 30-35):**
```dockerfile
# Copiar build do frontend do stage anterior
COPY --from=builder /app/dist ./dist

# Copiar servidor compilado
COPY --from=builder /app/dist-server ./dist-server

# Copiar código do servidor (para database scripts)
```

✅ Commit changes

---

### 📝 Passo 7: Editar `server/index.ts`

🔗 https://github.com/VitorRandrade/monetary-mind-71177/edit/main/server/index.ts

**Mudança A (linha 5):**
```diff
- import { pool, query } from './database';
+ import { pool, query } from './database.js';
```

**Mudança B (linha 19):**
```diff
-} from './auth';
+} from './auth.js';
```

✅ Commit changes

---

## 🚀 Fazer Deploy

Após aplicar as 3 correções acima:

1. Vá no **Easypanel**
2. Clique em **Deploy/Rebuild**
3. ✅ Build deve completar sem erros!

---

## 📊 Checklist

- [ ] `package.json` editado (2 mudanças)
- [ ] `ecosystem.config.js` renomeado para `.cjs`
- [ ] `Dockerfile` editado (4 mudanças - 2 antigas + 2 novas)
- [ ] `tsconfig.server.json` criado
- [ ] `ecosystem.config.cjs` conteúdo substituído
- [ ] `server/index.ts` editado (2 mudanças - adicionar .js)
- [ ] Deploy no Easypanel iniciado
- [ ] ✅ Aplicação funcionando!

---

## 🆘 Se continuar com erro

Verifique nos logs do Easypanel:
- ✅ Build deve mostrar: "Dependencies installed successfully"
- ✅ Runtime deve mostrar: "PM2 log: App launched"
- ❌ Se aparecer "module is not defined" → refaça o Passo 2 e 3
- ❌ Se aparecer "ERESOLVE" → refaça o Passo 1
