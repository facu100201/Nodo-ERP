#!/bin/bash

# Script de backup de base de datos
# Uso: ./scripts/backup_database.sh [nombre_backup]

set -e

# Configuración
DB_NAME="${DATABASE_NAME:-almacen_db}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${DB_NAME}_${TIMESTAMP}}"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "  Backup de Base de Datos - ERP Nodo"
echo "=========================================="
echo ""
echo "Base de datos: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Usuario: $DB_USER"
echo "Archivo de salida: $BACKUP_DIR/$BACKUP_NAME.sql"
echo ""

# Backup completo (esquema + datos)
echo "Iniciando backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges \
  -F p \
  -f "$BACKUP_DIR/$BACKUP_NAME.sql"

# Comprimir backup
echo "Comprimiendo backup..."
gzip -f "$BACKUP_DIR/$BACKUP_NAME.sql"

BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo "✅ Backup completado exitosamente"
echo "   Archivo: $BACKUP_FILE"
echo "   Tamaño: $BACKUP_SIZE"
echo ""
echo "Para restaurar:"
echo "  gunzip < $BACKUP_FILE | psql -U $DB_USER -d $DB_NAME"
echo ""
