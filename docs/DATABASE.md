# 🗄️ Guía de Base de Datos

Documentación completa sobre la base de datos del Sistema ERP/POS Nodo.

## 📋 Tabla de Contenidos

- [Información General](#información-general)
- [Estructura de Tablas](#estructura-de-tablas)
- [Relaciones](#relaciones)
- [Triggers y Funciones](#triggers-y-funciones)
- [Migraciones](#migraciones)
- [Índices y Performance](#índices-y-performance)
- [Backup y Restauración](#backup-y-restauración)
- [Diagramas](#diagramas)

---

## 📊 Información General

### Configuración

- **Motor**: PostgreSQL 15+
- **Nombre de Base de Datos**: `almacen_db`
- **Esquema**: `public`
- **Encoding**: UTF-8
- **Collation**: `en_US.UTF-8`

### Conexión

**Desarrollo Local**:
```
postgresql://postgres:postgres@localhost:5432/almacen_db
```

**Docker**:
```
postgresql://postgres:postgres@db:5432/almacen_db
```

### Verificación

```bash
# Verificar conexión
psql -U postgres -d almacen_db -c "SELECT version();"

# Verificar base de datos actual
psql -U postgres -d almacen_db -c "SELECT current_database();"

# Listar todas las tablas
psql -U postgres -d almacen_db -c "\dt"
```

---

## 🏗️ Estructura de Tablas

### Tablas Core

#### `usuarios`
Usuarios del sistema con autenticación y roles.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);
```

#### `roles`
Roles del sistema (ADMIN, CAJERO, ALMACEN).

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);
```

#### `puntos_venta`
Puntos de venta o cajas del sistema.

```sql
CREATE TABLE puntos_venta (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true
);
```

### Tablas de Productos

#### `productos`
Catálogo base de productos.

```sql
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    marca VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP
);
```

#### `variantes_producto`
Variantes de productos (talla, color, etc.).

```sql
CREATE TABLE variantes_producto (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    talla VARCHAR(10),
    color VARCHAR(30),
    precio_menudeo NUMERIC(10,2) NOT NULL,
    precio_mayoreo NUMERIC(10,2) NOT NULL,
    umbral_mayoreo INTEGER DEFAULT 12,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT true
);
```

#### `inventario`
Stock por variante de producto.

```sql
CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    variante_id INTEGER UNIQUE REFERENCES variantes_producto(id),
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);
```

#### `movimientos_inventario`
Historial de movimientos de inventario.

```sql
CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    variante_id INTEGER REFERENCES variantes_producto(id),
    tipo VARCHAR(20) NOT NULL, -- ENTRADA, SALIDA, AJUSTE
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    referencia VARCHAR(100),
    creado_en TIMESTAMP DEFAULT NOW()
);
```

### Tablas de Ventas

#### `ventas`
Cabecera de ventas.

```sql
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    punto_venta_id INTEGER REFERENCES puntos_venta(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    cliente_id INTEGER REFERENCES clientes(id),
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
    impuesto NUMERIC(10,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(20) NOT NULL,
    tipo_venta VARCHAR(20) DEFAULT 'CONTADO',
    estado VARCHAR(20) DEFAULT 'ABIERTA',
    creada_en TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

#### `venta_detalle`
Detalle de productos en una venta.

```sql
CREATE TABLE venta_detalle (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    variante_id INTEGER REFERENCES variantes_producto(id),
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);
```

#### `tickets`
Tickets generados para ventas.

```sql
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER UNIQUE REFERENCES ventas(id),
    contenido TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW()
);
```

### Tablas de Cobranza

#### `clientes`
Clientes del sistema.

```sql
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    rfc VARCHAR(13),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    limite_credito NUMERIC(10,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);
```

#### `cuentas_por_cobrar`
Ventas a crédito pendientes de pago.

```sql
CREATE TABLE cuentas_por_cobrar (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    monto_total NUMERIC(10,2) NOT NULL,
    monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(10,2) NOT NULL,
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    creada_en TIMESTAMP DEFAULT NOW()
);
```

#### `pagos_cuenta`
Pagos y abonos a cuentas por cobrar.

```sql
CREATE TABLE pagos_cuenta (
    id SERIAL PRIMARY KEY,
    cuenta_id INTEGER REFERENCES cuentas_por_cobrar(id),
    monto NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL,
    referencia VARCHAR(100),
    usuario_id INTEGER REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT NOW()
);
```

### Tablas de Facturación

#### `facturas`
Facturas CFDI 4.0.

```sql
CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    uuid_sat VARCHAR(36) UNIQUE,
    serie VARCHAR(10),
    folio INTEGER,
    fecha TIMESTAMP NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    rfc_emisor VARCHAR(13) NOT NULL,
    rfc_receptor VARCHAR(13),
    estado VARCHAR(20) DEFAULT 'BORRADOR',
    uso_cfdi VARCHAR(3),
    forma_pago VARCHAR(2),
    metodo_pago VARCHAR(3),
    xml_content TEXT,
    xml_url VARCHAR(500),
    pdf_url VARCHAR(500),
    creada_en TIMESTAMP DEFAULT NOW()
);
```

#### `factura_ventas`
Relación N:M entre facturas y ventas.

```sql
CREATE TABLE factura_ventas (
    factura_id INTEGER REFERENCES facturas(id),
    venta_id INTEGER REFERENCES ventas(id),
    PRIMARY KEY (factura_id, venta_id)
);
```

#### `folios_sat`
Control de folios para facturación SAT.

```sql
CREATE TABLE folios_sat (
    id SERIAL PRIMARY KEY,
    serie VARCHAR(10) UNIQUE NOT NULL,
    folio_actual INTEGER NOT NULL DEFAULT 1,
    activo BOOLEAN DEFAULT true
);
```

---

## 🔗 Relaciones

### Diagrama de Relaciones Principales

```
usuarios ──┐
           ├──→ ventas ──┐
clientes ──┘             │
                         ├──→ venta_detalle ──→ variantes_producto ──→ productos
puntos_venta ───────────┘                              │
                                                         └──→ inventario
```

### Relaciones Detalladas

- **usuarios** → **ventas** (1:N)
- **clientes** → **ventas** (1:N)
- **puntos_venta** → **ventas** (1:N)
- **ventas** → **venta_detalle** (1:N)
- **venta_detalle** → **variantes_producto** (N:1)
- **variantes_producto** → **productos** (N:1)
- **variantes_producto** → **inventario** (1:1)
- **variantes_producto** → **movimientos_inventario** (1:N)
- **ventas** → **tickets** (1:1)
- **ventas** → **cuentas_por_cobrar** (1:1)
- **clientes** → **cuentas_por_cobrar** (1:N)
- **cuentas_por_cobrar** → **pagos_cuenta** (1:N)
- **facturas** → **factura_ventas** → **ventas** (N:M)

---

## ⚙️ Triggers y Funciones

### Funciones Principales

#### `fn_precio_automatico_acumulado()`
Calcula precio menudeo/mayoreo basado en cantidad acumulada en la venta.

```sql
CREATE FUNCTION fn_precio_automatico_acumulado()
RETURNS TRIGGER AS $$
BEGIN
    -- Lógica de cálculo de precio según cantidad acumulada
    -- Si cantidad acumulada >= umbral_mayoreo: usa precio_mayoreo
    -- Si no: usa precio_menudeo
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### `fn_descuento_inventario()`
Actualiza inventario automáticamente al insertar en venta_detalle.

```sql
CREATE FUNCTION fn_descuento_inventario()
RETURNS TRIGGER AS $$
DECLARE
    stock_actual INT;
BEGIN
    SELECT stock INTO stock_actual
    FROM inventario
    WHERE variante_id = NEW.variante_id
    FOR UPDATE;

    IF stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Inventario insuficiente';
    END IF;

    UPDATE inventario
    SET stock = stock - NEW.cantidad,
        actualizado_en = NOW()
    WHERE variante_id = NEW.variante_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### `fn_recalcular_totales_venta()`
Recalcula totales de venta cuando cambia venta_detalle.

```sql
CREATE FUNCTION fn_recalcular_totales_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ventas
    SET subtotal = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM venta_detalle
        WHERE venta_id = COALESCE(NEW.venta_id, OLD.venta_id)
    ),
    total = subtotal - descuento + impuesto
    WHERE id = COALESCE(NEW.venta_id, OLD.venta_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### `fn_actualizar_cuenta_pago()`
Actualiza saldo de cuenta por cobrar al registrar pago.

```sql
CREATE FUNCTION fn_actualizar_cuenta_pago()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cuentas_por_cobrar
    SET monto_pagado = monto_pagado + NEW.monto,
        saldo_pendiente = monto_total - (monto_pagado + NEW.monto),
        estado = CASE
            WHEN (monto_pagado + NEW.monto) >= monto_total THEN 'PAGADA'
            ELSE 'PENDIENTE'
        END
    WHERE id = NEW.cuenta_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Triggers

```sql
-- Trigger para actualizar inventario
CREATE TRIGGER trigger_descuento_inventario
AFTER INSERT ON venta_detalle
FOR EACH ROW
EXECUTE FUNCTION fn_descuento_inventario();

-- Trigger para recalcular totales
CREATE TRIGGER trigger_recalcular_totales
AFTER INSERT OR UPDATE OR DELETE ON venta_detalle
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_totales_venta();

-- Trigger para actualizar cuenta al pagar
CREATE TRIGGER trigger_actualizar_cuenta_pago
AFTER INSERT ON pagos_cuenta
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_cuenta_pago();
```

---

## 🔄 Migraciones

### Aplicar Migraciones

```bash
# Migración 001: Campos adicionales en ventas
psql -U postgres -d almacen_db -f migrations/001_add_venta_fields.sql

# Migración 002: Mejoras en precios acumulados
psql -U postgres -d almacen_db -f migrations/002_mejora_precios_acumulado.sql

# Migración 003: Módulo de cobranza
psql -U postgres -d almacen_db -f migrations/003_modulo_cobranza.sql

# Migración 004: Alineación productos-facturas
psql -U postgres -d almacen_db -f migrations/004_alinear_productos_facturas.sql
```

### Verificar Migraciones Aplicadas

```sql
-- Ver estructura de tabla ventas (debe tener campos de migración 001)
\d ventas

-- Verificar que existen tablas de cobranza (migración 003)
\dt *cobranza*
\dt *pago*
```

### Rollback (Solo en Desarrollo)

⚠️ **ADVERTENCIA**: No hacer rollback en producción sin backup.

```sql
-- Rollback migración 001
ALTER TABLE ventas DROP COLUMN IF EXISTS subtotal;
ALTER TABLE ventas DROP COLUMN IF EXISTS descuento;
ALTER TABLE ventas DROP COLUMN IF EXISTS impuesto;
ALTER TABLE ventas DROP COLUMN IF EXISTS estado;
ALTER TABLE ventas DROP COLUMN IF EXISTS completed_at;
```

---

## 📈 Índices y Performance

### Índices Existentes

```sql
-- Índices en ventas
CREATE INDEX idx_ventas_fecha ON ventas(creada_en);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);

-- Índices en productos
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria);

-- Índices en variantes
CREATE INDEX idx_variantes_codigo_barras ON variantes_producto(codigo_barras);
CREATE INDEX idx_variantes_producto ON variantes_producto(producto_id);

-- Índices en inventario
CREATE INDEX idx_inventario_stock ON inventario(stock);
CREATE INDEX idx_inventario_variante ON inventario(variante_id);
```

### Consultas Optimizadas

```sql
-- Ventas del día (usa índice en creada_en)
EXPLAIN ANALYZE
SELECT * FROM ventas 
WHERE DATE(creada_en) = CURRENT_DATE;

-- Productos con stock bajo (usa índice en stock)
EXPLAIN ANALYZE
SELECT * FROM inventario 
WHERE stock < stock_minimo;
```

---

## 💾 Backup y Restauración

### Backup Completo

```bash
# Backup de esquema y datos
pg_dump -U postgres almacen_db > backup_completo_$(date +%Y%m%d).sql

# Backup solo esquema
pg_dump -U postgres -s almacen_db > backup_esquema_$(date +%Y%m%d).sql

# Backup solo datos
pg_dump -U postgres -a almacen_db > backup_datos_$(date +%Y%m%d).sql

# Backup comprimido
pg_dump -U postgres almacen_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restauración

```bash
# Restaurar backup completo
psql -U postgres -d almacen_db < backup_completo_20260121.sql

# Restaurar desde comprimido
gunzip < backup_20260121.sql.gz | psql -U postgres -d almacen_db

# Restaurar en nueva base de datos
createdb -U postgres almacen_db_restore
psql -U postgres -d almacen_db_restore < backup_completo_20260121.sql
```

### Backup Automático (Cron)

```bash
# Agregar a crontab (Linux/Mac)
0 2 * * * pg_dump -U postgres almacen_db | gzip > /backups/erp_$(date +\%Y\%m\%d).sql.gz
```

---

## 📊 Diagramas

### Diagrama ER

Ver archivo `docs/diagrama_er_bd.mmd` para diagrama completo en formato Mermaid.

### Generar Diagrama Visual

```bash
# Opción 1: Usar script incluido
python scripts/limpiar_esquema_para_dbdiagram.py

# Opción 2: Con DBeaver
# Conectar a almacen_db → Esquema public → Clic derecho → View Diagram

# Opción 3: Con dbdiagram.io
# Importar docs/esquema_para_dbdiagram_limpio.sql
```

---

## 🔍 Consultas Útiles

### Estadísticas Generales

```sql
-- Total de productos
SELECT COUNT(*) FROM productos WHERE activo = true;

-- Total de variantes
SELECT COUNT(*) FROM variantes_producto WHERE activo = true;

-- Ventas del mes
SELECT COUNT(*), SUM(total) 
FROM ventas 
WHERE DATE_TRUNC('month', creada_en) = DATE_TRUNC('month', CURRENT_DATE);

-- Stock total
SELECT SUM(stock) FROM inventario;
```

### Verificación de Integridad

```sql
-- Ventas sin detalles
SELECT v.id FROM ventas v
LEFT JOIN venta_detalle vd ON v.id = vd.venta_id
WHERE vd.id IS NULL;

-- Variantes sin inventario
SELECT v.id, v.sku FROM variantes_producto v
LEFT JOIN inventario i ON v.id = i.variante_id
WHERE i.id IS NULL;
```

---

## 📚 Referencias

- **Esquema Base**: `docs/almacen_db.sql`
- **Migraciones**: Carpeta `migrations/`
- **Diagrama ER**: `docs/diagrama_er_bd.mmd`
- **Documentación PostgreSQL**: https://www.postgresql.org/docs/

---

**Última actualización**: Enero 2026
