# 🚀 Guia de Push para GitHub e Deploy em VPS

## Parte 1: Preparar e Enviar para GitHub

### 1. Inicializar Git (se ainda não estiver inicializado)

```bash
cd C:\Users\Usuário\Documents\Git_Hub_Sistema\monetary-mind-71177

# Verificar se já tem git
git status

# Se não tiver, inicializar
git init
git branch -M main
```

### 2. Adicionar .env.example (template sem senhas)

Crie o arquivo `.env.example`:

```env
NODE_ENV=development
PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=monetary_mind
DB_USER=monetary_user
DB_PASSWORD=CHANGE_THIS_PASSWORD

# JWT
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHARS

# Frontend
FRONTEND_URL=http://localhost:8080
```

### 3. Verificar .gitignore

Certifique-se que `.gitignore` está correto (não enviar senhas!):

```bash
# Ver o que será commitado
git status

# Certifique-se que .env está no .gitignore
cat .gitignore | grep .env
```

### 4. Fazer Commit de Tudo

```bash
# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "feat: Sistema completo com autenticação e deploy para VPS"

# Ou commits separados (recomendado)
git add database/
git commit -m "feat: Schema completo do banco com autenticação"

git add server/
git commit -m "feat: Backend com JWT e sistema de permissões"

git add src/
git commit -m "feat: Frontend com React e autenticação"

git add deploy.sh backup.sh nginx.conf ecosystem.config.js
git commit -m "feat: Scripts de deploy e configuração para VPS"

git add *.md
git commit -m "docs: Documentação completa de deploy"
```

### 5. Conectar com GitHub

```bash
# Se o repositório já existe no GitHub
git remote add origin https://github.com/ObsidianSy/monetary-mind-71177.git

# Verificar
git remote -v

# Se já existe remote, atualizar
git remote set-url origin https://github.com/ObsidianSy/monetary-mind-71177.git
```

### 6. Fazer Push

```bash
# Primeira vez (forçar se necessário)
git push -u origin main

# Ou se já existe
git push origin main --force

# Se pedir autenticação, use Personal Access Token do GitHub
```

### 7. Criar Personal Access Token (se necessário)

1. GitHub.com → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. Marcar: `repo`, `workflow`
5. Copiar o token
6. Usar como senha no git push

---

## Parte 2: Deploy na VPS

### 1. Conectar na VPS via SSH

```bash
ssh root@SEU_IP_DA_VPS
# ou
ssh usuario@SEU_IP_DA_VPS
```

### 2. Preparar o Ambiente (primeira vez)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve ser 18+
npm --version

# Instalar PostgreSQL 17
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
sudo apt update
sudo apt install -y postgresql-17 postgresql-contrib-17

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2

# Instalar Git
sudo apt install -y git
```

### 3. Configurar PostgreSQL

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Executar comandos SQL
CREATE USER monetary_user WITH PASSWORD 'SuaSenhaForteAqui123!@#';
CREATE DATABASE monetary_mind OWNER monetary_user;
GRANT ALL PRIVILEGES ON DATABASE monetary_mind TO monetary_user;
\q

# Testar conexão
psql -h localhost -U monetary_user -d monetary_mind
# Digite a senha
\q
```

### 4. Clonar Repositório

```bash
# Criar diretório
sudo mkdir -p /var/www
cd /var/www

# Clonar do GitHub
sudo git clone https://github.com/ObsidianSy/monetary-mind-71177.git

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER monetary-mind-71177
cd monetary-mind-71177
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.production .env

# Editar com suas configurações
nano .env
```

Configure:
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=monetary_mind
DB_USER=monetary_user
DB_PASSWORD=SuaSenhaForteAqui123!@#
JWT_SECRET=COLE_AQUI_O_TOKEN_GERADO_ABAIXO
FRONTEND_URL=https://seu-dominio.com
```

Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copie o resultado e cole em JWT_SECRET
```

Salvar e sair: `Ctrl+X`, `Y`, `Enter`

### 6. Executar Deploy Automático

```bash
# Dar permissão de execução
chmod +x deploy.sh

# Executar
./deploy.sh
```

O script irá:
- ✅ Instalar dependências
- ✅ Buildar frontend
- ✅ Configurar banco de dados
- ✅ Criar usuário master
- ✅ Iniciar com PM2
- ✅ Configurar Nginx

### 7. Configurar Domínio (Opcional mas Recomendado)

#### Opção A: Nginx com Domínio

