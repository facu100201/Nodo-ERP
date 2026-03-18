#!/bin/bash
# ============================================================================
# Setup automatico de Metabase para ERP Nodo
# Ejecutar despues de: docker compose -f docker/docker-compose.yml up -d
# Uso: bash scripts/setup-metabase.sh
# ============================================================================

set -e

METABASE_URL="${METABASE_URL:-http://localhost:3001}"
MB_ADMIN_EMAIL="${MB_ADMIN_EMAIL:-admin@erpnodo.com}"
MB_ADMIN_PASSWORD="${MB_ADMIN_PASSWORD:-NodoERP123!}"
MB_ADMIN_FIRST="${MB_ADMIN_FIRST:-Admin}"
MB_ADMIN_LAST="${MB_ADMIN_LAST:-ERP}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-almacen_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Detectar comando Python disponible (python3 en Linux/Mac, python en Windows/Anaconda)
if command -v python3 >/dev/null 2>&1 && python3 -c "import sys, json" 2>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1 && python -c "import sys, json" 2>/dev/null; then
    PYTHON_CMD="python"
else
    PYTHON_CMD=""
fi

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 1. Esperar a que Metabase este listo ──
info "Esperando a que Metabase inicie en $METABASE_URL ..."
MAX_WAIT=300
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$METABASE_URL/api/health" 2>/dev/null || true)
    if [ "$STATUS" = "200" ]; then
        HEALTH=$(curl -s "$METABASE_URL/api/health" 2>/dev/null || true)
        if echo "$HEALTH" | grep -q '"ok"'; then
            ok "Metabase esta listo!"
            break
        fi
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done

if [ $WAITED -ge $MAX_WAIT ]; then
    error "Metabase no respondio despues de ${MAX_WAIT}s. Verifica que el contenedor este corriendo."
    exit 1
fi

# ── 2. Verificar si ya fue configurado ──
SETUP_TOKEN=$(curl -s "$METABASE_URL/api/session/properties" | grep -o '"setup-token":"[^"]*"' | cut -d'"' -f4 || true)

if [ -z "$SETUP_TOKEN" ] || [ "$SETUP_TOKEN" = "null" ]; then
    warn "Metabase ya fue configurado previamente. Intentando login..."

    SESSION=$(curl -s -X POST "$METABASE_URL/api/session" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$MB_ADMIN_EMAIL\",
            \"password\": \"$MB_ADMIN_PASSWORD\"
        }" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -z "$SESSION" ]; then
        error "No se pudo autenticar. Verifica las credenciales."
        echo "  Email: $MB_ADMIN_EMAIL"
        echo "  Password: $MB_ADMIN_PASSWORD"
        exit 1
    fi

    ok "Sesion iniciada correctamente."
