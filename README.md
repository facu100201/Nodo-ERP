# Nodo ERP

<p align="center">
  <a href="https://github.com/facu100201/Nodo-ERP/actions/workflows/ci.yml">
    <img src="https://github.com/facu100201/Nodo-ERP/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Anthropic-D97706?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" />
</p>

<p align="center">
  Sistema ERP y POS completo para PyMEs mexicanas.<br/>
  9 módulos de negocio · Clean Architecture · BI integrado · Asistente con IA · Un solo comando Docker.
</p>

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: ventas del día, stock crítico, cobranza pendiente |
| **Punto de Venta** | POS con lector de código de barras, cálculo de cambio y tickets |
| **Almacén** | Catálogo con variantes, control de stock y carga masiva por CSV |
| **RRHH** | Empleados, nómina y períodos de pago |
| **Cobranza** | Ventas a crédito, cuentas por cobrar y abonos |
| **Facturación** | Generación de CFDI (borrador → timbrado) |
| **Reportes** | Ventas e inventario exportables a CSV |
| **Analítica** | Dashboards interactivos embebidos con Metabase |
| **Asistente IA** | Chat con contexto del ERP usando Claude (Anthropic) |

---

## Stack

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Python 3.11 · FastAPI 0.109 · SQLAlchemy 2.0 · Alembic · JWT · Anthropic SDK |
| **Frontend** | React 19 · React Router 7 · Zustand · Recharts · Framer Motion · Bootstrap 5 |
| **Base de datos** | PostgreSQL 15 |
| **Infraestructura** | Docker Compose (5 servicios) · Metabase |
| **CI** | GitHub Actions — pytest + PostgreSQL real + npm build |

---

## Arquitectura

El backend implementa **Clean Architecture** en tres capas desacopladas:

```
React 19  ──HTTP/REST──►  FastAPI
                          ├── api/v1/        (rutas + validación Pydantic)
                          ├── services/      (lógica de negocio)
                          └── repositories/  (acceso a datos SQLAlchemy)
                                    │
                             PostgreSQL 15

React 19  ──embed──►  Metabase  (BI & dashboards)
```

---

## Inicio rápido

**Requisitos:** Docker Desktop + Git

```bash
# 1. Clonar (en Windows deshabilitar CRLF primero)
git config --global core.autocrlf false
git clone https://github.com/facu100201/Nodo-ERP.git
cd Nodo-ERP

# 2. Variables de entorno
cp backend/.env.example backend/.env
# Opcional: agrega ANTHROPIC_API_KEY en backend/.env para el asistente IA

# 3. Levantar
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Espera hasta ver `SEED COMPLETO EXITOSO` en los logs del backend:

```bash
docker logs pos_backend -f
```

### Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend ERP | http://localhost:3000 | `admin@local.com` / `admin123` |
| API Docs (Swagger) | http://localhost:8000/docs | — |
| Metabase BI | http://localhost:3001 | — |

> Metabase tarda 3–5 minutos en su primer arranque.

---

## Tests

```bash
# Requiere PostgreSQL corriendo (o usa el entorno Docker)
cd backend
pip install -r requirements.txt pytest httpx
pytest tests/ -v
```

Los tests cubren: health check, raíz de la API, login exitoso, credenciales inválidas y autenticación de endpoints protegidos.

---

## Estructura

```
Nodo-ERP/
├── .github/workflows/ci.yml   # GitHub Actions CI
├── backend/
│   ├── app/
│   │   ├── api/v1/            # 12 routers REST
│   │   ├── services/          # 9 servicios de negocio
│   │   ├── repositories/      # 5 repositorios (patrón Repository)
│   │   ├── models/            # 7 modelos SQLAlchemy
│   │   ├── schemas/           # DTOs Pydantic
│   │   └── core/              # Config, seguridad, base de datos
│   └── tests/                 # Suite de pruebas con pytest
├── frontend/src/
│   ├── pages/                 # 13 páginas (Dashboard, POS, Almacén…)
│   ├── components/            # Componentes reutilizables
│   └── hooks/                 # Custom hooks
├── docker/docker-compose.yml  # Orquestación de 5 servicios
├── docs/                      # Documentación técnica (16 archivos)
└── migrations/                # Migraciones SQL
```

---

## Operaciones

```bash
# Actualizar
git pull origin main && docker compose -f docker/docker-compose.yml up -d

# Reconstrucción completa (BD limpia)
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d

# Consola PostgreSQL
docker exec -it pos_db psql -U postgres -d almacen_db
```

### Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| `pos_db exited (126)` | `chmod +x docs/00_create_metabase_db.sh` y reiniciar |
| `bad interpreter: ^M` | `git config core.autocrlf false` + recheckout del script |
| `metabase_db does not exist` | `docker compose down -v && up -d` |
| `pos_metabase is unhealthy` | Esperar 3–5 min y repetir `up -d` |

Ver [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) para diagnóstico detallado.

---

## Licencia

[MIT](LICENSE) © 2025 Fernando Acuña Martínez
