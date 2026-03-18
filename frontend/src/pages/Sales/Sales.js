import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { salesService, productService } from '../../services/apiService';
import { DollarSign, Search, ShoppingCart, Plus, CheckCircle, XCircle } from 'lucide-react';
import './Sales.css';

function Sales() {
  const [currentSale, setCurrentSale] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Crear una venta nueva al cargar
    createNewSale();
  }, []);

  const createNewSale = async () => {
    try {
      const newSale = await salesService.create({
        cliente_nombre: clientName || 'Cliente General',
        metodo_pago: paymentMethod,
        descuento_general: 0,
        detalles: [],
      });
      setCurrentSale(newSale);
      setMessage({ type: 'success', text: 'Nueva venta iniciada' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error creando venta:', error);
      setMessage({ type: 'error', text: '❌ Error al crear la venta' });
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (!currentSale) {
      setMessage({ type: 'error', text: 'No hay una venta activa' });
      return;
    }

    if (!barcode) {
      setMessage({ type: 'error', text: '❌ Ingresa un código de barras' });
      return;
    }

    setLoading(true);
    try {
      const updatedSale = await salesService.addItem(currentSale.id, {
        codigo_barras: barcode,
        cantidad: quantity,
        descuento: discount,
      });
      
      setCurrentSale(updatedSale);
      setBarcode('');
      setQuantity(1);
      setDiscount(0);
      setMessage({ type: 'success', text: 'Producto agregado' });
      
      // Enfocar el input de código de barras
      document.getElementById('barcode-input')?.focus();
    } catch (error) {
      console.error('Error agregando item:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Error al agregar producto' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSale = async () => {
    if (!currentSale || !currentSale.detalles || currentSale.detalles.length === 0) {
      setMessage({ type: 'error', text: 'Agrega productos antes de completar la venta' });
      return;
    }

    try {
      await salesService.cerrar(currentSale.id);
      setMessage({ type: 'success', text: 'Venta completada exitosamente' });
      
      // Reiniciar después de 2 segundos
      setTimeout(() => {
        setClientName('');
        setPaymentMethod('EFECTIVO');
        createNewSale();
      }, 2000);
    } catch (error) {
      console.error('Error completando venta:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Error al completar la venta' 
      });
    }
  };

  const handleCancelSale = async () => {
    if (!currentSale) return;

    if (window.confirm('¿Estás seguro de cancelar esta venta?')) {
      try {
        await salesService.cancelar(currentSale.id);
        setMessage({ type: 'success', text: '⚠️ Venta cancelada' });
        createNewSale();
      } catch (error) {
        console.error('Error cancelando venta:', error);
        setMessage({ type: 'error', text: '❌ Error al cancelar la venta' });
      }
    }
  };


  return (
    <Layout>
      <div className="sales">
        <h1 className="page-title d-flex align-items-center gap-2">
          <DollarSign size={28} />
          Nueva Venta
        </h1>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="sales-grid">
          {/* Panel de escaneo */}
          <div className="sales-panel">
            <div className="card">
              <h2 className="card-title d-flex align-items-center gap-2"><Search size={22} /> Escanear Producto</h2>
              
              <form onSubmit={handleAddItem} className="scan-form">
                <div className="form-group">
                  <label htmlFor="barcode-input">Código de Barras</label>
                  <input
                    type="text"
                    id="barcode-input"
                    className="form-control"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Escanea o ingresa el código"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="quantity">Cantidad</label>
                    <input
                      type="number"
                      id="quantity"
                      className="form-control"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="discount">Descuento ($)</label>
                    <input
                      type="number"
                      id="discount"
                      className="form-control"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Agregando...' : <><Plus size={18} /> Agregar Producto</>}
                </button>
              </form>

              <div className="sale-info">
                <h3>Información de la Venta</h3>
                
                <div className="form-group">
                  <label htmlFor="client-name">Cliente</label>
                  <input
                    type="text"
                    id="client-name"
                    className="form-control"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre del cliente (opcional)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="payment-method">Método de Pago</label>
                  <select
                    id="payment-method"
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Carrito de compra */}
          <div className="sales-cart">
            <div className="card">
              <h2 className="card-title">🛒 Carrito de Compra</h2>
              
              {currentSale && currentSale.detalles && currentSale.detalles.length > 0 ? (
                <>
                  <div className="cart-items">
                    {currentSale.detalles.map((item, index) => (
                      <div key={index} className="cart-item">
                        <div className="item-info">
                          <h4>{item.producto_nombre || 'Producto'}</h4>
                          <p className="item-details">
                            Cantidad: {item.cantidad} × ${item.precio_unitario?.toFixed(2)}
                            {item.descuento > 0 && (
                              <span className="item-discount"> (-${item.descuento.toFixed(2)})</span>
                            )}
                          </p>
                        </div>
                        <div className="item-actions">
                          <p className="item-total">${item.subtotal?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>${currentSale.subtotal?.toFixed(2)}</span>
                    </div>
                    {currentSale.descuento > 0 && (
                      <div className="summary-row">
                        <span>Descuentos:</span>
                        <span className="text-discount">-${currentSale.descuento?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="summary-row summary-total">
                      <span>TOTAL:</span>
                      <span>${currentSale.total?.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="cart-actions">
                    <button 
                      className="btn btn-success btn-block"
                      onClick={handleCompleteSale}
                    >
                      ✅ Completar Venta
                    </button>
                    <button 
                      className="btn btn-danger btn-block"
                      onClick={handleCancelSale}
                    >
                      ❌ Cancelar Venta
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-cart">
                  <p className="d-flex align-items-center justify-content-center gap-2">
                    <ShoppingCart size={24} className="opacity-75" />
                    El carrito está vacío
                  </p>
                  <p className="empty-cart-subtitle">Escanea productos para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Sales;
