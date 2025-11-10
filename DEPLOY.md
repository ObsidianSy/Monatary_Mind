# Deploy Guide - Monetary Mind VPS

## 📋 Pré-requisitos na VPS

### 1. Sistema Operacional
- Ubuntu 20.04 LTS ou superior
- CentOS 8 ou superior
- Debian 11 ou superior

### 2. Software Necessário

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL 17
sudo apt install -y postgresql postgresql-contrib

# Instalar Git
sudo apt install -y git

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

## 🚀 Passo a Passo do Deploy

### 1. Configurar PostgreSQL

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar usuário e banco
CREATE USER monetary_user WITH PASSWORD 'SUA_SENHA_FORTE_AQUI';
CREATE DATABASE monetary_mind OWNER monetary_user;
GRANT ALL PRIVILEGES ON DATABASE monetary_mind TO monetary_user;
\q
```

### 2. Clonar Repositório

```bash
# Criar diretório
sudo mkdir -p /var/www
cd /var/www

# Clonar do GitHub
sudo git clone https://github.com/ObsidianSy/monetary-mind-71177.git
cd monetary-mind-71177

# Dar permissões
sudo chown -R $USER:$USER /var/www/monetary-mind-71177
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
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
DB_PASSWORD=SUA_SENHA_DO_POSTGRES
JWT_SECRET=GERE_UMA_STRING_ALEATORIA_DE_32_CHARS_AQUI
FRONTEND_URL=https://seu-dominio.com
```

Gerar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Executar Script de Deploy

```bash
# Dar permissão de execução
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

O script irá:
- ✅ Instalar dependências
- ✅ Buildar frontend
- ✅ Configurar banco de dados
- ✅ Criar usuário master
- ✅ Iniciar aplicação com PM2
- ✅ Configurar Nginx

### 5. Configurar SSL (HTTPS)

```bash
# Obter certificado Let's Encrypt
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Certbot irá configurar automaticamente o Nginx
# O certificado renova automaticamente
```

### 6. Configurar Firewall

```bash
# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 7. Configurar Backup Automático

```bash
# Dar permissão
chmod +x backup.sh

# Testar backup
./backup.sh

# Agendar backup diário às 2h da manhã
crontab -e

# Adicionar linha:
0 2 * * * /var/www/monetary-mind-71177/backup.sh >> /var/log/monetary-backup.log 2>&1
```

## 🔄 Atualizações Futuras

### Atualizar código do GitHub

```bash
cd /var/www/monetary-mind-71177

# Puxar alterações
git pull origin main

# Reinstalar dependências (se necessário)
npm install --legacy-peer-deps

# Rebuildar frontend
npm run build

# Reiniciar aplicação
pm2 restart monetary-mind

# Aplicar migrations (se houver)
psql -h localhost -U monetary_user -d monetary_mind -f database/migrations/nova_migration.sql
```

### Script rápido de update

```bash
# Criar arquivo update.sh
nano update.sh
```

Conteúdo:
```bash
#!/bin/bash
set -e
echo "🔄 Atualizando aplicação..."
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart monetary-mind
echo "✅ Aplicação atualizada!"
```

```bash
chmod +x update.sh
./update.sh
```

## 🔍 Monitoramento

### PM2 - Gerenciamento de Processos

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs monetary-mind

# Ver logs específicos
pm2 logs monetary-mind --lines 100

# Monitor de recursos
pm2 monit

# Reiniciar
pm2 restart monetary-mind

# Parar
pm2 stop monetary-mind

# Recarregar (zero-downtime)
pm2 reload monetary-mind
```

### Logs do Sistema

```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/monetary-mind-access.log
sudo tail -f /var/log/nginx/monetary-mind-error.log

# Logs do PM2
tail -f logs/pm2-combined.log

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Logs de backup
tail -f /var/log/monetary-backup.log
```

## 🛡️ Segurança

### 1. Firewall

```bash
# Ver regras
sudo ufw status

# Permitir apenas portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3001   # Backend (apenas via Nginx)
```

### 2. PostgreSQL

```bash
# Editar pg_hba.conf
sudo nano /etc/postgresql/17/main/pg_hba.conf

# Permitir apenas localhost
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
```

### 3. Atualizar Sistema

```bash
# Atualizar pacotes regularmente
sudo apt update && sudo apt upgrade -y

# Reiniciar se necessário
sudo reboot
```

### 4. Fail2Ban (proteção contra brute force)

```bash
# Instalar
sudo apt install fail2ban

# Configurar
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Iniciar
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## 📊 Domínio e DNS

### Configurar DNS

No seu provedor de domínio (GoDaddy, Namecheap, etc):

```
Tipo    Nome    Valor               TTL
A       @       IP_DA_SUA_VPS       3600
A       www     IP_DA_SUA_VPS       3600
```

Aguarde propagação do DNS (pode levar até 48h, geralmente 1-2h)

### Verificar DNS

```bash
# Verificar se DNS está apontando
dig seu-dominio.com
nslookup seu-dominio.com
```

## 🧪 Testar Aplicação

### 1. Backend API

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vitorandrade1937@gmail.com","password":"senhaadmin123"}'
```

### 2. Frontend

Acessar no navegador:
- http://seu-dominio.com (ou https:// se SSL configurado)

### 3. Performance

```bash
# Testar tempo de resposta
curl -w "@curl-format.txt" -o /dev/null -s http://seu-dominio.com
```

## 🆘 Troubleshooting

### Problema: "Cannot connect to database"

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Problema: "PM2 process not found"

```bash
# Listar processos
pm2 list

# Se vazio, iniciar manualmente
cd /var/www/monetary-mind-71177
pm2 start ecosystem.config.js
pm2 save
```

### Problema: "502 Bad Gateway" no Nginx

```bash
# Verificar se backend está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Testar configuração do Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problema: "Permission denied"

```bash
# Ajustar permissões
sudo chown -R $USER:$USER /var/www/monetary-mind-71177

# Permissões do Nginx para servir arquivos
sudo chown -R www-data:www-data /var/www/monetary-mind-71177/dist
```

## 📞 Suporte

- **Logs:** Sempre verificar logs quando houver problemas
- **PM2:** `pm2 logs monetary-mind`
- **Nginx:** `/var/log/nginx/monetary-mind-error.log`
- **PostgreSQL:** `/var/log/postgresql/`

## ✅ Checklist Final

- [ ] PostgreSQL instalado e configurado
- [ ] Node.js 18+ instalado
- [ ] Repositório clonado
- [ ] Variáveis de ambiente configuradas (.env)
- [ ] JWT_SECRET gerado e configurado
- [ ] Senha do banco de dados alterada
- [ ] Deploy executado com sucesso
- [ ] PM2 rodando e salvando estado
- [ ] Nginx configurado e rodando
- [ ] Firewall configurado
- [ ] SSL certificado instalado (Let's Encrypt)
- [ ] DNS apontando para VPS
- [ ] Backup automático agendado
- [ ] Senha do admin alterada após primeiro login
- [ ] Testes de login e funcionalidades OK

---

**Pronto para produção! 🚀**
