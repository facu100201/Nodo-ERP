import React, { useState, useEffect } from 'react';
import { salesService, inventoryService, dashboardService } from '../../services/apiService';
import { formatearMoneda } from '../../utils/helpers';
import { COLORES } from '../../utils/constants';
import { DollarSign, AlertTriangle, Package, ShoppingCart, BarChart3, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button, StatCardSkeleton, TableSkeleton } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function getChartColors() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    grid: dark ? 'rgba(56,189,248,0.15)' : COLORES.HIGHLIGHT,
    text: dark ? '#94a3b8' : COLORES.PRIMARY,
    tick: dark ? '#f0f9ff' : '#333',
    tooltipBg: dark ? '#161e2e' : COLORES.BG_MAIN,
    tooltipBorder: dark ? 'rgba(56,189,248,0.2)' : COLORES.HIGHLIGHT,
  };
}

function getMesActual() {
  const now = new Date();
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${MESES[now.getMonth()]} ${now.getFullYear()}`;
}

function Dashboard() {
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [rangoTiempoIngresos, setRangoTiempoIngresos] = useState('24h');
  const [rangoInforme, setRangoInforme] = useState('mes');
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick(t => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Cargar KPIs del dashboard, ventas recientes y stock bajo en paralelo
      const [dashData, salesData, lowStockData] = await Promise.all([
        dashboardService.resumen().catch(() => null),
        salesService.getAll({ limit: 5 }).catch(() => []),
        inventoryService.getLowStock().catch(() => []),
      ]);

      if (dashData) setDashboardData(dashData);
      setRecentSales(salesData);
      setLowStock(lowStockData);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── KPIs derivados de la API (con fallbacks a 0 si aún no cargó)
  const kpis = dashboardData?.kpis;
  const variacionText = kpis?.variacion_ingresos_pct != null
    ? `${kpis.variacion_ingresos_pct > 0 ? '+' : ''}${kpis.variacion_ingresos_pct}% vs mes anterior`
    : 'Sin comparativa';

  const resumenGeneral = {
    ingresosMensuales: kpis?.ingresos_mensuales ?? 0,
    ordenesPendientes: kpis?.ordenes_pendientes ?? 0,
    inventarioTotal: kpis?.inventario_total ?? 0,
    cuentasActivas: kpis?.clientes_activos ?? 0,
    variacionIngresos: variacionText,
    ordenesAtencionTexto: `${Math.floor((kpis?.ordenes_pendientes ?? 0) * 0.27)} requieren atención`,
    inventarioCriticoTexto: `${dashboardData?.logistica?.alertas_stock_bajo ?? 0} SKUs en nivel crítico`,
    cuentasActivasTexto: `+${kpis?.nuevos_clientes_mes ?? 0} nuevos este mes`,
  };

  const finanzasDetalle = {
    ingresoMes: dashboardData?.finanzas?.ingreso_mes ?? 0,
    cuentasPorCobrar: dashboardData?.finanzas?.cuentas_por_cobrar ?? 0,
    gastosOperativos: -(dashboardData?.finanzas?.gastos_operativos ?? 0),
  };

  const ventasCrmDetalle = {
    nuevosClientesMes: dashboardData?.ventas_crm?.nuevos_clientes_mes ?? 0,
    tasaConversion: dashboardData?.ventas_crm?.tasa_conversion ?? 0,
    pedidosB2B: dashboardData?.ventas_crm?.pedidos_b2b ?? 0,
  };

  const logisticaDetalle = {
    alertasStockBajo: dashboardData?.logistica?.alertas_stock_bajo ?? 0,
    enviosTransito: dashboardData?.logistica?.envios_transito ?? 0,
    devolucionesPendientes: dashboardData?.logistica?.devoluciones_pendientes ?? 0,
  };

  const rrhhDetalle = {
    empleadosActivos: dashboardData?.rrhh?.empleados_activos ?? 0,
    proximaNomina: dashboardData?.rrhh?.proxima_nomina ?? 'Sin programar',
    solicitudesVacacionesPendientes: dashboardData?.rrhh?.solicitudes_vacaciones_pendientes ?? 0,
  };

  // ── Datos de gráficas (API cuando está disponible, fallback hardcoded)
  const ingresosChartData = dashboardData?.ingresos_chart ?? [];

  const distribucionInventarioTalla = dashboardData?.distribucion_talla ?? [
    { name: 'Chica (S)', value: 40 },
    { name: 'Mediana (M)', value: 35 },
    { name: 'Grande (L / XL)', value: 25 },
  ];

  const DISTRIBUCION_COLORES = [
    COLORES.PRIMARY,
    COLORES.SECONDARY,
    COLORES.SUCCESS,
    COLORES.WARNING,
  ];

  const descargarInformeCSV = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const rangoLabel = rangoInforme === 'dia'
      ? 'dia'
      : (rangoInforme === 'semana' ? 'semana' : (rangoInforme === '90d' ? '90d' : 'mes'));

    const rows = [
      ['Informe', `Resumen general (${rangoLabel})`],
      ['Generado', `${yyyy}-${mm}-${dd}`],
      [''],
      ['KPIs'],
      ['Ingresos Mensuales (MXN)', resumenGeneral.ingresosMensuales],
      ['Ordenes Pendientes', resumenGeneral.ordenesPendientes],
      ['Inventario Total', resumenGeneral.inventarioTotal],
      ['Clientes Activos', resumenGeneral.cuentasActivas],
      [''],
      ['Ingresos por mes - últimos 6 meses (MXN)'],
      ['Periodo', 'Ingresos'],
      ...ingresosChartData.map((r) => [r.etiqueta, r.ingreso]),
      [''],
      ['Detalle por módulo'],
      ['Finanzas - Ingresos del mes (MXN)', finanzasDetalle.ingresoMes],
      ['Finanzas - Cuentas por cobrar (MXN)', finanzasDetalle.cuentasPorCobrar],
      ['Finanzas - Gastos operativos (MXN)', finanzasDetalle.gastosOperativos],
      ['Ventas y CRM - Nuevos clientes (Mes)', ventasCrmDetalle.nuevosClientesMes],
      ['Ventas y CRM - Tasa de conversión (%)', ventasCrmDetalle.tasaConversion],
      ['Ventas y CRM - Pedidos B2B en curso', ventasCrmDetalle.pedidosB2B],
      ['Logística - Alertas stock bajo (modelos)', logisticaDetalle.alertasStockBajo],
      ['Logística - Envíos en tránsito', logisticaDetalle.enviosTransito],
      ['Logística - Devoluciones pendientes', logisticaDetalle.devolucionesPendientes],
      ['RRHH - Empleados activos', rrhhDetalle.empleadosActivos],
      ['RRHH - Próxima nómina', rrhhDetalle.proximaNomina],
      ['RRHH - Solicitudes de vacaciones pendientes', rrhhDetalle.solicitudesVacacionesPendientes],
    ];

    const csv = rows
      .map((row) => row.map((cell) => {
        const v = cell == null ? '' : String(cell);
        return `"${v.replace(/"/g, '""')}"`;
      }).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_${rangoLabel}_${yyyy}${mm}${dd}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
        <div className="container-fluid">
          <div className="placeholder-glow mb-4">
            <div className="placeholder col-6 bg-secondary rounded" style={{height: '32px'}}></div>
          </div>
          <div className="row g-4 mb-4">
            <div className="col-12 col-sm-6 col-lg-3"><StatCardSkeleton /></div>
            <div className="col-12 col-sm-6 col-lg-3"><StatCardSkeleton /></div>
            <div className="col-12 col-sm-6 col-lg-3"><StatCardSkeleton /></div>
            <div className="col-12 col-sm-6 col-lg-3"><StatCardSkeleton /></div>
          </div>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <Card><CardContent><TableSkeleton rows={5} /></CardContent></Card>
            </div>
            <div className="col-12 col-lg-6">
              <Card><CardContent><TableSkeleton rows={5} /></CardContent></Card>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="w-100">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between gap-2 gap-md-3 mb-3 mb-md-4">
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <BarChart3 className="text-primary" size={30} style={{minWidth: '30px'}} />
            <h1 className="page-title mb-0">Resumen General</h1>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <button className="btn btn-outline-secondary btn-sm d-none d-md-inline-flex align-items-center gap-2">
              <span className="small">Este Mes: {getMesActual()}</span>
            </button>

            <select
              className="form-select form-select-sm"
              value={rangoInforme}
              onChange={(e) => setRangoInforme(e.target.value)}
              style={{ minWidth: 190 }}
              aria-label="Rango del informe"
            >
              <option value="dia">Informe del día</option>
              <option value="semana">Informe de la semana</option>
              <option value="mes">Informe del mes</option>
              <option value="90d">Informe de 90 días</option>
            </select>

            <button className="btn btn-primary btn-sm" onClick={descargarInformeCSV}>
              Descargar informe
            </button>
          </div>
        </div>

        {/* Tarjetas de resumen (arriba, estilo KPIs) */}
        <div className="row g-3 g-md-4 mb-3 mb-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <p className="text-uppercase text-muted fw-semibold small mb-2">Ingresos Mensuales</p>
                <h3 className="fw-bold mb-1">{formatearMoneda(resumenGeneral.ingresosMensuales)}</h3>
                <p className="mb-0 text-success small">{resumenGeneral.variacionIngresos}</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <p className="text-uppercase text-muted fw-semibold small mb-2">Ordenes Pendientes</p>
                <h3 className="fw-bold mb-1">{resumenGeneral.ordenesPendientes}</h3>
                <p className="mb-0 text-warning small">{resumenGeneral.ordenesAtencionTexto}</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <p className="text-uppercase text-muted fw-semibold small mb-2">Inventario Total</p>
                <h3 className="fw-bold mb-1">{resumenGeneral.inventarioTotal.toLocaleString('es-MX')}</h3>
                <p className="mb-0 text-danger small">{resumenGeneral.inventarioCriticoTexto}</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <p className="text-uppercase text-muted fw-semibold small mb-2">Clientes Activos</p>
                <h3 className="fw-bold mb-1">{resumenGeneral.cuentasActivas}</h3>
                <p className="mb-0 text-success small">{resumenGeneral.cuentasActivasTexto}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficas principales */}
        <div className="row g-3 g-md-4 mb-3 mb-md-4">
          {/* Ingresos */}
          <div className="col-12 col-lg-8">
            <Card hover className="h-100">
              <CardHeader gradient color="primary" className="p-3 p-md-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h5 className="mb-0 fw-bold small small-md card-chart-title text-uppercase">
                    Ingresos
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <select
                      className="form-select form-select-sm custom-select"
                      value={rangoTiempoIngresos}
                      onChange={(e) => setRangoTiempoIngresos(e.target.value)}
                    >
                      <option value="24h">Últimas 24 horas</option>
                      <option value="7d">Últimos 7 días</option>
                      <option value="90d">Últimos 90 días</option>
                    </select>
                    <Button variant="light" size="xs">
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="card-chart-body">
                <p className="small text-muted mb-2">moneda: mxn ($)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={ingresosChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={getChartColors().grid} />
                    <XAxis
                      dataKey="etiqueta"
                      stroke={getChartColors().text}
                      tick={{ fill: getChartColors().tick, fontSize: 12 }}
                    />
                    <YAxis
                      stroke={getChartColors().text}
                      tick={{ fill: getChartColors().tick, fontSize: 12 }}
                      tickFormatter={(value) => formatearMoneda(value).replace('$', '$ ')}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: getChartColors().tooltipBg,
                        border: `1px solid ${getChartColors().tooltipBorder}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)',
                      }}
                      formatter={(value) => [formatearMoneda(value), 'Ingresos']}
                    />
                    <Legend />
                    <Bar
                      dataKey="ingreso"
                      name="Ingresos"
                      fill={COLORES.PRIMARY}
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* CSS para el menú desplegable */}
          <style>
          {`
            .custom-select {
              background-color: var(--erp-bg-main) !important;
              color: var(--erp-text-on-light) !important;
              border-color: var(--erp-border) !important;
            }
            .custom-select option {
              background-color: var(--erp-bg-main) !important;
              color: var(--erp-text-on-light) !important;
            }
          `}
          </style>

          {/* Distribución de inventario por talla */}
          <div className="col-12 col-lg-4">
            <Card hover className="h-100">
              <CardHeader gradient color="success" className="p-3 p-md-4">
                <h5 className="mb-0 fw-bold small small-md card-chart-title">
                  Distribución de inventario por talla
                </h5>
              </CardHeader>
              <CardContent className="card-chart-body d-flex flex-column align-items-center justify-content-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distribucionInventarioTalla}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="38%"
                      outerRadius="72%"
                      paddingAngle={4}
                    >
                      {distribucionInventarioTalla.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={DISTRIBUCION_COLORES[index % DISTRIBUCION_COLORES.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: getChartColors().tooltipBg,
                        border: `1px solid ${getChartColors().tooltipBorder}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)',
                      }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tarjetas por módulo */}
        <div className="row g-3 g-md-4 mb-3 mb-md-4">
          {/* Finanzas */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-2 rounded-circle bg-primary bg-opacity-10 p-2">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                  <h5 className="mb-0 fw-semibold">Finanzas</h5>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Ingresos del mes</span>
                  <span className="fw-bold text-success">{formatearMoneda(finanzasDetalle.ingresoMes)}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Cuentas por cobrar</span>
                  <span className="fw-bold">{formatearMoneda(finanzasDetalle.cuentasPorCobrar)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Gastos operativos</span>
                  <span className="fw-bold text-danger">{formatearMoneda(finanzasDetalle.gastosOperativos)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ventas y CRM */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-2 rounded-circle bg-info bg-opacity-10 p-2">
                    <ShoppingCart size={18} className="text-info" />
                  </div>
                  <h5 className="mb-0 fw-semibold">Ventas y CRM</h5>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Nuevos clientes (Mes)</span>
                  <span className="fw-bold text-success">+{ventasCrmDetalle.nuevosClientesMes}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Tasa de conversión</span>
                  <span className="fw-bold">{ventasCrmDetalle.tasaConversion.toFixed(1)}%</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Pedidos B2B en curso</span>
                  <span className="fw-bold">{ventasCrmDetalle.pedidosB2B} Mayoristas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logística e Inventarios */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-2 rounded-circle bg-warning bg-opacity-10 p-2">
                    <Package size={18} className="text-warning" />
                  </div>
                  <h5 className="mb-0 fw-semibold">Logística e Inventarios</h5>
                </div>
                <div className="d-flex justify-content-between align-items-center small mb-2">
                  <span className="text-muted">Alertas de Stock Bajo</span>
                  <span className="badge bg-warning text-dark rounded-pill">
                    {logisticaDetalle.alertasStockBajo} Modelos
                  </span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Envíos en tránsito</span>
                  <span className="fw-bold">{logisticaDetalle.enviosTransito}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Devoluciones pendientes</span>
                  <span className="fw-bold">{logisticaDetalle.devolucionesPendientes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recursos Humanos */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-2 rounded-circle bg-danger bg-opacity-10 p-2">
                    <AlertTriangle size={18} className="text-danger" />
                  </div>
                  <h5 className="mb-0 fw-semibold">Recursos Humanos</h5>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Empleados activos</span>
                  <span className="fw-bold">{rrhhDetalle.empleadosActivos}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">Próxima nómina</span>
                  <span className="fw-bold">{rrhhDetalle.proximaNomina}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Solicitudes de vacaciones</span>
                  <span className="fw-bold">{rrhhDetalle.solicitudesVacacionesPendientes} Pendientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tablas */}
        <div className="row g-3 g-md-4">
          {/* Ventas recientes */}
          <div className="col-12 col-lg-6">
            <Card hover className="h-100">
              <CardHeader gradient color="primary" className="p-3 p-md-4">
                <div className="d-flex align-items-center gap-2">
                  <ShoppingCart size={18} className="d-md-none" />
                  <ShoppingCart size={20} className="d-none d-md-block" />
                  <h5 className="mb-0 fw-bold small small-md">Ventas Recientes</h5>
                </div>
              </CardHeader>
              <CardContent padding={false}>
                {recentSales.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 table-sm">
                      <thead className="table-light">
                        <tr>
                          <th className="small">ID</th>
                          <th className="small d-none d-md-table-cell">Método</th>
                          <th className="small">Total</th>
                          <th className="small">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => {
                          const totalNumero = typeof sale.total === 'number'
                            ? sale.total
                            : (sale.total != null ? parseFloat(sale.total) : 0);
                          return (
                            <tr key={sale.id}>
                              <td className="text-muted small">#{sale.id}</td>
                              <td className="fw-medium small d-none d-md-table-cell">{sale.metodo_pago || 'N/A'}</td>
                              <td className="fw-bold text-primary small">{formatearMoneda(totalNumero)}</td>
                              <td>
                                <Badge
                                  variant={getStatusVariant(sale.estado)}
                                  icon={getStatusIcon(sale.estado)}
                                >
                                  <span className="small">{getStatusLabel(sale.estado)}</span>
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 p-md-5 text-center text-muted">
                    <ShoppingCart size={40} className="mb-3 opacity-25 d-md-none" />
                    <ShoppingCart size={48} className="mb-3 opacity-25 d-none d-md-inline-block" />
                    <p className="small small-md mb-0">No hay ventas recientes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productos con stock bajo */}
          <div className="col-12 col-lg-6">
            <Card hover className="h-100">
              <CardHeader gradient color="warning" className="p-3 p-md-4">
                <div className="d-flex align-items-center gap-2">
                  <AlertTriangle size={18} className="d-md-none" />
                  <AlertTriangle size={20} className="d-none d-md-block" />
                  <h5 className="mb-0 fw-bold small small-md">Productos con Stock Bajo</h5>
                </div>
              </CardHeader>
              <CardContent padding={false}>
                {lowStock.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 table-sm">
                      <thead className="table-light">
                        <tr>
                          <th className="small">Producto</th>
                          <th className="small">Stock</th>
                          <th className="small d-none d-md-table-cell">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.map((item) => (
                          <tr key={item.variante_id}>
                            <td className="fw-medium small">
                              {item.nombre_producto}
                              {item.talla && <span className="text-muted ms-1">({item.talla})</span>}
                            </td>
                            <td>
                              <Badge variant="danger" dot>
                                <span className="small">{item.stock_actual} / 10</span>
                              </Badge>
                            </td>
                            <td className="d-none d-md-table-cell">
                              <Button variant="warning" size="xs" icon={Package}>
                                <span className="d-none d-lg-inline">Reabastecer</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 p-md-5 text-center text-success">
                    <CheckCircle size={40} className="mb-3 d-md-none" />
                    <CheckCircle size={48} className="mb-3 d-none d-md-inline-block" />
                    <p className="fw-medium small small-md mb-0">Todos los productos tienen stock suficiente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}

// Helpers para badges — estados reales del backend: ABIERTA | CERRADA | CANCELADA
function getStatusVariant(estado) {
  switch (estado) {
    case 'CERRADA':   return 'success';
    case 'ABIERTA':   return 'warning';
    case 'CANCELADA': return 'danger';
    default:          return 'default';
  }
}

function getStatusIcon(estado) {
  switch (estado) {
    case 'CERRADA':   return CheckCircle;
    case 'ABIERTA':   return Clock;
    case 'CANCELADA': return XCircle;
    default:          return null;
  }
}

function getStatusLabel(estado) {
  switch (estado) {
    case 'CERRADA':   return 'Completada';
    case 'ABIERTA':   return 'Pendiente';
    case 'CANCELADA': return 'Cancelada';
    default:          return estado || 'Desconocido';
  }
}

export default Dashboard;
