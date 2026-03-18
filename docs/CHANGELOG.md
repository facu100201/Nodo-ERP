# 📝 Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Agregado
- Documentación completa de clonación desde Git
- Archivos `.env.example` para configuración fácil
- Guía de contribución (CONTRIBUTING.md)
- Changelog para tracking de cambios

### Mejorado
- Organización de documentación en carpeta `docs/`
- README.md con estructura más profesional
- Guías de troubleshooting más completas

---

## [1.0.0] - 2026-01-21

### Agregado
- Sistema completo ERP/POS Nodo
- Módulo POS (Punto de Venta) con lector RF
- Módulo Almacén con control de stock y variantes
- Módulo Reportes con exportación
- Módulo Cobranza (ventas a crédito)
- Módulo Facturación SAT (CFDI 4.0)
- Frontend React completo con 6 páginas
- Autenticación JWT con roles
- Base de datos PostgreSQL con triggers automáticos
- Sistema de precios menudeo/mayoreo automático
- Tickets con código QR
- Carga masiva de productos por CSV
- Docker Compose para desarrollo
- Scripts de utilidad y verificación

### Documentación
- README.md completo
- docs/INSTALLATION.md - Guía de instalación
- docs/DEVELOPMENT.md - Guía de desarrollo
- docs/ARCHITECTURE.md - Arquitectura del sistema
- docs/API.md - Documentación de API
- docs/DATABASE.md - Guía de base de datos
- docs/SECURITY.md - Seguridad y autenticación
- docs/TROUBLESHOOTING.md - Solución de problemas
- docs/QUICK_REFERENCE.md - Referencia rápida
- docs/MIGRATIONS.md - Guía de migraciones

---

## Tipos de Cambios

- **Agregado** - Nueva funcionalidad
- **Cambiado** - Cambios en funcionalidad existente
- **Deprecado** - Funcionalidad que será removida
- **Removido** - Funcionalidad removida
- **Corregido** - Corrección de bugs
- **Seguridad** - Vulnerabilidades corregidas

---

## Formato de Versión

Este proyecto usa [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0) - Cambios incompatibles en API
- **MINOR** (0.1.0) - Nueva funcionalidad compatible
- **PATCH** (0.0.1) - Correcciones de bugs compatibles

---

**Última actualización**: Enero 2026
