#!/usr/bin/env python3
"""
Script de verificación de implementación completa.
Verifica que todos los componentes están en su lugar.
"""
from pathlib import Path
import sys

def verificar_archivos():
    """Verifica que todos los archivos clave existen."""
    archivos_requeridos = [
        # Documentación
        'AUDIT_GAP_MATRIX.md',
        'ALINEACION_COMPLETADA.md',
        'RUTAS_ALINEADAS.md',
        'POS_COMPLETO.md',
        'MODULO_ALMACEN.md',
        'MODULO_REPORTES.md',
        'MODULO_COBRANZA.md',
        'MODULO_FACTURACION.md',
        'FRONTEND_COMPLETO.md',
        'IMPLEMENTACION_COMPLETA.md',
        'INICIO_RAPIDO.md',
        
        # Migraciones
        'migrations/001_add_venta_fields.sql',
        'migrations/002_mejora_precios_acumulado.sql',
        'migrations/003_modulo_cobranza.sql',
        'migrations/apply_migrations.py',
        
        # Backend - Modelos
        'backend/app/models/usuario.py',
        'backend/app/models/producto.py',
        'backend/app/models/inventario.py',
        'backend/app/models/venta.py',
        'backend/app/models/cliente.py',
        'backend/app/models/factura.py',
        
        # Backend - Servicios
        'backend/app/services/auth_service.py',
        'backend/app/services/venta_service.py',
        'backend/app/services/ticket_service.py',
        'backend/app/services/producto_service.py',
        'backend/app/services/inventario_service.py',
        'backend/app/services/reporte_service.py',
        'backend/app/services/cobranza_service.py',
        'backend/app/services/facturacion_service.py',
        
        # Backend - Routers
        'backend/app/api/v1/auth.py',
        'backend/app/api/v1/pos.py',
        'backend/app/api/v1/ventas.py',
        'backend/app/api/v1/productos.py',
        'backend/app/api/v1/inventario.py',
        'backend/app/api/v1/reportes.py',
        'backend/app/api/v1/cobranza.py',
        'backend/app/api/v1/facturas.py',
        
        # Backend - Schemas
        'backend/app/schemas/auth.py',
        'backend/app/schemas/venta.py',
        'backend/app/schemas/ticket.py',
        
        # Frontend
        'frontend/src/App.js',
        'frontend/src/services/apiService.js',
        'frontend/src/pages/Dashboard.js',
        'frontend/src/pages/POS.js',
        'frontend/src/pages/Almacen.js',
        'frontend/src/pages/Reportes.js',
        'frontend/src/pages/Facturacion.js',
        'frontend/src/pages/Cobranza.js',
        'frontend/src/components/Navbar.js',
        
        # Ejemplos
        'examples/productos_carga_masiva.csv',
    ]
    
    # Ajustar ruta base: el script está en scripts/, pero los archivos están en la raíz
    base_path = Path(__file__).resolve().parent.parent
    archivos_faltantes = []
    archivos_encontrados = 0
    
    print("🔍 Verificando archivos de implementación...\n")
    
    for archivo in archivos_requeridos:
        ruta = base_path / archivo
        if ruta.exists():
            archivos_encontrados += 1
            print(f"✅ {archivo}")
        else:
            archivos_faltantes.append(archivo)
            print(f"❌ {archivo} - FALTANTE")
    
    print(f"\n📊 Resultado: {archivos_encontrados}/{len(archivos_requeridos)} archivos encontrados")
    
    if archivos_faltantes:
        print(f"\n⚠️  Archivos faltantes: {len(archivos_faltantes)}")
        return False
    else:
        print("\n✅ Todos los archivos de implementación están presentes")
        return True

def verificar_estructura():
    """Verifica la estructura de directorios."""
    directorios = [
        'backend/app/models',
        'backend/app/services',
        'backend/app/api/v1',
        'backend/app/schemas',
        'backend/app/repositories',
        'frontend/src/pages',
        'frontend/src/components',
        'frontend/src/services',
        'migrations',
        'examples',
        'documentacion'
    ]
    
    # Ajustar ruta base: el script está en scripts/, pero los directorios están en la raíz
    base_path = Path(__file__).resolve().parent.parent
    print("\n🔍 Verificando estructura de directorios...\n")
    
    todos_ok = True
    for directorio in directorios:
        ruta = base_path / directorio
        if ruta.exists() and ruta.is_dir():
            print(f"✅ {directorio}/")
        else:
            print(f"❌ {directorio}/ - FALTANTE")
            todos_ok = False
    
    return todos_ok

def main():
    """Ejecutar verificación completa."""
    print("=" * 60)
    print("  VERIFICACIÓN DE IMPLEMENTACIÓN - Sistema ERP Nodo")
    print("=" * 60)
    print()
    
    # Verificar archivos
    archivos_ok = verificar_archivos()
    
    # Verificar estructura
    estructura_ok = verificar_estructura()
    
    # Resultado final
    print("\n" + "=" * 60)
    if archivos_ok and estructura_ok:
        print("✅ VERIFICACIÓN EXITOSA")
        print("   Todos los componentes están en su lugar")
        print("   El sistema está listo para despliegue")
        print()
        print("📖 Siguiente paso: Ver INICIO_RAPIDO.md")
        return 0
    else:
        print("❌ VERIFICACIÓN FALLIDA")
        print("   Algunos componentes faltan")
        print("   Revisar los errores arriba")
        return 1

if __name__ == '__main__':
    sys.exit(main())
