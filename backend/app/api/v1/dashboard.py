from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.usuario import Usuario
from app.models.venta import Venta
from app.models.inventario import Inventario
from app.models.producto import VarianteProducto
from app.models.cliente import Cliente, CuentaPorCobrar
from app.models.empleado import Empleado, PeriodoNomina, DetalleNomina

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

MESES_ABREV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
               'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
TALLA_LABELS = {
    'S': 'Chica (S)', 'M': 'Mediana (M)',
    'L': 'Grande (L / XL)', 'XL': 'Grande (L / XL)',
    'XXL': 'Extra Grande (XXL)',
}


class KPIResumen(BaseModel):
    ingresos_mensuales: float
    variacion_ingresos_pct: Optional[float]
    ordenes_pendientes: int
    inventario_total: int
    clientes_activos: int
    nuevos_clientes_mes: int


class FinanzasDetalle(BaseModel):
    ingreso_mes: float
    cuentas_por_cobrar: float
    gastos_operativos: float


class VentasCRMDetalle(BaseModel):
    nuevos_clientes_mes: int
    tasa_conversion: float
    pedidos_b2b: int


class LogisticaDetalle(BaseModel):
    alertas_stock_bajo: int
    envios_transito: int
    devoluciones_pendientes: int


class RRHHDetalle(BaseModel):
    empleados_activos: int
    proxima_nomina: str
    solicitudes_vacaciones_pendientes: int


class IngresosMes(BaseModel):
    etiqueta: str
    ingreso: float


class DistribucionTalla(BaseModel):
    name: str
    value: float


class DashboardResumen(BaseModel):
    kpis: KPIResumen
    finanzas: FinanzasDetalle
    ventas_crm: VentasCRMDetalle
    logistica: LogisticaDetalle
    rrhh: RRHHDetalle
    ingresos_chart: List[IngresosMes]
    distribucion_talla: List[DistribucionTalla]


