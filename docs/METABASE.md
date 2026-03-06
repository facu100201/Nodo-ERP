# Metabase - Plataforma de Analitica

Metabase es la herramienta de Business Intelligence integrada en el ERP YOMYOM. Permite crear dashboards interactivos, visualizaciones y reportes avanzados directamente desde la base de datos PostgreSQL.

## Inicio Rapido

### 1. Levantar los servicios

```bash
docker compose -f docker/docker-compose.yml up -d
```

Metabase estara disponible en: **http://localhost:3001**

### 2. Configuracion automatica

Ejecutar el script de setup que configura todo automaticamente:

```bash
# Desde la raiz del proyecto
bash scripts/setup-metabase.sh
```

Esto crea:
- Usuario admin de Metabase
- Conexion a la base de datos `almacen_db`
- 12 visualizaciones predefinidas
- 3 dashboards (Ventas, Inventario, General)
- Links publicos para embeber en el frontend

### 3. Acceder desde el ERP

Navegar a la seccion **Analitica** en el sidebar del ERP (http://localhost:3000/analitica).

## Credenciales por Defecto

| Campo    | Valor                    |
|----------|--------------------------|
| URL      | http://localhost:3001    |
| Email    | admin@erp-yomyom.com    |
| Password | Metabase123!             |

> Cambiar estas credenciales en produccion.

## Dashboards Incluidos

### Ventas
- Ventas totales del mes (KPI)
- Ventas por metodo de pago (pie chart)
- Ventas por hora del dia (barras)
- Ventas por dia - ultimos 30 dias (linea)
- Top 10 productos mas vendidos (barras)
- Ventas por cajero (barras)

### Inventario
- Valor total del inventario (KPI)
- Productos con stock bajo < 10 (tabla)
- Movimientos de inventario - ultimos 7 dias (barras)
- Stock actual por producto (tabla completa)

### General
- Ventas por punto de venta (barras)
- Facturas emitidas por mes (barras)

## Crear Nuevos Dashboards

1. Acceder a Metabase: http://localhost:3001
2. Login con las credenciales de admin
3. Click en **+ New** > **Dashboard**
4. Agregar preguntas existentes o crear nuevas con el query builder
5. Para embeber en el ERP:
   - Ir a **Sharing** > **Enable sharing**
   - Copiar el UUID del dashboard publico
   - Agregar la variable de entorno en `frontend/.env`:
     ```
     REACT_APP_METABASE_DASHBOARD_CUSTOM=<uuid>
     ```

## Arquitectura

```
┌──────────────────────────────────────────┐
│  Frontend React (puerto 3000)            │
│  ┌────────────────────────────────┐      │
│  │  Pagina /analitica             │      │
│  │  ┌──────────────────────────┐  │      │
│  │  │  iframe → Metabase       │  │      │
│  │  │  (public dashboard)      │  │      │
│  │  └──────────────────────────┘  │      │
│  └────────────────────────────────┘      │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Metabase (puerto 3001)                  │
│  - Dashboards publicos (sin auth)        │
│  - Panel admin (con auth)                │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  PostgreSQL (puerto 5432)                │
│  Base de datos: almacen_db               │
│  - ventas, venta_detalle                 │
│  - productos, variantes_producto         │
│  - inventario, movimientos_inventario    │
│  - facturas, usuarios                    │
└──────────────────────────────────────────┘
```

## Variables de Entorno

### Docker Compose (servicio metabase)

| Variable          | Valor por defecto     | Descripcion                     |
|-------------------|-----------------------|---------------------------------|
| MB_DB_FILE        | /metabase-data/metabase.db | Ruta BD interna de Metabase |
| MB_JETTY_PORT     | 3000                  | Puerto interno del contenedor   |
| JAVA_TIMEZONE     | America/Mexico_City   | Zona horaria                    |

### Frontend

| Variable                              | Descripcion                          |
|---------------------------------------|--------------------------------------|
| REACT_APP_METABASE_URL                | URL de Metabase (default: http://localhost:3001) |
| REACT_APP_METABASE_DASHBOARD_VENTAS   | UUID del dashboard publico de ventas |
| REACT_APP_METABASE_DASHBOARD_INVENTARIO | UUID del dashboard de inventario   |
| REACT_APP_METABASE_DASHBOARD_GENERAL  | UUID del dashboard general           |

### Script de setup

| Variable          | Default                | Descripcion                     |
|-------------------|------------------------|---------------------------------|
| METABASE_URL      | http://localhost:3001  | URL de Metabase                 |
| MB_ADMIN_EMAIL    | admin@erp-yomyom.com  | Email del admin                 |
| MB_ADMIN_PASSWORD | Metabase123!           | Password del admin              |
| DB_HOST           | localhost              | Host de PostgreSQL              |
| DB_PORT           | 5432                   | Puerto de PostgreSQL            |
| DB_NAME           | almacen_db             | Nombre de la base de datos      |
| DB_USER           | postgres               | Usuario de PostgreSQL           |
| DB_PASSWORD       | postgres               | Password de PostgreSQL          |

## Uso con Docker (red interna)

Cuando se ejecuta el script desde dentro de la red Docker, usar el hostname del servicio:

```bash
DB_HOST=db bash scripts/setup-metabase.sh
```

## Troubleshooting

### Metabase no inicia
```bash
# Ver logs del contenedor
docker compose -f docker/docker-compose.yml logs metabase

# Reiniciar el servicio
docker compose -f docker/docker-compose.yml restart metabase
```

### Metabase tarda en iniciar
Es normal que Metabase tarde 1-2 minutos en su primer inicio. El healthcheck tiene `start_period: 120s` para esto.

### Error "No se encontro la base de datos"
Verificar que el servicio `db` este corriendo y saludable:
```bash
docker compose -f docker/docker-compose.yml ps db
```

### Dashboards no muestran datos
1. Verificar que existan datos de prueba en la BD
2. Sincronizar el esquema: Metabase Admin > Databases > Sync
3. Re-ejecutar el script de setup

### Resetear Metabase completamente
```bash
docker compose -f docker/docker-compose.yml down
docker volume rm docker_metabase_data
docker compose -f docker/docker-compose.yml up -d
# Esperar 2 min, luego re-ejecutar setup
bash scripts/setup-metabase.sh
```

## Produccion

Para produccion, considerar:

1. **Cambiar credenciales**: Usar variables de entorno seguras
2. **Base de datos dedicada**: Usar PostgreSQL en lugar de H2 para la BD interna de Metabase:
   ```yaml
   environment:
     - MB_DB_TYPE=postgres
     - MB_DB_DBNAME=metabase_config
     - MB_DB_PORT=5432
     - MB_DB_USER=metabase
     - MB_DB_PASS=<password-segura>
     - MB_DB_HOST=db
   ```
3. **HTTPS**: Configurar reverse proxy con SSL
4. **Backups**: Incluir el volumen `metabase_data` en la estrategia de backups
