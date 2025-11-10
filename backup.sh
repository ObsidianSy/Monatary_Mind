#!/bin/bash

# ============================================
# BACKUP AUTOMÁTICO DO BANCO DE DADOS
# Agendar no cron: 0 2 * * * /path/to/backup.sh
# ============================================

# Configurações
BACKUP_DIR="/var/backups/monetary-mind"
DB_NAME="monetary_mind"
DB_USER="monetary_user"
DB_HOST="localhost"
RETENTION_DAYS=30

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Data atual
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql.gz"

echo "🔄 Iniciando backup do banco de dados..."

# Fazer backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Verificar se backup foi criado
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup criado: $BACKUP_FILE"
    
    # Remover backups antigos
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "🗑️  Backups com mais de $RETENTION_DAYS dias removidos"
    
    # Listar backups existentes
    echo "📁 Backups disponíveis:"
    ls -lh $BACKUP_DIR/backup_*.sql.gz
else
    echo "❌ Erro ao criar backup!"
    exit 1
fi
