from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt, JWTError
from app.core.config import settings

# Parche de compatibilidad: passlib 1.7.4 busca bcrypt.__about__.__version__
# que bcrypt 4.x ya no expone. Se aplica antes de importar CryptContext.
import bcrypt as _bcrypt_module
if not hasattr(_bcrypt_module, "__about__"):
    from types import SimpleNamespace
    _bcrypt_module.__about__ = SimpleNamespace(__version__=_bcrypt_module.__version__)

from passlib.context import CryptContext

# Contexto para hashing de passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar password contra hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generar hash de password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crear token JWT.
    
    Args:
        data: Datos a codificar en el token
        expires_delta: Tiempo de expiración
        
    Returns:
        Token JWT codificado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodificar token JWT.
    
    Args:
        token: Token JWT a decodificar
        
    Returns:
        Payload del token o None si es inválido
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
