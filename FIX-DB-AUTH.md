# 🔧 Fix PostgreSQL Authentication Error

## ❌ Erro
```
password authentication failed for user "postgres"
```

## 🎯 Causa
O container não está recebendo as variáveis `DB_PASSWORD` ou a senha está diferente do container PostgreSQL.

---

## ✅ Solução Rápida (Portainer)

### Passo 1: Verificar senha do PostgreSQL
```bash
# No servidor VPS, via SSH:
docker exec -it <nome-container-postgres> psql -U postgres -c "\password"
# Define/confirma a senha
```

### Passo 2: Configurar variáveis no container app

**Containers** → Container do app → **Duplicate/Edit** → **Env**

Adicione/verifique:
```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=financeiro
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_AQUI
JWT_SECRET=ad52s51f4d25a48d15s12f52q92fg2j1s5112b7y2gd21s15A$b5j56sd6s5u54kB5c2d6sg$9d5A5resdwrf6r5A25
FRONTEND_URL=https://seu-dominio.com
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

**Deploy the container**

---

## ✅ Solução via docker-compose.yml

Se você usa Stack no Portainer, edite o arquivo `.env` ou adicione as variáveis diretamente:

### Criar/editar `.env` no servidor
```bash
cd /caminho/do/projeto

cat > .env << 'EOF'
# PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_NAME=financeiro
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres_aqui

# JWT
JWT_SECRET=ad52s51f4d25a48d15s12f52q92fg2j1s5112b7y2gd21s15A$b5j56sd6s5u54kB5c2d6sg$9d5A5resdwrf6r5A25

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seu-dominio.com
LOG_LEVEL=info
ENABLE_SWAGGER=false
EOF

# Restart stack
docker compose down
docker compose up -d
```

---

## ✅ Resetar senha do PostgreSQL (se necessário)

Se você esqueceu a senha:

```bash
# Parar containers
docker compose down

# Editar docker-compose.yml - adicionar na seção postgres:
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: nova_senha_segura

# Remover volume antigo (⚠️ APAGA DADOS)
docker volume rm nome_do_volume_postgres

# Subir novamente
docker compose up -d
```

**OU** sem perder dados:

```bash
# Conectar no container postgres
docker exec -it <container-postgres> bash

# Dentro do container:
psql -U postgres
ALTER USER postgres WITH PASSWORD 'nova_senha_segura';
\q
exit

# Atualizar .env com a nova senha
# Restart app container
docker restart <container-app>
```

---

## 🔍 Verificação

```bash
# Testar conexão manualmente
docker exec -it <container-app> sh

# Dentro do container app:
apk add postgresql-client
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Deve retornar:
# ?column? 
#----------
#        1
```

---

## 📝 Checklist Final

- [ ] Senha do PostgreSQL definida
- [ ] Variável `DB_PASSWORD` no container app com a mesma senha
- [ ] Variável `DB_HOST=postgres` (nome do serviço no docker-compose)
- [ ] Containers reiniciados após mudança de variáveis
- [ ] Logs mostram conexão bem-sucedida: `docker logs <container-app> --tail 50`
