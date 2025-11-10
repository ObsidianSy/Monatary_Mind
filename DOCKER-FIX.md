# 🔧 Correção dos Erros de Build e Runtime Docker

## Problemas Encontrados

### 1. Build Error - Conflito de Dependências
Erro ao fazer build do Docker devido a conflito entre `date-fns@4.1.0` e `react-day-picker@8.10.1`.

### 2. Runtime Error - PM2 ES Module
```
ReferenceError: module is not defined in ES module scope
```
O arquivo `ecosystem.config.js` usava sintaxe CommonJS mas o projeto está configurado como ES Module.

## Soluções Aplicadas

### Correção 1: Downgrade date-fns
```json
"date-fns": "^3.6.0"  // era "^4.1.0"
```

### Correção 2: Renomear ecosystem.config
- `ecosystem.config.js` → `ecosystem.config.cjs`
- Atualizado `package.json` e `Dockerfile`

## Arquivos Alterados

1. `package.json` - versão date-fns + script start:prod
2. `ecosystem.config.js` → `ecosystem.config.cjs` (renomeado)
3. `Dockerfile` - referência ao arquivo .cjs

## Como Aplicar a Correção no Servidor

### Opção 1: Editar diretamente no GitHub (MAIS FÁCIL)

**Passo 1: Editar package.json**

1. Acesse: https://github.com/VitorRandrade/monetary-mind-71177/edit/main/package.json

2. Faça 2 alterações:

   a) Linha ~56 - Altere:
   ```json
   "date-fns": "^4.1.0",
   ```
   Para:
   ```json
   "date-fns": "^3.6.0",
   ```

   b) Linha ~16 - Altere:
   ```json
   "start:prod": "NODE_ENV=production pm2 start ecosystem.config.js",
   ```
   Para:
   ```json
   "start:prod": "NODE_ENV=production pm2 start ecosystem.config.cjs",
   ```

3. Clique em "Commit changes"

**Passo 2: Renomear ecosystem.config.js**

1. Acesse: https://github.com/VitorRandrade/monetary-mind-71177/blob/main/ecosystem.config.js

2. Clique nos 3 pontos (...) → "Rename file"

3. Mude de `ecosystem.config.js` para `ecosystem.config.cjs`

4. Commit changes

**Passo 3: Editar Dockerfile**

1. Acesse: https://github.com/VitorRandrade/monetary-mind-71177/edit/main/Dockerfile

2. Encontre 2 ocorrências de `ecosystem.config.js` e mude para `ecosystem.config.cjs`:
   - Linha ~38: `COPY ecosystem.config.cjs ./`
   - Linha ~51: `CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]`

3. Commit changes

**Passo 4: Deploy**

No Easypanel, faça um novo deploy. Agora deve funcionar! ✅

### Opção 2: Via SSH no Servidor

Se você tem acesso SSH à VPS:

```bash
# Conectar ao servidor
ssh seu-usuario@seu-servidor

# Ir para o diretório do projeto
cd /etc/easypanel/projects/docker/financeiro_unified/code/

# Editar o package.json
nano package.json

# Localizar a linha com "date-fns": "^4.1.0"
# Alterar para "date-fns": "^3.6.0"
# Salvar (Ctrl+O, Enter, Ctrl+X)

# Fazer rebuild do container no Easypanel
```

### Opção 3: Recriar o serviço no Easypanel

1. No Easypanel, vá no seu serviço
2. Clique em "Settings" → "Source"
3. Mude o commit/branch temporariamente e salve
4. Volte para a branch `main` 
5. Isso forçará um novo pull do código
6. Faça deploy novamente

## Verificação

Após aplicar a correção, o build deve completar sem erros. Você verá algo como:

```
✓ Dependencies installed successfully
✓ Build completed
✓ Container started
```

## Commits Locais (Para Referência)

Commits feitos localmente mas não enviados ao GitHub por falta de permissão:

- `535d372` - fix: adicionar --legacy-peer-deps no Dockerfile
- `519265e` - fix: downgrade date-fns para v3.6.0 para compatibilidade

## Precisa de Ajuda?

Se tiver problemas, pode:
1. Verificar os logs no Easypanel
2. Testar localmente com: `docker build -t test .`
3. Verificar se o package.json foi atualizado corretamente
