import React, { useState, useEffect } from 'react';
import { salesService, inventoryService } from '../../services/apiService';
import { formatearMoneda } from '../../utils/helpers';
import { COLORES } from '../../utils/constants';
import { DollarSign, TrendingUp, AlertTriangle, Package, ShoppingCart, BarChart3, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button, StatCardSkeleton, TableSkeleton } from '../../components/ui';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART = {
  grid: COLORES.HIGHLIGHT,
  text: COLORES.PRIMARY,
  tooltipBg: COLORES.BG_MAIN,
  tooltipBorder: COLORES.HIGHLIGHT
};

function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    lowStockItems: 0,
    todaySales: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar ventas recientes
      const salesData = await salesService.getAll({ limit: 5 }).catch(() => []);
      setRecentSales(salesData);

      // Cargar productos con stock bajo
      const lowStockData = await inventoryService.getLowStock().catch(() => []);
      setLowStock(lowStockData);

      // Calcular estadísticas
      setStats({
        totalSales: salesData.length,
        totalProducts: 0, // Implementar según tu API
        lowStockItems: lowStockData.length,
        todaySales: salesData.filter(s => 
          new Date(s.fecha_venta).toDateString() === new Date().toDateString()
        ).length,
      });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos dummy para gráficas (después reemplazar con datos reales)
  const ventasUltimos7Dias = [
    { id: 1, dia: 'Lun', ventas: 2400, meta: 3000 },
    { id: 2, dia: 'Mar', ventas: 1398, meta: 3000 },
    { id: 3, dia: 'Mié', ventas: 4800, meta: 3000 },
    { id: 4, dia: 'Jue', ventas: 3908, meta: 3000 },
    { id: 5, dia: 'Vie', ventas: 4800, meta: 3000 },
    { id: 6, dia: 'Sáb', ventas: 3800, meta: 3000 },
    { id: 7, dia: 'Dom', ventas: 4300, meta: 3000 }
  ];

  const productosMasVendidos = [
    { id: 1, nombre: 'Producto A', ventas: 400 },
    { id: 2, nombre: 'Producto B', ventas: 300 },
    { id: 3, nombre: 'Producto C', ventas: 200 },
    { id: 4, nombre: 'Producto D', ventas: 150 },
    { id: 5, nombre: 'Producto E', ventas: 100 }
  ];

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
        <div className="d-flex align-items-center gap-2 gap-md-3 mb-3 mb-md-4">
          <BarChart3 className="text-primary" size={30} style={{minWidth: '30px'}} />
          <h1 className="page-title mb-0">Dashboard</h1>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="row g-3 g-md-4 mb-3 mb-md-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card bg-primary text-white shadow-sm stat-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 bg-white bg-opacity-25 rounded flex-shrink-0">
                    <DollarSign size={20} className="d-md-none" />
                    <DollarSign size={24} className="d-none d-md-block" />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <h6 className="card-subtitle mb-1 opacity-75 small small-md">Ventas Hoy</h6>
                    <h2 className="card-title fw-semibold mb-0 h4">{stats.todaySales}</h2>
                    <small className="opacity-75 d-none d-md-inline">+12% vs ayer</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card bg-success text-white shadow-sm stat-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 bg-white bg-opacity-25 rounded flex-shrink-0">
                    <TrendingUp size={20} className="d-md-none" />
                    <TrendingUp size={24} className="d-none d-md-block" />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <h6 className="card-subtitle mb-1 opacity-75 small small-md">Total Ventas</h6>
                    <h2 className="card-title fw-semibold mb-0 h4">{stats.totalSales}</h2>
                    <small className="opacity-75 d-none d-md-inline">Últimos 30 días</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card bg-warning text-dark shadow-sm stat-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 bg-white bg-opacity-25 rounded flex-shrink-0">
                    <AlertTriangle size={20} className="d-md-none" />
                    <AlertTriangle size={24} className="d-none d-md-block" />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <h6 className="card-subtitle mb-1 opacity-75 small small-md">Stock Bajo</h6>
                    <h2 className="card-title fw-semibold mb-0 h4">{stats.lowStockItems}</h2>
                    <small className="opacity-75 d-none d-md-inline">Requiere atención</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card bg-info text-white shadow-sm stat-card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 bg-white bg-opacity-25 rounded flex-shrink-0">
                    <Package size={20} className="d-md-none" />
                    <Package size={24} className="d-none d-md-block" />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <h6 className="card-subtitle mb-1 opacity-75 small small-md">Productos</h6>
                    <h2 className="card-title fw-semibold mb-0 h4">{stats.totalProducts}</h2>
                    <small className="opacity-75 d-none d-md-inline">En catálogo</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="row g-3 g-md-4 mb-3 mb-md-4">
          {/* Gráfica de Tendencia */}
          <div className="col-12 col-lg-6">
            <Card hover className="h-100">
              <CardHeader gradient color="primary" className="p-3 p-md-4">
                <div className="d-flex align-items-center gap-2">
                  <TrendingUp size={18} className="d-md-none" />
                  <TrendingUp size={20} className="d-none d-md-block" />
                  <h5 className="mb-0 fw-bold small small-md card-chart-title">Tendencia de Ventas (7 días)</h5>
                </div>
              </CardHeader>
            <CardContent className="card-chart-body">
              <div className="d-md-none">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={ventasUltimos7Dias}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="dia"
                      stroke={CHART.text}
                      tick={{fontSize: 10}}
                      label={{ value: 'Día', position: 'insideBottomRight', offset: -5 }}
                    />
                    <YAxis
                      stroke={CHART.text}
                      tick={{fontSize: 10}}
                      label={{ value: 'Ganancia', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: CHART.tooltipBg, 
                        border: `1px solid ${CHART.tooltipBorder}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend wrapperStyle={{fontSize: '12px'}} />
                    <Line 
                      type="monotone" 
                      dataKey="ventas" 
                      stroke={COLORES.SUCCESS} 
                      strokeWidth={2}
                      dot={{ fill: COLORES.SUCCESS, r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Ganancia diaria"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="meta" 
                      stroke={COLORES.SECONDARY} 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Meta diaria"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="d-none d-md-block">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ventasUltimos7Dias}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis
                    dataKey="dia"
                    stroke={CHART.text}
                    label={{ value: 'Día', position: 'insideBottomRight', offset: -5 }}
                  />
                  <YAxis
                    stroke={CHART.text}
                    label={{ value: 'Ganancia', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: CHART.tooltipBg, 
                      border: `1px solid ${CHART.tooltipBorder}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke={COLORES.SUCCESS} 
                    strokeWidth={3}
                    dot={{ fill: COLORES.SUCCESS, r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Ganancia diaria"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="meta" 
                    stroke={COLORES.SECONDARY} 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Meta diaria"
                  />
                </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Gráfica de Productos */}
          <div className="col-12 col-lg-6">
            <Card hover className="h-100">
              <CardHeader gradient color="success" className="p-3 p-md-4">
                <div className="d-flex align-items-center gap-2">
                  <BarChart3 size={18} className="d-md-none" />
                  <BarChart3 size={20} className="d-none d-md-block" />
                  <h5 className="mb-0 fw-bold small small-md card-chart-title">Productos Más Vendidos</h5>
                </div>
              </CardHeader>
            <CardContent className="card-chart-body">
              <div className="d-md-none">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productosMasVendidos}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="nombre" stroke={CHART.text} tick={{fontSize: 10}} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke={CHART.text} tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: CHART.tooltipBg, 
                        border: `1px solid ${CHART.tooltipBorder}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar 
                      dataKey="ventas" 
                      fill={COLORES.SECONDARY} 
                      radius={[4, 4, 0, 0]}
                      name="Unidades Vendidas"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="d-none d-md-block">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productosMasVendidos}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="nombre" stroke={CHART.text} />
                  <YAxis stroke={CHART.text} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: CHART.tooltipBg, 
                      border: `1px solid ${CHART.tooltipBorder}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(47, 65, 86, 0.1)'
                    }} 
                  />
                  <Bar 
                    dataKey="ventas" 
                    fill={COLORES.SECONDARY} 
                    radius={[8, 8, 0, 0]}
                    name="Unidades Vendidas"
                  />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </Card>
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
                          <th className="small d-none d-md-table-cell">Cliente</th>
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
                            <td className="fw-medium small d-none d-md-table-cell">{sale.cliente_nombre || 'N/A'}</td>
                            <td className="fw-bold text-primary small">{formatearMoneda(totalNumero)}</td>
                            <td>
                              <Badge 
                                variant={getStatusVariant(sale.estado)}
                                icon={getStatusIcon(sale.estado)}
                              >
                                <span className="small">{sale.estado}</span>
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
                          <tr key={item.id}>
                            <td className="fw-medium small">{item.nombre}</td>
                            <td>
                              <Badge variant="danger" dot>
                                <span className="small">{item.stock_actual} / {item.stock_minimo}</span>
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

// Helpers para badges
function getStatusVariant(estado) {
  switch (estado) {
    case 'COMPLETADA':
      return 'success';
    case 'PENDIENTE':
      return 'warning';
    case 'CANCELADA':
      return 'danger';
    default:
      return 'default';
  }
}

function getStatusIcon(estado) {
  switch (estado) {
    case 'COMPLETADA':
      return CheckCircle;
    case 'PENDIENTE':
      return Clock;
    case 'CANCELADA':
      return XCircle;
    default:
      return null;
  }
}

export default Dashboard;
