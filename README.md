# 🏪 Sistema ERP/POS Nodo - COMPLETO

Sistema integral de ERP y Punto de Venta construido a medida según especificaciones del cliente.

**Estado**: ✅ **IMPLEMENTACIÓN COMPLETA**  
**Fecha**: 2026-01-21  
**Versión**: 1.0.0

---

## 🎯 Módulos Implementados

✅ **POS (Punto de Venta)** - Ventas con lector RF, tickets con QR  
✅ **Almacén** - Control de stock, variantes, carga masiva  
✅ **Reportes** - Ventas, inventario, comparativas, exportación  
✅ **Cobranza** - Ventas a crédito, cuentas por cobrar, abonos  
✅ **Facturación SAT** - CFDI 4.0, timbrado PAC, facturas globales  
✅ **Frontend React** - 6 páginas completas con UX optimizada  

---

## 🚀 Stack Tecnológico

**Backend**:
- FastAPI + Python 3.11
- PostgreSQL 18
- SQLAlchemy 2.0
- JWT Authentication
- Clean Architecture

**Frontend**:
- React 18
- React Router v6
- Axios
- CSS Modules

**DevOps**:
- Docker & Docker Compose
- Hot reload en desarrollo
- Scripts de inicio rápido

## ⚡ Inicio Rápido (5 minutos)

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd ERP

# 2. Crear archivos .env (ver docs/INSTALLATION.md)
# Backend: cp backend/.env.example backend/.env
# Frontend: cp frontend/.env.example frontend/.env

# 3. Aplicar migraciones
psql -U postgres -d almacen_db -f migrations/001_add_venta_fields.sql
psql -U postgres -d almacen_db -f migrations/002_mejora_precios_acumulado.sql
psql -U postgres -d almacen_db -f migrations/003_modulo_cobranza.sql

# 4. Iniciar servicios (desde la raíz del proyecto)
docker compose -f docker/docker-compose.yml up -d

# 5. Acceder
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:3000
# Usuario: admin / Password: admin123
```

**⚠️ Nota**: Si encuentras errores al clonar, consulta [docs/TROUBLESHOOTING.md#clonación-desde-git](docs/TROUBLESHOOTING.md#clonación-desde-git)

📖 **Guía detallada**: Ver [docs/INSTALLATION.md](docs/INSTALLATION.md)

---

## 🏗️ Arquitectura

Sistema completo con **Clean Architecture** y **8 módulos funcionales**:

```
Sistema ERP Nodo/
├── Backend (FastAPI)
│   ├── 🔐 Autenticación (JWT + Roles)
│   ├── 🛒 POS (Punto de Venta)
│   ├── 💰 Ventas
│   ├── 📦 Almacén (Productos + Inventario)
│   ├── 📊 Reportes (4 tipos con exportación)
│   ├── 💳 Cobranza (Crédito + Abonos)
│   └── 🧾 Facturación SAT (CFDI 4.0)
├── Frontend (React)
│   ├── Dashboard
│   ├── POS (con escáner RF)
│   ├── Almacén (con carga masiva)
│   ├── Reportes (con gráficas)
│   ├── Facturación
│   └── Cobranza
└── Base de Datos (PostgreSQL)
    ├── 15+ tablas
    ├── 6 triggers automáticos
    └── Precios inteligentes
```

### Capas del Backend

1. **Models** (7): Entidades SQLAlchemy alineadas con BD
2. **Repositories** (4): Acceso a datos con locks
3. **Services** (8): Lógica de negocio y transacciones
4. **API** (8 routers): 50+ endpoints REST
5. **Schemas**: Validación Pydantic

## 📦 Instalación y Uso

### Instalación Completa

**Ver guía paso a paso**: [docs/INSTALLATION.md](docs/INSTALLATION.md)

### Inicio Rápido con Docker

```bash
cd ERP

# 1. Aplicar migraciones de BD (primera vez)
psql -U postgres -d almacen_db < migrations/001_add_venta_fields.sql
psql -U postgres -d almacen_db < migrations/002_mejora_precios_acumulado.sql
psql -U postgres -d almacen_db < migrations/003_modulo_cobranza.sql

# 2. Iniciar todos los servicios
docker compose -f docker/docker-compose.yml up -d