```bash
# Editar configuração do Nginx
sudo nano /etc/nginx/sites-available/monetary-mind

# Substituir "seu-dominio.com" pelo seu domínio real
# Salvar e sair

# Ativar site
sudo ln -sf /etc/nginx/sites-available/monetary-mind /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

#### Opção B: Configurar DNS

No seu provedor de domínio (GoDaddy, Namecheap, etc):

```
Tipo    Nome    Valor               TTL
A       @       IP_DA_SUA_VPS       3600
A       www     IP_DA_SUA_VPS       3600
```

### 8. Configurar SSL (HTTPS) - IMPORTANTE!

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado (substitua seu-dominio.com)
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Responder às perguntas:
# Email: seu@email.com
# Termos: Sim
# Newsletter: Não (opcional)
# Redirecionar HTTP para HTTPS: Sim (2)

# Certificado renova automaticamente!
# Testar renovação:
sudo certbot renew --dry-run
```

### 9. Configurar Firewall

```bash
# Permitir portas necessárias
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

### 10. Configurar Backup Automático

```bash
# Dar permissão
chmod +x backup.sh

# Testar backup
./backup.sh

# Editar crontab
crontab -e

# Adicionar linha (backup diário às 2h da manhã):
0 2 * * * /var/www/monetary-mind-71177/backup.sh >> /var/log/monetary-backup.log 2>&1

# Salvar e sair
```

### 11. Verificar se Tudo Está Funcionando

```bash
# Verificar PM2
pm2 status
pm2 logs monetary-mind

# Verificar Nginx
sudo systemctl status nginx

# Verificar PostgreSQL
sudo systemctl status postgresql

# Testar API
curl http://localhost:3001/health

# Testar no navegador
# https://seu-dominio.com
```

---

## Parte 3: Atualizações Futuras

### Atualizar código na VPS

```bash
# Conectar na VPS
ssh usuario@SEU_IP_DA_VPS

# Ir para o diretório
cd /var/www/monetary-mind-71177

# Puxar atualizações do GitHub
git pull origin main

# Reinstalar dependências (se necessário)
npm install --legacy-peer-deps

# Rebuildar frontend
npm run build

# Reiniciar aplicação
pm2 restart monetary-mind

# Ver logs
pm2 logs
```

### Script rápido de update

Criar `update.sh`:

```bash
#!/bin/bash
set -e
echo "🔄 Atualizando aplicação..."
cd /var/www/monetary-mind-71177
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart monetary-mind
echo "✅ Aplicação atualizada!"
pm2 logs monetary-mind --lines 50
```

Usar:
```bash
chmod +x update.sh
./update.sh
```

---

## 📋 Checklist Final

### GitHub
- [ ] .gitignore configurado (não enviar .env)
- [ ] .env.example criado (template)
- [ ] Código commitado
- [ ] Push para GitHub realizado
- [ ] README.md atualizado

### VPS
- [ ] SSH funcionando
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 17 instalado
- [ ] Nginx instalado
- [ ] PM2 instalado
- [ ] Repositório clonado
- [ ] .env configurado com senhas corretas
- [ ] JWT_SECRET gerado
- [ ] Deploy executado (./deploy.sh)
- [ ] PM2 mostrando "online"
- [ ] Nginx respondendo
- [ ] Domínio apontando para VPS
- [ ] SSL configurado (HTTPS)
- [ ] Firewall ativo
- [ ] Backup agendado
- [ ] Login funcionando
- [ ] Senha do admin alterada

---

## 🆘 Problemas Comuns

### "Permission denied" no git push
```bash
# Usar Personal Access Token como senha
# Ou configurar SSH key
ssh-keygen -t ed25519 -C "seu@email.com"
cat ~/.ssh/id_ed25519.pub
# Adicionar em GitHub → Settings → SSH Keys
```

### "Cannot connect to database"
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Verificar .env
cat .env | grep DB_
```

### "502 Bad Gateway"
```bash
# Verificar se backend está rodando
pm2 status
pm2 restart monetary-mind

# Ver logs
pm2 logs monetary-mind
```

### "Module not found"
```bash
# Reinstalar dependências
rm -rf node_modules
npm install --legacy-peer-deps
npm run build
pm2 restart monetary-mind
```

---

## 📞 Suporte

**Credenciais Master:**
- Email: vitorandrade1937@gmail.com
- Senha: senhaadmin123

**IMPORTANTE:** Altere a senha após primeiro login!

**Comandos úteis:**
```bash
pm2 status              # Ver status
pm2 logs               # Ver logs
pm2 restart all        # Reiniciar
pm2 monit              # Monitor de recursos
sudo systemctl status nginx    # Status do Nginx
sudo systemctl reload nginx    # Recarregar Nginx
```

---

**Pronto para produção! 🚀**
