import React, { useState, useEffect, useRef } from 'react';
import { posService, salesService } from '../../services/apiService';
import { ShoppingCart, Plus } from 'lucide-react';
import './POS.css';

function POS() {
  const [ventaActual, setVentaActual] = useState(null);
  const [items, setItems] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus en input de código de barras
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [items]);

  useEffect(() => {
    // Atajos de teclado globales
    const handleKeyDown = (e) => {
      // F1: Nueva Venta
      if (e.key === 'F1') {
        e.preventDefault();
        if (!ventaActual) {
          crearNuevaVenta();
        }
      }
      // F2: Cerrar Venta
      else if (e.key === 'F2') {
        e.preventDefault();
        if (ventaActual && items.length > 0) {
          cerrarVenta();
        }
      }
      // F3: Cancelar Venta
      else if (e.key === 'F3') {
        e.preventDefault();
        if (ventaActual) {
          cancelarVenta();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaActual, items]);

  const crearNuevaVenta = async () => {
    try {
      setLoading(true);
      const venta = await salesService.create({
        punto_venta_id: 1,
        metodo_pago: 'EFECTIVO',
        detalles: []
      });
      setVentaActual(venta);
      setItems([]);
      mostrarMensaje('success', 'Venta creada');
    } catch (error) {
      const d = error.response?.data?.detail;
      const msg = Array.isArray(d) ? d.map(e => e.msg).join(', ') : (d || error.message);
      mostrarMensaje('error', 'Error al crear venta: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const buscarYAgregarProducto = async (e) => {
    e.preventDefault();

    if (!codigoBarras) {
      mostrarMensaje('warning', 'Ingrese un código de barras');
      return;
    }

    try {
      setLoading(true);

      // Crear venta si no existe, obteniendo el ID directamente de la respuesta
      let ventaId;
      if (!ventaActual) {
        const venta = await salesService.create({
          punto_venta_id: 1,
          metodo_pago: 'EFECTIVO',
          detalles: []
        });
        setVentaActual(venta);
        setItems([]);
        ventaId = venta.id;
      } else {
        ventaId = ventaActual.id;
      }

      // Buscar producto
      const producto = await posService.buscarPorCodigo(codigoBarras);

      // Validar stock
      if (producto.stock_actual < cantidad) {
        mostrarMensaje('error', `Stock insuficiente. Disponible: ${producto.stock_actual}`);
        return;
      }

      // Agregar a venta
      const ventaActualizada = await salesService.addItem(ventaId, {
        codigo_barras: codigoBarras,
        cantidad: cantidad
      });

      setVentaActual(ventaActualizada);
      setItems(ventaActualizada.detalles || []);

      // Limpiar campos
      setCodigoBarras('');
      setCantidad(1);

      mostrarMensaje('success', `Agregado: ${producto.nombre_producto} (${cantidad})`);
    } catch (error) {
      const d = error.response?.data?.detail;
      const msg = Array.isArray(d) ? d.map(e => e.msg).join(', ') : (d || error.message);
      mostrarMensaje('error', 'Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const cerrarVenta = async () => {
    if (!ventaActual || items.length === 0) {
      mostrarMensaje('warning', 'No hay productos en la venta');
      return;
    }

    if (window.confirm('¿Cerrar venta y generar ticket?')) {
      try {
        setLoading(true);
        
        // Cerrar venta
        await salesService.cerrar(ventaActual.id);
        
        // Generar ticket
        const ticket = await salesService.generarTicket(ventaActual.id, true);
        
        // Mostrar ticket en nueva ventana
        const ventanaTicket = window.open('', '_blank');
        ventanaTicket.document.write(ticket.ticket_html);
        ventanaTicket.document.close();
        ventanaTicket.print();
        
        mostrarMensaje('success', 'Venta cerrada. Ticket generado.');
        
        // Limpiar venta
        setVentaActual(null);
        setItems([]);
        
      } catch (error) {
        mostrarMensaje('error', 'Error al cerrar venta: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const cancelarVenta = async () => {
    if (!ventaActual) return;

    if (window.confirm('¿Cancelar venta actual?')) {
      try {
        await salesService.cancelar(ventaActual.id);
        setVentaActual(null);
        setItems([]);
        mostrarMensaje('success', 'Venta cancelada');
      } catch (error) {
        mostrarMensaje('error', 'Error al cancelar: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  const calcularTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  };

  return (
      <div className="pos-container">
        <h1 className="page-title d-flex align-items-center gap-2">
          <ShoppingCart size={28} />
          Punto de Venta (POS)
        </h1>

        {/* Mensajes */}
        {mensaje.texto && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="pos-grid">
          {/* Panel izquierdo: Entrada de productos */}
          <div className="pos-input-panel">
            <div className="card">
              <h3>Escanear Producto</h3>
              
              <form onSubmit={buscarYAgregarProducto}>
                <div className="form-group">
                  <label>Código de Barras</label>
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="Escanear o ingresar código"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    className="form-control"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    min="1"
                    disabled={loading}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Agregar (Enter)'}
                </button>
              </form>

              <div className="pos-actions">
                {ventaActual && (
                  <>
                    <button 
                      className="btn btn-success btn-block"
                      onClick={cerrarVenta}
                      disabled={loading || items.length === 0}
                    >
                      💰 Cerrar Venta (F2)
                    </button>
                    <button 
                      className="btn btn-danger btn-block"
                      onClick={cancelarVenta}
                      disabled={loading}
                    >
                      ❌ Cancelar (F3)
                    </button>
                  </>
                )}
                {!ventaActual && (
                  <button 
                    className="btn btn-primary btn-block d-flex align-items-center justify-content-center gap-2"
                    onClick={crearNuevaVenta}
                    disabled={loading}
                  >
                    <Plus size={18} />
                    Nueva Venta (F1)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho: Resumen de venta */}
          <div className="pos-summary-panel">
            <div className="card">
              <h3>
                {ventaActual ? `Venta #${ventaActual.id}` : 'Sin venta activa'}
              </h3>

              {items.length > 0 ? (
                <>
                  <table className="pos-items-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant</th>
                        <th>Precio</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.producto_nombre || 'Producto'}</td>
                          <td className="text-center">{item.cantidad}</td>
                          <td className="text-right">${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                          <td className="text-right text-bold">${parseFloat(item.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pos-totals">
                    <div className="total-line">
                      <span>Subtotal:</span>
                      <span>${calcularTotal().toFixed(2)}</span>
                    </div>
                    <div className="total-line total-final">
                      <span>TOTAL:</span>
                      <span>${calcularTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-cart">
                  <p className="d-flex align-items-center justify-content-center gap-2">
                    <ShoppingCart size={24} className="opacity-75" />
                    Carrito vacío
                  </p>
                  <p className="text-muted">Escanea productos para agregar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Atajos de teclado */}
        <div className="keyboard-shortcuts">
          <small>
            <strong>Atajos:</strong> F1=Nueva Venta | F2=Cerrar | F3=Cancelar | Enter=Agregar
          </small>
        </div>
      </div>
  );
}

export default POS;
