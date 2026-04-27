from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from app.models.venta import Venta, VentaDetalle, EstadoVentaEnum
from app.repositories.venta_repository import VentaRepository
from app.repositories.producto_repository import ProductoRepository
from app.repositories.inventario_repository import InventarioRepository
from app.schemas.venta import (
    VentaCreate,
    VentaResponse,
    AddItemToSaleRequest,
    VentaDetalleCreate
)


class VentaService:
    """
    Servicio de Ventas con lógica de negocio.
    
    Maneja transacciones ACID para operaciones críticas.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.venta_repo = VentaRepository(db)
        self.producto_repo = ProductoRepository(db)
        self.inventario_repo = InventarioRepository(db)
    
    def crear_venta(self, venta_data: VentaCreate, usuario_id: int) -> VentaResponse:
        """
        Crear una venta completa con sus detalles.
        
        Transacción ACID que:
        1. Crea la venta
        2. Valida stock de todos los productos
        3. Crea los detalles
        4. Actualiza inventario (si no hay triggers)
        5. Calcula totales
        6. Marca como completada
        
        Args:
            venta_data: Datos de la venta
            usuario_id: ID del usuario que crea la venta
            
        Returns:
            VentaResponse con la venta creada
            
        Raises:
            HTTPException: Si hay errores de validación o stock insuficiente
        """
        try:
            # Crear venta inicial (ALINEADO con campos de BD)
            venta = Venta(
                punto_venta_id=venta_data.punto_venta_id,
                usuario_id=usuario_id,
                metodo_pago=venta_data.metodo_pago,
                estado=EstadoVentaEnum.ABIERTA.value
            )
            venta = self.venta_repo.create(venta)
            
            # Procesar cada detalle
            subtotal_total = Decimal("0")
            descuento_total = Decimal("0")
            
            for detalle_data in venta_data.detalles:
                # Agregar ítem (validará stock y creará detalle)
                detalle = self._add_item_internal(
                    venta_id=venta.id,
                    codigo_barras=detalle_data.codigo_barras,
                    cantidad=detalle_data.cantidad
                )
                subtotal_total += detalle.subtotal
            
            # Calcular totales
            impuesto = Decimal("0")  # Configurar según normativa
            total = subtotal_total - descuento_total + impuesto
            
            # Actualizar totales y cerrar solo si hay detalles
            if venta_data.detalles:
                impuesto = Decimal("0")
                total = subtotal_total - descuento_total + impuesto
                self.venta_repo.update_totales(
                    venta.id,
                    float(subtotal_total),
                    float(descuento_total),
                    float(impuesto),
                    float(total)
                )
                self.venta_repo.completar_venta(venta.id)

            # Commit transacción
            self.db.commit()
            
            # Retornar venta con detalles
            venta_final = self.venta_repo.get_by_id(venta.id)
            return VentaResponse.model_validate(venta_final)
            
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear venta: {str(e)}"
            )
    
    def add_item_to_sale(
        self,
        venta_id: int,
        item_data: AddItemToSaleRequest
    ) -> VentaResponse:
        """
        Agregar un ítem a una venta existente.
        
        ENDPOINT: POST /sales/{id}/item
        
        Transacción ACID que:
        1. Valida que la venta existe y está PENDIENTE
        2. Busca el producto por código de barras
        3. Valida stock disponible con SELECT FOR UPDATE
        4. Crea el detalle de venta
        5. Actualiza totales
        6. Commit de transacción
        
        Args:
            venta_id: ID de la venta
            item_data: Datos del ítem a agregar
            
        Returns:
            VentaResponse con la venta actualizada
            
        Raises:
            HTTPException: Si hay errores de validación o stock
        """
        try:
            # Validar que la venta existe y está pendiente
            venta = self.venta_repo.get_by_id_with_lock(venta_id)
            
            if not venta:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Venta {venta_id} no encontrada"
                )
            
            if venta.estado != EstadoVentaEnum.ABIERTA.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede agregar ítems a una venta en estado {venta.estado}"
                )
            
            # Agregar ítem
            self._add_item_internal(
                venta_id=venta_id,
                codigo_barras=item_data.codigo_barras,
                cantidad=item_data.cantidad
            )
            
            # Recalcular totales
            venta_actualizada = self.venta_repo.get_by_id(venta_id)
            subtotal = sum(d.subtotal for d in venta_actualizada.detalles)
            descuento = venta_actualizada.descuento
            impuesto = Decimal("0")
            total = subtotal - descuento + impuesto
            
            self.venta_repo.update_totales(
                venta_id,
                float(subtotal),
                float(descuento),
                float(impuesto),
                float(total)
            )
            
            # Commit transacción
            self.db.commit()
            
            # Retornar venta actualizada
            venta_final = self.venta_repo.get_by_id(venta_id)
            return VentaResponse.model_validate(venta_final)
            
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al agregar ítem: {str(e)}"
            )
    
    def _add_item_internal(
        self,
        venta_id: int,
        codigo_barras: str,
        cantidad: int
    ) -> VentaDetalle:
        """
        Método interno para agregar un ítem.
        Valida stock con SELECT FOR UPDATE y crea el detalle.
        
        NO hace commit - debe usarse dentro de una transacción.
        """
        # Buscar producto por código de barras
        variante = self.producto_repo.get_variante_by_codigo_barras(codigo_barras)
        
        if not variante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con código de barras '{codigo_barras}' no encontrado"
            )
        
        # Validar stock con SELECT FOR UPDATE (lock exclusivo)
        inventario = self.inventario_repo.get_by_variante_id_with_lock(variante.id)
        
        if not inventario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventario no encontrado para producto '{variante.producto.nombre}'"
            )
        
        if inventario.stock < cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente. Disponible: {inventario.stock}, Requerido: {cantidad}"
            )
        
        # Determinar precio según cantidad (menudeo vs mayoreo)
        # Por ahora usamos menudeo, la lógica de acumulado se implementará en siguiente fase
        precio_unitario = variante.precio_menudeo
        subtotal = precio_unitario * cantidad
        
        # Crear detalle de venta (ALINEADO: sin descuento en detalle)
        detalle = VentaDetalle(
            venta_id=venta_id,
            variante_id=variante.id,
            cantidad=cantidad,
            precio_unitario=precio_unitario,
            subtotal=subtotal
        )
        
        detalle = self.venta_repo.add_detalle(detalle)
        
        # NOTA: Los triggers de PostgreSQL actualizan inventario automáticamente
        # al insertar venta_detalle (ver fn_descuento_inventario en docs/almacen_db.sql)
        # Por lo tanto NO actualizamos el stock manualmente aquí
        
        return detalle
    
    def get_venta(self, venta_id: int) -> VentaResponse:
        """Obtener una venta por ID."""
        venta = self.venta_repo.get_by_id(venta_id)
        
        if not venta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Venta {venta_id} no encontrada"
            )
        
        return VentaResponse.model_validate(venta)
    
    def list_ventas(
        self,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[EstadoVentaEnum] = None
    ) -> List[VentaResponse]:
        """Listar ventas con filtros."""
        ventas = self.venta_repo.list_ventas(skip=skip, limit=limit, estado=estado)
        return [VentaResponse.model_validate(v) for v in ventas]
    
    def completar_venta(self, venta_id: int) -> VentaResponse:
        """Cerrar una venta abierta."""
        try:
            success = self.venta_repo.completar_venta(venta_id)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Venta {venta_id} no encontrada"
                )
            
            self.db.commit()
            
            venta = self.venta_repo.get_by_id(venta_id)
            return VentaResponse.model_validate(venta)
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al completar venta: {str(e)}"
            )
    
    def cancelar_venta(self, venta_id: int) -> VentaResponse:
        """Cancelar una venta abierta."""
        try:
            success = self.venta_repo.cancelar_venta(venta_id)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Venta {venta_id} no encontrada"
                )
            
            self.db.commit()
            
            venta = self.venta_repo.get_by_id(venta_id)
            return VentaResponse.model_validate(venta)
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al cancelar venta: {str(e)}"
            )
