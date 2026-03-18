# 🧪 Guía de Testing

Esta guía explica cómo escribir y ejecutar tests para el Sistema ERP/POS Nodo.

## 📋 Tabla de Contenidos

- [Estrategia de Testing](#estrategia-de-testing)
- [Configuración](#configuración)
- [Tests del Backend](#tests-del-backend)
- [Tests del Frontend](#tests-del-frontend)
- [Tests de Integración](#tests-de-integración)
- [Tests E2E](#tests-e2e)
- [Cobertura de Código](#cobertura-de-código)
- [CI/CD Integration](#cicd-integration)

---

## 🎯 Estrategia de Testing

### Pirámide de Testing

```
        /\
       /  \      E2E Tests (pocos, críticos)
      /____\
     /      \    Integration Tests (algunos)
    /________\
   /          \  Unit Tests (muchos)
  /____________\
```

### Tipos de Tests

1. **Unit Tests**: Testean funciones/métodos individuales
2. **Integration Tests**: Testean interacción entre componentes
3. **E2E Tests**: Testean flujos completos de usuario

---

## ⚙️ Configuración

### Instalar Dependencias de Testing

```bash
# Backend
pip install -r requirements-dev.txt

# Frontend
cd frontend
npm install
```

### Estructura de Tests

```
ERP/
├── tests/                    # Tests del backend
│   ├── unit/
│   │   ├── test_services.py
│   │   └── test_repositories.py
│   ├── integration/
│   │   ├── test_api.py
│   │   └── test_ventas_flow.py
│   └── conftest.py          # Configuración pytest
│
├── frontend/
│   └── src/
│       ├── __tests__/       # Tests del frontend
│       └── components/
│           └── __tests__/
```

---

## 🐍 Tests del Backend

### Configuración de Pytest

Crear `pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --strict-markers
    --tb=short
    --cov=backend/app
    --cov-report=html
    --cov-report=term-missing
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
```

### Crear conftest.py

`tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Base de datos de testing
TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/almacen_db_test"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Crear base de datos de testing."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Cliente de testing."""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Headers de autenticación para tests."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Ejemplo: Unit Test

`tests/unit/test_venta_service.py`:

```python
import pytest
from decimal import Decimal
from app.services.venta_service import VentaService
from app.schemas.venta import VentaCreate

def test_calcular_total_simple(db, auth_headers):
    """Test de cálculo de total."""
    service = VentaService(db)
    
    # Crear venta
    venta_data = VentaCreate(
        punto_venta_id=1,
        metodo_pago="EFECTIVO",
        detalles=[]
    )
    
    venta = service.crear_venta(venta_data)
    
    assert venta.total == Decimal("0.00")
    assert venta.estado == "ABIERTA"


def test_agregar_item_a_venta(db):
    """Test de agregar item a venta."""
    service = VentaService(db)
    
    # Setup: crear venta y producto
    # ... código de setup ...
    
    # Agregar item
    item_data = {
        "codigo_barras": "7501234567890",
        "cantidad": 2
    }
    
    venta = service.agregar_item(venta_id=1, item_data=item_data)
    
    assert len(venta.detalles) == 1
    assert venta.total > 0
```

### Ejemplo: Integration Test

`tests/integration/test_api_ventas.py`:

```python
import pytest

def test_crear_venta_endpoint(client, auth_headers):
    """Test del endpoint de crear venta."""
    response = client.post(
        "/api/v1/ventas",
        json={
            "punto_venta_id": 1,
            "metodo_pago": "EFECTIVO",
            "detalles": []
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["estado"] == "ABIERTA"


def test_agregar_item_endpoint(client, auth_headers):
    """Test del endpoint de agregar item."""
    # Crear venta primero
    venta_response = client.post(
        "/api/v1/ventas",
        json={"punto_venta_id": 1, "metodo_pago": "EFECTIVO", "detalles": []},
        headers=auth_headers
    )
    venta_id = venta_response.json()["id"]
    
    # Agregar item
    response = client.post(
        f"/api/v1/ventas/{venta_id}/items",
        json={
            "codigo_barras": "7501234567890",
            "cantidad": 2
        },
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["detalles"]) == 1
```

### Ejecutar Tests

```bash
# Todos los tests
pytest

# Solo unit tests
pytest -m unit

# Solo integration tests
pytest -m integration

# Con cobertura
pytest --cov=backend/app --cov-report=html

# Tests específicos
pytest tests/unit/test_venta_service.py::test_calcular_total_simple
```

---

## ⚛️ Tests del Frontend

### Configuración

El frontend ya tiene Jest y React Testing Library configurados.

### Ejemplo: Test de Componente

`frontend/src/components/__tests__/ProductCard.test.js`:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    name: 'Producto Test',
    price: 100.00,
    stock: 10
  };

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Producto Test')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('calls onAdd when button is clicked', () => {
    const mockOnAdd = jest.fn();
    render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);
    
    fireEvent.click(screen.getByText('Agregar'));
    
    expect(mockOnAdd).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

### Ejecutar Tests

```bash
cd frontend
npm test

# Con coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 🔗 Tests de Integración

### Test de Flujo Completo

`tests/integration/test_flujo_venta_completo.py`:

```python
def test_flujo_venta_completo(client, auth_headers):
    """Test del flujo completo de una venta."""
    # 1. Crear venta
    venta_response = client.post(
        "/api/v1/ventas",
        json={"punto_venta_id": 1, "metodo_pago": "EFECTIVO", "detalles": []},
        headers=auth_headers
    )
    venta_id = venta_response.json()["id"]
    
    # 2. Agregar productos
    client.post(
        f"/api/v1/ventas/{venta_id}/items",
        json={"codigo_barras": "7501234567890", "cantidad": 2},
        headers=auth_headers
    )
    
    # 3. Verificar venta
    venta = client.get(f"/api/v1/ventas/{venta_id}", headers=auth_headers).json()
    assert len(venta["detalles"]) == 1
    
    # 4. Cerrar venta
    client.post(f"/api/v1/ventas/{venta_id}/cerrar", headers=auth_headers)
    
    # 5. Verificar que no se puede agregar más items
    response = client.post(
        f"/api/v1/ventas/{venta_id}/items",
        json={"codigo_barras": "7501234567891", "cantidad": 1},
        headers=auth_headers
    )
    assert response.status_code == 400
```

---

## 🎭 Tests E2E

### Con Cypress (Opcional)

```bash
# Instalar Cypress
cd frontend
npm install --save-dev cypress

# Abrir Cypress
npx cypress open
```

Ejemplo `cypress/e2e/venta.cy.js`:

```javascript
describe('Flujo de Venta E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.login('admin', 'admin123');
  });

  it('completa una venta exitosamente', () => {
    cy.visit('/pos');
    cy.get('[data-testid="nueva-venta"]').click();
    cy.get('[data-testid="codigo-barras"]').type('7501234567890{enter}');
    cy.get('[data-testid="cerrar-venta"]').click();
    cy.get('[data-testid="ticket"]').should('be.visible');
  });
});
```

---

## 📊 Cobertura de Código

### Backend

```bash
# Generar reporte de cobertura
pytest --cov=backend/app --cov-report=html

# Ver reporte
open htmlcov/index.html  # Mac
start htmlcov/index.html  # Windows
```

**Meta de cobertura**: Mínimo 70%, idealmente 80%+

### Frontend

```bash
cd frontend
npm test -- --coverage
```

---

## 🔄 CI/CD Integration

Los tests se ejecutan automáticamente en CI/CD (ver `.github/workflows/ci.yml`).

### Ejecutar Tests Localmente como en CI

```bash
# Backend
pytest tests/ -v --cov=backend/app

# Frontend
cd frontend
npm test -- --watchAll=false
```

---

## 📚 Mejores Prácticas

### DO ✅

- Escribir tests antes o junto con el código (TDD)
- Tests independientes (no dependen de otros)
- Tests rápidos (< 1 segundo cada uno)
- Nombres descriptivos: `test_agregar_item_a_venta_cerrada_debe_fallar`
- Un assert por concepto
- Mockear dependencias externas

### DON'T ❌

- Tests que dependen de otros tests
- Tests que modifican estado global
- Tests lentos en suite de unit tests
- Tests sin limpieza (dejar datos en BD)
- Tests que prueban implementación, no comportamiento

---

## 🐛 Debugging Tests

```bash
# Ejecutar con output detallado
pytest -v -s

# Ejecutar con pdb (debugger)
pytest --pdb

# Ejecutar test específico con pdb
pytest tests/test_venta.py::test_crear_venta --pdb
```

---

**Última actualización**: Enero 2026
