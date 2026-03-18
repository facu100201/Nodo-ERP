# 🤝 Guía de Contribución

Gracias por tu interés en contribuir al Sistema ERP/POS Nodo. Esta guía te ayudará a entender cómo contribuir de manera efectiva.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

---

## 📜 Código de Conducta

Este proyecto sigue un código de conducta profesional:

- **Respeto**: Trata a todos con respeto y profesionalismo
- **Comunicación**: Sé claro y constructivo en tus comentarios
- **Colaboración**: Trabaja en equipo y comparte conocimiento
- **Calidad**: Prioriza código limpio, testeable y documentado

---

## 🚀 Cómo Contribuir

### 1. Fork y Clonar

```bash
# Fork el repositorio en GitHub/GitLab
# Luego clonar tu fork
git clone https://github.com/tu-usuario/ERP.git
cd ERP
```

### 2. Crear Rama de Trabajo

```bash
# Crear rama desde main/master
git checkout main
git pull origin main

# Crear rama para tu feature/fix
git checkout -b feature/nombre-de-tu-feature
# O
git checkout -b fix/descripcion-del-bug
```

**Convención de nombres de ramas**:
- `feature/` - Nueva funcionalidad
- `fix/` - Corrección de bugs
- `docs/` - Documentación
- `refactor/` - Refactorización
- `test/` - Tests
- `chore/` - Tareas de mantenimiento

### 3. Hacer Cambios

- Escribe código limpio y bien documentado
- Sigue los estándares de código del proyecto
- Agrega tests para nuevas funcionalidades
- Actualiza documentación si es necesario

### 4. Commit y Push

```bash
# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: agregar funcionalidad X"
# O
git commit -m "fix: corregir bug en módulo Y"

# Push a tu fork
git push origin feature/nombre-de-tu-feature
```

**Formato de commits** (Conventional Commits):
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Formato, punto y coma, etc. (no afecta código)
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Cambios en build, dependencias, etc.

### 5. Crear Pull Request

1. Ir a GitHub/GitLab y crear Pull Request
2. Llenar la plantilla de PR con:
   - Descripción de cambios
   - Tipo de cambio (feature/fix/etc.)
   - Tests realizados
   - Screenshots (si aplica)

---

## 🛠️ Configuración del Entorno de Desarrollo

### Requisitos Previos

- Python 3.11+
- Node.js 16+
- PostgreSQL 15+
- Git
- Docker (opcional pero recomendado)

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone <url-del-repositorio>
cd ERP

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 3. Instalar dependencias
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Si existe

# 4. Configurar .env
cp .env.example .env
# Editar .env con tus configuraciones

# 5. Instalar pre-commit hooks (si están configurados)
pre-commit install

# 6. Frontend
cd frontend
npm install
```

### Ejecutar Tests

```bash
# Backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html

# Frontend
cd frontend
npm test
```

---

## 📝 Estándares de Código

### Python (Backend)

**Formato**: Usar `black` para formateo automático
```bash
pip install black
black backend/app/
```

**Linting**: Usar `flake8` o `ruff`
```bash
pip install flake8
flake8 backend/app/
```

**Type Hints**: Siempre usar type hints
```python
def crear_venta(self, data: VentaCreate) -> VentaResponse:
    """Crear nueva venta."""
    ...
```

**Docstrings**: Usar formato Google o NumPy
```python
def calcular_total(self, subtotal: float, descuento: float) -> float:
    """
    Calcular total de venta.
    
    Args:
        subtotal: Subtotal de la venta
        descuento: Descuento aplicado
        
    Returns:
        Total calculado
        
    Raises:
        ValueError: Si el descuento es mayor al subtotal
    """
    ...
