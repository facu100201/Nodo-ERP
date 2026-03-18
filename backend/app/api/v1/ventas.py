from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from app.core.database import get_db
from app.schemas.venta import (
    VentaCreate,
    VentaResponse,
    AddItemToSaleRequest
)
from app.schemas.ticket import TicketResponse
from app.services.venta_service import VentaService
from app.services.ticket_service import TicketService
from app.api.dependencies import require_cajero_or_admin
from app.models.usuario import Usuario
from app.models.venta import EstadoVentaEnum

router = APIRouter(prefix="/ventas", tags=["Ventas"])


@router.post("", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    venta_data: VentaCreate,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db)
):
    """
    Crear una venta completa con sus detalles.
    
    **Transacción ACID** que valida stock y actualiza inventario.
    
    Requiere rol: CAJERO o ADMIN
    
    Ejemplo:
    ```json
    {
        "cliente_nombre": "Juan Pérez",
        "cliente_documento": "12345678",
        "metodo_pago": "EFECTIVO",
        "descuento_general": 0,
        "detalles": [
            {
                "codigo_barras": "7501234567890",
                "cantidad": 2,
                "descuento": 0
            }
        ]
    }
    ```
    """
    venta_service = VentaService(db)
    return venta_service.crear_venta(venta_data, current_user.id)


@router.post("/{venta_id}/items", response_model=VentaResponse)
def add_item_to_sale(
    venta_id: int,
    item_data: AddItemToSaleRequest,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db)
):
    """
    Agregar un ítem a una venta existente.
    
    **ENDPOINT: POST /ventas/{id}/items**
    
    **Transacción ACID con SELECT FOR UPDATE:**
    1. Valida que la venta existe y está PENDIENTE
    2. Busca el producto por código de barras
    3. Adquiere lock exclusivo en inventario (SELECT FOR UPDATE)
    4. Valida stock disponible
    5. Crea detalle de venta
    6. Actualiza totales
    7. Commit de transacción
    
    **Manejo de concurrencia:**
    - Usa `SELECT FOR UPDATE` para prevenir race conditions
    - Si dos cajeros intentan vender el mismo producto simultáneamente,
      uno esperará al otro gracias al lock
    
    **Manejo de errores:**
    - 404: Venta no encontrada
    - 404: Producto no encontrado
    - 400: Venta no está en estado PENDIENTE
    - 400: Stock insuficiente (con detalle de disponible vs requerido)
    
    Requiere rol: CAJERO o ADMIN
    
    Ejemplo:
    ```json
    {
        "codigo_barras": "7501234567890",
        "cantidad": 2,
        "descuento": 5.50
    }
    ```
    
    Respuesta exitosa:
    ```json
    {
        "id": 1,
        "cliente_nombre": "Juan Pérez",
        "usuario_id": 1,
        "subtotal": 100.00,
        "descuento": 5.50,
        "total": 94.50,
        "estado": "PENDIENTE",
        "detalles": [
            {
                "id": 1,
                "producto_nombre": "Producto X",
                "codigo_barras": "7501234567890",
                "cantidad": 2,
                "precio_unitario": 50.00,
                "subtotal": 94.50
            }
        ]
    }
    ```
    """
    venta_service = VentaService(db)
    return venta_service.add_item_to_sale(venta_id, item_data)


@router.get("/{venta_id}", response_model=VentaResponse)
def get_sale(
    venta_id: int,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db)
):
    """
    Obtener una venta por ID con sus detalles.
    
    Requiere rol: CAJERO o ADMIN
    """
    venta_service = VentaService(db)
    return venta_service.get_venta(venta_id)


@router.get("", response_model=List[VentaResponse])
def list_sales(
    skip: int = Query(0, ge=0, description="Registros a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de registros"),
    estado: Optional[EstadoVentaEnum] = Query(None, description="Filtrar por estado"),
    current_user: Usuario = Depends(require_cajero_or_admin),
    db: Session = Depends(get_db),
):
    """
    Listar ventas con paginación y filtros.
    
    Requiere rol: CAJERO o ADMIN
    """
    venta_service = VentaService(db)
    return venta_service.list_ventas(skip=skip, limit=limit, estado=estado)


@router.post("/{venta_id}/cerrar", response_model=VentaResponse)
def cerrar_venta(
    venta_id: int,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db)
):
    """
    Cerrar una venta (cambiar estado a CERRADA).
    
    Requiere rol: CAJERO o ADMIN
    """
    venta_service = VentaService(db)
    return venta_service.completar_venta(venta_id)


@router.post("/{venta_id}/cancelar", response_model=VentaResponse)
def cancelar_venta(
    venta_id: int,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)],
    db: Session = Depends(get_db)
):
    """
    Cancelar una venta abierta.
    
    Requiere rol: CAJERO o ADMIN
    """
    venta_service = VentaService(db)
    return venta_service.cancelar_venta(venta_id)


@router.get("/{venta_id}/ticket", response_model=TicketResponse)
def generar_ticket(
    venta_id: int,
    incluir_qr: bool = True,
    current_user: Annotated[Usuario, Depends(require_cajero_or_admin)] = None,
    db: Session = Depends(get_db)
):
    """
    Generar ticket de venta con QR para facturación.
    
    Retorna ticket en formato HTML y texto plano.
    
    Requiere rol: CAJERO o ADMIN
    """
    venta_service = VentaService(db)
    venta = venta_service.get_venta(venta_id)
    
    # Convertir a modelo ORM para el servicio de tickets
    from app.repositories.venta_repository import VentaRepository
    venta_repo = VentaRepository(db)
    venta_orm = venta_repo.get_by_id(venta_id)
    
    if not venta_orm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta {venta_id} no encontrada"
        )
    
    # Generar ticket
    ticket_html = TicketService.generar_ticket_html(venta_orm, incluir_qr=incluir_qr)
    ticket_texto = TicketService.generar_ticket_texto(venta_orm)
    qr_base64 = TicketService.generar_qr_facturacion(venta_id, float(venta_orm.total)) if incluir_qr else None
    
    return TicketResponse(
        ticket_html=ticket_html,
        ticket_texto=ticket_texto,
        qr_base64=qr_base64,
        venta_id=venta_id
    )
