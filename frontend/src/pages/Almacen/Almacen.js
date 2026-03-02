import React, { useState, useEffect } from 'react';
import { productService, inventoryService } from '../../services/apiService';
import { Package, Plus, Tag, FileUp } from 'lucide-react';
import './Almacen.css';

function Almacen() {
  const [activeTab, setActiveTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [stock, setStock] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Form data
  const [productoForm, setProductoForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    marca: ''
  });

  // eslint-disable-next-line no-unused-vars
  const [varianteForm, setVarianteForm] = useState({
    producto_id: '',
    sku: '',
    codigo_barras: '',
    talla: '',
    color: '',
    precio_menudeo: '',
    precio_mayoreo: '',
    stock_inicial: 0
  });

  // eslint-disable-next-line no-unused-vars
  const [movimientoForm, setMovimientoForm] = useState({
    variante_id: '',
    tipo: 'ENTRADA',
    cantidad: '',
    motivo: '',
    referencia: ''
  });

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      if (activeTab === 'productos') {
        const data = await productService.getAll();
        setProductos(data);
      } else if (activeTab === 'stock') {
        const data = await inventoryService.getStock();
        setStock(data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setModalType('');
  };

  const handleCrearProducto = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await productService.create(productoForm);
      mostrarMensaje('success', 'Producto creado correctamente');
      cerrarModal();
      cargarDatos();
      setProductoForm({ nombre: '', descripcion: '', categoria: '', marca: '' });
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleCrearVariante = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await productService.createVariante(varianteForm);
      mostrarMensaje('success', 'Variante creada correctamente');
      cerrarModal();
      cargarDatos();
    } catch (error) {
      mostrarMensaje('error', 'Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleMovimiento = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // eslint-disable-next-line no-unused-vars
      const result = await inventoryService.registrarMovimiento(movimientoForm);
      mostrarMensaje('success', 'Movimiento registrado correctamente');
      cerrarModal();
      if (activeTab === 'stock') cargarDatos();
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
      const result = await productService.cargaMasiva(file);
      mostrarMensaje('success', 
        `Carga completada: ${result.productos_creados} productos, ${result.variantes_creadas} variantes`
      );
      cargarDatos();
    } catch (error) {
      mostrarMensaje('error', 'Error en carga masiva: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  return (
      <div className="almacen-container">
        <h1 className="page-title d-flex align-items-center gap-2">
          <Package size={28} />
          Almacén
        </h1>

        {mensaje.texto && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Tabs */}
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

        {/* Acciones rápidas */}
        <div className="actions-bar">
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={() => abrirModal('producto')}>
            <Plus size={18} />
            Nuevo Producto
          </button>
          <button className="btn btn-secondary d-inline-flex align-items-center gap-2" onClick={() => abrirModal('variante')}>
            <Tag size={18} />
            Nueva Variante
          </button>
          <button className="btn btn-info d-inline-flex align-items-center gap-2" onClick={() => abrirModal('movimiento')}>
            <Package size={18} />
            Movimiento
          </button>
          <label className="btn btn-success d-inline-flex align-items-center gap-2" style={{cursor: 'pointer'}}>
            <FileUp size={18} />
            Carga Masiva
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCargaMasiva}
              style={{display: 'none'}}
            />
          </label>
        </div>

        {/* Contenido según tab activo */}
        <div className="tab-content card">
          {activeTab === 'productos' && (
            <div>
              <h3>Catálogo de Productos</h3>
              {productos.length > 0 ? (
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
              {stock.length > 0 ? (
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
                    {stock.map(item => (
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
        </div>

        {/* Modales */}
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
                    onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    className="form-control"
                    value={productoForm.descripcion}
                    onChange={(e) => setProductoForm({...productoForm, descripcion: e.target.value})}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Categoría</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productoForm.categoria}
                      onChange={(e) => setProductoForm({...productoForm, categoria: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productoForm.marca}
                      onChange={(e) => setProductoForm({...productoForm, marca: e.target.value})}
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
      </div>
  );
}

export default Almacen;
