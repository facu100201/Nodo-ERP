# 🔧 Guía de Solución de Problemas

Esta guía cubre problemas comunes y sus soluciones para el Sistema ERP/POS Nodo.

## 📋 Tabla de Contenidos

- [Clonación desde Git](#clonación-desde-git)
- [Problemas de Instalación](#problemas-de-instalación)
- [Problemas de Base de Datos](#problemas-de-base-de-datos)
- [Problemas de Backend](#problemas-de-backend)
- [Problemas de Frontend](#problemas-de-frontend)
- [Problemas de Autenticación](#problemas-de-autenticación)
- [Problemas de Docker](#problemas-de-docker)
- [Problemas de Performance](#problemas-de-performance)
- [Errores Comunes](#errores-comunes)

---

## 🔄 Clonación desde Git

Esta sección cubre problemas comunes al clonar el repositorio desde Git y cómo resolverlos.

### Proceso de Clonación Correcto

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd ERP

# 2. Verificar que todos los archivos se clonaron
git status

# 3. Crear archivo .env desde ejemplo (si existe)
cp .env.example .env
# O crear manualmente según docs/INSTALLATION.md

# 4. Verificar estructura del proyecto
ls -la
# Debe mostrar: backend/, frontend/, docs/, migrations/, scripts/, etc.
```

### Error: "fatal: repository not found" o "Permission denied"

**Síntoma**: No se puede clonar el repositorio.

**Solución**:

1. **Verificar URL del repositorio**:
```bash
# Verificar que la URL es correcta
git remote -v

# Si es privado, asegurar autenticación
# GitHub: usar SSH keys o Personal Access Token
# GitLab: usar SSH keys o Deploy Token
```

2. **Configurar autenticación SSH**:
```bash
# Generar SSH key si no existe
ssh-keygen -t ed25519 -C "tu_email@ejemplo.com"

# Agregar a ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copiar clave pública y agregar en GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
```

3. **Usar HTTPS con token**:
```bash
# Clonar con token en la URL
git clone https://<token>@github.com/usuario/repo.git

# O configurar credenciales
git config --global credential.helper store
```

### Error: "filename too long" en Windows

**Síntoma**: Error al clonar en Windows debido a rutas largas.

**Solución**:

```bash
# Habilitar soporte para rutas largas en Git
git config --global core.longpaths true

# O clonar en una ruta más corta
# Ejemplo: C:\ERP en lugar de C:\Users\Fernando Acuña\OneDrive\Escritorio\ERP
```

**Windows 10/11**: Habilitar rutas largas en el sistema:
```powershell
# Ejecutar como Administrador
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Error: Archivos faltantes después de clonar

**Síntoma**: Algunos archivos no aparecen después de clonar.

**Solución**:

1. **Verificar .gitignore**:
```bash
# Ver qué archivos están siendo ignorados
git check-ignore -v <ruta-del-archivo>

# Archivos comunes que NO se clonan (están en .gitignore):
# - .env (variables de entorno)
# - node_modules/ (dependencias Node.js)
# - venv/ o env/ (entorno virtual Python)
# - __pycache__/ (cache de Python)
# - *.log (archivos de log)
```

2. **Crear archivos faltantes manualmente**:

**Archivo `.env`** (requerido):
```bash
# Crear desde ejemplo si existe
cp .env.example .env

# O crear manualmente según docs/INSTALLATION.md
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/almacen_db
DATABASE_NAME=almacen_db
SECRET_KEY=tu-clave-secreta-super-segura-cambiar-en-produccion
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
API_V1_PREFIX=/api/v1
EOF
```

**Archivo `frontend/.env`**:
```bash
cd frontend
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000
EOF
```

3. **Instalar dependencias**:
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Error: "warning: LF will be replaced by CRLF" o problemas de line endings

**Síntoma**: Advertencias sobre finales de línea al clonar.

**Solución**:

```bash
# Configurar Git para manejar line endings automáticamente
git config --global core.autocrlf true   # Windows
git config --global core.autocrlf input  # Linux/Mac

# O configurar por repositorio
cd ERP
git config core.autocrlf true
```

### Error: "error: invalid path" o caracteres especiales en rutas

**Síntoma**: Error con caracteres especiales en nombres de archivos/carpetas.

**Solución**:

1. **Verificar encoding del sistema**:
```bash
# Windows PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Linux/Mac
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

2. **Configurar Git para UTF-8**:
```bash
git config --global core.quotepath false
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
```

3. **Si el problema persiste**, clonar en una ruta sin caracteres especiales:
```bash
# Evitar rutas con espacios o caracteres especiales
# ❌ Malo: C:\Users\Fernando Acuña\OneDrive\Escritorio\ERP
# ✅ Bueno: C:\ERP o C:\Projects\ERP
```

### Error: "fatal: unable to access" o problemas de proxy

**Síntoma**: No se puede acceder al repositorio debido a proxy/firewall.

**Solución**:

```bash
# Configurar proxy para Git
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy https://proxy.example.com:8080

# Si no hay proxy, deshabilitar
git config --global --unset http.proxy
git config --global --unset https.proxy

# Verificar configuración
git config --global --list | grep proxy
```

### Error: Archivos binarios corruptos o incompletos

**Síntoma**: Archivos grandes o binarios no se clonan correctamente.

**Solución**:

```bash
# Habilitar Git LFS si se usa
git lfs install

# Verificar integridad del repositorio
git fsck

# Re-clonar si es necesario
cd ..
rm -rf ERP
git clone <url-del-repositorio>
```

### Verificación Post-Clonación

Después de clonar, verificar que todo esté correcto:

```bash
# 1. Verificar estructura del proyecto
ls -la
# Debe mostrar: backend/, frontend/, docs/, migrations/, scripts/, etc.

# 2. Verificar que Git está configurado
git status

# 3. Verificar archivos críticos
test -f requirements.txt && echo "✅ requirements.txt existe" || echo "❌ Falta requirements.txt"
test -f docker-compose.yml && echo "✅ docker-compose.yml existe" || echo "❌ Falta docker-compose.yml"
test -f README.md && echo "✅ README.md existe" || echo "❌ Falta README.md"

# 4. Crear archivos faltantes necesarios
if [ ! -f .env ]; then
    echo "⚠️  Crear archivo .env (ver docs/INSTALLATION.md)"
fi

# 5. Verificar permisos de ejecución en scripts
chmod +x scripts/*.sh  # Linux/Mac
```

### Checklist Post-Clonación

- [ ] Repositorio clonado correctamente
- [ ] Archivo `.env` creado y configurado
- [ ] Archivo `frontend/.env` creado (si aplica)
- [ ] Dependencias de backend instaladas (`pip install -r requirements.txt`)
- [ ] Dependencias de frontend instaladas (`cd frontend && npm install`)
- [ ] Base de datos creada (`almacen_db`)
- [ ] Migraciones aplicadas
- [ ] Servicios iniciados (`docker-compose up -d` o manualmente)
- [ ] Health check del backend funciona (`curl http://localhost:8000/health`)

### Problemas Específicos por Plataforma

#### Windows

```powershell
# Verificar que Git está instalado
git --version

# Si no está instalado, descargar desde:
# https://git-scm.com/download/win

# Verificar que Git Bash funciona
bash --version

# Si hay problemas con rutas largas, usar ruta corta
# Clonar en: C:\ERP en lugar de ruta larga
```

#### Linux

```bash
# Instalar Git si no está
sudo apt update
sudo apt install git

# Verificar permisos
ls -la scripts/
chmod +x scripts/*.sh
```

#### macOS

```bash
# Instalar Git si no está
brew install git

# O con Xcode Command Line Tools
xcode-select --install
```

### Errores Comunes al Clonar

#### "fatal: early EOF" o "fatal: index-pack failed"

**Causa**: Problema de red o repositorio muy grande.

**Solución**:
```bash
# Aumentar buffer de Git
git config --global http.postBuffer 524288000

# Clonar con profundidad limitada primero
git clone --depth 1 <url-del-repositorio>
cd ERP
git fetch --unshallow
```

#### "error: The following untracked working tree files would be overwritten"

**Causa**: Archivos locales conflictúan con el repositorio.

**Solución**:
```bash
# Hacer backup de archivos locales
cp -r ERP ERP_backup

# Limpiar y re-clonar
rm -rf ERP
git clone <url-del-repositorio>
```

#### "warning: You appear to have cloned an empty repository"

**Causa**: El repositorio está vacío o la rama no tiene commits.

**Solución**:
```bash
# Verificar ramas disponibles
git branch -a

# Cambiar a rama principal si es necesario
git checkout main
# O
git checkout master
```

---

## 🚨 Problemas de Instalación

### Error: "port 8000 already in use"

**Síntoma**: El backend no puede iniciar porque el puerto está ocupado.

**Solución**:

**Windows**:
```powershell
# Encontrar proceso usando el puerto
netstat -ano | findstr :8000

# Terminar proceso (reemplazar <PID> con el número encontrado)
taskkill /PID <PID> /F
```

**Linux/Mac**:
```bash
# Encontrar y terminar proceso
lsof -ti:8000 | xargs kill -9

# O más específico
lsof -i:8000
kill -9 <PID>
```

**Alternativa**: Cambiar el puerto en `docker-compose.yml` o `.env`:
```yaml
ports:
  - "8001:8000"  # Cambiar puerto externo
```

### Error: "Module not found" o "ImportError"

**Síntoma**: Python no encuentra módulos del proyecto.

**Solución**:

```bash
# Verificar que estás en el entorno virtual
which python  # Debe mostrar ruta con 'venv'

# Reinstalar dependencias
pip install -r requirements.txt

# Si estás en Windows y hay errores de compilación
pip install -r backend/requirements_windows.txt

# Verificar que el PYTHONPATH incluye el backend
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"  # Linux/Mac
$env:PYTHONPATH="$env:PYTHONPATH;$(pwd)\backend"  # Windows PowerShell
```

### Error: "psycopg2-binary installation failed"

**Síntoma**: Error al instalar psycopg2-binary en Windows.

**Solución**:

```bash
# Opción 1: Usar script de instalación para Windows
.\scripts\instalar_dependencias_windows.ps1

# Opción 2: Instalar manualmente con versión compatible
pip install psycopg2-binary==2.9.9

# Opción 3: Usar solo asyncpg (no requiere psycopg2)
# Comentar psycopg2-binary en requirements.txt
```

---

## 🗄️ Problemas de Base de Datos

### Error: "database does not exist"

**Síntoma**: La aplicación no puede conectarse a la base de datos.

**Solución**:

```bash
# Crear base de datos
createdb -U postgres almacen_db

# O con psql
psql -U postgres -c "CREATE DATABASE almacen_db;"

# Verificar que existe
psql -U postgres -l | grep almacen_db
```

### Error: "password authentication failed"

**Síntoma**: Error de autenticación con PostgreSQL.

**Solución**:

1. Verificar credenciales en `.env`:
```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/almacen_db
```

2. Cambiar contraseña de PostgreSQL:
```sql
-- Conectar como superusuario
psql -U postgres

-- Cambiar contraseña
ALTER USER postgres WITH PASSWORD 'nueva_password';

-- Actualizar .env con la nueva contraseña
```

3. Verificar configuración de `pg_hba.conf` (si es necesario):
```bash
# Ubicación típica:
# Windows: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Linux: /etc/postgresql/15/main/pg_hba.conf

# Asegurar que tiene:
host    all    all    127.0.0.1/32    md5
```

### Error: "relation does not exist"

**Síntoma**: Las tablas no existen en la base de datos.

**Solución**:

```bash
# Aplicar esquema base
psql -U postgres -d almacen_db -f docs/almacen_db.sql

# Aplicar migraciones
psql -U postgres -d almacen_db -f migrations/001_add_venta_fields.sql
psql -U postgres -d almacen_db -f migrations/002_mejora_precios_acumulado.sql
psql -U postgres -d almacen_db -f migrations/003_modulo_cobranza.sql

# Verificar tablas
psql -U postgres -d almacen_db -c "\dt"
```

### Error: "duplicate key value violates unique constraint"

**Síntoma**: Intento de insertar datos duplicados.

**Solución**:

```sql
-- Verificar datos duplicados
SELECT email, COUNT(*) 
FROM usuarios 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Eliminar duplicados (mantener el más reciente)
DELETE FROM usuarios 
WHERE id NOT IN (
    SELECT MAX(id) 
    FROM usuarios 
    GROUP BY email
);
```

### Error: "deadlock detected"

**Síntoma**: Bloqueo de transacciones concurrentes.

**Solución**:

1. Verificar que se están usando `SELECT FOR UPDATE` correctamente
2. Reducir tiempo de transacciones
3. Revisar orden de locks (siempre mismo orden)
4. Aumentar `lock_timeout` si es necesario:

```sql
SET lock_timeout = '5s';
```

---

## ⚙️ Problemas de Backend

### Error: "422 Unprocessable Entity"

**Síntoma**: Validación fallida en request.

**Solución**:

1. Verificar formato del request en Swagger UI (`http://localhost:8000/docs`)
2. Revisar logs del backend para detalles:
```bash
docker-compose logs backend | grep -i error
```
3. Verificar que los campos requeridos están presentes
4. Verificar tipos de datos (ej: números vs strings)

### Error: "500 Internal Server Error"

**Síntoma**: Error del servidor sin detalles.

**Solución**:

1. Activar modo DEBUG en `.env`:
```env
DEBUG=True
```

2. Revisar logs detallados:
```bash
docker-compose logs -f backend
```

3. Verificar que la base de datos está accesible
4. Verificar que todas las migraciones están aplicadas

### Error: "Connection pool exhausted"

**Síntoma**: Demasiadas conexiones a la base de datos.

**Solución**:

1. Aumentar pool size en `backend/app/core/database.py`:
```python
engine = create_engine(
    url,
    pool_size=20,        # Aumentar de 10 a 20
    max_overflow=40,     # Aumentar de 20 a 40
    pool_pre_ping=True
)
```

2. Verificar conexiones activas:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'almacen_db';
```

3. Cerrar conexiones inactivas:
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'almacen_db' 
AND state = 'idle' 
AND state_change < now() - interval '5 minutes';
```

### Error: "Timeout waiting for connection"

**Síntoma**: Timeout al obtener conexión de la base de datos.

**Solución**:

1. Verificar que PostgreSQL está corriendo:
```bash
# Con Docker
docker-compose ps db

# Sin Docker
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
```

2. Verificar configuración de conexión en `.env`
3. Aumentar timeout en SQLAlchemy:
```python
engine = create_engine(
    url,
    connect_args={"connect_timeout": 10}
)
```

---

## 🎨 Problemas de Frontend

### Error: "Cannot connect to backend"

**Síntoma**: El frontend no puede comunicarse con el backend.

**Solución**:

1. Verificar que el backend está corriendo:
```bash
curl http://localhost:8000/health
```

2. Verificar variable de entorno en `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
```

3. Verificar CORS en el backend (debe permitir `http://localhost:3000`)

4. Verificar firewall/antivirus no está bloqueando conexiones

### Error: "CORS policy blocked"

**Síntoma**: Error de CORS en el navegador.

**Solución**:

1. Verificar configuración CORS en `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Asegurar que está incluido
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. Reiniciar backend después de cambios

### Error: "Token expired" o "Unauthorized"

**Síntoma**: Token JWT expirado o inválido.

**Solución**:

1. Limpiar localStorage:
```javascript
localStorage.clear();
```

2. Hacer login nuevamente

3. Verificar que `ACCESS_TOKEN_EXPIRE_MINUTES` en `.env` es suficiente:
```env
ACCESS_TOKEN_EXPIRE_MINUTES=60  # Aumentar si es necesario
```

### Error: "npm install failed"

**Síntoma**: Error al instalar dependencias de Node.js.

**Solución**:

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Si persiste, usar yarn
yarn install

# En Windows, ejecutar como administrador si hay problemas de permisos
```

---

## 🔐 Problemas de Autenticación

### Error: "Usuario o contraseña incorrectos"

**Síntoma**: Login falla aunque las credenciales sean correctas.

**Solución**:

1. Verificar que el usuario existe:
```sql
SELECT nombre, email, activo FROM usuarios WHERE nombre = 'admin';
```

2. Verificar que el usuario está activo (`activo = true`)

3. Verificar hash de contraseña. Si necesitas resetear:
```python
# Ejecutar en Python
from app.core.security import get_password_hash
print(get_password_hash("nueva_password"))
```

4. Actualizar contraseña en base de datos:
```sql
UPDATE usuarios 
SET password_hash = '$2b$12$...'  -- Hash generado arriba
WHERE nombre = 'admin';
```

### Error: "Token invalid" después de reiniciar backend

**Síntoma**: Tokens válidos dejan de funcionar después de reiniciar.

**Solución**:

1. Verificar que `SECRET_KEY` en `.env` no cambió
2. Si cambió `SECRET_KEY`, todos los tokens anteriores serán inválidos
3. Hacer login nuevamente para obtener nuevo token

---

## 🐳 Problemas de Docker

### Error: "Cannot connect to Docker daemon"

**Síntoma**: Docker no está corriendo.

**Solución**:

1. Iniciar Docker Desktop
2. Verificar que Docker está corriendo:
```bash
docker ps
```

3. En Linux, agregar usuario al grupo docker:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Error: "Container keeps restarting"

**Síntoma**: Contenedor se reinicia continuamente.

**Solución**:

1. Ver logs del contenedor:
```bash
docker-compose logs backend
docker-compose logs db
```

2. Verificar configuración en `docker-compose.yml`
3. Verificar que los puertos no están ocupados
4. Reconstruir contenedores:
```bash
docker-compose down
docker-compose up -d --build
```

### Error: "Volume mount failed"

**Síntoma**: No se pueden montar volúmenes en Docker.

**Solución**:

1. Verificar permisos de archivos/carpetas
2. En Windows, verificar que Docker Desktop tiene acceso a la unidad
3. Usar rutas absolutas en `docker-compose.yml`:
```yaml
volumes:
  - C:/Users/Fernando Acuña/OneDrive/Escritorio/ERP/backend/app:/app/app
```

### Error: "Out of memory" en Docker

**Síntoma**: Docker se queda sin memoria.

**Solución**:

1. Aumentar memoria asignada a Docker Desktop (Settings → Resources)
2. Limpiar recursos no usados:
```bash
docker system prune -a
```

3. Limitar memoria de contenedores en `docker-compose.yml`:
```yaml
services:
  backend:
    mem_limit: 1g
```

---

## ⚡ Problemas de Performance

### Lento: Queries muy lentas

**Síntoma**: Las consultas tardan mucho tiempo.

**Solución**:

1. Verificar índices en tablas frecuentemente consultadas:
```sql
-- Ver índices existentes
\d ventas
\d productos

-- Crear índices si faltan
CREATE INDEX idx_ventas_fecha ON ventas(creada_en);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_productos_nombre ON productos(nombre);
```

2. Analizar queries lentas:
```sql
-- Activar logging de queries lentas
SET log_min_duration_statement = 1000;  -- Log queries > 1 segundo

-- Ver queries activas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active';
```

3. Optimizar queries con EXPLAIN:
```sql
EXPLAIN ANALYZE SELECT * FROM ventas WHERE estado = 'CERRADA';
```

### Lento: Frontend tarda en cargar

**Síntoma**: El frontend es lento al cargar datos.

**Solución**:

1. Implementar paginación en endpoints que devuelven muchos datos
2. Usar lazy loading para componentes pesados
3. Implementar cache en el frontend
4. Optimizar bundle de React:
```bash
npm run build
# Revisar tamaño del bundle
```

### Lento: Docker consume muchos recursos

**Síntoma**: Docker consume demasiada CPU/RAM.

**Solución**:

1. Limitar recursos en `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

2. Usar imágenes más ligeras (alpine)
3. Limpiar imágenes y contenedores no usados regularmente

---

## ❌ Errores Comunes

### Error: "AttributeError: 'NoneType' object has no attribute"

**Causa**: Objeto no encontrado en base de datos.

**Solución**: Agregar validación antes de usar:
```python
if objeto is None:
    raise HTTPException(status_code=404, detail="Objeto no encontrado")
```

### Error: "IntegrityError: foreign key constraint"

**Causa**: Intento de eliminar registro referenciado.

**Solución**: Eliminar primero registros dependientes o usar CASCADE:
```sql
ALTER TABLE venta_detalle 
DROP CONSTRAINT venta_detalle_venta_id_fkey,
ADD CONSTRAINT venta_detalle_venta_id_fkey 
FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;
```

### Error: "ValueError: invalid literal for int()"

**Causa**: Conversión de tipo incorrecta.

**Solución**: Validar datos antes de convertir:
```python
try:
    id = int(request_id)
except ValueError:
    raise HTTPException(status_code=400, detail="ID inválido")
```

---

## 📞 Obtener Ayuda

Si el problema persiste:

1. Revisar logs completos:
```bash
docker-compose logs > logs.txt
```

2. Verificar versión de software:
```bash
python --version
postgres --version
docker --version
node --version
```

3. Consultar documentación:
   - [docs/INSTALLATION.md](INSTALLATION.md)
   - [docs/DEVELOPMENT.md](DEVELOPMENT.md)
   - [docs/API.md](API.md)

4. Revisar issues en el repositorio (si aplica)

---

**Última actualización**: Enero 2026
