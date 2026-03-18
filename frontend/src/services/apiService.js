import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token a todas las peticiones
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo redirigir si ya hay un token guardado (sesión expirada)
      // No redirigir durante el proceso de login para evitar loops
      const token = localStorage.getItem('token');
      if (token && !error.config?.url?.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authService = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/login`,
      formData,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/api/v1/auth/me');
    return response.data;
  },
};

// ==================== PRODUCTOS ====================
export const productService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/api/v1/productos', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/productos/${id}`);
    return response.data;
  },

  create: async (productData) => {
    const response = await apiClient.post('/api/v1/productos', productData);
    return response.data;
  },

  createVariante: async (varianteData) => {
    const response = await apiClient.post('/api/v1/productos/variantes', varianteData);
    return response.data;
  },

  cargaMasiva: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/v1/productos/carga-masiva', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  descargarPlantilla: async () => {
    const response = await apiClient.get('/api/v1/productos/plantilla', {
      responseType: 'blob',
    });
    return response.data;
  },

  update: async (id, productData) => {
    const response = await apiClient.patch(`/api/v1/productos/${id}`, productData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/v1/productos/${id}`);
    return response.data;
  },
};

// ==================== POS ====================
export const posService = {
  buscarPorCodigo: async (codigo) => {
    const response = await apiClient.get(`/api/v1/pos/barcode/${codigo}`);
    return response.data;
  },
};

// ==================== VENTAS ====================
export const salesService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/api/v1/ventas', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/ventas/${id}`);
    return response.data;
  },

  create: async (ventaData) => {
    const response = await apiClient.post('/api/v1/ventas', ventaData);
    return response.data;
  },

  addItem: async (ventaId, itemData) => {
    const response = await apiClient.post(`/api/v1/ventas/${ventaId}/items`, itemData);
    return response.data;
  },

  cerrar: async (ventaId) => {
    const response = await apiClient.post(`/api/v1/ventas/${ventaId}/cerrar`);
    return response.data;
  },

  cancelar: async (ventaId) => {
    const response = await apiClient.post(`/api/v1/ventas/${ventaId}/cancelar`);
    return response.data;
  },

  generarTicket: async (ventaId, incluirQR = true) => {
    const response = await apiClient.get(`/api/v1/ventas/${ventaId}/ticket`, {
      params: { incluir_qr: incluirQR }
    });
    return response.data;
  },
};

// ==================== INVENTARIO ====================
export const inventoryService = {
  getStock: async (params = {}) => {
    const response = await apiClient.get('/api/v1/inventario/stock', { params });
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get('/api/v1/inventario/stock/bajo');
    return response.data;
  },

  registrarMovimiento: async (movimientoData) => {
    const response = await apiClient.post('/api/v1/inventario/movimientos', movimientoData);
    return response.data;
  },

  listarMovimientos: async (params = {}) => {
    const response = await apiClient.get('/api/v1/inventario/movimientos', { params });
    return response.data;
  },
};