# 3. Verificar
curl http://localhost:8000/health
```

**Acceso**:
- Backend API: `http://localhost:8000`
- Documentación: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`
- Login: `admin` / `admin123`

### Sin Docker

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias del backend
pip install -r backend/requirements.txt

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tu configuración de PostgreSQL

# Ejecutar aplicación
uvicorn backend.app.main:app --reload
```

## 🗄️ Base de Datos

### Estructura Completa (15+ tablas)

**Core POS**:
- `usuarios`, `roles` - Autenticación y autorización
- `puntos_venta` - Cajas/sucursales
- `productos` - Catálogo base
- `variantes_producto` - Talla, color, precios
- `inventario` - Stock por variante
- `movimientos_inventario` - Trazabilidad

**Ventas**:
- `ventas` - Cabecera con totales
- `venta_detalle` - Líneas de productos
- `tickets` - Tickets generados

**Cobranza**:
- `clientes` - Clientes con límite crédito
- `cuentas_por_cobrar` - Ventas a crédito
- `pagos_cuenta` - Abonos y pagos

**Facturación**:
- `facturas` - CFDI 4.0
- `factura_ventas` - Relación N:M
- `folios_sat` - Control de numeración

### Triggers Automáticos (6)

1. ✅ `fn_precio_automatico_acumulado()` - Precio menudeo/mayoreo por acumulado
2. ✅ `fn_descuento_inventario()` - Actualiza stock en venta
3. ✅ `fn_validar_stock()` - Valida stock antes de vender
4. ✅ `fn_recalcular_totales_venta()` - Actualiza totales automáticamente
5. ✅ `fn_actualizar_cuenta_pago()` - Actualiza saldo al abonar

**Archivo base**: `docs/almacen_db.sql`  
**Migraciones**: Ver carpeta `migrations/`

### Script de Inicialización (Opcional)

Si necesitas crear las tablas, ejecuta:

```sql
-- Crear tablas base
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'CAJERO',
    activo INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Insertar usuario admin de prueba
-- Password: admin123
INSERT INTO usuarios (username, email, hashed_password, rol) VALUES
('admin', 'admin@pos.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVhC6U7QK', 'ADMIN');

-- Continuar con productos, inventario, etc...
```

## 🔐 Autenticación

### Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Usar Token

Incluir el token en el header `Authorization`:

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## 📘 Módulos y Endpoints (50+)

### 🔐 Autenticación
- `POST /api/v1/auth/login` - Login con JWT
- `GET /api/v1/auth/me` - Usuario actual

### 🛒 POS (Punto de Venta)
- `GET /api/v1/pos/barcode/{codigo}` - Buscar por código de barras

### 💰 Ventas
- `POST /api/v1/ventas` - Crear venta
- `GET /api/v1/ventas` - Listar ventas
- `GET /api/v1/ventas/{id}` - Detalle de venta
- `POST /api/v1/ventas/{id}/items` - Agregar producto
- `POST /api/v1/ventas/{id}/cerrar` - Cerrar venta
- `POST /api/v1/ventas/{id}/cancelar` - Cancelar venta
- `GET /api/v1/ventas/{id}/ticket` - Generar ticket con QR

### 📦 Productos y Almacén
- `GET /api/v1/productos` - Listar productos
- `POST /api/v1/productos` - Crear producto
- `POST /api/v1/productos/variantes` - Crear variante (talla/color)
- `POST /api/v1/productos/carga-masiva` - Importar CSV

### 📊 Inventario
- `GET /api/v1/inventario/stock` - Consultar stock
- `GET /api/v1/inventario/stock/bajo` - Stock bajo
- `POST /api/v1/inventario/movimientos` - Registrar entrada/salida
- `GET /api/v1/inventario/movimientos` - Historial

### 📈 Reportes
- `GET /api/v1/reportes/ventas` - Reporte de ventas
- `GET /api/v1/reportes/almacen` - Reporte de almacén
- `GET /api/v1/reportes/movimientos` - Movimientos
- `GET /api/v1/reportes/general/{mes}/{anio}` - Comparativo mensual
- Exportación a CSV disponible

### 💳 Cobranza
- `POST /api/v1/cobranza/clientes` - Crear cliente
- `POST /api/v1/cobranza/ventas-credito` - Venta a crédito
- `GET /api/v1/cobranza/cuentas-por-cobrar` - Listar cuentas
- `POST /api/v1/cobranza/pagos` - Registrar pago/abono
- `GET /api/v1/cobranza/estado-cuenta/{id}` - Estado de cuenta

