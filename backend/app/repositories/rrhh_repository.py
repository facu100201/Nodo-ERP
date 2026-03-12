from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import List, Optional
from datetime import datetime, date

from app.models.empleado import Empleado, PeriodoNomina, DetalleNomina, LogAcceso
from app.models.usuario import Usuario
from app.models.venta import Venta


class RRHHRepository:
    def __init__(self, db: Session):
        self.db = db

    # ──────────────────────── EMPLEADOS ────────────────────────

    def get_empleados(self, solo_activos: bool = False) -> List:
        q = (
            self.db.query(Empleado, Usuario)
            .join(Usuario, Empleado.usuario_id == Usuario.id)
        )
        if solo_activos:
            q = q.filter(Empleado.activo == True)
        return q.order_by(Empleado.id).all()

    def get_empleado_by_id(self, empleado_id: int):
        return (
            self.db.query(Empleado, Usuario)
            .join(Usuario, Empleado.usuario_id == Usuario.id)
            .filter(Empleado.id == empleado_id)
            .first()
        )

    def get_empleado_by_usuario_id(self, usuario_id: int) -> Optional[Empleado]:
        return self.db.query(Empleado).filter(Empleado.usuario_id == usuario_id).first()

    def crear_empleado(self, empleado: Empleado) -> Empleado:
        self.db.add(empleado)
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def actualizar_empleado(self, empleado: Empleado) -> Empleado:
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def contar_activos(self) -> int:
        return self.db.query(Empleado).filter(Empleado.activo == True).count()

    def capital_mensual(self) -> float:
        result = (
            self.db.query(func.sum(Empleado.salario_mensual))
            .filter(Empleado.activo == True)
            .scalar()
        )
        return float(result or 0)

    # ──────────────────────── NÓMINAS ────────────────────────

    def get_periodos(self) -> List[PeriodoNomina]:
        return self.db.query(PeriodoNomina).order_by(PeriodoNomina.fecha_inicio.desc()).all()

    def get_periodo_by_id(self, periodo_id: int) -> Optional[PeriodoNomina]:
        return self.db.query(PeriodoNomina).filter(PeriodoNomina.id == periodo_id).first()

    def crear_periodo(self, periodo: PeriodoNomina) -> PeriodoNomina:
        self.db.add(periodo)
        self.db.commit()
        self.db.refresh(periodo)
        return periodo

    def cerrar_periodo(self, periodo: PeriodoNomina) -> PeriodoNomina:
        periodo.estado = "CERRADO"
        self.db.commit()
        self.db.refresh(periodo)
        return periodo

    def crear_detalle_nomina(self, detalle: DetalleNomina) -> DetalleNomina:
        self.db.add(detalle)
        self.db.flush()
        return detalle

    # ──────────────────────── LOGS DE ACCESO ────────────────────────

    def registrar_log(self, log: LogAcceso) -> LogAcceso:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_logs(
        self,
        usuario_id: Optional[int] = None,
        accion: Optional[str] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List:
        q = (
            self.db.query(LogAcceso, Usuario)
            .join(Usuario, LogAcceso.usuario_id == Usuario.id)
        )
        if usuario_id:
            q = q.filter(LogAcceso.usuario_id == usuario_id)
        if accion:
            q = q.filter(LogAcceso.accion == accion.upper())
        if fecha_desde:
            q = q.filter(LogAcceso.timestamp >= fecha_desde)
        if fecha_hasta:
            q = q.filter(LogAcceso.timestamp <= fecha_hasta)
        return q.order_by(LogAcceso.timestamp.desc()).offset(skip).limit(limit).all()

    def contar_logs_hoy(self) -> int:
        hoy = date.today()
        return (
            self.db.query(LogAcceso)
            .filter(cast(LogAcceso.timestamp, Date) == hoy)
            .count()
        )

    # ──────────────────────── VENTAS POR SESIÓN ────────────────────────

    def ventas_por_usuario(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
    ) -> List:
        """Agrupa ventas CERRADAS por usuario para el período dado."""
        q = (
            self.db.query(
                Venta.usuario_id,
                Usuario.nombre.label("usuario_nombre"),
                func.count(Venta.id).label("total_ventas"),
                func.sum(Venta.total).label("total_monto"),
                func.avg(Venta.total).label("promedio_venta"),
            )
            .join(Usuario, Venta.usuario_id == Usuario.id)
            .filter(Venta.estado == "CERRADA")
        )
        if fecha_desde:
            naive_desde = fecha_desde.replace(tzinfo=None) if fecha_desde.tzinfo else fecha_desde
            q = q.filter(Venta.creada_en >= naive_desde)
        if fecha_hasta:
            naive_hasta = fecha_hasta.replace(tzinfo=None) if fecha_hasta.tzinfo else fecha_hasta
            q = q.filter(Venta.creada_en <= naive_hasta)
        return q.group_by(Venta.usuario_id, Usuario.nombre).order_by(func.sum(Venta.total).desc()).all()

    def ventas_hoy_resumen(self):
        hoy = date.today()
        result = (
            self.db.query(
                func.count(Venta.id).label("operaciones"),
                func.coalesce(func.sum(Venta.total), 0).label("total"),
            )
            .filter(Venta.estado == "CERRADA")
            .filter(cast(Venta.creada_en, Date) == hoy)
            .first()
        )
        return result
