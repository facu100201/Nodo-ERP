from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Empleado(Base):
    """Perfil de empleado vinculado a un usuario del sistema."""

    __tablename__ = "empleados"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)

    # Datos laborales
    departamento = Column(String(100), nullable=False)
    puesto = Column(String(100), nullable=False)
    salario_mensual = Column(Numeric(12, 2), nullable=False)
    fecha_ingreso = Column(DateTime(timezone=True), nullable=False)

    # Datos personales opcionales
    telefono = Column(String(20), nullable=True)
    direccion = Column(String(255), nullable=True)

    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("salario_mensual >= 0", name="empleados_salario_check"),
    )

    # Relaciones
    detalles_nomina = relationship("DetalleNomina", back_populates="empleado")


class PeriodoNomina(Base):
    """Período de nómina (quincenal, mensual, etc.)."""

    __tablename__ = "periodos_nomina"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    fecha_inicio = Column(DateTime(timezone=True), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=False)
    estado = Column(String(20), default="BORRADOR")  # BORRADOR | CERRADO
    total_bruto = Column(Numeric(14, 2), default=0)
    total_empleados = Column(Integer, default=0)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("estado IN ('BORRADOR','CERRADO')", name="periodos_nomina_estado_check"),
    )

    detalles = relationship("DetalleNomina", back_populates="periodo", cascade="all, delete-orphan")


class DetalleNomina(Base):
    """Línea de nómina: salario de un empleado en un período."""

    __tablename__ = "detalles_nomina"

    id = Column(Integer, primary_key=True, index=True)
    periodo_id = Column(Integer, ForeignKey("periodos_nomina.id"), nullable=False, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False)
    salario_base = Column(Numeric(12, 2), nullable=False)
    deducciones = Column(Numeric(12, 2), default=0)
    salario_neto = Column(Numeric(12, 2), nullable=False)
    notas = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("salario_base >= 0", name="detalle_nomina_base_check"),
        CheckConstraint("deducciones >= 0", name="detalle_nomina_ded_check"),
        CheckConstraint("salario_neto >= 0", name="detalle_nomina_neto_check"),
    )

    periodo = relationship("PeriodoNomina", back_populates="detalles")
    empleado = relationship("Empleado", back_populates="detalles_nomina")


class LogAcceso(Base):
    """Registro de eventos de acceso al sistema (login / logout)."""

    __tablename__ = "logs_acceso"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    accion = Column(String(20), nullable=False)  # LOGIN | LOGOUT
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    detalles = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        CheckConstraint("accion IN ('LOGIN','LOGOUT')", name="logs_acceso_accion_check"),
    )
