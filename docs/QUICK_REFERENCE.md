# ⚡ Referencia Rápida - Comandos y Atajos

Guía rápida de comandos, endpoints y atajos útiles para el Sistema ERP/POS Nodo.

## 📋 Tabla de Contenidos

- [Comandos Docker](#comandos-docker)
- [Comandos de Base de Datos](#comandos-de-base-de-datos)
- [Comandos Backend](#comandos-backend)
- [Comandos Frontend](#comandos-frontend)
- [Endpoints API](#endpoints-api)
- [Atajos de Teclado](#atajos-de-teclado)
- [Scripts Útiles](#scripts-útiles)

---

## 🐳 Comandos Docker

### Gestión de Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Reconstruir e iniciar
docker-compose up -d --build

# Ver estado de servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f frontend
```

### Acceso a Contenedores

```bash
# Acceder al shell del backend
docker-compose exec backend bash

# Acceder a PostgreSQL
docker-compose exec db psql -U postgres -d almacen_db

# Ejecutar comando en contenedor
docker-compose exec backend python scripts/verificar_bd.py
```

### Limpieza

```bash
# Detener y eliminar contenedores
docker-compose down

# Eliminar también volúmenes (¡cuidado con los datos!)
docker-compose down -v

# Limpiar imágenes no usadas
docker system prune -a
```

---

## 🗄️ Comandos de Base de Datos

### Conexión

```bash
# Conectar a PostgreSQL
psql -U postgres -d almacen_db

# Con Docker
docker-compose exec db psql -U postgres -d almacen_db
```

### Consultas Útiles

```sql
-- Ver todas las tablas
\dt

-- Describir estructura de tabla
\d ventas
\d productos

-- Ver usuarios
SELECT id, nombre, email, rol_id, activo FROM usuarios;

-- Ver productos con stock
SELECT p.nombre, v.sku, i.stock 
FROM productos p
JOIN variantes_producto v ON p.id = v.producto_id
JOIN inventario i ON v.id = i.variante_id
WHERE i.stock > 0;

-- Ver ventas del día
SELECT id, total, estado, creada_en 
FROM ventas 
WHERE DATE(creada_en) = CURRENT_DATE;

-- Ver tamaño de base de datos
SELECT pg_size_pretty(pg_database_size('almacen_db'));

-- Ver conexiones activas
SELECT count(*) FROM pg_stat_activity WHERE datname = 'almacen_db';
```

### Migraciones

```bash
# Aplicar migración individual
psql -U postgres -d almacen_db -f migrations/001_add_venta_fields.sql

# Con Docker
docker-compose exec db psql -U postgres -d almacen_db -f /tmp/migrations/001_add_venta_fields.sql

# Backup de base de datos
pg_dump -U postgres almacen_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U postgres -d almacen_db < backup_20260121.sql
```

---

## ⚙️ Comandos Backend

### Desarrollo

```bash
# Iniciar backend con hot reload
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Desde carpeta backend
cd backend
uvicorn app.main:app --reload

# Con entorno virtual activado
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
uvicorn app.main:app --reload
```

### Testing

```bash
# Health check
curl http://localhost:8000/health

# Login y obtener token
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | jq -r '.access_token')

# Usar token en requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/auth/me

# Ejecutar script de testing
./scripts/test_api.sh
```

### Verificación

```bash
# Verificar implementación
python scripts/verificar_implementacion.py

# Verificar base de datos
python scripts/verificar_bd.py
```

---

## 🎨 Comandos Frontend

### Desarrollo

```bash
# Instalar dependencias
cd frontend
npm install

# Iniciar servidor de desarrollo
npm start

# Build para producción
npm run build

# Ejecutar tests
npm test

# Linting
npm run lint
```

### Limpieza

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Limpiar build
rm -rf build
```

---

## 🔗 Endpoints API

### Autenticación

```bash
# Login
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded
Body: username=admin&password=admin123

# Usuario actual
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### POS

```bash
# Buscar por código de barras
GET /api/v1/pos/barcode/{codigo}
Authorization: Bearer <token>
```

### Ventas

```bash
# Crear venta
POST /api/v1/ventas
Authorization: Bearer <token>
Body: {
  "punto_venta_id": 1,
  "metodo_pago": "EFECTIVO",
  "detalles": []
}

# Listar ventas
GET /api/v1/ventas?estado=CERRADA&limit=10
Authorization: Bearer <token>

# Agregar producto a venta
POST /api/v1/ventas/{id}/items
Authorization: Bearer <token>
Body: {
  "codigo_barras": "7501234567890",
  "cantidad": 2
}

# Cerrar venta
POST /api/v1/ventas/{id}/cerrar
Authorization: Bearer <token>

# Generar ticket
GET /api/v1/ventas/{id}/ticket
Authorization: Bearer <token>
```

### Productos

```bash
# Listar productos
GET /api/v1/productos?categoria=ropa&buscar=camisa
Authorization: Bearer <token>

# Crear producto
POST /api/v1/productos
Authorization: Bearer <token>
Body: {
  "nombre": "Producto Nuevo",
  "categoria": "ropa",
  "variantes": [...]
}
```

### Inventario

```bash
# Consultar stock
GET /api/v1/inventario/stock?estado=BAJO
Authorization: Bearer <token>

# Registrar movimiento
POST /api/v1/inventario/movimientos
Authorization: Bearer <token>
Body: {
  "variante_id": 1,
  "tipo": "ENTRADA",
  "cantidad": 100,
  "motivo": "Compra"
}
```

### Reportes

```bash
# Reporte de ventas
GET /api/v1/reportes/ventas?fecha_desde=2026-01-01&fecha_hasta=2026-01-31
Authorization: Bearer <token>

# Reporte de almacén
GET /api/v1/reportes/almacen?categoria=ropa
Authorization: Bearer <token>

# Reporte general mensual
GET /api/v1/reportes/general/1/2026
Authorization: Bearer <token>
```

---

## ⌨️ Atajos de Teclado

### Frontend - POS

| Atajo | Acción |
|-------|--------|
| `F1` | Nueva Venta |
| `F2` | Cerrar Venta |
| `F3` | Cancelar Venta |
| `Enter` | Agregar Producto al Carrito |
| `Esc` | Cancelar Operación |
| `Ctrl + /` | Buscar Producto |

### Navegador

| Atajo | Acción |
|-------|--------|
| `Ctrl + R` | Recargar página |
| `Ctrl + Shift + R` | Recargar sin cache |
| `F12` | Abrir DevTools |
| `Ctrl + Shift + I` | Abrir DevTools (alternativo) |

---

## 🛠️ Scripts Útiles

### Scripts de Inicio

```powershell
# Windows PowerShell
.\scripts\start-all.ps1          # Inicia backend + DB
.\scripts\start-frontend.ps1     # Inicia frontend
.\scripts\verificar-sistema.ps1  # Verifica integridad
```

### Scripts de Verificación

```bash
# Verificar base de datos
python scripts/verificar_bd.py

# Verificar implementación completa
python scripts/verificar_implementacion.py

# Testing de API
./scripts/test_api.sh
```

### Scripts de Utilidad

```bash
# Limpiar esquema para dbdiagram
python scripts/limpiar_esquema_para_dbdiagram.py

# Generar hash de contraseña
python scripts/generar_hash.py
```

---

## 📝 Variables de Entorno

### Backend (.env)

```env
# Base de Datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/almacen_db
DATABASE_NAME=almacen_db

# JWT
SECRET_KEY=tu-clave-secreta-super-segura
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
DEBUG=True
API_V1_PREFIX=/api/v1
```

### Frontend (frontend/.env)

```env
REACT_APP_API_URL=http://localhost:8000
```

---

## 🔍 Consultas SQL Útiles

### Ventas

```sql
-- Ventas del día
SELECT COUNT(*), SUM(total) 
FROM ventas 
WHERE DATE(creada_en) = CURRENT_DATE;

-- Top productos vendidos
SELECT vd.variante_id, SUM(vd.cantidad) as total_vendido
FROM venta_detalle vd
JOIN ventas v ON vd.venta_id = v.id
WHERE v.estado = 'CERRADA'
GROUP BY vd.variante_id
ORDER BY total_vendido DESC
LIMIT 10;
```

### Inventario

```sql
-- Productos con stock bajo
SELECT p.nombre, v.sku, i.stock
FROM productos p
JOIN variantes_producto v ON p.id = v.producto_id
JOIN inventario i ON v.id = i.variante_id
WHERE i.stock < 10
ORDER BY i.stock ASC;

-- Movimientos recientes
SELECT tipo, cantidad, motivo, creado_en
FROM movimientos_inventario
ORDER BY creado_en DESC
LIMIT 20;
```

### Cobranza

```sql
-- Cuentas por cobrar vencidas
SELECT c.nombre, cpc.saldo_pendiente, cpc.fecha_vencimiento
FROM cuentas_por_cobrar cpc
JOIN clientes c ON cpc.cliente_id = c.id
WHERE cpc.saldo_pendiente > 0
AND cpc.fecha_vencimiento < CURRENT_DATE
ORDER BY cpc.fecha_vencimiento ASC;
```

---

## 🚀 Flujo Completo de Venta (cURL)

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | jq -r '.access_token')

# 2. Buscar producto
curl -X GET "http://localhost:8000/api/v1/pos/barcode/7501234567890" \
  -H "Authorization: Bearer $TOKEN"

# 3. Crear venta
VENTA_ID=$(curl -s -X POST "http://localhost:8000/api/v1/ventas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"punto_venta_id": 1, "metodo_pago": "EFECTIVO", "detalles": []}' \
  | jq -r '.id')

# 4. Agregar productos
curl -X POST "http://localhost:8000/api/v1/ventas/$VENTA_ID/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codigo_barras": "7501234567890", "cantidad": 2}'

# 5. Cerrar venta
curl -X POST "http://localhost:8000/api/v1/ventas/$VENTA_ID/cerrar" \
  -H "Authorization: Bearer $TOKEN"

# 6. Generar ticket
curl -X GET "http://localhost:8000/api/v1/ventas/$VENTA_ID/ticket" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.ticket_html' > ticket.html
```

---

## 📚 Recursos Adicionales

- **Documentación API**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Spec**: `http://localhost:8000/openapi.json`

---

**Última actualización**: Enero 2026
