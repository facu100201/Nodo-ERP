import React, { useState } from 'react';
import { reportesService } from '../../services/apiService';
import { BarChart3, FileSpreadsheet, CheckCircle, Clock } from 'lucide-react';
import './Reportes.css';

function Reportes() {
  const [tipoReporte, setTipoReporte] = useState('ventas');
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    metodo_pago: '',
    categoria: ''
  });

  const generarReporte = async () => {
    try {
      setLoading(true);
      let data;

      switch (tipoReporte) {
        case 'ventas':
          data = await reportesService.ventas(filtros);
          break;
        case 'almacen':
          data = await reportesService.almacen(filtros);
          break;
        case 'movimientos':
          data = await reportesService.movimientos(filtros);
          break;
        case 'mensual':
          const fecha = new Date();
          data = await reportesService.generalMensual(fecha.getMonth() + 1, fecha.getFullYear());
          break;
        default:
          data = {};
      }

      setReporte(data);
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar reporte: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = async () => {
    try {
      setLoading(true);
      let blob;

      if (tipoReporte === 'ventas') {
        blob = await reportesService.exportarVentas(filtros);
      } else if (tipoReporte === 'almacen') {
        blob = await reportesService.exportarAlmacen(filtros);
      }

      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="reportes-container">
        <h1 className="page-title d-flex align-items-center gap-2">
          <BarChart3 size={28} />
          Reportes
        </h1>

        <div className="reportes-grid">
          {/* Panel de configuración */}
          <div className="reportes-config card">
            <h3>Configuración</h3>

            <div className="form-group">
              <label>Tipo de Reporte</label>
              <select 
                className="form-control"
                value={tipoReporte}
                onChange={(e) => setTipoReporte(e.target.value)}
              >
                <option value="ventas">Reporte de Ventas</option>
                <option value="almacen">Reporte de Almacén</option>
                <option value="movimientos">Movimientos de Inventario</option>
                <option value="mensual">General Mensual</option>
              </select>
            </div>

            {(tipoReporte === 'ventas' || tipoReporte === 'movimientos') && (
              <>
                <div className="form-group">
                  <label>Fecha Desde</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fecha_desde}
                    onChange={(e) => setFiltros({...filtros, fecha_desde: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha Hasta</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fecha_hasta}
                    onChange={(e) => setFiltros({...filtros, fecha_hasta: e.target.value})}
                  />
                </div>
              </>
            )}

            {tipoReporte === 'ventas' && (
              <div className="form-group">
                <label>Método de Pago</label>
                <select 
                  className="form-control"
                  value={filtros.metodo_pago}
                  onChange={(e) => setFiltros({...filtros, metodo_pago: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
            )}

            {tipoReporte === 'almacen' && (
              <div className="form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  className="form-control"
                  value={filtros.categoria}
                  onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                  placeholder="Ej: Ropa, Calzado"
                />
              </div>
            )}

            <div className="form-actions">
              <button 
                className="btn btn-primary btn-block"
                onClick={generarReporte}
                disabled={loading}
              >
                {loading ? 'Generando...' : <><BarChart3 size={18} /> Generar Reporte</>}
              </button>

              {reporte && (tipoReporte === 'ventas' || tipoReporte === 'almacen') && (
                <button 
                  className="btn btn-success btn-block"
                  onClick={exportarReporte}
                  disabled={loading}
                >
                  📥 Exportar CSV
                </button>
              )}
            </div>
          </div>

          {/* Panel de resultados */}
          <div className="reportes-results card">
            <h3>Resultados</h3>

            {!reporte && (
              <div className="empty-state">
                <p className="d-flex justify-content-center mb-2">
                  <FileSpreadsheet size={48} className="opacity-50" style={{color: 'var(--erp-secondary)'}} />
                </p>
                <p>Configura los filtros y genera un reporte</p>
              </div>
            )}

            {reporte && tipoReporte === 'ventas' && (
              <div>
                <div className="resumen-cards">
                  <div className="resumen-card">
                    <div className="resumen-label">Total Ventas</div>
                    <div className="resumen-value">{reporte.resumen.total_ventas}</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-label">Efectivo</div>
                    <div className="resumen-value">${reporte.resumen.total_efectivo.toFixed(2)}</div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-label">Tarjeta</div>
                    <div className="resumen-value">${reporte.resumen.total_tarjeta.toFixed(2)}</div>
                  </div>
                  <div className="resumen-card primary">
                    <div className="resumen-label">Total General</div>
                    <div className="resumen-value">${reporte.resumen.total_general.toFixed(2)}</div>
                  </div>
                </div>

                <table className="table" style={{marginTop: '20px'}}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Método</th>
                      <th>Total</th>
                      <th>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.ventas.map(venta => (
                      <tr key={venta.id}>
                        <td>#{venta.id}</td>
                        <td>{venta.fecha}</td>
                        <td>{venta.usuario}</td>
                        <td>{venta.metodo_pago}</td>
                        <td className="text-bold">${venta.total.toFixed(2)}</td>
                        <td>
                          {venta.facturado ? <CheckCircle size={18} className="text-success" /> : <Clock size={18} className="text-muted" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reporte && tipoReporte === 'mensual' && (
              <div>
                <h4>Reporte Mensual - {reporte.mes}/{reporte.anio}</h4>
                
                <div className="resumen-cards">
                  <div className="resumen-card">
                    <div className="resumen-label">Ventas</div>
                    <div className="resumen-value">{reporte.actual.total_ventas}</div>
                    <div className="resumen-change">
                      {reporte.comparativa.variacion_ventas > 0 ? '↗' : '↘'} 
                      {Math.abs(reporte.comparativa.variacion_ventas).toFixed(1)}%
                    </div>
                  </div>
                  <div className="resumen-card primary">
                    <div className="resumen-label">Total</div>
                    <div className="resumen-value">${reporte.actual.total_general.toFixed(2)}</div>
                    <div className="resumen-change">
                      {reporte.comparativa.variacion_monto > 0 ? '↗' : '↘'} 
                      {Math.abs(reporte.comparativa.variacion_monto).toFixed(1)}%
                    </div>
                  </div>
                  <div className="resumen-card">
                    <div className="resumen-label">Ticket Promedio</div>
                    <div className="resumen-value">${reporte.actual.ticket_promedio.toFixed(2)}</div>
                  </div>
                </div>

                <h5 style={{marginTop: '30px'}}>Top 10 Productos</h5>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Total Vendido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productos_top.map((prod, idx) => (
                      <tr key={idx}>
                        <td>{prod.nombre}</td>
                        <td>{prod.cantidad}</td>
                        <td className="text-bold">${prod.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default Reportes;
