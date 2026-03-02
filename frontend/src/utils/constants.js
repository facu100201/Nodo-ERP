/**
 * Constantes globales de la aplicación
 */

// Roles de usuario
export const ROLES = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  ALMACEN: 'ALMACEN'
};

// Estados de venta
export const ESTADOS_VENTA = {
  ABIERTA: 'ABIERTA',
  CERRADA: 'CERRADA',
  CANCELADA: 'CANCELADA'
};

// Métodos de pago
export const METODOS_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA',
  CREDITO: 'CREDITO'
};

// Tipos de movimiento de inventario
export const TIPOS_MOVIMIENTO = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE'
};

// Estados de factura
export const ESTADOS_FACTURA = {
  BORRADOR: 'BORRADOR',
  TIMBRADA: 'TIMBRADA',
  CANCELADA: 'CANCELADA'
};

// Tipos de mensaje/alerta
export const TIPOS_MENSAJE = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Configuración de paginación
export const PAGINACION = {
  ITEMS_POR_PAGINA: 20,
  ITEMS_POR_PAGINA_OPCIONES: [10, 20, 50, 100]
};

// Duraciones de toast (en milisegundos)
export const DURACION_TOAST = {
  CORTA: 2000,
  MEDIA: 3000,
  LARGA: 5000
};

// Formato de fechas
export const FORMATO_FECHA = {
  CORTA: 'DD/MM/YYYY',
  LARGA: 'DD/MM/YYYY HH:mm:ss',
  SOLO_HORA: 'HH:mm:ss'
};

// URLs de la API (base)
export const API_ENDPOINTS = {
  AUTH: '/api/v1/auth',
  VENTAS: '/api/v1/ventas',
  PRODUCTOS: '/api/v1/productos',
  INVENTARIO: '/api/v1/inventario',
  REPORTES: '/api/v1/reportes',
  FACTURAS: '/api/v1/facturas',
  COBRANZA: '/api/v1/cobranza',
  POS: '/api/v1/pos'
};

// Atajos de teclado
export const ATAJOS_TECLADO = {
  NUEVA_VENTA: 'F1',
  CERRAR_VENTA: 'F2',
  CANCELAR_VENTA: 'F3',
  AGREGAR_PRODUCTO: 'Enter',
  BUSCAR: 'Control+K',
  GUARDAR: 'Control+S'
};

// Colores del tema ERP (alineados con theme.css)
export const COLORES = {
  PRIMARY: '#2f4156',
  SECONDARY: '#567c8d',
  BG_MAIN: '#ffffff',
  BG_SOFT: '#f5efeb',
  HIGHLIGHT: '#c8d9e6',
  SUCCESS: '#56a36b',
  DANGER: '#dc3545',
  WARNING: '#f2b705',
  INFO: '#17a2b8',
  LIGHT: '#f5efeb',
  DARK: '#2f4156'
};

// Validaciones
export const VALIDACIONES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_USERNAME_LENGTH: 50,
  MIN_STOCK: 0,
  MAX_CANTIDAD_VENTA: 9999,
  DECIMALES_PRECIO: 2
};

// Mensajes comunes
export const MENSAJES = {
  EXITO_GUARDAR: 'Guardado correctamente',
  ERROR_GUARDAR: 'Error al guardar',
  ERROR_CONEXION: 'Error de conexión con el servidor',
  CONFIRMAR_ELIMINAR: '¿Estás seguro de eliminar este elemento?',
  CAMPO_REQUERIDO: 'Este campo es requerido',
  SESION_EXPIRADA: 'Tu sesión ha expirado, por favor inicia sesión nuevamente'
};

export default {
  ROLES,
  ESTADOS_VENTA,
  METODOS_PAGO,
  TIPOS_MOVIMIENTO,
  ESTADOS_FACTURA,
  TIPOS_MENSAJE,
  PAGINACION,
  DURACION_TOAST,
  FORMATO_FECHA,
  API_ENDPOINTS,
  ATAJOS_TECLADO,
  COLORES,
  VALIDACIONES,
  MENSAJES
};