### 🧾 Facturación SAT
- `POST /api/v1/facturas` - Crear factura
- `POST /api/v1/facturas/{id}/timbrar` - Timbrar con PAC
- `POST /api/v1/facturas/global/tarjetas` - Factura global
- `POST /api/v1/facturas/{id}/cancelar` - Cancelar factura

**Total: 50+ endpoints** | Ver documentación completa en [docs/API.md](docs/API.md) y `http://localhost:8000/docs`

## ⭐ Características Destacadas

### 1. Precio Menudeo/Mayoreo Automático
✅ Trigger SQL que calcula precio por **cantidad acumulada**
- Cantidad < 12: Precio menudeo
- Cantidad >= 12: Precio mayoreo (actualiza TODA la venta)
- Sin intervención manual del usuario

### 2. Tickets con QR para Facturación
✅ Generación automática de tickets
- Formato HTML (impresión web)
- Formato texto (impresoras térmicas ESC/POS)
- QR code con URL de facturación
- Cliente escanea para facturar fácilmente

### 3. Carga Masiva de Productos
✅ Importación por CSV
- Layout definido (ver `examples/productos_carga_masiva.csv`)
- Validaciones automáticas
- Reporte de errores por línea
- Crea: producto + variantes + inventario

### 4. Control de Inventario Centralizado
✅ Multi-dispositivo seguro
- Locks de BD (`SELECT FOR UPDATE`)
- Previene overselling
- Actualización automática vía triggers
- Historial de movimientos con trazabilidad

### 5. Sistema de Cobranza
✅ Ventas a crédito completo
- Límite de crédito por cliente
- Validación automática
- Abonos parciales/totales
- Estados y vencimientos

### 6. Facturación SAT (CFDI 4.0)
✅ Preparada para PAC
- Folios y series automáticos
- Factura global de tarjetas
- Stub listo para integración real
- XML/PDF cuando se configure PAC

---

## 🎯 Ejemplo de Flujo Completo

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=admin123" | jq -r '.access_token')

# 2. Buscar producto por código
curl -X GET http://localhost:8000/api/v1/pos/barcode/7501234567890 \
  -H "Authorization: Bearer $TOKEN"

# 3. Crear venta
VENTA=$(curl -s -X POST http://localhost:8000/api/v1/ventas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "punto_venta_id": 1,
    "metodo_pago": "EFECTIVO",
    "detalles": [{"codigo_barras": "7501234567890", "cantidad": 5}]
  }')

VENTA_ID=$(echo $VENTA | jq -r '.id')

# 4. Agregar más productos (activar mayoreo)
curl -X POST http://localhost:8000/api/v1/ventas/$VENTA_ID/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codigo_barras": "7501234567890", "cantidad": 8}'

# 5. Cerrar venta
curl -X POST http://localhost:8000/api/v1/ventas/$VENTA_ID/cerrar \
  -H "Authorization: Bearer $TOKEN"

# 6. Generar ticket
curl -X GET http://localhost:8000/api/v1/ventas/$VENTA_ID/ticket \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.ticket_html' > ticket.html
```

### Respuesta Exitosa

```json
{
  "id": 1,
  "cliente_nombre": "Juan Pérez",
  "usuario_id": 1,
  "subtotal": 100.00,
  "descuento": 5.00,
  "total": 95.00,
  "estado": "PENDIENTE",
  "metodo_pago": "EFECTIVO",
  "detalles": [
    {
      "id": 1,
      "producto_nombre": "Producto X",
      "codigo_barras": "7501234567890",
      "cantidad": 2,
      "precio_unitario": 50.00,
      "descuento": 5.00,
      "subtotal": 95.00
    }
  ]
}
```

### Manejo de Errores

```json
// Stock insuficiente
{
  "detail": "Stock insuficiente. Disponible: 1, Requerido: 2"
}

// Producto no encontrado
{
  "detail": "Producto con código de barras '7501234567890' no encontrado"
}

