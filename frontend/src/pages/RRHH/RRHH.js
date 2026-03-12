import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, Activity, ShoppingBag,
  Plus, ChevronDown, ChevronUp, UserCheck, UserX,
  RefreshCw, X, Check, AlertCircle
} from 'lucide-react';
import { rrhhService } from '../../services/apiService';
import './RRHH.css';

// ─── helpers ───────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const fmtShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const today = () => new Date().toISOString().slice(0, 10);

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`rrhh-kpi-card rrhh-kpi-card--${color}`}>
      <div className="rrhh-kpi-card__icon"><Icon size={22} strokeWidth={1.8} /></div>
      <div className="rrhh-kpi-card__body">
        <span className="rrhh-kpi-card__label">{label}</span>
        <span className="rrhh-kpi-card__value">{value}</span>
      </div>
    </div>
  );
}

// ─── Alerta inline ──────────────────────────────────────────────────────────
function Alert({ msg, type = 'danger', onClose }) {
  if (!msg) return null;
  return (
    <div className={`rrhh-alert rrhh-alert--${type}`}>
      <AlertCircle size={15} />
      <span>{msg}</span>
      {onClose && <button onClick={onClose}><X size={13} /></button>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: PERSONAL
// ════════════════════════════════════════════════════════════════════════════
function TabPersonal() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    usuario_id: '', departamento: '', puesto: '',
    salario_mensual: '', fecha_ingreso: today(),
    telefono: '', direccion: '', activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rrhhService.listarEmpleados();
      setEmpleados(data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ usuario_id: '', departamento: '', puesto: '', salario_mensual: '', fecha_ingreso: today(), telefono: '', direccion: '', activo: true });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({
      usuario_id: emp.usuario_id,
      departamento: emp.departamento,
      puesto: emp.puesto,
      salario_mensual: emp.salario_mensual,
      fecha_ingreso: emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : today(),
      telefono: emp.telefono || '',
      direccion: emp.direccion || '',
      activo: emp.activo,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        usuario_id: parseInt(form.usuario_id),
        salario_mensual: parseFloat(form.salario_mensual),
        fecha_ingreso: new Date(form.fecha_ingreso).toISOString(),
      };
      if (editTarget) {
        await rrhhService.actualizarEmpleado(editTarget.id, payload);
      } else {
        await rrhhService.crearEmpleado(payload);
      }
      setShowForm(false);
      cargar();
    } catch (e) {
      setFormError(e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (emp) => {
    try {
      await rrhhService.actualizarEmpleado(emp.id, { activo: !emp.activo });
      cargar();
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    }
  };

  if (loading) return <div className="rrhh-loading"><RefreshCw size={20} className="spin" /> Cargando personal…</div>;

  return (
    <div className="rrhh-tab-content">
      <div className="rrhh-tab-header">
        <h3 className="rrhh-tab-title">Personal Registrado</h3>
        <button className="rrhh-btn rrhh-btn--primary" onClick={openCreate}>
          <Plus size={15} /> Nuevo Empleado
        </button>
      </div>

      <Alert msg={error} onClose={() => setError(null)} />

      {/* Modal / Form */}
      {showForm && (
        <div className="rrhh-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="rrhh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rrhh-modal__header">
              <h4>{editTarget ? 'Editar Empleado' : 'Nuevo Empleado'}</h4>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form className="rrhh-modal__body" onSubmit={handleSave}>
              <Alert msg={formError} onClose={() => setFormError(null)} />

              {!editTarget && (
                <div className="rrhh-field">
                  <label>ID de Usuario *</label>
                  <input type="number" required value={form.usuario_id}
                    onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))} />
                  <small>Debe coincidir con el ID del usuario en el sistema</small>
                </div>
              )}

              <div className="rrhh-field-row">
                <div className="rrhh-field">
                  <label>Departamento *</label>
                  <input required value={form.departamento}
                    onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} />
                </div>
                <div className="rrhh-field">
                  <label>Puesto *</label>
                  <input required value={form.puesto}
                    onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))} />
                </div>
              </div>

              <div className="rrhh-field-row">
                <div className="rrhh-field">
                  <label>Salario Mensual (MXN) *</label>
                  <input type="number" step="0.01" min="0" required value={form.salario_mensual}
                    onChange={e => setForm(f => ({ ...f, salario_mensual: e.target.value }))} />
                </div>
                <div className="rrhh-field">
                  <label>Fecha de Ingreso *</label>
                  <input type="date" required value={form.fecha_ingreso}
                    onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} />
                </div>
              </div>

              <div className="rrhh-field-row">
                <div className="rrhh-field">
                  <label>Teléfono</label>
                  <input value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="rrhh-field">
                  <label>Dirección</label>
                  <input value={form.direccion}
                    onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
              </div>

              {editTarget && (
                <div className="rrhh-field rrhh-field--check">
                  <input type="checkbox" id="activo" checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                  <label htmlFor="activo">Empleado activo</label>
                </div>
              )}

              <div className="rrhh-modal__footer">
                <button type="button" className="rrhh-btn rrhh-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="rrhh-btn rrhh-btn--primary" disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Guardando…</> : <><Check size={14} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {empleados.length === 0 ? (
        <div className="rrhh-empty">No hay empleados registrados aún.</div>
      ) : (
        <div className="rrhh-table-wrap">
          <table className="rrhh-table">
            <thead>
              <tr>
                <th>ID</th><th>Nombre</th><th>Email</th>
                <th>Departamento</th><th>Puesto</th>
                <th>Salario</th><th>Ingreso</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(emp => (
                <tr key={emp.id} className={!emp.activo ? 'rrhh-row--inactive' : ''}>
                  <td>{emp.id}</td>
                  <td className="rrhh-cell--bold">{emp.usuario_nombre || '—'}</td>
                  <td>{emp.usuario_email || '—'}</td>
                  <td>{emp.departamento}</td>
                  <td>{emp.puesto}</td>
                  <td className="rrhh-cell--money">{fmt(emp.salario_mensual)}</td>
                  <td>{fmtShort(emp.fecha_ingreso)}</td>
                  <td>
                    <span className={`rrhh-badge ${emp.activo ? 'rrhh-badge--green' : 'rrhh-badge--red'}`}>
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="rrhh-cell--actions">
                    <button className="rrhh-btn-icon" title="Editar" onClick={() => openEdit(emp)}>✏️</button>
                    <button
                      className={`rrhh-btn-icon ${emp.activo ? 'rrhh-btn-icon--danger' : 'rrhh-btn-icon--success'}`}
                      title={emp.activo ? 'Desactivar' : 'Activar'}
                      onClick={() => toggleActivo(emp)}
                    >
                      {emp.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: NÓMINAS
// ════════════════════════════════════════════════════════════════════════════
function TabNominas() {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [form, setForm] = useState({ nombre: '', fecha_inicio: today(), fecha_fin: today(), detalles: [] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [nominas, emps] = await Promise.all([
        rrhhService.listarNominas(),
        rrhhService.listarEmpleados(true),
      ]);
      setPeriodos(nominas);
      setEmpleados(emps);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openForm = () => {
    const detalles = empleados.map(e => ({
      empleado_id: e.id,
      nombre: e.usuario_nombre,
      puesto: e.puesto,
      salario_base: e.salario_mensual,
      deducciones: '0',
      notas: '',
    }));
    setForm({ nombre: '', fecha_inicio: today(), fecha_fin: today(), detalles });
    setFormError(null);
    setShowForm(true);
  };

  const handleDetalle = (idx, field, value) => {
    setForm(f => {
      const detalles = [...f.detalles];
      detalles[idx] = { ...detalles[idx], [field]: value };
      return { ...f, detalles };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre,
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin).toISOString(),
        detalles: form.detalles.map(d => ({
          empleado_id: d.empleado_id,
          salario_base: parseFloat(d.salario_base),
          deducciones: parseFloat(d.deducciones) || 0,
          notas: d.notas || null,
        })),
      };
      await rrhhService.crearNomina(payload);
      setShowForm(false);
      cargar();
    } catch (e) {
      setFormError(e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  const cerrar = async (id) => {
    if (!window.confirm('¿Cerrar este período de nómina? Esta acción no se puede deshacer.')) return;
    try {
      await rrhhService.cerrarNomina(id);
      cargar();
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    }
  };

  if (loading) return <div className="rrhh-loading"><RefreshCw size={20} className="spin" /> Cargando nóminas…</div>;

  return (
    <div className="rrhh-tab-content">
      <div className="rrhh-tab-header">
        <h3 className="rrhh-tab-title">Períodos de Nómina</h3>
        <button className="rrhh-btn rrhh-btn--primary" onClick={openForm}>
          <Plus size={15} /> Nueva Nómina
        </button>
      </div>

      <Alert msg={error} onClose={() => setError(null)} />

      {/* Form modal */}
      {showForm && (
        <div className="rrhh-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="rrhh-modal rrhh-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="rrhh-modal__header">
              <h4>Nueva Nómina</h4>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form className="rrhh-modal__body" onSubmit={handleSave}>
              <Alert msg={formError} onClose={() => setFormError(null)} />

              <div className="rrhh-field">
                <label>Nombre del Período *</label>
                <input required value={form.nombre}
                  placeholder="Ej. Quincena 1 – Marzo 2026"
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>

              <div className="rrhh-field-row">
                <div className="rrhh-field">
                  <label>Fecha Inicio *</label>
                  <input type="date" required value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
                <div className="rrhh-field">
                  <label>Fecha Fin *</label>
                  <input type="date" required value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
              </div>

              {form.detalles.length > 0 && (
                <div className="rrhh-nomina-detalles">
                  <p className="rrhh-nomina-detalles__title">Detalle por empleado</p>
                  <div className="rrhh-table-wrap">
                    <table className="rrhh-table rrhh-table--compact">
                      <thead>
                        <tr>
                          <th>Empleado</th><th>Puesto</th>
                          <th>Salario Base</th><th>Deducciones</th>
                          <th>Neto</th><th>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.detalles.map((d, i) => {
                          const neto = (parseFloat(d.salario_base) || 0) - (parseFloat(d.deducciones) || 0);
                          return (
                            <tr key={d.empleado_id}>
                              <td className="rrhh-cell--bold">{d.nombre}</td>
                              <td>{d.puesto}</td>
                              <td>
                                <input className="rrhh-input-inline" type="number" step="0.01" min="0"
                                  value={d.salario_base}
                                  onChange={e => handleDetalle(i, 'salario_base', e.target.value)} />
                              </td>
                              <td>
                                <input className="rrhh-input-inline" type="number" step="0.01" min="0"
                                  value={d.deducciones}
                                  onChange={e => handleDetalle(i, 'deducciones', e.target.value)} />
                              </td>
                              <td className={`rrhh-cell--money ${neto < 0 ? 'rrhh-cell--negative' : ''}`}>
                                {fmt(neto)}
                              </td>
                              <td>
                                <input className="rrhh-input-inline rrhh-input-inline--wide" value={d.notas}
                                  onChange={e => handleDetalle(i, 'notas', e.target.value)} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="rrhh-cell--bold">Total Bruto</td>
                          <td className="rrhh-cell--money rrhh-cell--bold">
                            {fmt(form.detalles.reduce((s, d) => s + (parseFloat(d.salario_base) || 0), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="rrhh-modal__footer">
                <button type="button" className="rrhh-btn rrhh-btn--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="rrhh-btn rrhh-btn--primary" disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Guardando…</> : <><Check size={14} /> Crear Nómina</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {periodos.length === 0 ? (
        <div className="rrhh-empty">No hay períodos de nómina registrados.</div>
      ) : (
        <div className="rrhh-accordion">
          {periodos.map(p => (
            <div key={p.id} className="rrhh-accordion__item">
              <div className="rrhh-accordion__header" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <div className="rrhh-accordion__title">
                  <span className="rrhh-cell--bold">{p.nombre}</span>
                  <span className="rrhh-accordion__meta">{fmtShort(p.fecha_inicio)} – {fmtShort(p.fecha_fin)}</span>
                </div>
                <div className="rrhh-accordion__right">
                  <span className={`rrhh-badge ${p.estado === 'CERRADO' ? 'rrhh-badge--green' : 'rrhh-badge--yellow'}`}>{p.estado}</span>
                  <span className="rrhh-cell--money rrhh-cell--bold">{fmt(p.total_bruto)}</span>
                  <span className="rrhh-accordion__emp-count">{p.total_empleados} emp.</span>
                  {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expanded === p.id && (
                <div className="rrhh-accordion__body">
                  {p.estado === 'BORRADOR' && (
                    <button className="rrhh-btn rrhh-btn--warning rrhh-btn--sm" onClick={() => cerrar(p.id)}>
                      Cerrar período
                    </button>
                  )}
                  {p.detalles?.length > 0 ? (
                    <div className="rrhh-table-wrap">
                      <table className="rrhh-table rrhh-table--compact">
                        <thead>
                          <tr><th>Empleado</th><th>Puesto</th><th>Salario Base</th><th>Deducciones</th><th>Neto</th><th>Notas</th></tr>
                        </thead>
                        <tbody>
                          {p.detalles.map(d => (
                            <tr key={d.id}>
                              <td className="rrhh-cell--bold">{d.empleado_nombre || `Emp. #${d.empleado_id}`}</td>
                              <td>{d.empleado_puesto || '—'}</td>
                              <td className="rrhh-cell--money">{fmt(d.salario_base)}</td>
                              <td className="rrhh-cell--money">{fmt(d.deducciones)}</td>
                              <td className="rrhh-cell--money rrhh-cell--bold">{fmt(d.salario_neto)}</td>
                              <td>{d.notas || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="rrhh-empty">Sin detalles.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: LOGS DE ACCESO
// ════════════════════════════════════════════════════════════════════════════
function TabLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ accion: '', fecha_desde: today(), fecha_hasta: today() });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.accion) params.accion = filtros.accion;
      if (filtros.fecha_desde) params.fecha_desde = new Date(filtros.fecha_desde).toISOString();
      if (filtros.fecha_hasta) params.fecha_hasta = new Date(filtros.fecha_hasta + 'T23:59:59').toISOString();
      const data = await rrhhService.listarLogs(params);
      setLogs(data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="rrhh-tab-content">
      <div className="rrhh-tab-header">
        <h3 className="rrhh-tab-title">Logs de Acceso al Sistema</h3>
        <button className="rrhh-btn rrhh-btn--ghost rrhh-btn--sm" onClick={cargar}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <Alert msg={error} onClose={() => setError(null)} />

      {/* Filtros */}
      <div className="rrhh-filters">
        <div className="rrhh-field rrhh-field--inline">
          <label>Acción</label>
          <select value={filtros.accion} onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))}>
            <option value="">Todas</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
          </select>
        </div>
        <div className="rrhh-field rrhh-field--inline">
          <label>Desde</label>
          <input type="date" value={filtros.fecha_desde}
            onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
        </div>
        <div className="rrhh-field rrhh-field--inline">
          <label>Hasta</label>
          <input type="date" value={filtros.fecha_hasta}
            onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
        </div>
      </div>

      {loading ? (
        <div className="rrhh-loading"><RefreshCw size={20} className="spin" /> Cargando logs…</div>
      ) : logs.length === 0 ? (
        <div className="rrhh-empty">Sin registros para los filtros seleccionados.</div>
      ) : (
        <div className="rrhh-table-wrap">
          <table className="rrhh-table">
            <thead>
              <tr>
                <th>#</th><th>Usuario</th><th>Acción</th>
                <th>IP</th><th>Dispositivo / UA</th><th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td className="rrhh-cell--bold">{log.usuario_nombre || `ID ${log.usuario_id}`}</td>
                  <td>
                    <span className={`rrhh-badge ${log.accion === 'LOGIN' ? 'rrhh-badge--blue' : 'rrhh-badge--gray'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td>{log.ip_address || '—'}</td>
                  <td className="rrhh-cell--ua">{log.user_agent ? log.user_agent.slice(0, 60) + (log.user_agent.length > 60 ? '…' : '') : '—'}</td>
                  <td>{fmtDate(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: VENTAS POR SESIÓN
// ════════════════════════════════════════════════════════════════════════════
function TabVentasSesion() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ fecha_desde: today(), fecha_hasta: today() });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.fecha_desde) params.fecha_desde = new Date(filtros.fecha_desde).toISOString();
      if (filtros.fecha_hasta) params.fecha_hasta = new Date(filtros.fecha_hasta + 'T23:59:59').toISOString();
      const data = await rrhhService.ventasSesion(params);
      setDatos(data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalGeneral = datos.reduce((s, d) => s + parseFloat(d.total_monto || 0), 0);
  const totalOps = datos.reduce((s, d) => s + (d.total_ventas || 0), 0);

  return (
    <div className="rrhh-tab-content">
      <div className="rrhh-tab-header">
        <h3 className="rrhh-tab-title">Ventas y Operaciones por Vendedor</h3>
        <button className="rrhh-btn rrhh-btn--ghost rrhh-btn--sm" onClick={cargar}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <Alert msg={error} onClose={() => setError(null)} />

      <div className="rrhh-filters">
        <div className="rrhh-field rrhh-field--inline">
          <label>Desde</label>
          <input type="date" value={filtros.fecha_desde}
            onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
        </div>
        <div className="rrhh-field rrhh-field--inline">
          <label>Hasta</label>
          <input type="date" value={filtros.fecha_hasta}
            onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
        </div>
      </div>

      {loading ? (
        <div className="rrhh-loading"><RefreshCw size={20} className="spin" /> Cargando datos…</div>
      ) : datos.length === 0 ? (
        <div className="rrhh-empty">Sin ventas registradas en el período.</div>
      ) : (
        <>
          <div className="rrhh-sesion-summary">
            <span>Total del período: <strong>{fmt(totalGeneral)}</strong></span>
            <span>Total operaciones: <strong>{totalOps}</strong></span>
            <span>Vendedores activos: <strong>{datos.length}</strong></span>
          </div>
          <div className="rrhh-table-wrap">
            <table className="rrhh-table">
              <thead>
                <tr>
                  <th>Vendedor</th><th>Operaciones</th>
                  <th>Monto Total</th><th>Promedio por Venta</th>
                  <th>% del Total</th>
                </tr>
              </thead>
              <tbody>
                {datos.map(d => {
                  const pct = totalGeneral > 0 ? (parseFloat(d.total_monto) / totalGeneral * 100).toFixed(1) : 0;
                  return (
                    <tr key={d.usuario_id}>
                      <td className="rrhh-cell--bold">{d.usuario_nombre}</td>
                      <td>{d.total_ventas}</td>
                      <td className="rrhh-cell--money rrhh-cell--bold">{fmt(d.total_monto)}</td>
                      <td className="rrhh-cell--money">{fmt(d.promedio_venta)}</td>
                      <td>
                        <div className="rrhh-progress">
                          <div className="rrhh-progress__bar" style={{ width: `${pct}%` }} />
                          <span>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="rrhh-cell--bold">Total</td>
                  <td className="rrhh-cell--bold">{totalOps}</td>
                  <td className="rrhh-cell--money rrhh-cell--bold">{fmt(totalGeneral)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'personal',   label: 'Personal',          icon: Users },
  { id: 'nominas',    label: 'Nóminas',            icon: DollarSign },
  { id: 'logs',       label: 'Logs de Acceso',     icon: Activity },
  { id: 'sesion',     label: 'Ventas por Sesión',  icon: ShoppingBag },
];

export default function RRHH() {
  const [tab, setTab] = useState('personal');
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    rrhhService.resumen()
      .then(setResumen)
      .catch(() => {});
  }, []);

  return (
    <div className="rrhh-page">
      {/* ── Header ── */}
      <div className="rrhh-page-header">
        <div>
          <h1 className="rrhh-page-title">
            <Users size={24} strokeWidth={1.8} />
            Recursos Humanos
          </h1>
          <p className="rrhh-page-subtitle">Gestión de personal, nóminas y control de acceso</p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="rrhh-kpis">
        <KpiCard icon={Users} label="Personal Activo"
          value={resumen ? resumen.total_empleados_activos : '—'} color="blue" />
        <KpiCard icon={DollarSign} label="Capital en Nómina (mensual)"
          value={resumen ? fmt(resumen.capital_mensual_nomina) : '—'} color="green" />
        <KpiCard icon={Activity} label="Accesos Hoy"
          value={resumen ? resumen.logs_hoy : '—'} color="purple" />
        <KpiCard icon={ShoppingBag} label="Ventas Hoy"
          value={resumen ? `${resumen.ventas_hoy_operaciones} ops · ${fmt(resumen.ventas_hoy_total)}` : '—'} color="orange" />
      </div>

      {/* ── Tabs ── */}
      <div className="rrhh-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              className={`rrhh-tab-btn ${tab === t.id ? 'rrhh-tab-btn--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={15} strokeWidth={1.8} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="rrhh-tab-panel">
        {tab === 'personal' && <TabPersonal />}
        {tab === 'nominas'  && <TabNominas />}
        {tab === 'logs'     && <TabLogs />}
        {tab === 'sesion'   && <TabVentasSesion />}
      </div>
    </div>
  );
}
