import React, { useState, useEffect } from 'react';
import { cobranzaService } from '../../services/apiService';
import {
  Wallet,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import './Cobranza.css';

function Cobranza() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [filtrosUI, setFiltrosUI] = useState({
    q: '',
    estado: 'TODAS',
  });

  const [pagoForm, setPagoForm] = useState({
    cuenta_id: null,
    monto: '',
    metodo_pago: 'EFECTIVO',
    referencia: '',
    notas: ''
  });

  useEffect(() => {
    cargarCuentas();
  }, []);

  const cargarCuentas = async (filtros = {}) => {
    try {
      setLoading(true);
      const data = await cobranzaService.listarCuentas(filtros);
      setCuentas(data);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPago = (cuenta) => {
    setPagoForm({
      ...pagoForm,
      cuenta_id: cuenta.id,
      monto: cuenta.saldo_pendiente
    });
    setModalType('pago');
    setShowModal(true);
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      // eslint-disable-next-line no-unused-vars
      const result = await cobranzaService.registrarPago(pagoForm);
      mostrarMensaje('success', 'Pago registrado correctamente');
      setShowModal(false);
      cargarCuentas();
      setPagoForm({ cuenta_id: null, monto: '', metodo_pago: 'EFECTIVO', referencia: '', notas: '' });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  const calcularTotales = () => {
    const saldoTotal = cuentas
      .filter(c => c.estado === 'PENDIENTE')
      .reduce((sum, c) => sum + c.saldo_pendiente, 0);
    
    const vencidas = cuentas.filter(c => c.dias_vencido > 0).length;

    return { saldoTotal, vencidas };
  };

  const totales = calcularTotales();
  const cuentasFiltradas = cuentas.filter((c) => {
    const q = filtrosUI.q.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${c.id} ${c.cliente_nombre || ''} ${c.venta_id || ''}`.toLowerCase();
    return haystack.includes(q);
  });
  const cuentasVisibles =
    filtrosUI.estado === 'TODAS'
      ? cuentasFiltradas
      : cuentasFiltradas.filter((c) => c.estado === filtrosUI.estado);

  return (
      <div className="cobranza-container">
        <h1 className="page-title d-flex align-items-center gap-2">
          <Wallet size={28} />
          Cobranza
        </h1>

        {mensaje.texto && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Resumen */}
        <div className="resumen-cobranza">
          <div className="resumen-card">
            <div className="resumen-label">Saldo Total</div>
            <div className="resumen-value">${totales.saldoTotal.toFixed(2)}</div>
          </div>
          <div className="resumen-card warning">
            <div className="resumen-label">Cuentas Vencidas</div>
            <div className="resumen-value">{totales.vencidas}</div>
          </div>
          <div className="resumen-card">
            <div className="resumen-label">Cuentas Activas</div>
            <div className="resumen-value">{cuentas.filter(c => c.estado === 'PENDIENTE').length}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="actions-bar cobranza-actions">
          <div className="cobranza-search" role="search">
            <Search size={16} aria-hidden="true" />
            <input
              className="cobranza-search-input"
              type="text"
              value={filtrosUI.q}
              onChange={(e) => setFiltrosUI((p) => ({ ...p, q: e.target.value }))}
              placeholder="Buscar por cliente, #cuenta o #venta…"
              aria-label="Buscar cuentas"
            />
            {filtrosUI.q && (
              <button
                type="button"
                className="cobranza-icon-btn"
                onClick={() => setFiltrosUI((p) => ({ ...p, q: '' }))}
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="cobranza-filters">
            <button
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={() => cargarCuentas()}
              disabled={loading}
              type="button"
            >
              <RefreshCw size={16} />
              Todas
            </button>
            <button
              className="btn btn-warning d-inline-flex align-items-center gap-2"
              onClick={() => cargarCuentas({ vencidas: true })}
              disabled={loading}
              type="button"
            >
              <AlertTriangle size={16} />
              Vencidas
            </button>
            <button
              className="btn btn-success d-inline-flex align-items-center gap-2"
              onClick={() => cargarCuentas({ estado: 'PAGADA' })}
              disabled={loading}
              type="button"
            >
              <CheckCircle2 size={16} />
              Pagadas
            </button>

            <select
              className="form-control cobranza-select"
              value={filtrosUI.estado}
              onChange={(e) => setFiltrosUI((p) => ({ ...p, estado: e.target.value }))}
              aria-label="Filtrar por estado"
              disabled={loading}
            >
              <option value="TODAS">Estado: todos</option>
              <option value="PENDIENTE">Estado: pendiente</option>
              <option value="VENCIDA">Estado: vencida</option>
              <option value="PAGADA">Estado: pagada</option>
            </select>
          </div>
        </div>

        {/* Tabla de cuentas */}
        <div className="card">
          <div className="cobranza-card-header">
            <h3 className="m-0">Cuentas por Cobrar</h3>
            {loading && (
              <div className="cobranza-loading" aria-live="polite">
                <Loader2 className="spin" size={16} aria-hidden="true" />
                Cargando…
              </div>
            )}
          </div>

          {cuentasVisibles.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentasVisibles.map(cuenta => (
                  <tr key={cuenta.id} className={cuenta.dias_vencido > 0 ? 'row-vencida' : ''}>
                    <td>#{cuenta.id}</td>
                    <td>{cuenta.cliente_nombre}</td>
                    <td>#{cuenta.venta_id}</td>
                    <td>${cuenta.monto_total.toFixed(2)}</td>
                    <td>${cuenta.monto_pagado.toFixed(2)}</td>
                    <td className="text-bold">${cuenta.saldo_pendiente.toFixed(2)}</td>
                    <td>
                      {cuenta.fecha_vencimiento}
                      {cuenta.dias_vencido > 0 && (
                        <span className="badge badge-danger" style={{marginLeft: '5px'}} title="Días vencido">
                          {cuenta.dias_vencido}d
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        cuenta.estado === 'PAGADA' ? 'success' :
                        cuenta.estado === 'VENCIDA' ? 'danger' : 'warning'
                      }`}>
                        {cuenta.estado}
                      </span>
                    </td>
                    <td>
                      {cuenta.estado === 'PENDIENTE' && (
                        <button 
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                          onClick={() => abrirModalPago(cuenta)}
                          disabled={loading}
                          type="button"
                        >
                          <CreditCard size={14} />
                          Abonar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state cobranza-empty">
              <div className="empty-state-title">No hay cuentas por mostrar</div>
              <div className="empty-state-subtitle">
                Prueba ajustando los filtros o busca por cliente / número de venta.
              </div>
            </div>
          )}
        </div>

        {/* Modal de pago */}
        {showModal && modalType === 'pago' && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Registrar Pago/Abono</h3>
              
              <form onSubmit={registrarPago}>
                <div className="form-group">
                  <label>Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Método de Pago *</label>
                  <select
                    className="form-control"
                    value={pagoForm.metodo_pago}
                    onChange={(e) => setPagoForm({...pagoForm, metodo_pago: e.target.value})}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Referencia</label>
                  <input
                    type="text"
                    className="form-control"
                    value={pagoForm.referencia}
                    onChange={(e) => setPagoForm({...pagoForm, referencia: e.target.value})}
                    placeholder="Número de referencia, cheque, etc."
                  />
                </div>

                <div className="form-group">
                  <label>Notas</label>
                  <textarea
                    className="form-control"
                    value={pagoForm.notas}
                    onChange={(e) => setPagoForm({...pagoForm, notas: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrar Pago'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}

export default Cobranza;
