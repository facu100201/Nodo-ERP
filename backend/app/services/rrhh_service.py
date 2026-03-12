from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.repositories.rrhh_repository import RRHHRepository
from app.models.empleado import Empleado, PeriodoNomina, DetalleNomina, LogAcceso
from app.schemas.rrhh import (
    EmpleadoCreate,
    EmpleadoUpdate,
    EmpleadoResponse,
    PeriodoNominaCreate,
    PeriodoNominaResponse,
    DetalleNominaResponse,
    LogAccesoResponse,
    VentasSesionResponse,
    RRHHResumenResponse,
)


class RRHHService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RRHHRepository(db)

    # ──────────────────────── EMPLEADOS ────────────────────────

    def listar_empleados(self, solo_activos: bool = False) -> List[EmpleadoResponse]:
        rows = self.repo.get_empleados(solo_activos=solo_activos)
        return [self._build_empleado_response(emp, usr) for emp, usr in rows]

    def obtener_empleado(self, empleado_id: int) -> EmpleadoResponse:
        row = self.repo.get_empleado_by_id(empleado_id)
        if not row:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        emp, usr = row
        return self._build_empleado_response(emp, usr)

    def crear_empleado(self, data: EmpleadoCreate) -> EmpleadoResponse:
        if self.repo.get_empleado_by_usuario_id(data.usuario_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este usuario ya tiene un perfil de empleado",
            )
        emp = Empleado(
            usuario_id=data.usuario_id,
            departamento=data.departamento,
            puesto=data.puesto,
            salario_mensual=data.salario_mensual,
            fecha_ingreso=data.fecha_ingreso,
            telefono=data.telefono,
            direccion=data.direccion,
        )
        emp = self.repo.crear_empleado(emp)
        row = self.repo.get_empleado_by_id(emp.id)
        emp, usr = row
        return self._build_empleado_response(emp, usr)

    def actualizar_empleado(self, empleado_id: int, data: EmpleadoUpdate) -> EmpleadoResponse:
        row = self.repo.get_empleado_by_id(empleado_id)
        if not row:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        emp, usr = row
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(emp, field, value)
        emp = self.repo.actualizar_empleado(emp)
        row = self.repo.get_empleado_by_id(emp.id)
        emp, usr = row
        return self._build_empleado_response(emp, usr)

    def _build_empleado_response(self, emp: Empleado, usr) -> EmpleadoResponse:
        return EmpleadoResponse(
            id=emp.id,
            usuario_id=emp.usuario_id,
            usuario_nombre=usr.nombre if usr else None,
            usuario_email=usr.email if usr else None,
            usuario_rol=str(usr.rol_id) if usr else None,
            departamento=emp.departamento,
            puesto=emp.puesto,
            salario_mensual=emp.salario_mensual,
            fecha_ingreso=emp.fecha_ingreso,
            telefono=emp.telefono,
            direccion=emp.direccion,
            activo=emp.activo,
            creado_en=emp.creado_en,
        )

    # ──────────────────────── NÓMINAS ────────────────────────

    def listar_periodos(self) -> List[PeriodoNominaResponse]:
        periodos = self.repo.get_periodos()
        return [self._build_periodo_response(p) for p in periodos]

    def obtener_periodo(self, periodo_id: int) -> PeriodoNominaResponse:
        p = self.repo.get_periodo_by_id(periodo_id)
        if not p:
            raise HTTPException(status_code=404, detail="Período de nómina no encontrado")
        return self._build_periodo_response(p)

    def crear_periodo(self, data: PeriodoNominaCreate, creado_por: int) -> PeriodoNominaResponse:
        if data.fecha_fin <= data.fecha_inicio:
            raise HTTPException(
                status_code=400,
                detail="fecha_fin debe ser posterior a fecha_inicio",
            )

        total_bruto = Decimal("0")
        detalles_obj = []

        for d in data.detalles:
            neto = d.salario_base - d.deducciones
            if neto < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"El salario neto del empleado {d.empleado_id} es negativo",
                )
            total_bruto += d.salario_base
            detalles_obj.append(
                DetalleNomina(
                    empleado_id=d.empleado_id,
                    salario_base=d.salario_base,
                    deducciones=d.deducciones,
                    salario_neto=neto,
                    notas=d.notas,
                )
            )

        periodo = PeriodoNomina(
            nombre=data.nombre,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            estado="BORRADOR",
            total_bruto=total_bruto,
            total_empleados=len(detalles_obj),
            creado_por=creado_por,
        )
        periodo = self.repo.crear_periodo(periodo)

        for det in detalles_obj:
            det.periodo_id = periodo.id
            self.repo.crear_detalle_nomina(det)
        self.db.commit()

        periodo = self.repo.get_periodo_by_id(periodo.id)
        return self._build_periodo_response(periodo)

    def cerrar_periodo(self, periodo_id: int) -> PeriodoNominaResponse:
        p = self.repo.get_periodo_by_id(periodo_id)
        if not p:
            raise HTTPException(status_code=404, detail="Período de nómina no encontrado")
        if p.estado == "CERRADO":
            raise HTTPException(status_code=400, detail="El período ya está cerrado")
        p = self.repo.cerrar_periodo(p)
        return self._build_periodo_response(p)

    def _build_periodo_response(self, p: PeriodoNomina) -> PeriodoNominaResponse:
        detalles = []
        for d in (p.detalles or []):
            emp_nombre = None
            emp_puesto = None
            if d.empleado:
                emp_nombre_row = self.repo.get_empleado_by_id(d.empleado_id)
                if emp_nombre_row:
                    _, usr = emp_nombre_row
                    emp_nombre = usr.nombre if usr else None
                emp_puesto = d.empleado.puesto
            detalles.append(
                DetalleNominaResponse(
                    id=d.id,
                    empleado_id=d.empleado_id,
                    empleado_nombre=emp_nombre,
                    empleado_puesto=emp_puesto,
                    salario_base=d.salario_base,
                    deducciones=d.deducciones,
                    salario_neto=d.salario_neto,
                    notas=d.notas,
                )
            )
        return PeriodoNominaResponse(
            id=p.id,
            nombre=p.nombre,
            fecha_inicio=p.fecha_inicio,
            fecha_fin=p.fecha_fin,
            estado=p.estado,
            total_bruto=p.total_bruto,
            total_empleados=p.total_empleados,
            creado_por=p.creado_por,
            creado_en=p.creado_en,
            detalles=detalles,
        )

    # ──────────────────────── LOGS DE ACCESO ────────────────────────

    def registrar_log(
        self,
        usuario_id: int,
        accion: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        detalles: Optional[str] = None,
    ) -> None:
        log = LogAcceso(
            usuario_id=usuario_id,
            accion=accion.upper(),
            ip_address=ip_address,
            user_agent=user_agent,
            detalles=detalles,
        )
        self.repo.registrar_log(log)

    def listar_logs(
        self,
        usuario_id: Optional[int] = None,
        accion: Optional[str] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[LogAccesoResponse]:
        rows = self.repo.get_logs(
            usuario_id=usuario_id,
            accion=accion,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            skip=skip,
            limit=limit,
        )
        return [
            LogAccesoResponse(
                id=log.id,
                usuario_id=log.usuario_id,
                usuario_nombre=usr.nombre if usr else None,
                accion=log.accion,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                detalles=log.detalles,
                timestamp=log.timestamp,
            )
            for log, usr in rows
        ]

    # ──────────────────────── VENTAS POR SESIÓN ────────────────────────

    def ventas_por_sesion(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
    ) -> List[VentasSesionResponse]:
        rows = self.repo.ventas_por_usuario(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
        return [
            VentasSesionResponse(
                usuario_id=row.usuario_id,
                usuario_nombre=row.usuario_nombre,
                total_ventas=row.total_ventas,
                total_monto=Decimal(str(row.total_monto or 0)),
                promedio_venta=Decimal(str(row.promedio_venta or 0)),
            )
            for row in rows
        ]

    # ──────────────────────── RESUMEN / KPIs ────────────────────────

    def resumen(self) -> RRHHResumenResponse:
        ventas_hoy = self.repo.ventas_hoy_resumen()
        return RRHHResumenResponse(
            total_empleados_activos=self.repo.contar_activos(),
            capital_mensual_nomina=Decimal(str(self.repo.capital_mensual())),
            logs_hoy=self.repo.contar_logs_hoy(),
            ventas_hoy_total=Decimal(str(ventas_hoy.total if ventas_hoy else 0)),
            ventas_hoy_operaciones=int(ventas_hoy.operaciones if ventas_hoy else 0),
        )