else
    # ── 3. Setup inicial ──
    info "Ejecutando setup inicial de Metabase..."

    SETUP_RESPONSE=$(curl -s -X POST "$METABASE_URL/api/setup" \
        -H "Content-Type: application/json" \
        -d "{
            \"token\": \"$SETUP_TOKEN\",
            \"user\": {
                \"email\": \"$MB_ADMIN_EMAIL\",
                \"password\": \"$MB_ADMIN_PASSWORD\",
                \"first_name\": \"$MB_ADMIN_FIRST\",
                \"last_name\": \"$MB_ADMIN_LAST\",
                \"site_name\": \"ERP Nodo - Analitica\"
            },
            \"database\": {
                \"engine\": \"postgres\",
                \"name\": \"ERP Nodo\",
                \"details\": {
                    \"host\": \"$DB_HOST\",
                    \"port\": $DB_PORT,
                    \"dbname\": \"$DB_NAME\",
                    \"user\": \"$DB_USER\",
                    \"password\": \"$DB_PASSWORD\",
                    \"ssl\": false
                }
            },
            \"prefs\": {
                \"site_name\": \"ERP Nodo - Analitica\",
                \"site_locale\": \"es\",
                \"allow_tracking\": false
            }
        }")

    SESSION=$(echo "$SETUP_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -z "$SESSION" ]; then
        warn "Setup no devolvio sesion. Intentando login con credenciales existentes..."

        SESSION=$(curl -s -X POST "$METABASE_URL/api/session" \
            -H "Content-Type: application/json" \
            -d "{
                \"username\": \"$MB_ADMIN_EMAIL\",
                \"password\": \"$MB_ADMIN_PASSWORD\"
            }" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || true)

        if [ -z "$SESSION" ]; then
            error "Error en el setup inicial. Respuesta: $SETUP_RESPONSE"
            exit 1
        fi

        ok "Login exitoso (setup ya fue completado)."
    else
        ok "Setup inicial completado."
    fi
fi

AUTH_HEADER="X-Metabase-Session: $SESSION"

# ── 4. Habilitar embedding publico ──
info "Habilitando embedding publico..."

curl -s -X PUT "$METABASE_URL/api/setting/enable-public-sharing" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{"value": true}' > /dev/null

ok "Embedding publico habilitado."

# ── 5. Obtener ID de la base de datos ──
info "Verificando conexion a base de datos..."

extract_json_id() {
    # Extrae el campo "id" de nivel superior de un JSON de base de datos
    # $1 = JSON string
    local JSON="$1"
    local RESULT=""
    if [ -n "$PYTHON_CMD" ]; then
        RESULT=$(echo "$JSON" | $PYTHON_CMD -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['id'])
except:
    pass
" 2>/dev/null || true)
    fi
    # Fallback: grep para objeto simple (respuesta de CREATE o GET /database/:id)
    if [ -z "$RESULT" ]; then
        RESULT=$(echo "$JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*' || true)
    fi
    echo "$RESULT"
}

parse_postgres_id() {
    local JSON="$1"
    local RESULT=""
    if [ -n "$PYTHON_CMD" ]; then
        RESULT=$(echo "$JSON" | $PYTHON_CMD -c "
import sys, json
try:
    data = json.load(sys.stdin)
    dbs = data.get('data', data) if isinstance(data, dict) else data
    if not isinstance(dbs, list):
        sys.exit(0)
    for db in dbs:
        if db.get('engine') == 'postgres' and 'Nodo' in db.get('name',''):
            print(db['id'])
            sys.exit(0)
    for db in dbs:
        if db.get('engine') == 'postgres':
            print(db['id'])
            sys.exit(0)
except:
    pass
" 2>/dev/null || true)
    fi
    # Fallback grep: busca el id justo antes de engine:postgres
    if [ -z "$RESULT" ]; then
        RESULT=$(echo "$JSON" | grep -o '"id":[0-9]*[^}]*"engine":"postgres"' | head -1 | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*' || true)
        # Si el patron anterior no matchea, intentar al reves
        if [ -z "$RESULT" ]; then
            RESULT=$(echo "$JSON" | tr ',' '\n' | grep '"engine":"postgres"' | head -1 || true)
            if [ -n "$RESULT" ]; then
                RESULT=$(echo "$JSON" | tr '{' '\n' | grep '"engine":"postgres"' | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*' || true)
            fi
        fi
    fi
    echo "$RESULT"
}

DB_RESPONSE=$(curl -s "$METABASE_URL/api/database" -H "$AUTH_HEADER")
DB_ID=$(parse_postgres_id "$DB_RESPONSE")

if [ -z "$DB_ID" ]; then
    info "Base de datos PostgreSQL no encontrada. Creando conexion..."

    CREATE_DB_RESPONSE=$(curl -s -X POST "$METABASE_URL/api/database" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"engine\": \"postgres\",
            \"name\": \"ERP Nodo\",
            \"details\": {
                \"host\": \"$DB_HOST\",
                \"port\": $DB_PORT,
                \"dbname\": \"$DB_NAME\",
                \"user\": \"$DB_USER\",
                \"password\": \"$DB_PASSWORD\",
                \"ssl\": false
            }
        }")

    DB_ID=$(extract_json_id "$CREATE_DB_RESPONSE")

    if [ -z "$DB_ID" ]; then
        error "No se pudo crear la conexion a la base de datos."
        error "Respuesta: $CREATE_DB_RESPONSE"
        exit 1
    fi

    ok "Conexion a PostgreSQL creada (ID: $DB_ID)"
fi

info "Base de datos PostgreSQL detectada (ID: $DB_ID)"

# Verificar que el ID es realmente una BD postgres
DB_INFO=$(curl -s "$METABASE_URL/api/database/$DB_ID" -H "$AUTH_HEADER")
DB_ENGINE=$(extract_json_id "$DB_INFO" 2>/dev/null || true)
if [ -n "$PYTHON_CMD" ]; then
    DB_ENGINE=$(echo "$DB_INFO" | $PYTHON_CMD -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('engine',''))
except:
    pass
" 2>/dev/null || true)
else
    DB_ENGINE=$(echo "$DB_INFO" | grep -o '"engine":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
fi

if [ "$DB_ENGINE" != "postgres" ]; then
    error "DB_ID=$DB_ID no corresponde a una base de datos PostgreSQL (engine=$DB_ENGINE)"
    error "Haz reset: docker volume rm docker_metabase_data"
    exit 1
fi

ok "Base de datos conectada (ID: $DB_ID, engine: $DB_ENGINE)"

# ── 6. Sincronizar esquema de BD ──
info "Sincronizando esquema de base de datos..."

curl -s -X POST "$METABASE_URL/api/database/$DB_ID/sync_schema" \
    -H "$AUTH_HEADER" > /dev/null

sleep 3
ok "Sincronizacion iniciada."

# ── 7. Obtener tabla IDs ──
info "Obteniendo estructura de tablas..."

TABLES_JSON=$(curl -s "$METABASE_URL/api/database/$DB_ID/metadata" \
    -H "$AUTH_HEADER")

get_table_id() {
    echo "$TABLES_JSON" | grep -o "\"id\":[0-9]*,\"name\":\"$1\"" | head -1 | grep -o '"id":[0-9]*' | cut -d: -f2 || true
}

VENTAS_TABLE=$(get_table_id "ventas")
VENTA_DETALLE_TABLE=$(get_table_id "venta_detalle")
PRODUCTOS_TABLE=$(get_table_id "productos")
VARIANTES_TABLE=$(get_table_id "variantes_producto")
INVENTARIO_TABLE=$(get_table_id "inventario")
MOVIMIENTOS_TABLE=$(get_table_id "movimientos_inventario")
FACTURAS_TABLE=$(get_table_id "facturas")
USUARIOS_TABLE=$(get_table_id "usuarios")

if [ -z "$VENTAS_TABLE" ]; then
    warn "Las tablas aun no estan sincronizadas. Esperando 15 segundos..."
    sleep 15

    TABLES_JSON=$(curl -s "$METABASE_URL/api/database/$DB_ID/metadata" \
        -H "$AUTH_HEADER")

    VENTAS_TABLE=$(get_table_id "ventas")
    VENTA_DETALLE_TABLE=$(get_table_id "venta_detalle")
    PRODUCTOS_TABLE=$(get_table_id "productos")
    VARIANTES_TABLE=$(get_table_id "variantes_producto")
    INVENTARIO_TABLE=$(get_table_id "inventario")
    MOVIMIENTOS_TABLE=$(get_table_id "movimientos_inventario")
    FACTURAS_TABLE=$(get_table_id "facturas")
    USUARIOS_TABLE=$(get_table_id "usuarios")
fi

info "Tablas encontradas:"
echo "  ventas=$VENTAS_TABLE venta_detalle=$VENTA_DETALLE_TABLE"
echo "  productos=$PRODUCTOS_TABLE variantes=$VARIANTES_TABLE"
echo "  inventario=$INVENTARIO_TABLE movimientos=$MOVIMIENTOS_TABLE"

# ── 8. Crear preguntas (cards) con SQL nativo ──
info "Creando preguntas/visualizaciones..."

create_question() {
    local NAME="$1"
    local SQL="$2"
    local DISPLAY="$3"

    RESULT=$(curl -s -X POST "$METABASE_URL/api/card" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$NAME\",
            \"dataset_query\": {
                \"type\": \"native\",
                \"native\": {
                    \"query\": \"$SQL\"
                },
                \"database\": $DB_ID
            },
            \"display\": \"$DISPLAY\",
            \"visualization_settings\": {}
        }")

    CARD_ID=$(extract_json_id "$RESULT")

    if [ -n "$CARD_ID" ]; then
        # Habilitar sharing publico para esta card
        PUBLIC_RESULT=$(curl -s -X POST "$METABASE_URL/api/card/$CARD_ID/public_link" \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" 2>/dev/null || true)

        ok "  Creada: $NAME (ID: $CARD_ID)" >&2
    else
        warn "  Error creando: $NAME" >&2
    fi

    echo "$CARD_ID"
}

# ── Preguntas de VENTAS ──
Q1=$(create_question \
    "Ventas por Dia (Ultimos 30 dias)" \
    "SELECT DATE(creada_en) as fecha, COUNT(*) as num_ventas, SUM(total) as total_ventas FROM ventas WHERE creada_en >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(creada_en) ORDER BY fecha" \
    "line")

Q2=$(create_question \
    "Ventas por Metodo de Pago" \
    "SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total FROM ventas GROUP BY metodo_pago ORDER BY total DESC" \
    "pie")

Q3=$(create_question \
    "Top 10 Productos Mas Vendidos" \
    "SELECT p.nombre as producto, vp.talla, vp.color, SUM(vd.cantidad) as total_vendido, SUM(vd.subtotal) as total_ingreso FROM venta_detalle vd JOIN variantes_producto vp ON vd.variante_id = vp.id JOIN productos p ON vp.producto_id = p.id GROUP BY p.nombre, vp.talla, vp.color ORDER BY total_vendido DESC LIMIT 10" \
    "bar")

Q4=$(create_question \
    "Ventas Totales del Mes" \
    "SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as ingreso_total, COALESCE(AVG(total), 0) as ticket_promedio FROM ventas WHERE DATE_TRUNC('month', creada_en) = DATE_TRUNC('month', CURRENT_DATE)" \
    "scalar")

Q5=$(create_question \
    "Ventas por Punto de Venta" \
    "SELECT pv.codigo as punto_venta, pv.descripcion, COUNT(v.id) as num_ventas, SUM(v.total) as total FROM ventas v JOIN puntos_venta pv ON v.punto_venta_id = pv.id GROUP BY pv.codigo, pv.descripcion ORDER BY total DESC" \
    "bar")

Q6=$(create_question \
    "Ventas por Hora del Dia" \
    "SELECT EXTRACT(HOUR FROM creada_en)::int as hora, COUNT(*) as num_ventas, SUM(total) as total FROM ventas GROUP BY hora ORDER BY hora" \
    "bar")

# ── Preguntas de INVENTARIO ──
Q7=$(create_question \
    "Stock Actual por Producto" \
    "SELECT p.nombre as producto, vp.talla, vp.color, vp.sku, i.stock, vp.precio_menudeo, vp.precio_mayoreo FROM inventario i JOIN variantes_producto vp ON i.variante_id = vp.id JOIN productos p ON vp.producto_id = p.id ORDER BY i.stock ASC" \
    "table")

Q8=$(create_question \
    "Productos con Stock Bajo (< 10)" \
    "SELECT p.nombre as producto, vp.talla, vp.color, vp.sku, i.stock FROM inventario i JOIN variantes_producto vp ON i.variante_id = vp.id JOIN productos p ON vp.producto_id = p.id WHERE i.stock < 10 ORDER BY i.stock ASC" \
    "table")

Q9=$(create_question \
    "Movimientos de Inventario (Ultimos 7 dias)" \
    "SELECT DATE(mi.creado_en) as fecha, mi.tipo, COUNT(*) as movimientos, SUM(mi.cantidad) as total_unidades FROM movimientos_inventario mi WHERE mi.creado_en >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(mi.creado_en), mi.tipo ORDER BY fecha DESC" \
    "bar")

Q10=$(create_question \
    "Valor Total del Inventario" \
    "SELECT SUM(i.stock * vp.precio_menudeo) as valor_menudeo, SUM(i.stock * vp.precio_mayoreo) as valor_mayoreo, SUM(i.stock) as total_unidades FROM inventario i JOIN variantes_producto vp ON i.variante_id = vp.id" \
    "scalar")

# ── Preguntas de FACTURACION ──
Q11=$(create_question \
    "Facturas Emitidas por Mes" \
    "SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') as mes, COUNT(*) as num_facturas, SUM(total) as total_facturado FROM facturas GROUP BY DATE_TRUNC('month', fecha) ORDER BY mes DESC LIMIT 12" \
    "bar")

# ── Preguntas de USUARIOS ──
Q12=$(create_question \
    "Ventas por Cajero" \
    "SELECT u.nombre as cajero, COUNT(v.id) as num_ventas, SUM(v.total) as total_vendido, AVG(v.total) as ticket_promedio FROM ventas v JOIN usuarios u ON v.usuario_id = u.id GROUP BY u.nombre ORDER BY total_vendido DESC" \
    "bar")

# ── 9. Crear coleccion para organizar ──
info "Creando coleccion ERP Nodo..."

COLLECTION_RESULT=$(curl -s -X POST "$METABASE_URL/api/collection" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ERP Nodo",
        "description": "Dashboards y reportes del sistema ERP",
        "color": "#2f4156"
    }')

COLLECTION_ID=$(echo "$COLLECTION_RESULT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2 || true)
ok "Coleccion creada (ID: $COLLECTION_ID)"

# Mover cards a la coleccion
for CARD_ID in $Q1 $Q2 $Q3 $Q4 $Q5 $Q6 $Q7 $Q8 $Q9 $Q10 $Q11 $Q12; do
    if [ -n "$CARD_ID" ] && [ "$CARD_ID" != "null" ]; then
        curl -s -X PUT "$METABASE_URL/api/card/$CARD_ID" \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "{\"collection_id\": $COLLECTION_ID}" > /dev/null 2>&1
    fi
done

ok "Cards movidas a la coleccion."

# ── 10. Crear dashboards ──
info "Creando dashboards..."

create_dashboard() {
    local NAME="$1"
    local DESC="$2"

    RESULT=$(curl -s -X POST "$METABASE_URL/api/dashboard" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$NAME\",
            \"description\": \"$DESC\",
            \"collection_id\": $COLLECTION_ID
        }")

    DASH_ID=$(echo "$RESULT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2 || true)
    echo "$DASH_ID"
}

DASH_VENTAS=$(create_dashboard "Ventas" "Dashboard de ventas: tendencias, metodos de pago, top productos y rendimiento por cajero")
DASH_INVENTARIO=$(create_dashboard "Inventario" "Dashboard de inventario: stock actual, alertas de stock bajo, movimientos y valor total")
DASH_GENERAL=$(create_dashboard "General" "Dashboard general: facturacion, ventas por punto de venta y metricas clave del negocio")

ok "Dashboards creados: Ventas=$DASH_VENTAS, Inventario=$DASH_INVENTARIO, General=$DASH_GENERAL"

# ── 11. Agregar cards a los dashboards ──
info "Configurando layouts de dashboards..."

add_card_to_dashboard() {
    local DASH_ID="$1"
    local CARD_ID="$2"
    local SIZE_X="$3"
    local SIZE_Y="$4"
    local COL="$5"
    local ROW="$6"

    if [ -z "$CARD_ID" ] || [ "$CARD_ID" = "null" ]; then return; fi

    curl -s -X PUT "$METABASE_URL/api/dashboard/$DASH_ID" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"dashcards\": [{
                \"id\": -1,
                \"card_id\": $CARD_ID,
                \"size_x\": $SIZE_X,
                \"size_y\": $SIZE_Y,
                \"col\": $COL,
                \"row\": $ROW
            }]
        }" > /dev/null 2>&1
}

# Dashboard Ventas - layout progresivo
add_cards_to_dashboard() {
    local DASH_ID="$1"
    shift
    local CARDS_JSON="["
    local FIRST=true

    while [ $# -ge 5 ]; do
        local CARD_ID="$1"
        local SIZE_X="$2"
        local SIZE_Y="$3"
        local COL="$4"
        local ROW="$5"
        shift 5

        if [ -z "$CARD_ID" ] || [ "$CARD_ID" = "null" ]; then continue; fi

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            CARDS_JSON="$CARDS_JSON,"
        fi

        CARDS_JSON="$CARDS_JSON{\"id\":-$RANDOM,\"card_id\":$CARD_ID,\"size_x\":$SIZE_X,\"size_y\":$SIZE_Y,\"col\":$COL,\"row\":$ROW}"
    done

    CARDS_JSON="$CARDS_JSON]"

    curl -s -X PUT "$METABASE_URL/api/dashboard/$DASH_ID" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"dashcards\": $CARDS_JSON}" > /dev/null 2>&1
}

# Dashboard Ventas
if [ -n "$DASH_VENTAS" ]; then
    add_cards_to_dashboard "$DASH_VENTAS" \
        "$Q4"  6 4 0 0 \
        "$Q2"  6 4 6 0 \
        "$Q6" 12 4 0 4 \
        "$Q1" 12 5 0 8 \
        "$Q3" 12 5 0 13 \
        "$Q12" 12 5 0 18
    ok "  Dashboard Ventas configurado"
fi

# Dashboard Inventario
if [ -n "$DASH_INVENTARIO" ]; then
    add_cards_to_dashboard "$DASH_INVENTARIO" \
        "$Q10" 12 4 0 0 \
        "$Q8"  12 5 0 4 \
        "$Q9"  12 5 0 9 \
        "$Q7"  12 6 0 14
    ok "  Dashboard Inventario configurado"
fi

# Dashboard General
if [ -n "$DASH_GENERAL" ]; then
    add_cards_to_dashboard "$DASH_GENERAL" \
        "$Q5"  12 5 0 0 \
        "$Q11" 12 5 0 5
    ok "  Dashboard General configurado"
fi

# ── 12. Habilitar sharing publico en dashboards ──
info "Habilitando acceso publico a dashboards..."

enable_public_dashboard() {
    local DASH_ID="$1"
    local DASH_NAME="$2"

    if [ -z "$DASH_ID" ] || [ "$DASH_ID" = "null" ]; then return; fi

    RESULT=$(curl -s -X POST "$METABASE_URL/api/dashboard/$DASH_ID/public_link" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" 2>/dev/null || true)

    UUID=$(echo "$RESULT" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4 || true)

    if [ -n "$UUID" ]; then
        ok "  $DASH_NAME: $METABASE_URL/public/dashboard/$UUID" >&2
        echo "$UUID"
    else
        warn "  No se pudo generar link publico para $DASH_NAME" >&2
    fi
}

UUID_VENTAS=$(enable_public_dashboard "$DASH_VENTAS" "Ventas")
UUID_INVENTARIO=$(enable_public_dashboard "$DASH_INVENTARIO" "Inventario")
UUID_GENERAL=$(enable_public_dashboard "$DASH_GENERAL" "General")

# ── 13. Guardar configuracion para el frontend ──
SCRIPT_DIR="$(dirname "$0")"
METABASE_PUBLIC_URL="${METABASE_PUBLIC_URL:-http://localhost:3001}"

# JSON de runtime — el frontend lo lee en tiempo real (no necesita rebuild)
PUBLIC_DIR="${SCRIPT_DIR}/../frontend/public"
mkdir -p "$PUBLIC_DIR"
cat > "${PUBLIC_DIR}/metabase-config.json" << EOF
{
  "REACT_APP_METABASE_URL": "${METABASE_PUBLIC_URL}",
  "REACT_APP_METABASE_DASHBOARD_VENTAS": "${UUID_VENTAS}",
  "REACT_APP_METABASE_DASHBOARD_INVENTARIO": "${UUID_INVENTARIO}",
  "REACT_APP_METABASE_DASHBOARD_GENERAL": "${UUID_GENERAL}"
}
EOF

ok "Config runtime guardada en frontend/public/metabase-config.json"

# Tambien guardar .env.metabase como referencia
cat > "${SCRIPT_DIR}/../frontend/.env.metabase" << EOF
# Configuracion de Metabase para el frontend
# Generado automaticamente por setup-metabase.sh
REACT_APP_METABASE_URL=${METABASE_PUBLIC_URL}
REACT_APP_METABASE_DASHBOARD_VENTAS=${UUID_VENTAS}
REACT_APP_METABASE_DASHBOARD_INVENTARIO=${UUID_INVENTARIO}
REACT_APP_METABASE_DASHBOARD_GENERAL=${UUID_GENERAL}
EOF

# ── Resumen final ──
echo ""
echo "============================================"
echo -e "${GREEN}  METABASE CONFIGURADO EXITOSAMENTE${NC}"
echo "============================================"
echo ""
echo "  Panel Metabase:  $METABASE_PUBLIC_URL"
echo "  Email:           $MB_ADMIN_EMAIL"
echo "  Password:        $MB_ADMIN_PASSWORD"
echo ""
echo "  Dashboards publicos:"
if [ -n "$UUID_VENTAS" ]; then
    echo "    Ventas:     $METABASE_PUBLIC_URL/public/dashboard/$UUID_VENTAS"
fi
if [ -n "$UUID_INVENTARIO" ]; then
    echo "    Inventario: $METABASE_PUBLIC_URL/public/dashboard/$UUID_INVENTARIO"
fi
if [ -n "$UUID_GENERAL" ]; then
    echo "    General:    $METABASE_PUBLIC_URL/public/dashboard/$UUID_GENERAL"
fi
echo ""
echo "  Base de datos: $DB_NAME ($DB_HOST:$DB_PORT)"
echo "  12 visualizaciones creadas en 3 dashboards"
echo ""