// ==================== REPORTES ====================
export const reportesService = {
  ventas: async (params = {}) => {
    const response = await apiClient.get('/api/v1/reportes/ventas', { params });
    return response.data;
  },

  exportarVentas: async (params = {}) => {
    const response = await apiClient.get('/api/v1/reportes/ventas/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  almacen: async (params = {}) => {
    const response = await apiClient.get('/api/v1/reportes/almacen', { params });
    return response.data;
  },

  exportarAlmacen: async (params = {}) => {
    const response = await apiClient.get('/api/v1/reportes/almacen/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  movimientos: async (params = {}) => {
    const response = await apiClient.get('/api/v1/reportes/movimientos', { params });
    return response.data;
  },

  generalMensual: async (mes, anio) => {
    const response = await apiClient.get(`/api/v1/reportes/general/${mes}/${anio}`);
    return response.data;
  },
};

// ==================== COBRANZA ====================
export const cobranzaService = {
  crearCliente: async (clienteData) => {
    const response = await apiClient.post('/api/v1/cobranza/clientes', clienteData);
    return response.data;
  },

  crearVentaCredito: async (ventaCreditoData) => {
    const response = await apiClient.post('/api/v1/cobranza/ventas-credito', ventaCreditoData);
    return response.data;
  },

  listarCuentas: async (params = {}) => {
    const response = await apiClient.get('/api/v1/cobranza/cuentas-por-cobrar', { params });
    return response.data;
  },

  registrarPago: async (pagoData) => {
    const response = await apiClient.post('/api/v1/cobranza/pagos', pagoData);
    return response.data;
  },

  estadoCuenta: async (clienteId) => {
    const response = await apiClient.get(`/api/v1/cobranza/estado-cuenta/${clienteId}`);
    return response.data;
  },
};

// ==================== FACTURACIÓN ====================
export const facturacionService = {
  crear: async (facturaData) => {
    const response = await apiClient.post('/api/v1/facturas', facturaData);
    return response.data;
  },

  listar: async (params = {}) => {
    const response = await apiClient.get('/api/v1/facturas', { params });
    return response.data;
  },

  obtener: async (facturaId) => {
    const response = await apiClient.get(`/api/v1/facturas/${facturaId}`);
    return response.data;
  },

  timbrar: async (facturaId) => {
    const response = await apiClient.post(`/api/v1/facturas/${facturaId}/timbrar`);
    return response.data;
  },

  cancelar: async (facturaId, motivo = '02') => {
    const response = await apiClient.post(`/api/v1/facturas/${facturaId}/cancelar`, null, {
      params: { motivo }
    });
    return response.data;
  },

  globalTarjetas: async (params) => {
    const response = await apiClient.post('/api/v1/facturas/global/tarjetas', params);
    return response.data;
  },
};

// ==================== RECURSOS HUMANOS ====================
export const rrhhService = {
  resumen: async () => {
    const response = await apiClient.get('/api/v1/rrhh/resumen');
    return response.data;
  },

  // Empleados
  listarEmpleados: async (soloActivos = false) => {
    const response = await apiClient.get('/api/v1/rrhh/empleados', {
      params: { solo_activos: soloActivos },
    });
    return response.data;
  },

  crearEmpleado: async (data) => {
    const response = await apiClient.post('/api/v1/rrhh/empleados', data);
    return response.data;
  },

  actualizarEmpleado: async (id, data) => {
    const response = await apiClient.patch(`/api/v1/rrhh/empleados/${id}`, data);
    return response.data;
  },

  // Nóminas
  listarNominas: async () => {
    const response = await apiClient.get('/api/v1/rrhh/nominas');
    return response.data;
  },

  crearNomina: async (data) => {
    const response = await apiClient.post('/api/v1/rrhh/nominas', data);
    return response.data;
  },

  cerrarNomina: async (id) => {
    const response = await apiClient.post(`/api/v1/rrhh/nominas/${id}/cerrar`);
    return response.data;
  },

  // Logs de acceso
  listarLogs: async (params = {}) => {
    const response = await apiClient.get('/api/v1/rrhh/logs', { params });
    return response.data;
  },

  // Ventas por sesión
  ventasSesion: async (params = {}) => {
    const response = await apiClient.get('/api/v1/rrhh/ventas-sesion', { params });
    return response.data;
  },
};

// ==================== DASHBOARD ====================
export const dashboardService = {
  resumen: async () => {
    const response = await apiClient.get('/api/v1/dashboard/resumen');
    return response.data;
  },
};

// ==================== ASISTENTE IA ====================
export const aiService = {
  chat: async (message, context = null) => {
    const response = await apiClient.post('/api/v1/ai/chat', { message, context }, { timeout: 30000 });
    return response.data;
  },
};

// ==================== HEALTH ====================
export const healthService = {
  check: async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },
};

export default apiClient;
