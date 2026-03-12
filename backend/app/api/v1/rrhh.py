from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import require_admin
from app.models.usuario import Usuario
from app.services.rrhh_service import RRHHService
from app.schemas.rrhh import (
    EmpleadoCreate,
    EmpleadoUpdate,
    EmpleadoResponse,
    PeriodoNominaCreate,
    PeriodoNominaResponse,
    LogAccesoResponse,
    VentasSesionResponse,
    RRHHResumenResponse,
)

router = APIRouter(prefix="/rrhh", tags=["Recursos Humanos"])


# ──────────────────────────────────────────────────
# KPIs / RESUMEN
# ──────────────────────────────────────────────────

@router.get("/resumen", response_model=RRHHResumenResponse)
def resumen_rrhh(
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """KPIs principales del módulo de RRHH."""
    service = RRHHService(db)
    return service.resumen()


# ──────────────────────────────────────────────────
# EMPLEADOS
# ──────────────────────────────────────────────────

@router.get("/empleados", response_model=List[EmpleadoResponse])
def listar_empleados(
    solo_activos: bool = Query(False),
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos los empleados (con datos de usuario)."""
    service = RRHHService(db)
    return service.listar_empleados(solo_activos=solo_activos)


@router.get("/empleados/{empleado_id}", response_model=EmpleadoResponse)
def obtener_empleado(
    empleado_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = RRHHService(db)
    return service.obtener_empleado(empleado_id)


@router.post("/empleados", response_model=EmpleadoResponse, status_code=201)
def crear_empleado(
    data: EmpleadoCreate,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crea un perfil de empleado vinculado a un usuario existente."""
    service = RRHHService(db)
    return service.crear_empleado(data)


@router.patch("/empleados/{empleado_id}", response_model=EmpleadoResponse)
def actualizar_empleado(
    empleado_id: int,
    data: EmpleadoUpdate,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = RRHHService(db)
    return service.actualizar_empleado(empleado_id, data)


# ──────────────────────────────────────────────────
# NÓMINAS
# ──────────────────────────────────────────────────

@router.get("/nominas", response_model=List[PeriodoNominaResponse])
def listar_nominas(
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos los períodos de nómina."""
    service = RRHHService(db)
    return service.listar_periodos()


@router.get("/nominas/{periodo_id}", response_model=PeriodoNominaResponse)
def obtener_nomina(
    periodo_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = RRHHService(db)
    return service.obtener_periodo(periodo_id)


@router.post("/nominas", response_model=PeriodoNominaResponse, status_code=201)
def crear_nomina(
    data: PeriodoNominaCreate,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crea un período de nómina con sus detalles por empleado."""
    service = RRHHService(db)
    return service.crear_periodo(data, creado_por=current_user.id)


@router.post("/nominas/{periodo_id}/cerrar", response_model=PeriodoNominaResponse)
def cerrar_nomina(
    periodo_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cierra (congela) un período de nómina."""
    service = RRHHService(db)
    return service.cerrar_periodo(periodo_id)


# ──────────────────────────────────────────────────
# LOGS DE ACCESO
# ──────────────────────────────────────────────────

@router.get("/logs", response_model=List[LogAccesoResponse])
def listar_logs(
    usuario_id: Optional[int] = Query(None),
    accion: Optional[str] = Query(None, description="LOGIN o LOGOUT"),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Logs de acceso al sistema con filtros."""
    service = RRHHService(db)
    return service.listar_logs(
        usuario_id=usuario_id,
        accion=accion,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        skip=skip,
        limit=limit,
    )


# ──────────────────────────────────────────────────
# VENTAS POR SESIÓN
# ──────────────────────────────────────────────────

@router.get("/ventas-sesion", response_model=List[VentasSesionResponse])
def ventas_por_sesion(
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Ventas y montos agrupados por vendedor en el período indicado."""
    service = RRHHService(db)
    return service.ventas_por_sesion(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
