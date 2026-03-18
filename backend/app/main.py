from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.core.database import engine, Base
from app.api.v1 import auth, ventas, pos, productos, inventario, reportes, cobranza, facturas, configuracion, rrhh, dashboard, ai

# Importar todos los modelos para que Base los conozca antes de create_all
import app.models  # noqa: F401

# Configurar logging
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_dir=settings.LOG_DIR
)
logger = get_logger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    description="""
    Backend profesional para sistema POS/Almacén - YOMYOM
    
    ## Características
    
    * **Autenticación JWT** con roles (ADMIN, CAJERO, ALMACEN)
    * **Transacciones ACID** para operaciones de venta
    * **SELECT FOR UPDATE** para manejo de concurrencia
    * **Búsqueda por código de barras** optimizada para POS
    * **Control de inventario** con validación de stock
    * **Precios diferenciados** (menudeo/mayoreo)
    * **Facturación SAT** preparada
    
    ## Arquitectura
    
    * Clean Architecture (Repositories → Services → API)
    * SQLAlchemy 2.0 con PostgreSQL
    * Manejo profesional de errores
    * Alineado con docs/almacen_db.sql
    """
)

# Configurar CORS
cors_origins = settings.CORS_ORIGINS.split(",") if "," in settings.CORS_ORIGINS else [settings.CORS_ORIGINS]
allow_all = "*" in cors_origins
if allow_all and not settings.DEBUG:
    logger.warning("⚠️  CORS configurado con '*' en producción. Esto es inseguro!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all else cors_origins,
    allow_origin_regex=".*" if allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers (ALINEADO con openapi.yaml)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(pos.router, prefix=settings.API_V1_PREFIX)
app.include_router(ventas.router, prefix=settings.API_V1_PREFIX)
app.include_router(productos.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventario.router, prefix=settings.API_V1_PREFIX)
app.include_router(reportes.router, prefix=settings.API_V1_PREFIX)
app.include_router(cobranza.router, prefix=settings.API_V1_PREFIX)
app.include_router(facturas.router, prefix=settings.API_V1_PREFIX)
app.include_router(configuracion.router, prefix=settings.API_V1_PREFIX)
app.include_router(rrhh.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def create_rrhh_tables():
    """Crea las tablas de RRHH si no existen (idempotente)."""
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("✅ Tablas RRHH verificadas/creadas correctamente")
    except Exception as e:
        logger.error(f"❌ Error creando tablas RRHH: {e}")


@app.get("/")
def root():
    """Endpoint raíz."""
    return {
        "message": "POS Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint.
    
    Verifica que la aplicación está funcionando correctamente.
    """
    from datetime import datetime
    from app.core.database import engine
    from sqlalchemy import text
    
    try:
        # Verificar conexión a base de datos
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail=f"Unhealthy: Database connection failed - {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
