from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.models.usuario import Usuario


class UsuarioRepository:
    """Repositorio para operaciones de Usuario."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_username(self, username: str) -> Optional[Usuario]:
        """Obtener usuario por nombre o email."""
        return self.db.query(Usuario).filter(
            or_(Usuario.nombre == username, Usuario.email == username),
            Usuario.activo == True
        ).first()
    
    def get_by_id(self, usuario_id: int) -> Optional[Usuario]:
        """Obtener usuario por ID."""
        return self.db.query(Usuario).filter(
            Usuario.id == usuario_id,
            Usuario.activo == True
        ).first()
    
    def get_by_email(self, email: str) -> Optional[Usuario]:
        """Obtener usuario por email."""
        return self.db.query(Usuario).filter(
            Usuario.email == email,
            Usuario.activo == True
        ).first()
