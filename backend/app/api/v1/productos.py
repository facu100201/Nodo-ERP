from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from decimal import Decimal

from pydantic import BaseModel, Field

from app.core.database import get_db
from app.api.dependencies import require_cajero_or_admin, get_current_active_user
from app.models.usuario import Usuario
from app.models.producto import Producto, VarianteProducto
from app.services.producto_service import (
    ProductoService, ProductoCreateRequest, VarianteCreateRequest,
)

router = APIRouter(prefix="/productos", tags=["Productos"])


# ── Schemas de respuesta ───────────────────────────────────────────────────────

class VarianteResponse(BaseModel):
    id: int
    producto_id: int
    sku: str
    codigo_barras: str
    talla: str | None
    color: str | None
    precio_menudeo: Decimal
    precio_mayoreo: Decimal
    activo: bool

    class Config:
        from_attributes = True


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    categoria: str | None
    marca: str | None
    activo: bool
    variantes: List[VarianteResponse] = []

    class Config:
        from_attributes = True


class CargaMasivaResponse(BaseModel):
    variantes_creadas: int
    errores: List[dict]
    exitoso: bool


# ── Schemas de entrada ─────────────────────────────────────────────────────────

class ProductoCreateSchema(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = None
    categoria: str | None = None
    marca: str | None = None


class ProductoUpdateSchema(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    descripcion: str | None = None
    categoria: str | None = None
    marca: str | None = None


class VarianteCreateSchema(BaseModel):
    producto_id: int
    sku: str = Field(..., min_length=1, max_length=50)
    codigo_barras: str = Field(..., min_length=1, max_length=100)
    talla: str | None = Field(None, max_length=20)
    color: str | None = Field(None, max_length=30)
    precio_menudeo: Decimal = Field(..., ge=0)
    precio_mayoreo: Decimal = Field(..., ge=0)
    stock_inicial: int = Field(default=0, ge=0)


# ── Endpoints ─────────────────────────────────────────────────────────────────
# IMPORTANTE: /plantilla debe declararse ANTES de /{producto_id} para que
# FastAPI no intente convertir "plantilla" a int como producto_id.

@router.get("/plantilla", summary="Descargar plantilla Excel para carga masiva")
def descargar_plantilla(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    db: Session = Depends(get_db),
):
    """
    Descarga una plantilla Excel lista para usar en la carga masiva de variantes.

    El archivo incluye:
    - Encabezados con el formato exacto requerido.
    - Una fila de ejemplo con datos de prueba.

    Requiere autenticación.
    """
    service = ProductoService(db)
    excel_bytes = service.generar_plantilla_excel()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_variantes.xlsx"},
    )


@router.get("", response_model=List[ProductoResponse])
def listar_productos(
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    buscar: Optional[str] = Query(None, description="Buscar por nombre"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Annotated[Usuario, Depends(get_current_active_user)] = None,
    db: Session = Depends(get_db),
):
    """
    Listar productos con filtros opcionales.
    Requiere autenticación.
    """
    query = db.query(Producto)
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    if buscar:
        query = query.filter(Producto.nombre.ilike(f"%{buscar}%"))
    if activo is not None:
        query = query.filter(Producto.activo.is_(activo))
    return query.offset(skip).limit(limit).all()


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    db: Session = Depends(get_db),
):
    """
    Obtener detalle de un producto con todas sus variantes.
    Requiere autenticación.
    """
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    return producto


@router.patch("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    producto_data: ProductoUpdateSchema,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db),
):
    """
    Actualizar campos de un producto existente.
    Requiere rol: CAJERO o ADMIN
    """
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    update_data = producto_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(producto, key, value)
    db.commit()
    db.refresh(producto)
    return producto


@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(
    producto_data: ProductoCreateSchema,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db),
):
    """
    Crear un nuevo producto.
    Requiere rol: CAJERO o ADMIN
    """
    service = ProductoService(db)
    return service.crear_producto(ProductoCreateRequest(
        nombre=producto_data.nombre,
        descripcion=producto_data.descripcion,
        categoria=producto_data.categoria,
        marca=producto_data.marca,
    ))


@router.post("/variantes", response_model=VarianteResponse, status_code=status.HTTP_201_CREATED)
def crear_variante(
    variante_data: VarianteCreateSchema,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db),
):
    """
    Crear una nueva variante de producto.
    Crea también el registro de inventario inicial si stock_inicial > 0.
    Requiere rol: CAJERO o ADMIN
    """
    service = ProductoService(db)
    return service.crear_variante(VarianteCreateRequest(
        producto_id=variante_data.producto_id,
        sku=variante_data.sku,
        codigo_barras=variante_data.codigo_barras,
        talla=variante_data.talla,
        color=variante_data.color,
        precio_menudeo=float(variante_data.precio_menudeo),
        precio_mayoreo=float(variante_data.precio_mayoreo),
        stock_inicial=variante_data.stock_inicial,
    ))


@router.post("/carga-masiva", response_model=CargaMasivaResponse)
def carga_masiva(
    file: UploadFile,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db),
):
    """
    Carga masiva de variantes desde CSV o Excel (.xlsx / .xls).

    **Columnas requeridas** (en cualquier orden):
    `producto_id`, `sku`, `talla`, `color`, `precio_menudeo`, `precio_mayoreo`, `codigo_barras`

    **Columnas opcionales:**
    - `producto`: nombre descriptivo (solo referencia, no se guarda)
    - `activo`: `true`/`false`/`1`/`0`/`si`/`no` — default `true`

    **Ejemplo de fila:**
    ```
    1, Playera Básica, PLY-M-NEG-001, M, Negro, 600.00, 500.00, 7501234567890, true
    ```

    - Los errores por fila se acumulan sin detener la carga completa.
    - Las filas válidas se guardan aunque otras fallen (SAVEPOINT por fila).
    - `producto_id` debe corresponder a un producto existente.
    - SKU y código de barras deben ser únicos en la BD.

    Descarga la plantilla con **`GET /productos/plantilla`**.

    Requiere rol: CAJERO o ADMIN
    """
    service = ProductoService(db)
    return service.carga_masiva_csv(file)


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db),
):
    """
    Desactivar un producto y sus variantes (soft delete).
    Requiere rol: CAJERO o ADMIN
    """
    service = ProductoService(db)
    if not service.eliminar_producto(producto_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    return None
