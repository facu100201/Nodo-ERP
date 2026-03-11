import React, { useState, useEffect } from 'react';
import { facturacionService, salesService } from '../../services/apiService';
import {
  Receipt,
  Plus,
  Globe,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  FileText,
  Search,
  X,
  Copy,
  Loader2,
} from 'lucide-react';
import './Facturacion.css';

function Facturacion() {
  const [facturas, setFacturas] = useState([]);
  const [ventasPendientes, setVentasPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [filtrosUI, setFiltrosUI] = useState({
    q: '',
    estado: 'TODOS',
    qVentas: '',
  });
  
  const [facturaForm, setFacturaForm] = useState({
    ventas_ids: [],
    rfc_receptor: '',
    nombre_receptor: '',
    regimen_fiscal_receptor: '616',
    domicilio_fiscal_receptor: '',
    uso_cfdi: 'G03',
    tipo_comprobante: 'I',
    forma_pago: '01',
    metodo_pago: 'PUE',
    moneda: 'MXN',
    tipo_cambio: null,
    observaciones: ''
  });

  useEffect(() => {
    cargarFacturas();
    cargarVentasPendientes();
  }, []);

  const cargarFacturas = async () => {
    try {
      const data = await facturacionService.listar();
      setFacturas(data);
    } catch (error) {
      console.error('Error cargando facturas:', error);
    }
  };

  const cargarVentasPendientes = async () => {
    try {
      const data = await salesService.getAll({ estado: 'CERRADA' });
      setVentasPendientes(data);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    }
  };

  const crearFactura = async (e) => {
    e.preventDefault();
    
    if (facturaForm.ventas_ids.length === 0) {
      mostrarMensaje('warning', 'Seleccione al menos una venta');
      return;
    }

    try {
      setLoading(true);
      const factura = await facturacionService.crear(facturaForm);
      mostrarMensaje('success', `Factura #${factura.id} creada en borrador`);
      setShowModal(false);
      cargarFacturas();
      cargarVentasPendientes();
      setFacturaForm({
        ventas_ids: [],
        rfc_receptor: '',
        nombre_receptor: '',
        regimen_fiscal_receptor: '616',
        domicilio_fiscal_receptor: '',
        uso_cfdi: 'G03',
        tipo_comprobante: 'I',
        forma_pago: '01',
        metodo_pago: 'PUE',
        moneda: 'MXN',
        tipo_cambio: null,
        observaciones: ''
      });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const timbrarFactura = async (facturaId) => {
    if (!window.confirm('¿Timbrar factura con el SAT?')) return;

    try {
      setLoading(true);
      const factura = await facturacionService.timbrar(facturaId);
      mostrarMensaje('success', `Factura timbrada. UUID: ${factura.uuid_sat}`);
      cargarFacturas();
    } catch (error) {
      mostrarMensaje('error', 'Error al timbrar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const generarFacturaGlobal = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    
    if (!window.confirm('¿Generar factura global de ventas con tarjeta del día?')) return;

    try {
      setLoading(true);
      const factura = await facturacionService.globalTarjetas({
        fecha_desde: hoy,
        fecha_hasta: hoy
      });
      mostrarMensaje('success', `Factura global #${factura.id} creada (${factura.total_ventas} ventas)`);
      cargarFacturas();
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };

  const toggleVenta = (ventaId) => {
    setFacturaForm(prev => ({
      ...prev,
      ventas_ids: prev.ventas_ids.includes(ventaId)
        ? prev.ventas_ids.filter(id => id !== ventaId)
        : [...prev.ventas_ids, ventaId]
    }));
  };

  const facturasVisibles = facturas.filter((f) => {
    if (filtrosUI.estado !== 'TODOS' && f.estado !== filtrosUI.estado) return false;
    const q = filtrosUI.q.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${f.id} ${f.rfc_receptor || ''} ${f.uuid_sat || ''} ${f.serie || ''}-${f.folio || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const ventasVisibles = ventasPendientes.filter((v) => {
    const q = filtrosUI.qVentas.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${v.id} ${v.metodo_pago || ''} ${v.total || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const totalSeleccionado = facturaForm.ventas_ids.reduce((sum, id) => {
    const v = ventasPendientes.find((x) => x.id === id);
    return sum + (v?.total || 0);
  }, 0);

  const copiar = async (texto, okMsg = 'Copiado al portapapeles') => {
    try {
      await navigator.clipboard.writeText(String(texto));
      mostrarMensaje('success', okMsg);
    } catch {
      mostrarMensaje('warning', 'No se pudo copiar automáticamente');
    }
  };

  return (
      <div className="facturacion-container">
        <h1 className="page-title d-flex align-items-center gap-2">
          <Receipt size={28} />
          Facturación SAT
        </h1>

        {mensaje.texto && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="actions-bar facturacion-actions">
          <div className="facturacion-search" role="search">
            <Search size={16} aria-hidden="true" />
            <input
              className="facturacion-search-input"
              type="text"
              value={filtrosUI.q}
              onChange={(e) => setFiltrosUI((p) => ({ ...p, q: e.target.value }))}
              placeholder="Buscar por RFC, UUID, folio o #factura…"
              aria-label="Buscar facturas"
            />
            {filtrosUI.q && (
              <button
                type="button"
                className="facturacion-icon-btn"
                onClick={() => setFiltrosUI((p) => ({ ...p, q: '' }))}
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="facturacion-actions-right">
            <select
              className="form-control facturacion-select"
              value={filtrosUI.estado}
              onChange={(e) => setFiltrosUI((p) => ({ ...p, estado: e.target.value }))}
              aria-label="Filtrar por estado"
              disabled={loading}
            >
              <option value="TODOS">Estado: todos</option>
              <option value="BORRADOR">Estado: borrador</option>
              <option value="TIMBRADA">Estado: timbrada</option>
              <option value="CANCELADA">Estado: cancelada</option>
            </select>

            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)} type="button">
            <Plus size={18} />
            Nueva Factura
          </button>
          <button className="btn btn-success d-flex align-items-center gap-2" onClick={generarFacturaGlobal} type="button" disabled={loading}>
            <Globe size={18} />
            Factura Global Tarjetas
          </button>
          </div>
        </div>

        <div className="card">
          <div className="facturacion-card-header">
            <h3 className="m-0">Facturas Emitidas</h3>
            {loading && (
              <div className="facturacion-loading" aria-live="polite">
                <Loader2 className="spin" size={16} aria-hidden="true" />
                Procesando…
              </div>
            )}
          </div>

          {facturasVisibles.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Serie-Folio</th>
                  <th>UUID</th>
                  <th>RFC Receptor</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasVisibles.map(factura => (
                  <tr key={factura.id}>
                    <td>#{factura.id}</td>
                    <td>{factura.serie}-{factura.folio}</td>
                    <td className="uuid-cell">
                      <div className="uuid-wrap">
                        <span title={factura.uuid_sat || ''}>
                          {factura.uuid_sat ? factura.uuid_sat.substring(0, 16) + '...' : '-'}
                        </span>
                        {factura.uuid_sat && (
                          <button
                            type="button"
                            className="facturacion-icon-btn"
                            onClick={() => copiar(factura.uuid_sat, 'UUID copiado')}
                            aria-label="Copiar UUID"
                            title="Copiar UUID"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{factura.rfc_receptor}</td>
                    <td className="text-bold">${factura.total.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${
                        factura.estado === 'TIMBRADA' ? 'success' :
                        factura.estado === 'BORRADOR' ? 'warning' : 'secondary'
                      }`}>
                        {factura.estado}
                      </span>
                    </td>
                    <td>
                      {factura.estado === 'BORRADOR' && (
                        <button 
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
                          onClick={() => timbrarFactura(factura.id)}
                          disabled={loading}
                          type="button"
                        >
                          <CreditCard size={14} />
                          Timbrar
                        </button>
                      )}
                      {factura.estado === 'TIMBRADA' && factura.pdf_url && (
                        <a 
                          href={factura.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-info d-inline-flex align-items-center gap-2"
                        >
                          <FileText size={14} />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state facturacion-empty">
              <div className="empty-state-title">No hay facturas para mostrar</div>
              <div className="empty-state-subtitle">
                Crea una nueva factura o ajusta el filtro/búsqueda.
              </div>
            </div>
          )}
        </div>

        {/* Modal crear factura */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Nueva Factura</h3>
              
              <form onSubmit={crearFactura}>
                <h4 className="form-section-title d-flex align-items-center gap-2"><ClipboardList size={18} /> Datos del Receptor</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>RFC Receptor *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={facturaForm.rfc_receptor}
                      onChange={(e) => setFacturaForm({...facturaForm, rfc_receptor: e.target.value.toUpperCase()})}
                      placeholder="XAXX010101000"
                      required
                      maxLength="13"
                      minLength="12"
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre o Razón Social *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={facturaForm.nombre_receptor}
                      onChange={(e) => setFacturaForm({...facturaForm, nombre_receptor: e.target.value.toUpperCase()})}
                      placeholder="PUBLICO EN GENERAL"
                      required
                      maxLength="255"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Régimen Fiscal</label>
                    <select
                      className="form-control"
                      value={facturaForm.regimen_fiscal_receptor}
                      onChange={(e) => setFacturaForm({...facturaForm, regimen_fiscal_receptor: e.target.value})}
                    >
                      <option value="616">616 - Sin obligaciones fiscales</option>
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                      <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                      <option value="606">606 - Arrendamiento</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                      <option value="621">621 - Incorporación Fiscal</option>
                      <option value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas</option>
                      <option value="626">626 - Régimen Simplificado de Confianza</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Uso CFDI *</label>
                    <select
                      className="form-control"
                      value={facturaForm.uso_cfdi}
                      onChange={(e) => setFacturaForm({...facturaForm, uso_cfdi: e.target.value})}
                      required
                    >
                      <option value="G01">G01 - Adquisición de mercancías</option>
                      <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="I01">I01 - Construcciones</option>
                      <option value="I02">I02 - Mobilario y equipo de oficina</option>
                      <option value="I03">I03 - Equipo de transporte</option>
                      <option value="I04">I04 - Equipo de cómputo</option>
                      <option value="I05">I05 - Dados, troqueles, moldes, matrices</option>
                      <option value="I06">I06 - Comunicaciones telefónicas</option>
                      <option value="I07">I07 - Comunicaciones satelitales</option>
                      <option value="I08">I08 - Otra maquinaria y equipo</option>
                      <option value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                      <option value="D02">D02 - Gastos médicos por incapacidad o discapacidad</option>
                      <option value="D03">D03 - Gastos funerales</option>
                      <option value="D04">D04 - Donativos</option>
                      <option value="D05">D05 - Intereses reales efectivamente pagados por créditos hipotecarios</option>
                      <option value="D06">D06 - Aportaciones voluntarias al SAR</option>
                      <option value="D07">D07 - Primas por seguros de gastos médicos</option>
                      <option value="D08">D08 - Gastos de transportación escolar obligatoria</option>
                      <option value="D09">D09 - Depósitos en cuentas para el ahorro, primas</option>
                      <option value="D10">D10 - Pagos por servicios educativos (colegiaturas)</option>
                      <option value="S01">S01 - Sin efectos fiscales</option>
                      <option value="CP01">CP01 - Pagos</option>
                      <option value="CN01">CN01 - Nómina</option>
                      <option value="P01">P01 - Por definir</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Domicilio Fiscal Receptor (Opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={facturaForm.domicilio_fiscal_receptor}
                    onChange={(e) => setFacturaForm({...facturaForm, domicilio_fiscal_receptor: e.target.value})}
                    placeholder="Calle, Número, Colonia, CP, Ciudad, Estado"
                    maxLength="500"
                  />
                </div>

                <h4 className="form-section-title d-flex align-items-center gap-2"><CreditCard size={18} /> Forma y Método de Pago</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Forma de Pago</label>
                    <select
                      className="form-control"
                      value={facturaForm.forma_pago}
                      onChange={(e) => setFacturaForm({...facturaForm, forma_pago: e.target.value})}
                    >
                      <option value="01">01 - Efectivo</option>
                      <option value="02">02 - Cheque nominativo</option>
                      <option value="03">03 - Transferencia electrónica de fondos</option>
                      <option value="04">04 - Tarjeta de crédito</option>
                      <option value="28">28 - Tarjeta de débito</option>
                      <option value="29">29 - Tarjeta de servicios</option>
                      <option value="99">99 - Por definir</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Método de Pago</label>
                    <select
                      className="form-control"
                      value={facturaForm.metodo_pago}
                      onChange={(e) => setFacturaForm({...facturaForm, metodo_pago: e.target.value})}
                    >
                      <option value="PUE">PUE - Pago en una sola exhibición</option>
                      <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Moneda</label>
                    <select
                      className="form-control"
                      value={facturaForm.moneda}
                      onChange={(e) => setFacturaForm({...facturaForm, moneda: e.target.value})}
                    >
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="USD">USD - Dólar Americano</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="CAD">CAD - Dólar Canadiense</option>
                      <option value="GBP">GBP - Libra Esterlina</option>
                    </select>
                  </div>

                  {facturaForm.moneda !== 'MXN' && (
                    <div className="form-group">
                      <label>Tipo de Cambio *</label>
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control"
                        value={facturaForm.tipo_cambio || ''}
                        onChange={(e) => setFacturaForm({...facturaForm, tipo_cambio: parseFloat(e.target.value)})}
                        placeholder="20.5"
                        required={facturaForm.moneda !== 'MXN'}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Observaciones (Opcional)</label>
                  <textarea
                    className="form-control"
                    value={facturaForm.observaciones}
                    onChange={(e) => setFacturaForm({...facturaForm, observaciones: e.target.value})}
                    placeholder="Notas o comentarios adicionales"
                    rows="2"
                    maxLength="500"
                  />
                </div>

                <h4 className="form-section-title d-flex align-items-center gap-2"><ShoppingCart size={18} /> Ventas</h4>

                <div className="form-group">
                  <div className="facturacion-ventas-header">
                    <label className="m-0">Ventas a Facturar</label>
                    <div className="facturacion-ventas-meta">
                      <span className="text-muted">{facturaForm.ventas_ids.length} seleccionada(s)</span>
                      <span className="facturacion-total">Total: ${totalSeleccionado.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="facturacion-search ventas-search" role="search">
                    <Search size={16} aria-hidden="true" />
                    <input
                      className="facturacion-search-input"
                      type="text"
                      value={filtrosUI.qVentas}
                      onChange={(e) => setFiltrosUI((p) => ({ ...p, qVentas: e.target.value }))}
                      placeholder="Buscar venta por #, método o total…"
                      aria-label="Buscar ventas"
                    />
                    {filtrosUI.qVentas && (
                      <button
                        type="button"
                        className="facturacion-icon-btn"
                        onClick={() => setFiltrosUI((p) => ({ ...p, qVentas: '' }))}
                        aria-label="Limpiar búsqueda de ventas"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="ventas-list">
                    {ventasVisibles.slice(0, 20).map(venta => (
                      <div key={venta.id} className="venta-item">
                        <input
                          type="checkbox"
                          checked={facturaForm.ventas_ids.includes(venta.id)}
                          onChange={() => toggleVenta(venta.id)}
                        />
                        <label>
                          Venta #{venta.id} - ${venta.total?.toFixed(2) || '0.00'} - {venta.metodo_pago}
                        </label>
                      </div>
                    ))}
                  </div>
                  <small className="text-muted">
                    Mostrando {Math.min(ventasVisibles.length, 20)} de {ventasVisibles.length} venta(s) disponibles
                  </small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Factura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}

export default Facturacion;
