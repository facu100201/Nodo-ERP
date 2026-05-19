# Nodo ERP

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Anthropic-D97706?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<p align="center">
  Sistema ERP completo para PyMEs — ventas, inventario, nómina, cobranza, facturación CFDI y analítica con BI integrado.<br/>
  Levanta todo el stack en 2 comandos gracias a Docker Compose.
</p>

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: ventas del día, stock crítico, cobranza pendiente |
| **Punto de Venta** | POS con lector de código de barras, tickets y cambio automático |
| **Almacén** | Catálogo de productos con variantes, control de stock y carga masiva por CSV |
| **RRHH** | Gestión de empleados, nómina y períodos de pago |
| **Cobranza** | Ventas a crédito, cuentas por cobrar y registro de abonos |
| **Facturación** | Generación de CFDI con flujo borrador → timbrado |
| **Reportes** | Reportes de ventas e inventario exportables a CSV |
| **Analítica** | Dashboards interactivos embebidos con Metabase |
| **Asistente IA** | Chat con contexto del ERP usando Claude (Anthropic) |

---

## Stack tecnológico

### Backend
- **FastAPI 0.109** — API REST async con documentación automática (OpenAPI)
- **SQLAlchemy 2.0** — ORM con patrón Repository
- **PostgreSQL 15** — Base de datos relacional
- **Alembic** — Migraciones de esquema
- **JWT** — Autenticación con `python-jose` + `passlib`
- **Anthropic SDK** — Integración con Claude para el asistente IA

### Frontend
- **React 19** — UI con React Router 7
- **Zustand** — Estado global ligero
- **Recharts** — Gráficas y visualizaciones
- **Framer Motion** — Animaciones
- **Bootstrap 5** — Componentes UI

### Infraestructura
- **Docker Compose** — Orquestación de 5 servicios: `db`, `backend`, `frontend`, `metabase`, `metabase-setup`
- **Metabase** — BI y dashboards embebidos

---

## Arquitectura

```
┌─────────────┐     HTTP/REST      ┌──────────────────────────────────────┐
│  React 19   │ ◄────────────────► │         FastAPI (Python 3.11)        │
│  Frontend   │                    │                                      │
│  :3000      │                    │  api/v1/    →  services/  →  repos/  │
└─────────────┘                    │  (routes)      (lógica)    (BD)      │
                                   └──────────────┬───────────────────────┘
                                                  │
                                    ┌─────────────▼──────────┐
                                    │    PostgreSQL 15        │
                                    │    :5432                │
                                    └─────────────────────────┘

┌─────────────┐     Embed          ┌──────────────────────────┐
│  React 19   │ ◄────────────────► │  Metabase  :3001         │
│  Analítica  │                    │  (BI & Dashboards)       │
└─────────────┘                    └──────────────────────────┘
```

El backend sigue **Clean Architecture** en tres capas:
- `api/v1/` — Rutas y serialización (Pydantic schemas)
- `services/` — Lógica de negocio desacoplada de la BD
- `repositories/` — Acceso a datos con SQLAlchemy

---

## Inicio rápido

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git

### 1. Clonar y configurar

```bash
# En Windows: deshabilitar conversión CRLF antes de clonar
git config --global core.autocrlf false

git clone https://github.com/facu100201/Nodo-ERP.git
cd Nodo-ERP
```

### 2. Variables de entorno

```bash
cp backend/.env.example backend/.env
```

El `.env` ya tiene valores funcionales para desarrollo local. Para usar el **Asistente IA** agrega tu `ANTHROPIC_API_KEY` en ese archivo.

### 3. Levantar el stack

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Espera hasta ver en los logs del backend:

```bash
docker logs pos_backend -f
# Espera: "SEED COMPLETO EXITOSO" y "Application startup complete ✓"
```

> Metabase tarda 3–5 minutos en su primer arranque — es normal.

### 4. Acceder al sistema

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend ERP | http://localhost:3000 | `admin@local.com` / `admin123` |
| API Docs (Swagger) | http://localhost:8000/docs | — |
| Metabase BI | http://localhost:3001 | — |

---

## Estructura del proyecto

```
Nodo-ERP/
├── backend/
│   └── app/
│       ├── api/v1/         # 12 routers (auth, pos, ventas, rrhh, ...)
│       ├── services/       # 9 servicios de negocio
│       ├── repositories/   # 5 repositorios de acceso a datos
│       ├── models/         # 7 modelos SQLAlchemy
│       ├── schemas/        # DTOs Pydantic
│       └── core/           # Config, seguridad, base de datos
├── frontend/
│   └── src/
│       ├── pages/          # 13 páginas (Dashboard, POS, Almacén, ...)
│       ├── components/     # Componentes reutilizables
│       ├── services/       # Clientes HTTP
│       └── hooks/          # Custom hooks
├── docker/
│   └── docker-compose.yml  # Orquestación de 5 servicios
├── docs/                   # Documentación técnica extensa
├── migrations/             # Migraciones SQL
└── scripts/                # Utilidades de administración
```

---

## Operaciones comunes

### Actualizar a la versión más reciente

```bash
git pull origin main
docker compose -f docker/docker-compose.yml up -d
```

### Reconstrucción completa (BD limpia)

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
```

### Acceder directamente a la BD

```bash
docker exec -it pos_db psql -U postgres -d almacen_db
```

---

## Solución de problemas

| Síntoma | Solución rápida |
|---------|-----------------|
| `pos_db exited (126)` | `chmod +x docs/00_create_metabase_db.sh` y reiniciar |
| `/bin/bash^M: bad interpreter` | Configurar `core.autocrlf false` y recheckout del script |
| `metabase_db does not exist` | `docker compose down -v && up -d` |
| `pos_metabase is unhealthy` | Esperar 3–5 min y repetir `up -d` |

Ver [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) para diagnóstico detallado.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diseño del sistema y decisiones técnicas |
| [API.md](docs/API.md) | Referencia de endpoints REST |
| [DATABASE.md](docs/DATABASE.md) | Esquema y migraciones |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Guía de contribución y entorno local |
| [SECURITY.md](docs/SECURITY.md) | Modelo de autenticación y permisos |
| [METABASE.md](docs/METABASE.md) | Configuración de dashboards BI |

---

## Licencia

[MIT](LICENSE) © 2025 Fernando Acuña Martínez
