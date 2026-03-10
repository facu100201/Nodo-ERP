import React, { useState, useEffect } from 'react';
import { productService, inventoryService } from '../../services/apiService';
import { Package, Plus, Tag, FileUp, Download, ArrowUpDown, HelpCircle } from 'lucide-react';
import './Almacen.css';

function Almacen() {
  const [activeTab, setActiveTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [stock, setStock] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [erroresCarga, setErroresCarga] = useState([]);
  const [mostrarAyudaCarga, setMostrarAyudaCarga] = useState(false);

  const [productoForm, setProductoForm] = useState({
    nombre: '', descripcion: '', categoria: '', marca: '',
  });

  const [varianteForm, setVarianteForm] = useState({
    producto_id: '', sku: '', codigo_barras: '',
    talla: '', color: '', precio_menudeo: '', precio_mayoreo: '', stock_inicial: 0,
  });

  const [movimientoForm, setMovimientoForm] = useState({
    variante_id: '', tipo: 'ENTRADA', cantidad: '', motivo: '', referencia: '',
  });

  const [filtroColorStock, setFiltroColorStock] = useState('todos');
  const [filtroTallaStock, setFiltroTallaStock] = useState('todas');

  // Lista plana de variantes para el selector de movimientos
  const todasVariantes = productos.flatMap(p =>
    (p.variantes || []).map(v => ({ ...v, nombre_producto: p.nombre }))
  );

  // Cargar productos siempre al montar (los necesitamos en los formularios)
  useEffect(() => {
    cargarProductos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar stock solo cuando se activa esa pestaña
  useEffect(() => {
    if (activeTab === 'stock') cargarStock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProductos(data);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarStock = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getStock();
      setStock(data);
    } catch (error) {
      console.error('Error cargando stock:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── KPIs derivados ──────────────────────────────────────────────────────────

  const totalProductos = productos.length;
  const productosActivos = productos.filter(p => p.activo).length;
  const totalVariantes = productos.reduce(
    (acc, p) => acc + (p.variantes?.length || 0),
    0
  );
  const coloresDistintosProductos = new Set(
    productos.flatMap(p =>
      (p.variantes || [])
        .map(v => v.color)
        .filter(Boolean)
    )
  ).size;

  const totalUnidadesStock = stock.reduce(
    (acc, item) => acc + (item.stock_actual || 0),
    0
  );
  const variantesBajoStock = stock.filter(
    item => typeof item.stock_actual === 'number' && item.stock_actual <= 10
  ).length;
  const coloresStockSet = new Set(
    stock.map(item => item.color).filter(Boolean)
  );
  const coloresDisponiblesStock = ['todos', ...Array.from(coloresStockSet).sort()];

  const tallasStockSet = new Set(
    stock.map(item => item.talla).filter(Boolean)
  );
  const tallasDisponiblesStock = ['todas', ...Array.from(tallasStockSet).sort()];

  const stockFiltrado = stock.filter(item => {
    if (filtroColorStock !== 'todos' && item.color !== filtroColorStock) {
      return false;
    }
    if (filtroTallaStock !== 'todas' && item.talla !== filtroTallaStock) {
      return false;
    }
    return true;
  });

  const abrirModal = (type) => { setModalType(type); setShowModal(true); };
  const cerrarModal = () => { setShowModal(false); setModalType(''); };

  // ── Handlers de formularios ────────────────────────────────────────────────

  const handleCrearProducto = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await productService.create(productoForm);
      mostrarMensaje('success', 'Producto creado correctamente');
      cerrarModal();
      cargarProductos();
      setProductoForm({ nombre: '', descripcion: '', categoria: '', marca: '' });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCrearVariante = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await productService.createVariante({
        ...varianteForm,
        producto_id: Number(varianteForm.producto_id),
        precio_menudeo: Number(varianteForm.precio_menudeo),
        precio_mayoreo: Number(varianteForm.precio_mayoreo),
        stock_inicial: Number(varianteForm.stock_inicial),
      });
      mostrarMensaje('success', 'Variante creada correctamente');
      cerrarModal();
      cargarProductos();
      setVarianteForm({
        producto_id: '', sku: '', codigo_barras: '',
        talla: '', color: '', precio_menudeo: '', precio_mayoreo: '', stock_inicial: 0,
      });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleMovimiento = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryService.registrarMovimiento({
        ...movimientoForm,
        variante_id: Number(movimientoForm.variante_id),
        cantidad: Number(movimientoForm.cantidad),
      });
      mostrarMensaje('success', 'Movimiento registrado correctamente');
      cerrarModal();
      if (activeTab === 'stock') cargarStock();
      setMovimientoForm({ variante_id: '', tipo: 'ENTRADA', cantidad: '', motivo: '', referencia: '' });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCargaMasiva = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setErroresCarga([]);
      const result = await productService.cargaMasiva(file);
      setErroresCarga(result.errores || []);
      if (result.exitoso) {
        mostrarMensaje('success',
          `Carga completada: ${result.variantes_creadas} variante(s) creada(s)`
        );
      } else {
        mostrarMensaje('error',
          `Carga parcial: ${result.variantes_creadas} creada(s), ` +
          `${result.errores.length} con error. Ver detalle abajo.`
        );
      }
      cargarProductos();
    } catch (error) {
      mostrarMensaje('error',
        'Error en carga masiva: ' + (error.response?.data?.detail || error.message)
      );
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDescargarPlantilla = async () => {
    try {
      const blob = await productService.descargarPlantilla();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_variantes.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      mostrarMensaje('error', 'Error al descargar la plantilla');
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="almacen-container">
      <h1 className="page-title d-flex align-items-center gap-2">
        <Package size={28} />
        Almacén
      </h1>

      {/* Notificación principal */}
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {/* KPIs principales de almacén */}
      <div className="almacen-kpis">
        <div className="kpi-card">
          <span className="kpi-label">Productos</span>
          <span className="kpi-value">{totalProductos}</span>
          <span className="kpi-subtitle">
            {productosActivos} activos
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Variantes</span>
          <span className="kpi-value">{totalVariantes}</span>
          <span className="kpi-subtitle">
            {tallasStockSet.size} tallas distintas
          </span>
          <label className="kpi-filter-label">
            Filtrar por talla:
            <select
              className="form-control kpi-filter-select"
              value={filtroTallaStock}
              onChange={e => setFiltroTallaStock(e.target.value)}
            >
              {tallasDisponiblesStock.map(talla => (
                <option key={talla} value={talla}>
                  {talla === 'todas' ? 'Todas las tallas' : talla}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Unidades en stock</span>
          <span className="kpi-value">{totalUnidadesStock}</span>
          <span className="kpi-subtitle">
            {variantesBajoStock} variantes con stock bajo
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Colores en stock</span>
          <span className="kpi-value">{coloresStockSet.size}</span>
          <label className="kpi-filter-label">
            Filtrar por color:
            <select
              className="form-control kpi-filter-select"
              value={filtroColorStock}
              onChange={e => setFiltroColorStock(e.target.value)}
            >
              {coloresDisponiblesStock.map(color => (
                <option key={color} value={color}>
                  {color === 'todos' ? 'Todos los colores' : color}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Tabla de errores de carga masiva */}
      {erroresCarga.length > 0 && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #e74c3c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ color: '#e74c3c' }}>
              Errores en la carga masiva ({erroresCarga.length} fila(s) rechazada(s))
            </strong>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setErroresCarga([])}
            >
              Cerrar
            </button>
          </div>
          <table className="table" style={{ fontSize: 13, marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Línea</th>
                <th style={{ width: 140 }}>SKU</th>
                <th>Detalle del error</th>
              </tr>
            </thead>
            <tbody>
              {erroresCarga.map((err, i) => (
                <tr key={i}>
                  <td>{err.linea}</td>
                  <td>{err.sku}</td>
                  <td style={{ color: '#e74c3c' }}>{err.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pestañas */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          📋 Productos
        </button>
        <button
          className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          📊 Stock
        </button>
        <button
          className={`tab ${activeTab === 'movimientos' ? 'active' : ''}`}
          onClick={() => setActiveTab('movimientos')}
        >
          📈 Movimientos
        </button>
      </div>

      {/* Barra de acciones */}
      <div className="actions-bar">
        <button
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => abrirModal('producto')}
        >
          <Plus size={18} /> Nuevo Producto
        </button>
        <button
          className="btn btn-secondary d-inline-flex align-items-center gap-2"
          onClick={() => abrirModal('variante')}
        >
          <Tag size={18} /> Nueva Variante
        </button>
        <button
          className="btn btn-info d-inline-flex align-items-center gap-2"
          onClick={() => abrirModal('movimiento')}
        >
          <ArrowUpDown size={18} /> Movimiento
        </button>
        <button
          className="btn btn-secondary d-inline-flex align-items-center gap-2"
          onClick={handleDescargarPlantilla}
          title="Descarga la plantilla Excel con el formato correcto para carga masiva"
        >
          <Download size={18} /> Plantilla Excel
        </button>
        <div className="acciones-carga-masiva">
          <label
            className="btn btn-success d-inline-flex align-items-center gap-2"
            style={{ cursor: 'pointer' }}
            title="Carga variantes desde un archivo Excel (.xlsx) o CSV"
          >
            <FileUp size={18} /> Carga Masiva
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleCargaMasiva}
              style={{ display: 'none' }}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm boton-ayuda-carga"
            title="Ver ayuda sobre el formato del archivo de carga masiva"
            onClick={() => setMostrarAyudaCarga(!mostrarAyudaCarga)}
          >
            <HelpCircle size={16} style={{ marginRight: 4 }} />
            <span className="texto-ayuda-carga">Ayuda</span>
          </button>
        </div>
      </div>

      {mostrarAyudaCarga && (
        <div className="alert alert-info ayuda-carga-masiva">
          <strong>Formato de columnas para carga masiva:</strong>{' '}
          El archivo de Excel debe tener las columnas en este orden exacto:{' '}
          <code>producto_id</code>, <code>producto</code>, <code>sku</code>,{' '}
          <code>talla</code>, <code>color</code>, <code>precio_menudeo</code>,{' '}
          <code>precio_mayoreo</code>, <code>codigo_barras</code>, <code>activo</code>
          Puedes descargar la plantilla dando clic en el botón "Plantilla Excel" para ver un ejemplo con datos de muestra.
        </div>
      )}

      {/* Contenido por pestaña */}
      <div className="tab-content card">

        {activeTab === 'productos' && (
          <div>
            <h3>Catálogo de Productos</h3>
            {loading ? (
              <p className="empty-state">Cargando...</p>
            ) : productos.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Marca</th>
                    <th>Variantes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(producto => (
                    <tr key={producto.id}>
                      <td>{producto.id}</td>
                      <td>{producto.nombre}</td>
                      <td>{producto.categoria || '-'}</td>
                      <td>{producto.marca || '-'}</td>
                      <td>{producto.variantes?.length || 0}</td>
                      <td>
                        <span className={`badge badge-${producto.activo ? 'success' : 'secondary'}`}>
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No hay productos registrados</p>
            )}
          </div>
        )}

        {activeTab === 'stock' && (
          <div>
            <h3>Control de Stock</h3>
            {loading ? (
              <p className="empty-state">Cargando...</p>
            ) : stockFiltrado.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Talla</th>
                    <th>Color</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.map(item => (
                    <tr key={item.variante_id}>
                      <td>{item.nombre_producto}</td>
                      <td>{item.sku}</td>
                      <td>{item.talla || '-'}</td>
                      <td>{item.color || '-'}</td>
                      <td className={item.stock_actual <= 10 ? 'text-danger' : ''}>
                        {item.stock_actual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No hay registros de stock</p>
            )}
          </div>
        )}

        {activeTab === 'movimientos' && (
          <div>
            <h3>Movimientos de Inventario</h3>
            <p className="empty-state">
              Usa el botón <strong>Movimiento</strong> para registrar entradas o salidas de stock.
            </p>
          </div>
        )}

      </div>

      {/* ── Modal: Nuevo Producto ──────────────────────────────────────────── */}
      {showModal && modalType === 'producto' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo Producto</h3>
            <form onSubmit={handleCrearProducto}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="form-control"
                  value={productoForm.nombre}
                  onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  value={productoForm.descripcion}
                  onChange={(e) => setProductoForm({ ...productoForm, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productoForm.categoria}
                    onChange={(e) => setProductoForm({ ...productoForm, categoria: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Marca</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productoForm.marca}
                    onChange={(e) => setProductoForm({ ...productoForm, marca: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Variante ─────────────────────────────────────────── */}
      {showModal && modalType === 'variante' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Nueva Variante</h3>
            <form onSubmit={handleCrearVariante}>
              <div className="form-group">
                <label>Producto *</label>
                <select
                  className="form-control"
                  value={varianteForm.producto_id}
                  onChange={(e) => setVarianteForm({ ...varianteForm, producto_id: e.target.value })}
                  required
                >
                  <option value="">— Seleccionar producto —</option>
                  {productos.filter(p => p.activo).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={varianteForm.sku}
                    onChange={(e) => setVarianteForm({ ...varianteForm, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Código de barras *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={varianteForm.codigo_barras}
                    onChange={(e) => setVarianteForm({ ...varianteForm, codigo_barras: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Talla</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="M, L, XL…"
                    value={varianteForm.talla}
                    onChange={(e) => setVarianteForm({ ...varianteForm, talla: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Negro, Rojo…"
                    value={varianteForm.color}
                    onChange={(e) => setVarianteForm({ ...varianteForm, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Precio menudeo *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={varianteForm.precio_menudeo}
                    onChange={(e) => setVarianteForm({ ...varianteForm, precio_menudeo: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Precio mayoreo *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={varianteForm.precio_mayoreo}
                    onChange={(e) => setVarianteForm({ ...varianteForm, precio_mayoreo: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Stock inicial</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={varianteForm.stock_inicial}
                  onChange={(e) => setVarianteForm({ ...varianteForm, stock_inicial: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Variante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Movimiento de Inventario ───────────────────────────────── */}
      {showModal && modalType === 'movimiento' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar Movimiento</h3>
            <form onSubmit={handleMovimiento}>
              <div className="form-group">
                <label>Variante *</label>
                <select
                  className="form-control"
                  value={movimientoForm.variante_id}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, variante_id: e.target.value })}
                  required
                >
                  <option value="">— Seleccionar variante —</option>
                  {todasVariantes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre_producto} — {v.sku}
                      {(v.talla || v.color)
                        ? ` (${[v.talla, v.color].filter(Boolean).join(' ')})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    className="form-control"
                    value={movimientoForm.tipo}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, tipo: e.target.value })}
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={movimientoForm.cantidad}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, cantidad: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Motivo *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Compra, Ajuste, Devolución…"
                  value={movimientoForm.motivo}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, motivo: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Referencia</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="N° de factura, orden de compra…"
                  value={movimientoForm.referencia}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, referencia: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Almacen;
