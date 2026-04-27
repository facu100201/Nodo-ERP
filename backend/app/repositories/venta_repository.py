from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime
from app.models.venta import Venta, VentaDetalle, EstadoVentaEnum


class VentaRepository:
    """Repositorio para operaciones de Venta."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, venta: Venta) -> Venta:
        """Crear una nueva venta usando SQL directo (evita FK a puntos_venta sin modelo ORM)."""
        result = self.db.execute(
            text("""
                INSERT INTO ventas (punto_venta_id, usuario_id, metodo_pago, estado,
                                    subtotal, descuento, impuesto, total)
                VALUES (:pvid, :uid, :metodo, :estado, 0, 0, 0, 0)
                RETURNING id
            """),
            {
                "pvid": venta.punto_venta_id,
                "uid": venta.usuario_id,
                "metodo": venta.metodo_pago,
                "estado": venta.estado,
            }
        )
        new_id = result.scalar()
        return self.get_by_id(new_id)
    
    def get_by_id(self, venta_id: int) -> Optional[Venta]:
        """
        Obtener venta por ID con sus detalles.
        """
        return self.db.query(Venta).options(
            joinedload(Venta.detalles)
        ).filter(
            Venta.id == venta_id
        ).first()
    
    def get_by_id_with_lock(self, venta_id: int) -> Optional[Venta]:
        """
        Obtener venta por ID con lock para actualización.
        Usa SELECT FOR UPDATE.
        """
        return self.db.query(Venta).filter(
            Venta.id == venta_id
        ).with_for_update().first()
    
    def add_detalle(self, detalle: VentaDetalle) -> VentaDetalle:
        """Agregar un detalle a una venta usando SQL directo."""
        result = self.db.execute(
            text("""
                INSERT INTO venta_detalle (venta_id, variante_id, cantidad, precio_unitario, subtotal)
                VALUES (:vid, :varid, :qty, :precio, :sub)
                RETURNING id
            """),
            {
                "vid": detalle.venta_id,
                "varid": detalle.variante_id,
                "qty": detalle.cantidad,
                "precio": detalle.precio_unitario,
                "sub": detalle.subtotal,
            }
        )
        new_id = result.scalar()
        return self.db.query(VentaDetalle).filter(VentaDetalle.id == new_id).first()
    
    def update_totales(
        self,
        venta_id: int,
        subtotal: float,
        descuento: float,
        impuesto: float,
        total: float
    ) -> bool:
        """Actualizar totales de una venta usando SQL directo."""
        result = self.db.execute(
            text("""
                UPDATE ventas
                SET subtotal=:sub, descuento=:desc, impuesto=:imp, total=:tot
                WHERE id=:vid
            """),
            {"sub": subtotal, "desc": descuento, "imp": impuesto, "tot": total, "vid": venta_id}
        )
        return result.rowcount > 0

    def completar_venta(self, venta_id: int) -> bool:
        """Marcar una venta como cerrada usando SQL directo."""
        result = self.db.execute(
            text("UPDATE ventas SET estado='CERRADA', completed_at=now() WHERE id=:vid"),
            {"vid": venta_id}
        )
        return result.rowcount > 0

    def cancelar_venta(self, venta_id: int) -> bool:
        """Cancelar una venta usando SQL directo."""
        result = self.db.execute(
            text("UPDATE ventas SET estado='CANCELADA' WHERE id=:vid"),
            {"vid": venta_id}
        )
        return result.rowcount > 0
    
    def list_ventas(
        self,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[EstadoVentaEnum] = None
    ) -> List[Venta]:
        """Listar ventas con paginación."""
        query = self.db.query(Venta).options(
            joinedload(Venta.detalles)
        )
        
        if estado:
            query = query.filter(Venta.estado == estado.value)
        
        return query.order_by(Venta.creada_en.desc()).offset(skip).limit(limit).all()
