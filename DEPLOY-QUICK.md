# Monetary Mind - Deploy Quick Reference

## 🚀 VPS Deploy - Checklist Rápido

### 1. Preparar VPS (Ubuntu 20.04+)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL 17
sudo apt install -y postgresql postgresql-contrib

# Instalar outros pacotes
sudo apt install -y git nginx
sudo npm install -g pm2
```

### 2. Configurar PostgreSQL

```bash
sudo -u postgres psql

CREATE USER monetary_user WITH PASSWORD 'SENHA_FORTE_AQUI';
CREATE DATABASE monetary_mind OWNER monetary_user;
GRANT ALL PRIVILEGES ON DATABASE monetary_mind TO monetary_user;
\q
```

### 3. Clonar e Configurar

```bash
cd /var/www
sudo git clone https://github.com/ObsidianSy/monetary-mind-71177.git
cd monetary-mind-71177
sudo chown -R $USER:$USER .

# Configurar .env
cp .env.production .env
nano .env  # Editar variáveis
```

### 4. Deploy Automático

```bash
chmod +x deploy.sh
./deploy.sh
```

### 5. Configurar SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### 6. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📝 Variáveis de Ambiente (.env)

```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=monetary_mind
DB_USER=monetary_user
DB_PASSWORD=SENHA_POSTGRESQL
JWT_SECRET=GERAR_COM_CRYPTO
FRONTEND_URL=https://seu-dominio.com
```

Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔄 Comandos Úteis

```bash
# PM2
pm2 status
pm2 logs monetary-mind
pm2 restart monetary-mind
pm2 monit

# Nginx
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -d monetary_mind

# Backup
./backup.sh
crontab -e  # 0 2 * * * /path/to/backup.sh

# Update
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart monetary-mind
```

## ✅ Verificar Deploy

- [ ] Backend: `curl http://localhost:3001/health`
- [ ] Frontend: `https://seu-dominio.com`
- [ ] SSL: `https://` funciona sem aviso
- [ ] Login: vitorandrade1937@gmail.com / senhaadmin123
- [ ] PM2: `pm2 status` mostra online
- [ ] Logs: `pm2 logs` sem erros
- [ ] Firewall: `sudo ufw status` ativo
- [ ] Backup: `/var/backups/monetary-mind/` existe

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| 502 Bad Gateway | `pm2 restart monetary-mind` |
| Can't connect to DB | `sudo systemctl restart postgresql` |
| PM2 not found | `npm install -g pm2` |
| SSL não funciona | `sudo certbot renew --dry-run` |
| Build fail | `rm -rf node_modules && npm install --legacy-peer-deps` |

---

**Login Master:** vitorandrade1937@gmail.com / senhaadmin123  
**IMPORTANTE:** Altere a senha após primeiro acesso!
