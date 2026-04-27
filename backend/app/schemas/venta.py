from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


class VentaDetalleCreate(BaseModel):
    """Schema para crear un detalle de venta."""
    codigo_barras: str = Field(..., description="Código de barras del producto")
    cantidad: int = Field(..., gt=0, description="Cantidad a vender")


class VentaDetalleResponse(BaseModel):
    """Schema para respuesta de detalle de venta (ALINEADO)."""
    id: int
    venta_id: int
    variante_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    
    class Config:
        from_attributes = True


class VentaCreate(BaseModel):
    """Schema para crear una venta completa (ALINEADO con BD)."""
    punto_venta_id: int = Field(..., description="ID del punto de venta")
    metodo_pago: str = Field(..., description="EFECTIVO o TARJETA")
    detalles: List[VentaDetalleCreate] = Field(default=[])


class VentaResponse(BaseModel):
    """Schema para respuesta de venta (ALINEADO)."""
    id: int
    punto_venta_id: int
    usuario_id: int
    subtotal: Optional[Decimal]
    descuento: Optional[Decimal]
    impuesto: Optional[Decimal]
    total: Decimal
    estado: str
    metodo_pago: str
    creada_en: datetime
    completed_at: Optional[datetime]
    detalles: List[VentaDetalleResponse] = []
    
    class Config:
        from_attributes = True


class AddItemToSaleRequest(BaseModel):
    """
    Schema para agregar un ítem a una venta existente.
    Endpoint: POST /ventas/{id}/items
    """
    codigo_barras: str = Field(..., description="Código de barras del producto", min_length=1)
    cantidad: int = Field(..., gt=0, description="Cantidad a agregar")
    
    class Config:
        json_schema_extra = {
            "example": {
                "codigo_barras": "7501234567890",
                "cantidad": 2
            }
        }
