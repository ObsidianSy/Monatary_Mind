# Script PowerShell para instalar as extensões recomendadas do VS Code
# Execute em PowerShell: .\scripts\install-extensions.ps1

$extensions = @(
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'bradlc.vscode-tailwindcss',
    'Prisma.prisma',
    'eamodio.gitlens',
    'GitHub.vscode-pull-request-github',
    'mtxr.sqltools',
    'mtxr.sqltools-driver-pg',
    'Orta.vscode-jest',
    'humao.rest-client',
    'ms-azuretools.vscode-docker',
    'SonarSource.sonarlint-vscode',
    'editorconfig.editorconfig',
    'Gruntfuggly.todo-tree',
    'aaron-bond.better-comments',
    'alefragnani.project-manager',
    'ms-vsliveshare.vsliveshare',
    'wix.vscode-import-cost',
    'christian-kohler.path-intellisense'
)

# Verifica se o comando 'code' está disponível
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "Comando 'code' não encontrado. Abra o VS Code e execute: 'Command Palette -> 'Install 'code' command in PATH'" -ForegroundColor Yellow
    exit 1
}

foreach ($ext in $extensions) {
    Write-Host "Instalando $ext ..."
    code --install-extension $ext --force
}

Write-Host "Instalação concluída. Reinicie o VS Code se necessário." -ForegroundColor Green
