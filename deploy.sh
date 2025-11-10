#!/bin/bash

# ============================================
# SCRIPT DE DEPLOY AUTOMÁTICO - VPS
# ============================================

set -e  # Exit on error

echo "🚀 Iniciando deploy do Monetary Mind..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. VERIFICAR DEPENDÊNCIAS
# ============================================
echo -e "${YELLOW}📦 Verificando dependências...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado!${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não está instalado!${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependências verificadas${NC}\n"

# ============================================
# 2. ATUALIZAR CÓDIGO DO GIT
# ============================================
echo -e "${YELLOW}📥 Atualizando código do repositório...${NC}"
git pull origin main
echo -e "${GREEN}✅ Código atualizado${NC}\n"

# ============================================
# 3. INSTALAR DEPENDÊNCIAS
# ============================================
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✅ Dependências instaladas${NC}\n"

# ============================================
# 4. BUILD DO FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Buildando frontend...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend buildado${NC}\n"

# ============================================
# 5. CONFIGURAR BANCO DE DADOS
# ============================================
echo -e "${YELLOW}🗄️  Configurando banco de dados...${NC}"

# Verificar se .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    echo "Copie .env.production.example e configure as variáveis"
    exit 1
fi

# Carregar variáveis do .env.production
source .env.production

# Verificar se banco existe
if psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${GREEN}✅ Banco de dados já existe${NC}"
else
    echo -e "${YELLOW}📊 Criando banco de dados...${NC}"
    createdb -h $DB_HOST -U $DB_USER $DB_NAME
    echo -e "${GREEN}✅ Banco de dados criado${NC}"
fi

# Aplicar migrations
echo -e "${YELLOW}📋 Aplicando schema do banco...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/init-complete.sql
echo -e "${GREEN}✅ Schema aplicado${NC}"

# Criar usuário master
echo -e "${YELLOW}👤 Criando usuário administrador...${NC}"
NODE_ENV=production npm run seed-auth
echo -e "${GREEN}✅ Usuário master criado${NC}\n"

# ============================================
# 6. PM2 - GERENCIADOR DE PROCESSOS
# ============================================
echo -e "${YELLOW}🔄 Configurando PM2...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
fi

# Parar processo anterior se existir
pm2 stop monetary-mind 2>/dev/null || true
pm2 delete monetary-mind 2>/dev/null || true

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}✅ PM2 configurado${NC}\n"

# ============================================
# 7. NGINX (opcional)
# ============================================
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}🌐 Configurando Nginx...${NC}"
    
    # Copiar configuração do Nginx
    sudo cp nginx.conf /etc/nginx/sites-available/monetary-mind
    sudo ln -sf /etc/nginx/sites-available/monetary-mind /etc/nginx/sites-enabled/
    
    # Testar configuração
    sudo nginx -t
    
    # Recarregar Nginx
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configurado${NC}\n"
fi

# ============================================
# 8. FIREWALL (opcional)
# ============================================
if command -v ufw &> /dev/null; then
    echo -e "${YELLOW}🔥 Configurando firewall...${NC}"
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3001/tcp
    echo -e "${GREEN}✅ Firewall configurado${NC}\n"
fi

# ============================================
# 9. RESUMO FINAL
# ============================================
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "📊 Backend: http://localhost:3001"
echo -e "🌐 Frontend: http://localhost (Nginx) ou /dist"
echo -e ""
echo -e "${YELLOW}📧 Credenciais do Admin:${NC}"
echo -e "Email: vitorandrade1937@gmail.com"
echo -e "Senha: senhaadmin123"
echo -e ""
echo -e "${YELLOW}⚡ Comandos úteis:${NC}"
echo -e "pm2 status          - Ver status dos processos"
echo -e "pm2 logs            - Ver logs em tempo real"
echo -e "pm2 restart all     - Reiniciar aplicação"
echo -e "pm2 monit           - Monitor de recursos"
echo -e ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo -e "1. Altere a senha do admin após primeiro login"
echo -e "2. Configure JWT_SECRET em .env.production"
echo -e "3. Configure certificado SSL para HTTPS"
echo -e "4. Configure backup automático do banco"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
