# Sistema ERP Nodo

Sistema integral de ERP y Punto de Venta con módulos de ventas, inventario, RRHH, cobranza, facturación y analítica.

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- [Git](https://git-scm.com/)

---

## Instalación y primer arranque

### 1. Configurar Git (solo Windows — hacer una sola vez)

```bash
git config --global core.autocrlf false
```

> Evita que Git convierta los scripts `.sh` a CRLF en Windows, lo que causaría errores dentro de los contenedores Linux.

### 2. Clonar el repositorio

```bash
git clone https://github.com/ERP-nodo/ERP.git
cd ERP
```

### 3. Dar permisos al script de inicialización de BD

```bash
chmod +x docs/00_create_metabase_db.sh
```

### 4. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

El archivo `.env` ya tiene valores funcionales para desarrollo local. No es necesario editarlo.

### 5. Construir y levantar los contenedores

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

### 6. Verificar que todo esté corriendo

```bash
docker compose -f docker/docker-compose.yml ps
```

Deberías ver 5 contenedores: `pos_db`, `pos_backend`, `pos_frontend`, `pos_metabase`, `pos_metabase_setup`.

### 7. Esperar la inicialización completa

El backend ejecuta las seeds automáticamente al iniciar. Monitorea con:

```bash
docker logs pos_backend -f
```

Espera hasta ver:
```
SEED COMPLETO EXITOSO
Application startup complete ✓
```

> **Metabase tarda 3–5 minutos** en iniciar por primera vez (corre migraciones internas). Es normal que `pos_metabase_setup` tarde en completarse.

---

## Acceso al sistema

| Servicio    | URL                        |
|-------------|----------------------------|
| Frontend    | http://localhost:3000      |
| Backend API | http://localhost:8000/docs |
| Metabase    | http://localhost:3001      |

### Credenciales por defecto

| Usuario              | Contraseña  | Rol   |
|----------------------|-------------|-------|
| admin@local.com      | admin123    | Admin |

---

## Actualizar a la versión más reciente

Si ya tienes el proyecto corriendo y quieres bajar los últimos cambios:

```bash
git pull origin main
docker compose -f docker/docker-compose.yml up -d
```

Docker Compose solo reinicia los contenedores que cambiaron.

Si los cambios incluyen modificaciones al backend (modelos, servicios, seeds), fuerza la recreación del contenedor para que apliquen:

```bash
git pull origin main
docker compose -f docker/docker-compose.yml up -d --force-recreate backend
```

---

## Reconstrucción completa (base de datos limpia)

Úsalo cuando quieras partir desde cero o haya cambios en el esquema de BD:

```bash
# Detener todo y eliminar volúmenes
docker compose -f docker/docker-compose.yml down -v

# Reconstruir imágenes sin caché
docker compose -f docker/docker-compose.yml build --no-cache

# Levantar todo de nuevo
docker compose -f docker/docker-compose.yml up -d
```

---

## Solución de problemas comunes

### `pos_db exited (126)` — Error de permisos en el script de BD

```bash
chmod +x docs/00_create_metabase_db.sh
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d
```

### `/bin/bash^M: bad interpreter` — Scripts con saltos de línea Windows (CRLF)

```bash
git config --global core.autocrlf false
git rm --cached docs/00_create_metabase_db.sh
git checkout docs/00_create_metabase_db.sh
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d
```

### `metabase_db does not exist` — BD inicializada a medias

El volumen quedó incompleto de un arranque fallido anterior:

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d
```

### `pos_metabase is unhealthy` — Metabase aún no terminó de iniciar

Espera 3–5 minutos y vuelve a ejecutar:

```bash
docker compose -f docker/docker-compose.yml up -d
```

### Ver logs de un contenedor específico

```bash
docker logs pos_backend --tail 50
docker logs pos_metabase --tail 50
docker logs pos_db --tail 50
```

### Conectarse directamente a la base de datos

```bash
docker exec -it pos_db psql -U postgres -d almacen_db
```

---

## Stack tecnológico

- **Backend:** FastAPI + Python 3.11 + SQLAlchemy 2.0
- **Base de datos:** PostgreSQL 15
- **Frontend:** React 18
- **Analítica:** Metabase (dashboards embebidos)
- **Infraestructura:** Docker Compose

---

## Módulos

| Módulo        | Descripción                                              |
|---------------|----------------------------------------------------------|
| Dashboard     | KPIs generales del negocio                               |
| Punto de Venta| Ventas con lector de código de barras                    |
| Almacén       | Productos, variantes, stock, carga masiva por CSV        |
| RRHH          | Empleados, nómina, periodos de pago                      |
| Cobranza      | Ventas a crédito, cuentas por cobrar, abonos             |
| Facturación   | Facturas CFDI (borrador/timbrado)                        |
| Reportes      | Ventas, inventario, exportación a CSV                    |
| Analítica     | Dashboards interactivos con Metabase                     |
| Asistente IA  | Chat con contexto del ERP                                |
