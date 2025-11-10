# ==================================================================
# Script de Migração Automática - Monetary Mind
# ==================================================================
# 
# Este script automatiza o processo de migração do schema public
# para o schema financeiro.
# 
# USO:
#   .\migrate.ps1 -DbName "seu_banco" -DbUser "postgres" -DbPassword "sua_senha"
# 
# OPÇÕES:
#   -DbName      Nome do banco de dados (padrão: monetary_mind)
#   -DbUser      Usuário do PostgreSQL (padrão: postgres)
#   -DbPassword  Senha do PostgreSQL
#   -DbHost      Host do PostgreSQL (padrão: localhost)
#   -DbPort      Porta do PostgreSQL (padrão: 5432)
#   -SkipBackup  Pular criação de backup (NÃO RECOMENDADO)
# 
# ==================================================================

param(
    [string]$DbName = "monetary_mind",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [switch]$SkipBackup
)

# Cores para output
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }

# Banner
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        MIGRAÇÃO MONETARY MIND - Schema Financeiro            ║
║                                                              ║
║  public.contas    →  financeiro.conta                        ║
║  public.categorias →  financeiro.categoria                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# Verificar se pg_dump e psql estão disponíveis
Write-Info "Verificando dependências..."
try {
    $pgDumpVersion = & pg_dump --version 2>&1
    $psqlVersion = & psql --version 2>&1
    Write-Success "PostgreSQL client encontrado: $psqlVersion"
} catch {
    Write-Error "PostgreSQL client tools (pg_dump, psql) não encontrados!"
    Write-Info "Instale PostgreSQL ou adicione ao PATH: C:\Program Files\PostgreSQL\XX\bin"
    exit 1
}

# Verificar se senha foi fornecida
if ([string]::IsNullOrEmpty($DbPassword)) {
    $DbPassword = Read-Host "Digite a senha do PostgreSQL" -AsSecureString
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
    )
}

# Configurar variável de ambiente para senha
$env:PGPASSWORD = $DbPassword

# Testar conexão
Write-Info "Testando conexão com o banco..."
$testQuery = "SELECT 1"
try {
    $result = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $testQuery 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Falha na conexão"
    }
    Write-Success "Conexão estabelecida com $DbName@$DbHost"
} catch {
    Write-Error "Não foi possível conectar ao banco de dados!"
    Write-Error $result
    exit 1
}

# Criar backup
if (-not $SkipBackup) {
    Write-Info "Criando backup do banco..."
    $backupFile = "backup_pre_migracao_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
    
    try {
        & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -f $backupFile
        if ($LASTEXITCODE -eq 0) {
            $backupSize = (Get-Item $backupFile).Length / 1MB
            Write-Success "Backup criado: $backupFile ($([math]::Round($backupSize, 2)) MB)"
        } else {
            throw "Erro ao criar backup"
        }
    } catch {
        Write-Error "Falha ao criar backup!"
        Write-Warning "Deseja continuar sem backup? (S/N)"
        $response = Read-Host
        if ($response -ne "S" -and $response -ne "s") {
            Write-Info "Migração cancelada"
            exit 1
        }
    }
} else {
    Write-Warning "Backup pulado conforme solicitado (NÃO RECOMENDADO!)"
}

# Contar registros atuais
Write-Info "Contando registros existentes..."
$countQuery = @"
SELECT 
    COALESCE((SELECT COUNT(*) FROM public.contas), 0) as contas,
    COALESCE((SELECT COUNT(*) FROM public.categorias), 0) as categorias,
    COALESCE((SELECT COUNT(*) FROM public.transacoes), 0) as transacoes,
    COALESCE((SELECT COUNT(*) FROM public.cartoes), 0) as cartoes,
    COALESCE((SELECT COUNT(*) FROM public.faturas), 0) as faturas,
    COALESCE((SELECT COUNT(*) FROM public.fatura_itens), 0) as itens;
"@

try {
    $counts = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $countQuery 2>&1
    Write-Info "Registros encontrados:"
    Write-Host $counts -ForegroundColor Gray
} catch {
    Write-Warning "Não foi possível contar registros antigos (tabelas podem não existir)"
}

# Executar init-database.sql
Write-Info "Criando schema financeiro..."
$initFile = Join-Path $PSScriptRoot ".." "server" "init-database.sql"
if (-not (Test-Path $initFile)) {
    Write-Error "Arquivo não encontrado: $initFile"
    exit 1
}

try {
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $initFile
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Schema financeiro criado"
    } else {
        throw "Erro ao criar schema"
    }
} catch {
    Write-Error "Falha ao executar init-database.sql"
    exit 1
}

# Executar migração
Write-Info "Executando migração de dados..."
$migrateFile = Join-Path $PSScriptRoot "migrate-to-financeiro-schema.sql"
if (-not (Test-Path $migrateFile)) {
    Write-Error "Arquivo não encontrado: $migrateFile"
    exit 1
}

try {
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $migrateFile
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migração concluída"
    } else {
        throw "Erro durante migração"
    }
} catch {
    Write-Error "Falha ao executar migração!"
    Write-Warning "Restaure o backup se necessário: pg_restore -U $DbUser -d $DbName -c $backupFile"
    exit 1
}

# Verificar migração
Write-Info "Verificando integridade dos dados..."
$verifyQuery = @"
SELECT 
    (SELECT COUNT(*) FROM financeiro.conta) as conta,
    (SELECT COUNT(*) FROM financeiro.categoria) as categoria,
    (SELECT COUNT(*) FROM financeiro.transacao) as transacao,
    (SELECT COUNT(*) FROM financeiro.cartao) as cartao,
    (SELECT COUNT(*) FROM financeiro.fatura) as fatura,
    (SELECT COUNT(*) FROM financeiro.fatura_item) as fatura_item;
"@

try {
    $newCounts = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -t -c $verifyQuery
    Write-Success "Registros migrados:"
    Write-Host $newCounts -ForegroundColor Green
} catch {
    Write-Warning "Não foi possível verificar contagem final"
}

# Limpar variável de senha
$env:PGPASSWORD = $null

# Sucesso!
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!              ║
║                                                              ║
║  Próximos passos:                                            ║
║  1. Reinicie o servidor backend (npm start)                  ║
║  2. Teste as funcionalidades principais                      ║
║  3. Se tudo funcionar, remova as tabelas antigas             ║
║                                                              ║
║  Backup salvo em: $backupFile
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Info "Para remover tabelas antigas após confirmação:"
Write-Host "  DROP TABLE public.contas, public.categorias, etc." -ForegroundColor Gray
Write-Info "Ou descomente as linhas de DROP no arquivo migrate-to-financeiro-schema.sql"