@router.get("/resumen", response_model=DashboardResumen)
def resumen_dashboard(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """KPIs y datos del resumen general del ERP."""
    now = datetime.now()
    mes = now.month
    anio = now.year
    mes_ant = mes - 1 if mes > 1 else 12
    anio_ant = anio if mes > 1 else anio - 1

    # ── Ingresos mensuales (ventas CERRADAS del mes actual)
    ingresos_mes = float(
        db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
            extract('month', Venta.creada_en) == mes,
            extract('year', Venta.creada_en) == anio,
            Venta.estado == 'CERRADA',
        ).scalar() or 0
    )

    ingresos_mes_ant = float(
        db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
            extract('month', Venta.creada_en) == mes_ant,
            extract('year', Venta.creada_en) == anio_ant,
            Venta.estado == 'CERRADA',
        ).scalar() or 0
    )

    variacion = None
    if ingresos_mes_ant > 0:
        variacion = round((ingresos_mes - ingresos_mes_ant) / ingresos_mes_ant * 100, 1)

    # ── Órdenes pendientes (ventas ABIERTA)
    ordenes_pendientes = int(
        db.query(func.count(Venta.id)).filter(Venta.estado == 'ABIERTA').scalar() or 0
    )

    # ── Inventario total (suma de stock)
    inventario_total = int(
        db.query(func.coalesce(func.sum(Inventario.stock), 0)).scalar() or 0
    )

    # ── Clientes activos
    clientes_activos = int(
        db.query(func.count(Cliente.id)).filter(Cliente.activo == True).scalar() or 0
    )

    # ── Nuevos clientes este mes
    nuevos_clientes_mes = int(
        db.query(func.count(Cliente.id)).filter(
            extract('month', Cliente.creado_en) == mes,
            extract('year', Cliente.creado_en) == anio,
        ).scalar() or 0
    )

    # ── Cuentas por cobrar pendientes
    cuentas_por_cobrar = float(
        db.query(func.coalesce(func.sum(CuentaPorCobrar.saldo_pendiente), 0)).filter(
            CuentaPorCobrar.estado == 'PENDIENTE'
        ).scalar() or 0
    )

    # ── Gastos operativos (nómina del mes como proxy)
    gastos_operativos = float(
        db.query(func.coalesce(func.sum(DetalleNomina.salario_neto), 0))
        .join(PeriodoNomina, PeriodoNomina.id == DetalleNomina.periodo_id)
        .filter(
            extract('month', PeriodoNomina.fecha_inicio) == mes,
            extract('year', PeriodoNomina.fecha_inicio) == anio,
        ).scalar() or 0
    )

    # ── Tasa de conversión (ventas CERRADAS / total ventas del mes)
    total_ventas_mes = int(
        db.query(func.count(Venta.id)).filter(
            extract('month', Venta.creada_en) == mes,
            extract('year', Venta.creada_en) == anio,
        ).scalar() or 0
    )
    ventas_cerradas_mes = int(
        db.query(func.count(Venta.id)).filter(
            extract('month', Venta.creada_en) == mes,
            extract('year', Venta.creada_en) == anio,
            Venta.estado == 'CERRADA',
        ).scalar() or 0
    )
    tasa_conversion = round(ventas_cerradas_mes / total_ventas_mes * 100, 1) if total_ventas_mes > 0 else 0.0

    # ── Pedidos B2B (cuentas por cobrar activas)
    pedidos_b2b = int(
        db.query(func.count(CuentaPorCobrar.id)).filter(
            CuentaPorCobrar.estado == 'PENDIENTE'
        ).scalar() or 0
    )

    # ── Alertas stock bajo (stock <= 10)
    alertas_stock_bajo = int(
        db.query(func.count(Inventario.id)).filter(Inventario.stock <= 10).scalar() or 0
    )

    # ── Empleados activos
    empleados_activos = int(
        db.query(func.count(Empleado.id)).filter(Empleado.activo == True).scalar() or 0
    )

    # ── Próxima nómina (primer período BORRADOR por fecha)
    proxima_nom = (
        db.query(PeriodoNomina)
        .filter(PeriodoNomina.estado == 'BORRADOR')
        .order_by(PeriodoNomina.fecha_fin)
        .first()
    )
    if proxima_nom:
        fd = proxima_nom.fecha_fin
        if hasattr(fd, 'date'):
            fd = fd.date()
        proxima_nomina_str = f"{fd.day} {MESES_ES[fd.month - 1]}"
    else:
        proxima_nomina_str = "Sin programar"

    # ── Gráfica: ingresos mensuales (últimos 6 meses)
    ingresos_chart = []
    for i in range(5, -1, -1):
        m = mes - i
        a = anio
        if m <= 0:
            m += 12
            a -= 1
        total_m = float(
            db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
                extract('month', Venta.creada_en) == m,
                extract('year', Venta.creada_en) == a,
                Venta.estado == 'CERRADA',
            ).scalar() or 0
        )
        ingresos_chart.append(IngresosMes(etiqueta=MESES_ABREV[m - 1], ingreso=total_m))

    # ── Distribución de inventario por talla
    talla_rows = (
        db.query(VarianteProducto.talla, func.sum(Inventario.stock).label('total'))
        .join(Inventario, Inventario.variante_id == VarianteProducto.id)
        .group_by(VarianteProducto.talla)
        .all()
    )
    total_stock_tallas = sum(float(r.total or 0) for r in talla_rows) or 1
    talla_map: dict = {}
    for row in talla_rows:
        label = TALLA_LABELS.get(row.talla or '', row.talla or 'Sin talla')
        pct = round(float(row.total or 0) / total_stock_tallas * 100, 1)
        talla_map[label] = talla_map.get(label, 0) + pct

    distribucion_talla = [DistribucionTalla(name=k, value=v) for k, v in talla_map.items()]
    if not distribucion_talla:
        distribucion_talla = [
            DistribucionTalla(name='Chica (S)', value=40),
            DistribucionTalla(name='Mediana (M)', value=35),
            DistribucionTalla(name='Grande (L / XL)', value=25),
        ]

    return DashboardResumen(
        kpis=KPIResumen(
            ingresos_mensuales=ingresos_mes,
            variacion_ingresos_pct=variacion,
            ordenes_pendientes=ordenes_pendientes,
            inventario_total=inventario_total,
            clientes_activos=clientes_activos,
            nuevos_clientes_mes=nuevos_clientes_mes,
        ),
        finanzas=FinanzasDetalle(
            ingreso_mes=ingresos_mes,
            cuentas_por_cobrar=cuentas_por_cobrar,
            gastos_operativos=gastos_operativos,
        ),
        ventas_crm=VentasCRMDetalle(
            nuevos_clientes_mes=nuevos_clientes_mes,
            tasa_conversion=tasa_conversion,
            pedidos_b2b=pedidos_b2b,
        ),
        logistica=LogisticaDetalle(
            alertas_stock_bajo=alertas_stock_bajo,
            envios_transito=0,
            devoluciones_pendientes=0,
        ),
        rrhh=RRHHDetalle(
            empleados_activos=empleados_activos,
            proxima_nomina=proxima_nomina_str,
            solicitudes_vacaciones_pendientes=0,
        ),
        ingresos_chart=ingresos_chart,
        distribucion_talla=distribucion_talla,
    )