```

**Estructura de Archivos**:
- Un archivo = una clase/función principal
- Imports ordenados: stdlib → third-party → local
- Máximo 300 líneas por archivo (idealmente < 200)

### JavaScript/React (Frontend)

**Formato**: Usar Prettier
```bash
npm install --save-dev prettier
npx prettier --write "src/**/*.{js,jsx}"
```

**Linting**: Usar ESLint
```bash
npm run lint
```

**Componentes**:
- Componentes funcionales con hooks
- Props tipadas con PropTypes o TypeScript
- Un componente por archivo
- Nombres descriptivos

**Ejemplo**:
```javascript
// ✅ Bueno
const ProductCard = ({ product, onAdd }) => {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <button onClick={() => onAdd(product.id)}>Agregar</button>
    </div>
  );
};

// ❌ Evitar
const PC = ({ p, oa }) => { ... }
```

### SQL

- Usar mayúsculas para palabras clave SQL
- Indentar correctamente
- Comentar queries complejas
- Usar nombres descriptivos para funciones/triggers

```sql
-- ✅ Bueno
CREATE FUNCTION fn_calcular_precio_acumulado()
RETURNS TRIGGER AS $$
BEGIN
    -- Lógica aquí
END;
$$ LANGUAGE plpgsql;

-- ❌ Evitar
create function fn1() returns trigger as $$ begin ... end; $$ language plpgsql;
```

---

## 🔄 Proceso de Pull Request

### Antes de Crear PR

- [ ] Código sigue los estándares del proyecto
- [ ] Tests pasan localmente
- [ ] Documentación actualizada
- [ ] Sin conflictos con `main`
- [ ] Commits con mensajes descriptivos

### Plantilla de PR

```markdown
## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## Descripción
Breve descripción de los cambios...

## Cambios Realizados
- Cambio 1
- Cambio 2
- Cambio 3

## Tests
- [ ] Tests unitarios agregados/modificados
- [ ] Tests de integración ejecutados
- [ ] Tests manuales realizados

## Checklist
- [ ] Código sigue estándares del proyecto
- [ ] Self-review realizado
- [ ] Comentarios agregados donde es necesario
- [ ] Documentación actualizada
- [ ] Sin warnings nuevos
- [ ] Tests pasan
- [ ] Sin conflictos
```

### Revisión de Código

- Los PRs requieren al menos 1 aprobación
- Responde a comentarios de revisión
- Haz cambios incrementales si se solicitan
- Mantén el PR enfocado (una cosa a la vez)

---

## 🐛 Reportar Bugs

### Antes de Reportar

1. Verificar que no es un problema conocido
2. Verificar que ocurre en la última versión
3. Intentar reproducir el problema

### Plantilla de Bug Report

```markdown
**Descripción del Bug**
Descripción clara y concisa del bug.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer clic en '...'
3. Ver error

**Comportamiento Esperado**
Qué debería pasar.

**Comportamiento Actual**
Qué pasa realmente.

**Screenshots**
Si aplica, agregar screenshots.

**Entorno**
- OS: [ej. Windows 10]
- Navegador: [ej. Chrome 120]
- Versión: [ej. 1.0.0]

**Logs**
```
Pegar logs relevantes aquí
```

**Información Adicional**
Cualquier otra información relevante.
```

---

## 💡 Sugerir Mejoras

### Plantilla de Feature Request

```markdown
**¿Es tu sugerencia relacionada con un problema?**
Descripción clara del problema.

**Describe la solución que te gustaría**
Descripción clara de lo que quieres que pase.

**Describe alternativas consideradas**
Otras soluciones o features que consideraste.

**Contexto Adicional**
Cualquier otro contexto, screenshots, etc.
```

---

## 📚 Recursos Adicionales

- [docs/DEVELOPMENT.md](DEVELOPMENT.md) - Guía de desarrollo
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura del sistema
- [docs/API.md](API.md) - Documentación de API
- [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solución de problemas

---

## ❓ Preguntas

Si tienes preguntas:
1. Revisar documentación en `docs/`
2. Buscar en issues existentes
3. Crear nuevo issue con etiqueta `question`

---

**Gracias por contribuir! 🎉**
