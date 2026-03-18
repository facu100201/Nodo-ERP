# 📦 Guía de Instalación Completa

Esta guía proporciona instrucciones detalladas para instalar y configurar el Sistema ERP/POS Nodo en diferentes entornos.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación con Docker (Recomendado)](#instalación-con-docker-recomendado)
- [Instalación sin Docker](#instalación-sin-docker)
- [Configuración Inicial](#configuración-inicial)
- [Aplicar Migraciones](#aplicar-migraciones)
- [Verificación](#verificación)
- [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

### Software Necesario

- **Git** (versión 2.30+) - [Descargar](https://git-scm.com/downloads)
- **Docker Desktop** (versión 20.10+) - [Descargar](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (incluido con Docker Desktop)

### Clonar el Repositorio

```bash
# Clonar desde Git
git clone <url-del-repositorio>
cd ERP

# Verificar que se clonó correctamente
git status
ls -la
```

**Nota**: Si encuentras errores al clonar, consulta [docs/TROUBLESHOOTING.md#clonación-desde-git](TROUBLESHOOTING.md#clonación-desde-git) para soluciones detalladas.

### Alternativa sin Docker

- **Python 3.11+** - [Descargar](https://www.python.org/downloads/)
- **PostgreSQL 15+** - [Descargar](https://www.postgresql.org/download/)
- **Node.js 16+** (solo para frontend) - [Descargar](https://nodejs.org/)

---

## 🐳 Instalación con Docker (Recomendado)

Esta es la forma más rápida y confiable de instalar el sistema.

### Paso 1: Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd ERP
```

### Paso 2: Configurar Variables de Entorno

**Opción A: Usar archivo de ejemplo (Recomendado)**

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones
# En Windows: notepad .env
# En Linux/Mac: nano .env o vim .env
```

**Opción B: Crear manualmente**

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Base de Datos
DATABASE_URL=postgresql://postgres:postgres@db:5432/almacen_db
DATABASE_NAME=almacen_db

# JWT
SECRET_KEY=tu-clave-secreta-super-segura-cambiar-en-produccion
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
DEBUG=True
API_V1_PREFIX=/api/v1

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

**⚠️ Importante**: 
- El archivo `.env` NO se incluye en el repositorio (está en `.gitignore`)
- Cada desarrollador debe crear su propio `.env` desde `.env.example`
- Nunca compartas tu archivo `.env` con credenciales reales

### Paso 3: Iniciar Servicios

```bash
# Iniciar todos los servicios (base de datos, backend, frontend)
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend
```

### Paso 4: Aplicar Migraciones

```bash
# Conectar al contenedor de base de datos
docker-compose exec db psql -U postgres -d almacen_db

# Dentro de psql, aplicar migraciones:
\i /migrations/001_add_venta_fields.sql
\i /migrations/002_mejora_precios_acumulado.sql
\i /migrations/003_modulo_cobranza.sql
\i /migrations/004_alinear_productos_facturas.sql

# O desde fuera del contenedor:
docker-compose exec db psql -U postgres -d almacen_db -f /migrations/001_add_venta_fields.sql
```

**Nota**: Si las migraciones están en tu sistema local, cópialas primero:

```bash
docker cp migrations/001_add_venta_fields.sql pos_db:/tmp/
docker-compose exec db psql -U postgres -d almacen_db -f /tmp/001_add_venta_fields.sql
```

### Paso 5: Verificar Instalación

```bash
# Health check del backend
curl http://localhost:8000/health

# Verificar que el frontend responde
curl http://localhost:3000
```

**Acceso**:
- Backend API: `http://localhost:8000`
- Documentación Swagger: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`
- Credenciales por defecto: `admin` / `admin123`

---

## 💻 Instalación sin Docker

### Backend

#### Paso 1: Instalar PostgreSQL

**Windows**:
1. Descargar desde [postgresql.org](https://www.postgresql.org/download/windows/)
2. Instalar con configuración por defecto
3. Recordar la contraseña del usuario `postgres`

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS**:
```bash
brew install postgresql
brew services start postgresql
```

#### Paso 2: Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE almacen_db;

# Crear usuario (opcional)
CREATE USER erp_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE almacen_db TO erp_user;

# Salir
\q
```

#### Paso 3: Configurar Python

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Si tienes problemas en Windows, usa:
pip install -r backend/requirements_windows.txt
```

#### Paso 4: Configurar Variables de Entorno

**Opción A: Usar archivo de ejemplo (Recomendado)**

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones locales
```

**Opción B: Crear manualmente**

Crea un archivo `.env` en la raíz con:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/almacen_db
DATABASE_NAME=almacen_db
SECRET_KEY=tu-clave-secreta-super-segura
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
```

**Nota**: Asegúrate de ajustar `DATABASE_URL` con tus credenciales reales de PostgreSQL.

#### Paso 5: Inicializar Base de Datos

```bash
# Aplicar esquema base
psql -U postgres -d almacen_db -f docs/almacen_db.sql

# Aplicar migraciones
psql -U postgres -d almacen_db -f migrations/001_add_venta_fields.sql
psql -U postgres -d almacen_db -f migrations/002_mejora_precios_acumulado.sql
psql -U postgres -d almacen_db -f migrations/003_modulo_cobranza.sql
psql -U postgres -d almacen_db -f migrations/004_alinear_productos_facturas.sql
```

#### Paso 6: Iniciar Backend

```bash
# Desde la raíz del proyecto
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# O desde la raíz:
uvicorn backend.app.main:app --reload
```

### Frontend

#### Paso 1: Instalar Node.js

Descargar e instalar desde [nodejs.org](https://nodejs.org/)

#### Paso 2: Instalar Dependencias

```bash
cd frontend
npm install
```

#### Paso 3: Configurar Variables de Entorno

**Opción A: Usar archivo de ejemplo (Recomendado)**

```bash
cd frontend
cp .env.example .env
# El archivo .env.example ya tiene la configuración por defecto
```

**Opción B: Crear manualmente**

Crea `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8000
```

**Nota**: Si el backend corre en otro puerto o dominio, ajusta `REACT_APP_API_URL` accordingly.

#### Paso 4: Iniciar Frontend

```bash
npm start
```

El frontend estará disponible en `http://localhost:3000`

---

## ⚙️ Configuración Inicial

### Crear Usuario Administrador

Si no existe un usuario admin, créalo ejecutando:

```sql
-- Conectar a la base de datos
psql -U postgres -d almacen_db

-- Insertar usuario admin
-- Password: admin123 (hash bcrypt)
INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo, creado_en)
VALUES (
    'admin',
    'admin@erp.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVhC6U7QK',
    1, -- ID del rol ADMIN
    true,
    NOW()
);
```

### Configurar Puntos de Venta

```sql
INSERT INTO puntos_venta (codigo, descripcion, activo)
VALUES 
    ('CAJA01', 'Caja Principal', true),
    ('CAJA02', 'Caja Secundaria', true);
```

---

## 🔄 Aplicar Migraciones

### Método 1: Manual (Recomendado para desarrollo)

```bash
# Conectar a PostgreSQL
psql -U postgres -d almacen_db

# Aplicar cada migración
\i migrations/001_add_venta_fields.sql
\i migrations/002_mejora_precios_acumulado.sql
\i migrations/003_modulo_cobranza.sql
\i migrations/004_alinear_productos_facturas.sql

# Verificar
\d ventas
```

### Método 2: Script Python

```bash
python migrations/apply_migrations.py
```

### Método 3: Con Docker

```bash
# Copiar migraciones al contenedor
docker cp migrations/ pos_db:/tmp/migrations/

# Ejecutar migraciones
docker-compose exec db psql -U postgres -d almacen_db -f /tmp/migrations/001_add_venta_fields.sql
```

---

## ✅ Verificación

### Verificar Backend

```bash
# Health check
curl http://localhost:8000/health

# Debe responder:
# {"status":"healthy","timestamp":"2026-01-21T10:00:00"}
```

### Verificar Base de Datos

```bash
# Usar script de verificación
python scripts/verificar_bd.py

# O manualmente
psql -U postgres -d almacen_db -c "\dt"
```

### Verificar Frontend

Abrir `http://localhost:3000` en el navegador. Debe mostrar la pantalla de login.

### Verificar Instalación Completa

```bash
python scripts/verificar_implementacion.py
```

---

## 🐛 Solución de Problemas

### Error: "port 8000 already in use"

**Windows**:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Linux/Mac**:
```bash
lsof -ti:8000 | xargs kill -9
```

### Error: "database does not exist"

```bash
# Crear base de datos
createdb -U postgres almacen_db

# O con psql
psql -U postgres -c "CREATE DATABASE almacen_db;"
```

### Error: "no password supplied"

Verificar que el archivo `.env` tiene las credenciales correctas:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/almacen_db
```

### Error: "Module not found"

```bash
# Reinstalar dependencias
pip install -r requirements.txt

# O con Docker
docker-compose up -d --build
```

### Error: "Connection refused" en Docker

```bash
# Verificar que los servicios están corriendo
docker-compose ps

# Reiniciar servicios
docker-compose restart

# Ver logs para diagnosticar
docker-compose logs backend
docker-compose logs db
```

### Error: Frontend no se conecta al backend

1. Verificar que `REACT_APP_API_URL` en `frontend/.env` apunta al backend correcto
2. Verificar CORS en el backend (debe permitir `http://localhost:3000`)
3. Verificar que el backend está corriendo en el puerto correcto

### Problemas con dependencias en Windows

Si tienes errores de compilación en Windows:

```bash
# Usar el script de instalación para Windows
.\scripts\instalar_dependencias_windows.ps1

# O instalar manualmente con wheels precompilados
pip install -r backend/requirements_windows.txt
```

---

## 📚 Próximos Pasos

Después de la instalación exitosa:

1. ✅ Revisar [docs/DEVELOPMENT.md](DEVELOPMENT.md) para guía de desarrollo
2. ✅ Consultar [docs/API.md](API.md) para documentación de la API
3. ✅ Ver [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) para problemas comunes
4. ✅ Explorar [docs/QUICK_REFERENCE.md](QUICK_REFERENCE.md) para comandos rápidos

---

**Última actualización**: Enero 2026
