# Resumen Ejecutivo — ERP Nodo (Tienda física)

## 1. Visión general del producto

El **ERP Nodo** es un sistema integral para operación de **tienda física**, diseñado para unificar en una sola solución los procesos críticos del negocio: **venta en caja**, **control centralizado de inventario**, **variantes de producto (talla/color)**, **precios menudeo/mayoreo**, **reportes operativos y gerenciales**, **cobranza (ventas a crédito)** y un módulo de **facturación** preparado para integrarse a un **PAC/SAT**.

El objetivo principal del sistema es garantizar una operación ágil y consistente en mostrador, mantener visibilidad confiable del stock en tiempo real y habilitar decisiones informadas a través de reportes claros, alineados a los requerimientos operativos descritos en el documento de necesidades del cliente.

---

## 2. Alcance funcional implementado (estado actual)

### 2.1 Punto de venta (Caja)

- **Registro de ventas** con control por usuario y punto de venta.
- **Captura por código de barras** (compatible con lectores tipo “teclado” y flujos POS).
- **Manejo de método de pago** (efectivo / tarjeta) y estados de venta (abierta, cerrada, cancelada).
- **Ticket de venta** generado desde el sistema con desglose de productos, cantidades, precio unitario y total.
- **Código QR en ticket** para orientar el flujo de facturación al cliente (link/flujo configurable).

### 2.2 Almacén / Inventarios

- **Catálogo de productos** con soporte de **variantes** por talla y color.
- **Precios diferenciados por variante**: menudeo y mayoreo.
- **Control de stock por variante** con validaciones para evitar negativos.
- **Movimientos de inventario** (entradas, salidas y ajustes), con historial consultable.
- **Carga masiva** de productos/variantes mediante layout (CSV) para altas rápidas.

### 2.3 Cobranza (ventas a crédito)

- **Clientes**, **cuentas por cobrar** y **pagos/abonos**.
- Consulta de **estado de cuenta** por cliente.
- Control operativo para soportar escenarios de ventas a crédito y registro de pagos.

### 2.4 Reportes

- **Reporte de ventas** con filtros por fechas, método de pago y estado.
- **Reporte de almacén** (existencias por producto/variante, precios, stock, filtros).
- **Reporte de movimientos** de inventario con filtros.
- **Reporte general mensual/comparativo** (enfoque operativo/gerencial sobre ventas).
- **Exportación** (según endpoints disponibles) para análisis externo.

### 2.5 Seguridad y control de acceso

- Autenticación con **token (JWT)**.
- Validación de usuario activo.
- Endpoints protegidos para operaciones sensibles.

---

## 3. Alineación con el documento de necesidades (qué cubre)

Con base en el documento de necesidades proporcionado por Nodo, la solución cubre los requerimientos funcionales clave:

### 3.1 Portal de ventas (Caja)

- **Conexión con caja**: flujo de venta completo (creación, detalle, cierre/cancelación).
- **Lectura/escaneo**: búsqueda por código de barras optimizada para operación de mostrador.
- **Impresión de ticket**: generación del ticket desde sistema y capacidad de impresión (ver pendientes para integración física dedicada).
- **Generación de QR para facturación**: ticket incluye QR para orientar el proceso.
- **Cobranza**: soporte para ventas a crédito y pagos.
- **Precio mayoreo/menudeo**: lógica de precio por cantidad (incluye reglas por acumulado para llegar a mayoreo).
- **Entrada manual de cantidades**: soporte operativo para registrar cantidades sin depender solo del escaneo.

### 3.2 Programa de control de stock (Almacén)

- Variantes por talla/color.
- Control centralizado de stock (multi-dispositivo vía base de datos).
- Entrada y registro de productos y movimientos.
- Layout/carga masiva y control de precios.
- Disminución de stock post-venta mediante consistencia transaccional.

### 3.3 Programa de reporteo

- Reporte de ventas, almacén y movimientos.
- Reporte general mensual comparativo (ventas).

---

## 4. Arquitectura, operación y calidad técnica

### 4.1 Arquitectura

- **Backend API**: FastAPI (servicios, repositorios, validación).
- **Base de datos**: PostgreSQL con integridad referencial y funciones/triggers para soportar reglas (por ejemplo, lógica de precios por acumulado y recálculo de totales).
- **Frontend**: React con cliente API centralizado y módulos por dominio (POS, Almacén, Reportes, Facturación, Cobranza).
- **Contenerización**: Docker Compose para despliegue reproducible (db, backend, frontend).

### 4.2 Consistencia y concurrencia

- Diseño orientado a operación real con múltiples dispositivos.
- Uso de bloqueos/consistencia a nivel base de datos para evitar condiciones de carrera en stock y ventas.

### 4.3 Extensibilidad

El sistema está estructurado para permitir crecimiento por fases (por ejemplo: integración PAC real, impresión térmica ESC/POS, etiquetas, egresos/costos), sin comprometer el núcleo de ventas e inventario.

---

## 5. Pendientes prioritarios para cumplimiento “100% operativo” del documento

Estos puntos se consideran la siguiente fase para cerrar completamente el alcance esperado en producción (según prioridades acordadas: SAT real → ticket físico → reportes):

### 5.1 Facturación SAT real (PAC/SAT en producción)

- Reemplazar el flujo “preparado/stub” por integración real con un **PAC definido** (credenciales, certificados, timbrado, cancelación, acuses).
- Persistencia completa de **XML timbrado** y **PDF** (si aplica) y recuperación segura por API.
- Manejo robusto de errores y estados.

### 5.2 Ticket físico con impresora térmica (operación de caja)

- Integración dedicada a impresora térmica (ESC/POS o puente local) para:
  - impresión directa
  - corte automático
  - configuración de impresora (según modelo)

### 5.3 Reportes reforzados (según interpretación del documento)

- Reporte de **“salidas por venta”** claramente reflejado en movimientos (ya sea registrando movimientos por venta o derivando desde detalle de ventas).
- Si el cliente exige “rentabilidad” completa: módulo de **egresos/costos** y reporte mensual ingresos vs egresos.

### 5.4 Códigos de barras y etiquetas (si se requiere generación)

- Generación/administración de códigos y **plantillas de etiquetas** imprimibles para operación de almacén.

---

## 6. Propuesta de valor (por qué este sistema)

- **Reduce errores** y mejora la trazabilidad: inventario y ventas quedan alineados en un flujo único.
- **Acelera la operación de caja**: escaneo, cantidades, precios menudeo/mayoreo y ticket.
- **Mejora control y visibilidad**: stock, movimientos y reportes para administración.
- **Escalable y mantenible**: arquitectura moderna, API documentada, despliegue reproducible con Docker.
- **Preparado para crecer**: integración SAT real, impresión térmica y mejoras operativas sin rehacer el núcleo.

---

## 7. Qué se entrega como producto (en términos comerciales)

El ERP Nodo se entrega como una solución lista para operar en tienda física con los módulos base (POS, almacén, cobranza, reportes) y con una ruta clara de evolución para integrar SAT real y ticket físico según hardware y proveedor de timbrado que el cliente elija.

