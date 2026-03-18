# Script de backup de base de datos para Windows PowerShell
# Uso: .\scripts\backup_database.ps1 [nombre_backup]

param(
    [string]$BackupName = ""
)

# Configuración
$DB_NAME = if ($env:DATABASE_NAME) { $env:DATABASE_NAME } else { "almacen_db" }
$DB_USER = if ($env:DATABASE_USER) { $env:DATABASE_USER } else { "postgres" }
$DB_HOST = if ($env:DATABASE_HOST) { $env:DATABASE_HOST } else { "localhost" }
$DB_PORT = if ($env:DATABASE_PORT) { $env:DATABASE_PORT } else { "5432" }
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

if ([string]::IsNullOrEmpty($BackupName)) {
    $BackupName = "backup_${DB_NAME}_${TIMESTAMP}"
}

# Crear directorio de backups si no existe
if (-Not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Backup de Base de Datos - ERP Nodo" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base de datos: $DB_NAME" -ForegroundColor White
Write-Host "Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor White
Write-Host "Usuario: $DB_USER" -ForegroundColor White
Write-Host "Archivo de salida: $BACKUP_DIR\$BackupName.sql" -ForegroundColor White
Write-Host ""

# Verificar que pg_dump está disponible
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-Not $pgDumpPath) {
    Write-Host "❌ Error: pg_dump no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de tener PostgreSQL instalado y en el PATH" -ForegroundColor Yellow
    exit 1
}

# Backup completo
Write-Host "Iniciando backup..." -ForegroundColor Yellow
$env:PGPASSWORD = if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } else { "postgres" }

& pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
    --no-owner --no-privileges `
    -F p `
    -f "$BACKUP_DIR\$BackupName.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al crear backup" -ForegroundColor Red
    exit 1
}

# Comprimir backup (requiere 7-Zip o similar)
$BackupFile = "$BACKUP_DIR\$BackupName.sql"
if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
    Write-Host "Comprimiendo backup..." -ForegroundColor Yellow
    Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
    Remove-Item $BackupFile
    $BackupFile = "$BackupFile.zip"
}

$BackupSize = (Get-Item $BackupFile).Length / 1MB
$BackupSizeFormatted = "{0:N2} MB" -f $BackupSize

Write-Host ""
Write-Host "✅ Backup completado exitosamente" -ForegroundColor Green
Write-Host "   Archivo: $BackupFile" -ForegroundColor White
Write-Host "   Tamaño: $BackupSizeFormatted" -ForegroundColor White
Write-Host ""
Write-Host "Para restaurar:" -ForegroundColor Yellow
Write-Host "  gunzip < $BackupFile | psql -U $DB_USER -d $DB_NAME" -ForegroundColor Cyan
Write-Host ""
