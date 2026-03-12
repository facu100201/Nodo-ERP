from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ──────────────────────────────────────────
# EMPLEADO
# ──────────────────────────────────────────

class EmpleadoCreate(BaseModel):
    usuario_id: int
    departamento: str = Field(..., min_length=1, max_length=100)
    puesto: str = Field(..., min_length=1, max_length=100)
    salario_mensual: Decimal = Field(..., ge=0)
    fecha_ingreso: datetime
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class EmpleadoUpdate(BaseModel):
    departamento: Optional[str] = Field(None, max_length=100)
    puesto: Optional[str] = Field(None, max_length=100)
    salario_mensual: Optional[Decimal] = Field(None, ge=0)
    fecha_ingreso: Optional[datetime] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None


class EmpleadoResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    usuario_rol: Optional[str] = None
    departamento: str
    puesto: str
    salario_mensual: Decimal
    fecha_ingreso: datetime
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# NÓMINA
# ──────────────────────────────────────────

class DetalleNominaCreate(BaseModel):
    empleado_id: int
    salario_base: Decimal = Field(..., ge=0)
    deducciones: Decimal = Field(default=Decimal("0"), ge=0)
    notas: Optional[str] = None


class DetalleNominaResponse(BaseModel):
    id: int
    empleado_id: int
    empleado_nombre: Optional[str] = None
    empleado_puesto: Optional[str] = None
    salario_base: Decimal
    deducciones: Decimal
    salario_neto: Decimal
    notas: Optional[str] = None

    class Config:
        from_attributes = True


class PeriodoNominaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    fecha_inicio: datetime
    fecha_fin: datetime
    detalles: List[DetalleNominaCreate] = []


class PeriodoNominaResponse(BaseModel):
    id: int
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: str
    total_bruto: Decimal
    total_empleados: int
    creado_por: int
    creado_en: datetime
    detalles: List[DetalleNominaResponse] = []

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# LOG DE ACCESO
# ──────────────────────────────────────────

class LogAccesoResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: Optional[str] = None
    accion: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    detalles: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# VENTAS POR SESIÓN (agregado)
# ──────────────────────────────────────────

class VentasSesionResponse(BaseModel):
    usuario_id: int
    usuario_nombre: str
    total_ventas: int
    total_monto: Decimal
    promedio_venta: Decimal
    fecha: Optional[str] = None


# ──────────────────────────────────────────
# KPIs / RESUMEN
# ──────────────────────────────────────────

class RRHHResumenResponse(BaseModel):
    total_empleados_activos: int
    capital_mensual_nomina: Decimal
    logs_hoy: int
    ventas_hoy_total: Decimal
    ventas_hoy_operaciones: int