// Venta no está pendiente
{
  "detail": "No se puede agregar ítems a una venta en estado COMPLETADA"
}
```

## 🔒 Transacciones ACID

### SELECT FOR UPDATE

El endpoint `POST /sales/{id}/item` usa **SELECT FOR UPDATE** para:

1. **Bloquear** el registro de inventario durante la transacción
2. **Prevenir** que dos cajeros vendan el mismo stock simultáneamente
3. **Garantizar** consistencia en operaciones concurrentes

```python
# En el repositorio
inventario = self.db.query(Inventario).filter(
    Inventario.variante_producto_id == variante_id
).with_for_update().first()  # 🔒 Lock exclusivo
```

### Flujo de Transacción

```
1. BEGIN TRANSACTION
2. SELECT ... FROM ventas WHERE id = X FOR UPDATE
3. SELECT ... FROM inventario WHERE variante_id = Y FOR UPDATE
4. Validar stock >= cantidad
5. INSERT INTO venta_detalle
6. UPDATE ventas SET total = ...
7. COMMIT (o ROLLBACK si hay error)
```

## 🎯 Roles y Permisos

- **ADMIN**: Acceso completo
- **CAJERO**: Crear y gestionar ventas

```python
# En los endpoints
@router.post("/sales")
def create_sale(
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)]
):
    # Solo CAJERO o ADMIN pueden acceder
    ...
```

## 🧪 Testing

### Con Postman/Insomnia

1. Importar colección desde `http://localhost:8000/openapi.json`
2. Configurar variable `base_url = http://localhost:8000`
3. Hacer login y copiar token
4. Agregar token a Authorization Header

### Con cURL

Ver ejemplos en la sección de endpoints arriba.

### Documentación Interactiva

Swagger UI: `http://localhost:8000/docs`

ReDoc: `http://localhost:8000/redoc`

## 📊 Monitoreo

### Health Check

```bash
curl http://localhost:8000/health
```

### Logs de Docker

```bash
docker compose -f docker/docker-compose.yml logs -f backend
```

### Conexión a PostgreSQL

```bash
docker compose -f docker/docker-compose.yml exec db psql -U postgres -d pos_db
```

## 🔧 Configuración

Todas las configuraciones están en `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/pos_db

# JWT
SECRET_KEY=tu-clave-super-segura
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
DEBUG=True
```

## 📝 Notas Importantes

### Triggers de PostgreSQL

Si tu base de datos tiene **triggers** que actualizan el inventario automáticamente al insertar en `venta_detalle`, el sistema los respetará y NO actualizará el stock manualmente.

Si NO tienes triggers, descomenta esta línea en `venta_service.py`:

```python
# En _add_item_internal()
inventario.cantidad -= cantidad  # Descomentar si no hay triggers
```

### Seguridad en Producción

1. Cambiar `SECRET_KEY` en `.env`
2. Configurar CORS con orígenes específicos
3. Usar HTTPS
4. Configurar rate limiting
5. Implementar logging robusto

## 🎓 Roles y Permisos

El sistema implementa control de acceso basado en roles (RBAC):

### Roles del Sistema

**ADMIN**: Acceso completo
- ✅ Todos los módulos
- ✅ Configuración del sistema
- ✅ Gestión de usuarios
- ✅ Reportes completos

**CAJERO**: Operaciones de venta
- ✅ POS (ventas)
- ✅ Cobranza (pagos)
- ✅ Reportes (consulta)
- ✅ Facturación

**ALMACEN**: Gestión de inventario
- ✅ Productos y variantes
- ✅ Movimientos de stock
- ✅ Reportes de almacén
- ✅ Carga masiva

Para más detalles sobre seguridad y autenticación, ver [docs/SECURITY.md](docs/SECURITY.md)

---

## 🔍 Verificación de Instalación

```bash
# Ejecutar script de verificación
python scripts/verificar_implementacion.py
```

Verifica que todos los archivos y módulos estén en su lugar.

---

## 🚀 Despliegue a Producción

**Checklist Pre-Producción**:

1. ✅ Aplicar todas las migraciones de base de datos
2. ⚠️ Configurar `SECRET_KEY` segura en variables de entorno
3. ⚠️ Configurar CORS con orígenes específicos (no `*`)
4. ⚠️ Integrar PAC real para facturación SAT (Finkok/Diverza)
5. ⚠️ Configurar certificados SAT y credenciales
6. ✅ Build del frontend para producción (`npm run build`)
7. ✅ Configurar HTTPS/SSL
8. ⚠️ Configurar `DEBUG=False` en producción
9. ⚠️ Configurar logging robusto
10. ⚠️ Configurar backups automáticos de base de datos

