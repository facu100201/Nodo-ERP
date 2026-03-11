#!/bin/sh
# Entrypoint para el servicio metabase-setup en Docker.
# Verifica si Metabase ya fue configurado antes de re-ejecutar el setup.

CONFIG="/frontend/public/metabase-config.json"
METABASE_URL="${METABASE_URL:-http://metabase:3000}"

# Si ya existe config, verificar que los dashboards sigan activos
if [ -f "$CONFIG" ]; then
    UUID=$(grep -o '"REACT_APP_METABASE_DASHBOARD_VENTAS":"[^"]*"' "$CONFIG" | cut -d'"' -f4)
    if [ -n "$UUID" ]; then
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$METABASE_URL/public/dashboard/$UUID" 2>/dev/null)
        if [ "$STATUS" = "200" ] || [ "$STATUS" = "202" ]; then
            echo "[OK] Metabase ya configurado. Dashboards activos. Nada que hacer."
            exit 0
        fi
    fi
fi

echo "[INFO] Configurando Metabase por primera vez..."
apk add --no-cache bash curl > /dev/null 2>&1
bash /scripts/setup-metabase.sh