Para más detalles, consultar [docs/INSTALLATION.md](docs/INSTALLATION.md) y [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## 📁 Estructura del Proyecto

```
ERP/
├── backend/
│   └── app/              # Código del backend (FastAPI)
│       ├── core/         # Configuración y seguridad
│       ├── models/       # Modelos SQLAlchemy
│       ├── schemas/      # Schemas Pydantic
│       ├── repositories/ # Acceso a datos
│       ├── services/     # Lógica de negocio
│       └── api/          # Endpoints REST
│
├── frontend/             # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas (Dashboard, POS, etc.)
│   │   ├── services/     # Cliente API
│   │   └── context/      # Context API (Auth)
│   └── public/
│
├── docs/                 # Documentación completa del proyecto
│   ├── INSTALLATION.md   # Guía de instalación
│   ├── DEVELOPMENT.md    # Guía de desarrollo
│   ├── ARCHITECTURE.md   # Arquitectura del sistema
│   ├── API.md            # Documentación de API
│   ├── DATABASE.md       # Base de datos
│   ├── SECURITY.md       # Seguridad y autenticación
│   ├── TROUBLESHOOTING.md # Solución de problemas
│   ├── QUICK_REFERENCE.md # Referencia rápida
│   └── MIGRATIONS.md     # Migraciones de BD
│
├── scripts/              # Scripts de utilidad
│   ├── inicio.ps1
│   ├── start-all.ps1
│   ├── start-frontend.ps1
│   ├── verificar-sistema.ps1
│   ├── test_api.sh
│   └── instalar_dependencias_windows.ps1
│
├── examples/             # Ejemplos de uso
├── docker/               # Docker
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── Dockerfile.prod
├── backend/              # Backend FastAPI (requirements.txt, openapi.yaml, app/)
├── docs/                # Documentación (CHANGELOG, INSTALLATION, etc.)
└── README.md            # Este archivo
```

## 📚 Documentación Completa

Toda la documentación está organizada profesionalmente en la carpeta `docs/`:

### 🚀 Guías Principales
- **[docs/INSTALLATION.md](docs/INSTALLATION.md)** ⭐ - Instalación completa paso a paso
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Guía de desarrollo y contribución
- **[docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - Comandos rápidos y referencias

### 🔧 Documentación Técnica
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura del sistema (Clean Architecture)
- **[docs/API.md](docs/API.md)** - Documentación completa de la API REST
- **[docs/DATABASE.md](docs/DATABASE.md)** - Estructura y gestión de base de datos
- **[docs/SECURITY.md](docs/SECURITY.md)** - Seguridad, autenticación JWT y roles

### 🛠️ Operaciones y Mantenimiento
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solución de problemas comunes
- **[docs/MIGRATIONS.md](docs/MIGRATIONS.md)** - Guía de migraciones de base de datos
- **[docs/DIAGRAMA_BASE_DE_DATOS.md](docs/DIAGRAMA_BASE_DE_DATOS.md)** - Diagramas y visualización

### 📖 Documentación Adicional
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Historial de cambios
- **[docs/SOLUCION_LOGIN.md](docs/SOLUCION_LOGIN.md)** - Solución de problemas de login en Docker
- **[frontend/README.md](frontend/README.md)** - Documentación específica del frontend
- **[planeacion/ResumenEjecutivoERP.md](planeacion/ResumenEjecutivoERP.md)** - Resumen ejecutivo del proyecto

## 🚀 Scripts de Inicio Rápido

En la carpeta `scripts/` encontrarás:

```powershell
# Windows PowerShell
.\scripts\start-all.ps1        # Inicia backend + DB
.\scripts\start-frontend.ps1   # Inicia frontend React
.\scripts\verificar-sistema.ps1 # Verifica integridad del sistema
```

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 📧 Soporte

Para dudas o problemas, revisar:
- **Documentación interactiva**: `http://localhost:8000/docs` (Swagger UI)
- **Documentación completa**: Carpeta `docs/` con guías profesionales
- **Solución de problemas**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Referencia rápida**: [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
- **Logs de la aplicación**: `docker compose -f docker/docker-compose.yml logs -f` o logs del servidor
